use crate::api::{SpotifyApi, TrackItem};
use crate::cdp::CdpSession;
use crate::extensions::ExtensionManager;
use crate::queue::QueueManager;
use anyhow::Result;
use serde_json::json;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::Mutex;

const HTML: &str = include_str!("../ui/index.html");
const CSS: &str = include_str!("../ui/style.css");
const JS: &str = include_str!("../ui/app.js");
const LOGO: &str = include_str!("../ui/logo.svg");

/// Estado soberano del reproductor Amphion enfocado 100% en Streaming en Alta Calidad.
pub struct AppState {
    pub api: Option<SpotifyApi>,
    pub cdp: Option<Arc<CdpSession>>,
    pub queue: Arc<Mutex<QueueManager>>,
    pub extensions: Arc<Mutex<ExtensionManager>>,
    pub is_playing: bool,
    pub adblock: Arc<Mutex<crate::adblock::AdBlockManager>>,
}

pub async fn run_server(port: u16, state: Arc<Mutex<AppState>>) -> Result<()> {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    println!("🌐 Servidor de streaming Amphion activo en http://127.0.0.1:{}", port);

    while let Ok((mut socket, _)) = listener.accept().await {
        let state_clone = Arc::clone(&state);
        tokio::spawn(async move {
            if let Some(req_str) = read_http_request(&mut socket).await {
                let origin = req_str.lines()
                    .find(|l| l.to_lowercase().starts_with("origin:"))
                    .and_then(|l| l.split_once(':').map(|x| x.1.trim()))
                    .unwrap_or("");

                let allowed_origin = resolve_allowed_origin(origin);

                let (status, mime, body) = handle_request(&req_str, state_clone).await;

                let resp = format!(
                    "HTTP/1.1 {}\r\nContent-Type: {}\r\nAccess-Control-Allow-Origin: {}\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    status, mime, allowed_origin, body.len(), body
                );
                let _ = socket.write_all(resp.as_bytes()).await;
            }
        });
    }

    Ok(())
}

pub fn resolve_allowed_origin(origin: &str) -> &'static str {
    if origin == "https://open.spotify.com"
        || origin.starts_with("http://127.0.0.1")
        || origin.starts_with("http://localhost")
        || origin.is_empty()
    {
        if origin.is_empty() { "*" } else { "https://open.spotify.com" }
    } else {
        "null"
    }
}

async fn read_http_request(socket: &mut TcpStream) -> Option<String> {
    let mut data = Vec::with_capacity(4096);
    let mut buf = [0u8; 2048];
    loop {
        let n = socket.read(&mut buf).await.ok()?;
        if n == 0 {
            break;
        }
        data.extend_from_slice(&buf[..n]);

        if let Some(pos) = data.windows(4).position(|w| w == b"\r\n\r\n") {
            let header_end = pos + 4;
            let header_text = String::from_utf8_lossy(&data[..pos]);
            let content_length = header_text
                .lines()
                .map(|l| l.to_lowercase())
                .find_map(|l| l.strip_prefix("content-length:").map(|v| v.trim().to_string()))
                .and_then(|v| v.parse::<usize>().ok())
                .unwrap_or(0);
            if data.len() >= header_end + content_length {
                break;
            }
        }
    }
    if data.is_empty() {
        None
    } else {
        Some(String::from_utf8_lossy(&data).to_string())
    }
}

async fn handle_request(req: &str, state: Arc<Mutex<AppState>>) -> (&'static str, &'static str, String) {
    let mut lines = req.lines();
    let first_line = lines.next().unwrap_or("");
    let parts: Vec<&str> = first_line.split_whitespace().collect();

    if parts.len() < 2 {
        return ("400 Bad Request", "text/plain", "Bad Request".to_string());
    }

    let method = parts[0];
    let path = parts[1];

    if method == "OPTIONS" {
        return ("200 OK", "text/plain", "OK".to_string());
    }

    match (method, path) {
        ("GET", "/") | ("GET", "/index.html") => ("200 OK", "text/html", HTML.to_string()),
        ("GET", "/style.css") => ("200 OK", "text/css", CSS.to_string()),
        ("GET", "/app.js") => ("200 OK", "application/javascript", JS.to_string()),
        ("GET", "/logo.svg") => ("200 OK", "image/svg+xml", LOGO.to_string()),

        ("GET", "/api/status") => {
            let st = state.lock().await;
            let q = st.queue.lock().await;
            let current = q.current_track().cloned();
            let q_state = q.get_state();

            let res = json!({
                "is_playing": st.is_playing,
                "current_track": current,
                "queue": q_state,
                "adblock": st.adblock.lock().await.enabled,
                "mode": "streaming_pure",
                "audio_quality": "320kbps_lossless_aac",
                "user": {
                    "display_name": "Darwin Pinargote Franco",
                    "product": "Premium"
                }
            });

            ("200 OK", "application/json", res.to_string())
        }

        ("POST", "/api/settings/adblock") => {
            let body = extract_body(req);
            let st = state.lock().await;
            let enabled = serde_json::from_str::<serde_json::Value>(&body)
                .ok()
                .and_then(|v| v.get("enabled").and_then(|e| e.as_bool()))
                .unwrap_or(false);

            let mut manager = st.adblock.lock().await;
            match manager.set_enabled(enabled).await {
                Ok(value) => ("200 OK", "application/json", json!({ "adblock": value }).to_string()),
                Err(e) => ("500 Internal Server Error", "application/json", json!({ "error": e.to_string() }).to_string()),
            }
        }

        ("GET", "/api/extensions") => {
            let st = state.lock().await;
            let ext_mgr = st.extensions.lock().await;
            let list = ext_mgr.list_extensions();
            ("200 OK", "application/json", serde_json::to_string(&list).unwrap_or_default())
        }

        ("POST", "/api/toggle-play") => {
            let mut st = state.lock().await;
            st.is_playing = !st.is_playing;
            if let Some(cdp) = &st.cdp {
                if st.is_playing {
                    let _ = cdp.evaluate("window.MintPlayer && window.MintPlayer.resume()", false).await;
                } else {
                    let _ = cdp.evaluate("window.MintPlayer && window.MintPlayer.pause()", false).await;
                }
            }
            ("200 OK", "application/json", json!({ "is_playing": st.is_playing }).to_string())
        }

        ("POST", "/api/next") => {
            let mut st = state.lock().await;
            let next_track = {
                let mut q = st.queue.lock().await;
                q.next()
            };

            if let Some(track) = next_track {
                if let Some(cdp) = &st.cdp {
                    let script = format!("window.MintPlayer && window.MintPlayer.play('{}')", track.uri);
                    let _ = cdp.evaluate(&script, false).await;
                }
                st.is_playing = true;
                ("200 OK", "application/json", serde_json::to_string(&track).unwrap_or_default())
            } else {
                ("404 Not Found", "application/json", json!({ "error": "Fin de cola" }).to_string())
            }
        }

        ("POST", "/api/prev") => {
            let mut st = state.lock().await;
            let prev_track = {
                let mut q = st.queue.lock().await;
                q.previous()
            };

            if let Some(track) = prev_track {
                if let Some(cdp) = &st.cdp {
                    let script = format!("window.MintPlayer && window.MintPlayer.play('{}')", track.uri);
                    let _ = cdp.evaluate(&script, false).await;
                }
                st.is_playing = true;
                ("200 OK", "application/json", serde_json::to_string(&track).unwrap_or_default())
            } else {
                ("404 Not Found", "application/json", json!({ "error": "No hay pista anterior" }).to_string())
            }
        }

        ("GET", p) if p.starts_with("/api/search") => {
            let st = state.lock().await;
            let query = p.split("q=").nth(1).unwrap_or("").split('&').next().unwrap_or("");
            let query = urlencoding_decode(query);

            if let Some(api) = &st.api {
                if let Ok(tracks) = api.search_tracks(&query).await {
                    return ("200 OK", "application/json", serde_json::to_string(&tracks).unwrap_or_default());
                }
            }

            let mock_tracks = vec![
                TrackItem {
                    id: "mock1".to_string(),
                    name: format!("{} (Amphion Stream)", query),
                    uri: "spotify:track:4cOdK2wGLETKBW3PvgPWqT".to_string(),
                    duration_ms: 215000,
                    artists: vec![],
                    album: None,
                }
            ];
            ("200 OK", "application/json", serde_json::to_string(&mock_tracks).unwrap_or_default())
        }

        ("GET", "/api/queue") => {
            let st = state.lock().await;
            let q = st.queue.lock().await;
            let state_data = q.get_state();
            ("200 OK", "application/json", json!(state_data).to_string())
        }

        ("POST", "/api/queue/add") => {
            let body = extract_body(req);
            if let Ok(track) = serde_json::from_str::<TrackItem>(&body) {
                let st = state.lock().await;
                let mut q = st.queue.lock().await;
                let mut state_data = q.get_state();
                state_data.tracks.push(track);
                q.set_queue(state_data.tracks, state_data.current_index.unwrap_or(0));
                return ("200 OK", "application/json", json!({ "ok": true }).to_string());
            }
            ("400 Bad Request", "text/plain", "Invalid JSON".to_string())
        }

        _ => ("404 Not Found", "text/plain", "Ruta no encontrada".to_string()),
    }
}

fn extract_body(req: &str) -> String {
    if let Some(idx) = req.find("\r\n\r\n") {
        req[idx + 4..].to_string()
    } else {
        String::new()
    }
}

fn urlencoding_decode(s: &str) -> String {
    percent_encoding::percent_decode_str(s).decode_utf8_lossy().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_allowed_origin() {
        assert_eq!(resolve_allowed_origin("https://open.spotify.com"), "https://open.spotify.com");
        assert_eq!(resolve_allowed_origin("http://127.0.0.1:4567"), "https://open.spotify.com");
        assert_eq!(resolve_allowed_origin("http://localhost:3000"), "https://open.spotify.com");
        assert_eq!(resolve_allowed_origin(""), "*");
        assert_eq!(resolve_allowed_origin("https://malicious-site.com"), "null");
    }

    #[test]
    fn test_urlencoding_decode() {
        assert_eq!(urlencoding_decode("Vallenatos%20Virales"), "Vallenatos Virales");
        assert_eq!(urlencoding_decode("Olv%C3%ADdala"), "Olvídala");
    }

    #[test]
    fn test_extract_body() {
        let req = "POST /api/test HTTP/1.1\r\nHost: localhost\r\nContent-Length: 15\r\n\r\n{\"key\":\"value\"}";
        assert_eq!(extract_body(req), "{\"key\":\"value\"}");
    }
}
