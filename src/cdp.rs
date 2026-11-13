use anyhow::{Context, Result};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::{broadcast, oneshot, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyToken {
    pub access_token: String,
    pub expires_at_ms: f64,
    pub client_id: String,
    pub is_anonymous: bool,
}

#[derive(Debug, Deserialize)]
struct CdpTarget {
    id: String,
    #[serde(rename = "type")]
    target_type: String,
    url: String,
    #[serde(rename = "webSocketDebuggerUrl")]
    web_socket_debugger_url: Option<String>,
}

pub struct ChromeProcess {
    child: Child,
    pub port: u16,
    pub user_data_dir: PathBuf,
}

impl ChromeProcess {
    pub fn spawn(port: u16, headless: bool) -> Result<Self> {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        let user_data_dir = PathBuf::from(home).join(".config/mintplayer/chrome-profile");
        std::fs::create_dir_all(&user_data_dir)?;

        let mut cmd = Command::new("google-chrome");
        cmd.arg(format!("--remote-debugging-port={}", port))
            .arg(format!("--user-data-dir={}", user_data_dir.display()))
            .arg("--no-first-run")
            .arg("--no-default-browser-check")
            .arg("--disable-background-timer-throttling")
            .arg("--disable-backgrounding-occluded-windows")
            .arg("--disable-renderer-backgrounding")
            .arg("--autoplay-policy=no-user-gesture-required");

        if headless {
            cmd.arg("--headless=new");
            cmd.arg("https://open.spotify.com");
        } else {
            // Abrir directamente Spotify Web Player en modo App Window nativa
            cmd.arg("--app=https://open.spotify.com");
            cmd.arg("--class=mintplayer");
            cmd.arg("--name=mintplayer");
        }

        let child = cmd.spawn().context("Error al iniciar Google Chrome")?;
        Ok(Self {
            child,
            port,
            user_data_dir,
        })
    }
}

impl Drop for ChromeProcess {
    fn drop(&mut self) {
        let _ = self.child.kill();
    }
}

pub struct CdpSession {
    next_id: AtomicU64,
    pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Value>>>>,
    tx_ws: Arc<Mutex<futures_util::stream::SplitSink<tokio_tungstenite::WebSocketStream<tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>>, Message>>>,
    pub binding_rx: broadcast::Receiver<Value>,
}

impl CdpSession {
    pub async fn connect(cdp_ws_url: &str) -> Result<Arc<Self>> {
        let (ws_stream, _) = connect_async(cdp_ws_url).await
            .with_context(|| format!("No se pudo conectar al WebSocket CDP: {}", cdp_ws_url))?;

        let (tx, mut rx) = ws_stream.split();
        let pending: Arc<Mutex<HashMap<u64, oneshot::Sender<Value>>>> = Arc::new(Mutex::new(HashMap::new()));
        let (binding_tx, binding_rx) = broadcast::channel(128);

        let pending_clone = Arc::clone(&pending);
        tokio::spawn(async move {
            while let Some(Ok(msg)) = rx.next().await {
                if let Message::Text(text) = msg {
                    if let Ok(val) = serde_json::from_str::<Value>(&text) {
                        if let Some(id) = val.get("id").and_then(|i| i.as_u64()) {
                            let mut map = pending_clone.lock().await;
                            if let Some(sender) = map.remove(&id) {
                                let _ = sender.send(val);
                            }
                        } else if let Some(method) = val.get("method").and_then(|m| m.as_str()) {
                            if method == "Runtime.bindingCalled" {
                                if let Some(params) = val.get("params") {
                                    let _ = binding_tx.send(params.clone());
                                }
                            }
                        }
                    }
                }
            }
        });

        let session = Arc::new(Self {
            next_id: AtomicU64::new(1),
            pending,
            tx_ws: Arc::new(Mutex::new(tx)),
            binding_rx,
        });

        // Inicializar dominios esenciales
        session.call("Runtime.enable", json!({})).await?;
        session.call("Page.enable", json!({})).await?;
        session.call("Network.enable", json!({})).await?;
        session.call("Runtime.addBinding", json!({ "name": "__mintPlayerPost" })).await?;

        Ok(session)
    }

    pub async fn call(&self, method: &str, params: Value) -> Result<Value> {
        let id = self.next_id.fetch_add(1, Ordering::SeqCst);
        let req = json!({
            "id": id,
            "method": method,
            "params": params
        });

        let (tx, rx) = oneshot::channel();
        {
            let mut map = self.pending.lock().await;
            map.insert(id, tx);
        }

        {
            let mut ws = self.tx_ws.lock().await;
            ws.send(Message::Text(req.to_string())).await?;
        }

        let resp = rx.await.context("Canal de respuesta CDP cerrado")?;
        if let Some(err) = resp.get("error") {
            anyhow::bail!("Error CDP en {}: {}", method, err);
        }

        Ok(resp.get("result").cloned().unwrap_or(Value::Null))
    }

    pub async fn evaluate(&self, expression: &str, await_promise: bool) -> Result<Value> {
        let result = self.call("Runtime.evaluate", json!({
            "expression": expression,
            "awaitPromise": await_promise,
            "returnByValue": true
        })).await?;

        Ok(result.get("result").cloned().unwrap_or(Value::Null))
    }
}

pub async fn find_or_create_spotify_tab(port: u16) -> Result<String> {
    let client = reqwest::Client::new();
    let list_url = format!("http://127.0.0.1:{}/json/list", port);

    // Esperar a que Chrome responda en el puerto de depuración
    let mut targets: Vec<CdpTarget> = Vec::new();
    for _ in 0..20 {
        if let Ok(resp) = client.get(&list_url).send().await {
            if let Ok(items) = resp.json::<Vec<CdpTarget>>().await {
                targets = items;
                break;
            }
        }
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    }

    // Buscar una pestaña existente con Spotify
    for t in &targets {
        if t.target_type == "page" && t.url.starts_with("https://open.spotify.com") {
            if let Some(ref ws) = t.web_socket_debugger_url {
                return Ok(ws.clone());
            }
        }
    }

    // Si no existe, abrir pestaña nueva
    let new_url = format!("http://127.0.0.1:{}/json/new?https://open.spotify.com", port);
    let target: CdpTarget = client.put(&new_url).send().await?
        .json().await?;

    target.web_socket_debugger_url
        .context("Pestaña creada pero no expuso webSocketDebuggerUrl")
}
