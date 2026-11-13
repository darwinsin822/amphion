use crate::api::{SpotifyApi, TrackItem};
use crate::cdp::CdpSession;
use crate::extensions::ExtensionManager;
use crate::queue::QueueManager;
use anyhow::Result;
use serde_json::json;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::Mutex;

const HTML: &str = include_str!("../ui/index.html");
const CSS: &str = include_str!("../ui/style.css");
const JS: &str = include_str!("../ui/app.js");
const LOGO: &str = include_str!("../ui/logo.svg");

pub struct AppState {
    pub api: Option<SpotifyApi>,
    pub cdp: Option<Arc<CdpSession>>,
    pub queue: Arc<Mutex<QueueManager>>,
    pub extensions: Arc<Mutex<ExtensionManager>>,
    pub is_playing: bool,
    pub adblock_enabled: bool,
    pub prefer_flac_flag: bool,
    pub download_dir: String,
}

pub async fn run_server(port: u16, state: Arc<Mutex<AppState>>) -> Result<()> {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    println!("🌐 Servidor de interfaz MintPlayer activo en http://127.0.0.1:{}", port);

    while let Ok((mut socket, _)) = listener.accept().await {
        let state_clone = Arc::clone(&state);
        tokio::spawn(async move {
            let mut buf = [0u8; 8192];
            if let Ok(n) = socket.read(&mut buf).await {
                if n == 0 { return; }
                let req_str = String::from_utf8_lossy(&buf[..n]);
                let (status, mime, body) = handle_request(&req_str, state_clone).await;

                let resp = format!(
                    "HTTP/1.1 {}\r\nContent-Type: {}\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    status, mime, body.len(), body
                );
                let _ = socket.write_all(resp.as_bytes()).await;
            }
        });
    }

    Ok(())
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
                "adblock": st.adblock_enabled,
                "prefer_flac": st.prefer_flac_flag,
                "download_dir": st.download_dir,
                "user": {
                    "display_name": "Darwin Pinargote Franco",
                    "product": "Free (Bypass CDP Activo)"
                }
            });

            ("200 OK", "application/json", res.to_string())
        }

        ("GET", "/api/extensions") => {
            let st = state.lock().await;
            let ext_mgr = st.extensions.lock().await;
            let list = ext_mgr.list_extensions();
            ("200 OK", "application/json", serde_json::to_string(&list).unwrap_or_default())
        }

        ("POST", "/api/settings/prefer-flac") => {
            let body = extract_body(req);
            let mut st = state.lock().await;
            if let Ok(v) = serde_json::from_str::<serde_json::Value>(&body) {
                if let Some(enabled) = v.get("enabled").and_then(|e| e.as_bool()) {
                    st.prefer_flac_flag = enabled;
                }
            }
            ("200 OK", "application/json", json!({ "prefer_flac": st.prefer_flac_flag }).to_string())
        }

        ("POST", "/api/download") => {
            let body = extract_body(req);
            let st = state.lock().await;
            let ext_mgr = st.extensions.lock().await;

            let (track_name, artist, prefer_flac) = if let Ok(v) = serde_json::from_str::<serde_json::Value>(&body) {
                let t = v.get("track").and_then(|x| x.as_str()).unwrap_or("Zapateando Juyayay");
                let a = v.get("artist").and_then(|x| x.as_str()).unwrap_or("Jayac");
                let flac = v.get("prefer_flac").and_then(|x| x.as_bool()).unwrap_or(st.prefer_flac_flag);
                (t.to_string(), a.to_string(), flac)
            } else {
                ("Zapateando Juyayay".to_string(), "Jayac".to_string(), st.prefer_flac_flag)
            };

            let download_meta = ext_mgr.resolve_download(&track_name, &artist, prefer_flac);
            let dest_dir = st.download_dir.clone();

            // Ejecución asíncrona real mediante yt-dlp
            let query = format!("ytsearch1:{} {} audio", track_name, artist);
            let audio_format = if prefer_flac { "flac" } else { "mp3" };
            let out_tmpl = format!("{}/%(title)s.%(ext)s", dest_dir);

            tokio::spawn(async move {
                let ytdlp_path = if std::path::Path::new("/home/darwinsin/.local/bin/yt-dlp").exists() {
                    "/home/darwinsin/.local/bin/yt-dlp"
                } else {
                    "yt-dlp"
                };

                let _ = std::process::Command::new(ytdlp_path)
                    .arg("-x")
                    .arg("--audio-format")
                    .arg(audio_format)
                    .arg("--audio-quality")
                    .arg("320K")
                    .arg("--no-playlist")
                    .arg("-o")
                    .arg(&out_tmpl)
                    .arg(&query)
                    .spawn();
            });

            let result = json!({
                "status": "success",
                "message": format!("Descarga iniciada hacia {}", dest_dir),
                "resolution": download_meta,
                "track": track_name,
                "artist": artist,
                "target_path": format!("{}/{} - {}.{}", dest_dir, track_name, artist, download_meta["format"].as_str().unwrap_or("m4a"))
            });

            ("200 OK", "application/json", result.to_string())
        }

        ("POST", "/api/open-downloads") => {
            let st = state.lock().await;
            let _ = std::process::Command::new("xdg-open")
                .arg(&st.download_dir)
                .spawn();
            ("200 OK", "application/json", json!({ "ok": true, "path": st.download_dir }).to_string())
        }

        ("GET", "/api/downloads/history") => {
            let st = state.lock().await;
            let mut files = Vec::new();
            if let Ok(entries) = std::fs::read_dir(&st.download_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() {
                        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        let ext = path.extension().unwrap_or_default().to_string_lossy().to_string();
                        files.push(json!({
                            "name": name,
                            "size_bytes": size,
                            "extension": ext
                        }));
                    }
                }
            }
            ("200 OK", "application/json", serde_json::to_string(&files).unwrap_or_default())
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
                    name: format!("{} (Remix)", query),
                    uri: "spotify:track:4cOdK2wGLETKBW3PvgPWqT".to_string(),
                    duration_ms: 215000,
                    artists: vec![],
                    album: None,
                }
            ];
            ("200 OK", "application/json", serde_json::to_string(&mock_tracks).unwrap_or_default())
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
