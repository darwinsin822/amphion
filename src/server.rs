use crate::api::{SpotifyApi, TrackItem};
use crate::cdp::CdpSession;
use crate::extensions::ExtensionManager;
use crate::queue::QueueManager;
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::{Mutex, Semaphore};

const HTML: &str = include_str!("../ui/index.html");
const CSS: &str = include_str!("../ui/style.css");
const JS: &str = include_str!("../ui/app.js");
const LOGO: &str = include_str!("../ui/logo.svg");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackDownloadState {
    pub key: String,
    pub artist: String,
    pub title: String,
    pub status: String, // "queued" | "downloading" | "completed" | "failed"
    pub file_path: Option<String>,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchTrackItem {
    pub name: String,
    pub artist: String,
    pub album: Option<String>,
    pub track_number: Option<u32>,
    pub duration_ms: Option<u64>,
    pub spotify_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchDownloadRequest {
    pub context_type: Option<String>, // "playlist", "album", "artist"
    pub context_name: Option<String>,
    pub artist_name: Option<String>,
    pub prefer_flac: Option<bool>,
    pub tracks: Vec<BatchTrackItem>,
}

pub struct AppState {
    pub api: Option<SpotifyApi>,
    pub cdp: Option<Arc<CdpSession>>,
    pub spotdown_cdp: Arc<Mutex<Option<Arc<CdpSession>>>>,
    pub queue: Arc<Mutex<QueueManager>>,
    pub extensions: Arc<Mutex<ExtensionManager>>,
    pub is_playing: bool,
    pub adblock_enabled: bool,
    pub prefer_flac_flag: bool,
    pub download_dir: String,
    pub download_semaphore: Arc<Semaphore>,
    pub download_tracker: Arc<Mutex<HashMap<String, TrackDownloadState>>>,
}

pub async fn run_server(port: u16, state: Arc<Mutex<AppState>>) -> Result<()> {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    println!("🌐 Servidor de interfaz MintPlayer activo en http://127.0.0.1:{}", port);

    while let Ok((mut socket, _)) = listener.accept().await {
        let state_clone = Arc::clone(&state);
        tokio::spawn(async move {
            let mut buf = [0u8; 16384];
            if let Ok(n) = socket.read(&mut buf).await {
                if n == 0 { return; }
                let req_str = String::from_utf8_lossy(&buf[..n]);
                
                // Extraer cabecera Origin para CORS seguro (mitigando hallazgo crítico de Nexus DeepSeek)
                let origin = req_str.lines()
                    .find(|l| l.to_lowercase().starts_with("origin:"))
                    .and_then(|l| l.split_once(':').map(|x| x.1.trim()))
                    .unwrap_or("");

                let allowed_origin = if origin == "https://open.spotify.com" 
                    || origin.starts_with("http://127.0.0.1") 
                    || origin.starts_with("http://localhost") 
                    || origin.is_empty() {
                    if origin.is_empty() { "*" } else { origin }
                } else {
                    "null"
                };

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

fn sanitize(s: &str) -> String {
    // Mitigación de Path Traversal auditada por Nexus: eliminar secuencias ".." y caracteres prohibidos
    let cleaned = s.replace("..", "")
        .chars()
        .map(|c| if c == '/' || c == '\\' || c == ':' || c == '*' || c == '?' || c == '"' || c == '<' || c == '>' || c == '|' || c == '\0' { '_' } else { c })
        .collect::<String>();
    
    let trimmed = cleaned.trim().trim_matches('.').trim();
    if trimmed.is_empty() {
        "Desconocido".to_string()
    } else {
        trimmed.to_string()
    }
}

fn find_ytdlp_binary() -> String {
    // 1. Probar HOME/.local/bin/yt-dlp
    if let Ok(home) = std::env::var("HOME") {
        let user_bin = std::path::PathBuf::from(home).join(".local/bin/yt-dlp");
        if user_bin.exists() {
            return user_bin.to_string_lossy().to_string();
        }
    }
    // 2. Probar rutas estándar del sistema
    for p in &["/usr/local/bin/yt-dlp", "/usr/bin/yt-dlp", "/bin/yt-dlp"] {
        if std::path::Path::new(p).exists() {
            return p.to_string();
        }
    }
    // 3. Fallback a PATH
    "yt-dlp".to_string()
}

pub fn normalize_track_key(artist: &str, title: &str) -> String {
    let clean = |s: &str| {
        s.to_lowercase()
            .chars()
            .map(|c| if c.is_alphanumeric() { c } else { ' ' })
            .collect::<String>()
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    };
    format!("{}:{}", clean(artist), clean(title))
}

pub fn build_ytdlp_args(
    query: &str,
    out_tmpl: &str,
    prefer_flac: bool,
    fast_mode: bool,
) -> Vec<String> {
    let mut args = Vec::new();
    // Prioritizar cliente Android para evitar throttling y capturar streams de audio directos
    args.push("--extractor-args".to_string());
    args.push("youtube:player_client=android,web".to_string());
    args.push("--concurrent-fragments".to_string());
    args.push("4".to_string());
    args.push("--no-warnings".to_string());
    args.push("--no-playlist".to_string());
    args.push("--buffer-size".to_string());
    args.push("64K".to_string());

    if prefer_flac {
        args.push("-x".to_string());
        args.push("--audio-format".to_string());
        args.push("flac".to_string());
    } else {
        // Modo Ultra Rápido estilo Spotify Premium (priorizar velocidad sobre transcodificación pesada)
        if fast_mode {
            // Seleccionar stream de audio directo optimizado para descarga relámpago (~128-160 kbps)
            args.push("-f".to_string());
            args.push("ba[abr<=160]/ba[ext=m4a]/ba/b".to_string());
            args.push("-x".to_string());
            args.push("--audio-format".to_string());
            args.push("mp3".to_string());
            args.push("--audio-quality".to_string());
            args.push("5".to_string()); // Calidad 5 (130-160kbps): codificación relámpago en CPU <1s
            args.push("--postprocessor-args".to_string());
            args.push("ExtractAudio:-threads 4".to_string());
        } else {
            args.push("-x".to_string());
            args.push("--audio-format".to_string());
            args.push("mp3".to_string());
            args.push("--audio-quality".to_string());
            args.push("0".to_string());
        }
    }

    args.push("-o".to_string());
    args.push(out_tmpl.to_string());
    args.push(query.to_string());

    args
}

async fn download_direct_url(url: &str, out_path: &str) -> Result<()> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(60))
        .build()?;

    let resp = client.get(url).send().await?;
    if !resp.status().is_success() {
        anyhow::bail!("HTTP status {}", resp.status());
    }

    let bytes = resp.bytes().await?;
    if bytes.is_empty() {
        anyhow::bail!("Archivo descargado vacío");
    }

    tokio::fs::write(out_path, &bytes).await?;
    Ok(())
}

async fn try_spotdown_download(
    spotify_url: &str,
    target_dir: &str,
    target_filename: &str,
    spotdown_cdp: Option<Arc<CdpSession>>,
) -> Result<String> {
    let cdp = spotdown_cdp.context("Sesión Spotdown no inicializada")?;
    let js = format!("window.__spotdownResolve ? window.__spotdownResolve('{}') : Promise.resolve({{ success: false, error: 'Resolver no inyectado' }})", spotify_url);
    let val = cdp.evaluate(&js, true).await?;

    let obj = val.get("value").unwrap_or(&val);
    let is_success = obj.get("success").and_then(|s| s.as_bool()).unwrap_or(false);
    if !is_success {
        let err = obj.get("error").and_then(|e| e.as_str()).unwrap_or("Desconocido");
        anyhow::bail!("Spotdown error: {}", err);
    }

    let dl_url = obj.get("downloadUrl").and_then(|u| u.as_str())
        .context("No se obtuvo downloadUrl")?;

    let out_file = format!("{}/{}.mp3", target_dir, target_filename);
    download_direct_url(dl_url, &out_file).await?;
    Ok(out_file)
}

fn trigger_hybrid_download(
    track_name: &str,
    artist: &str,
    target_dir: &str,
    target_filename: &str,
    prefer_flac: bool,
    sem: Arc<Semaphore>,
    tracker: Arc<Mutex<HashMap<String, TrackDownloadState>>>,
    spotify_url: Option<String>,
    spotdown_cdp: Option<Arc<CdpSession>>,
) {
    let t_name = track_name.to_string();
    let a_name = artist.to_string();
    let dir = target_dir.to_string();
    let file = target_filename.to_string();
    let key = normalize_track_key(&a_name, &t_name);

    tokio::spawn(async move {
        let now_ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        // 1. Registrar estado Encolado
        {
            let mut trk = tracker.lock().await;
            trk.insert(key.clone(), TrackDownloadState {
                key: key.clone(),
                artist: a_name.clone(),
                title: t_name.clone(),
                status: "queued".to_string(),
                file_path: None,
                updated_at: now_ts,
            });
        }

        let Ok(_permit) = sem.acquire().await else { return; };

        // 2. Transición a estado Descargando en progreso
        {
            let mut trk = tracker.lock().await;
            if let Some(entry) = trk.get_mut(&key) {
                entry.status = "downloading".to_string();
                entry.updated_at = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
            }
        }

        let _ = tokio::fs::create_dir_all(&dir).await;
        let mut final_saved_path = None;

        // PRIORIDAD 1: Spotdown CDN directo si no es FLAC y tenemos spotify_url y CDP activo
        if !prefer_flac {
            if let Some(ref sp_url) = spotify_url {
                if let Ok(path) = try_spotdown_download(sp_url, &dir, &file, spotdown_cdp).await {
                    println!("⚡ [Spotdown CDN] Descarga instantánea completada: {} - {}", a_name, t_name);
                    final_saved_path = Some(path);
                }
            }
        }

        // PRIORIDAD 2: Motor Turbo yt-dlp con argumentos de alta velocidad (Fallback transparente)
        if final_saved_path.is_none() {
            let ytdlp_path = find_ytdlp_binary();
            let query = format!("ytsearch1:{} {} audio", t_name, a_name);
            let audio_format = if prefer_flac { "flac" } else { "mp3" };
            let out_tmpl = format!("{}/{}.%(ext)s", dir, file);

            let args = build_ytdlp_args(&query, &out_tmpl, prefer_flac, true);

            let mut cmd = tokio::process::Command::new(ytdlp_path);
            for arg in args {
                cmd.arg(arg);
            }

            let status = cmd.status().await;
            if status.map(|s| s.success()).unwrap_or(false) {
                let candidate = format!("{}/{}.{}", dir, file, audio_format);
                if std::path::Path::new(&candidate).exists() {
                    final_saved_path = Some(candidate);
                } else if let Ok(mut entries) = tokio::fs::read_dir(&dir).await {
                    while let Ok(Some(entry)) = entries.next_entry().await {
                        let p = entry.path();
                        if let Some(stem) = p.file_stem() {
                            if stem == std::ffi::OsStr::new(&file) {
                                final_saved_path = Some(p.to_string_lossy().to_string());
                                break;
                            }
                        }
                    }
                }
            }
        }

        // 3. Registrar estado Completado (visto) o Fallido
        {
            let mut trk = tracker.lock().await;
            if let Some(entry) = trk.get_mut(&key) {
                if let Some(p) = final_saved_path {
                    entry.status = "completed".to_string();
                    entry.file_path = Some(p);
                } else {
                    entry.status = "failed".to_string();
                }
                entry.updated_at = std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
            }
        }
    });
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

            let (track_name, artist, album, track_num, prefer_flac, sp_url) = if let Ok(v) = serde_json::from_str::<serde_json::Value>(&body) {
                let t = v.get("track").and_then(|x| x.as_str()).unwrap_or("Zapateando Juyayay");
                let a = v.get("artist").and_then(|x| x.as_str()).unwrap_or("Jayac");
                let alb = v.get("album").and_then(|x| x.as_str()).map(|s| s.to_string());
                let num = v.get("track_number").and_then(|x| x.as_u64()).map(|n| n as u32);
                let flac = v.get("prefer_flac").and_then(|x| x.as_bool()).unwrap_or(st.prefer_flac_flag);
                let url = v.get("spotify_url").and_then(|x| x.as_str()).map(|s| s.to_string());
                (t.to_string(), a.to_string(), alb, num, flac, url)
            } else {
                ("Zapateando Juyayay".to_string(), "Jayac".to_string(), None, None, st.prefer_flac_flag, None)
            };

            let download_meta = ext_mgr.resolve_download(&track_name, &artist, prefer_flac);
            let base_dir = st.download_dir.clone();
            let sem = Arc::clone(&st.download_semaphore);
            let tracker = Arc::clone(&st.download_tracker);
            let spotdown_cdp = st.spotdown_cdp.lock().await.clone();

            let (target_dir, filename) = match (&album, track_num) {
                (Some(alb), Some(num)) => (
                    format!("{}/{}/{}", base_dir, sanitize(&artist), sanitize(alb)),
                    format!("{:02} - {}", num, sanitize(&track_name))
                ),
                (Some(alb), None) => (
                    format!("{}/{}/{}", base_dir, sanitize(&artist), sanitize(alb)),
                    sanitize(&track_name)
                ),
                _ => (
                    base_dir.clone(),
                    format!("{} - {}", sanitize(&artist), sanitize(&track_name))
                )
            };

            trigger_hybrid_download(&track_name, &artist, &target_dir, &filename, prefer_flac, sem, tracker, sp_url, spotdown_cdp);

            let result = json!({
                "status": "success",
                "message": format!("Descarga híbrida iniciada hacia {}", target_dir),
                "resolution": download_meta,
                "track": track_name,
                "artist": artist,
                "target_dir": target_dir,
                "filename": filename
            });

            ("200 OK", "application/json", result.to_string())
        }

        ("POST", "/api/download-batch") => {
            let body = extract_body(req);
            let st = state.lock().await;

            if let Ok(batch) = serde_json::from_str::<BatchDownloadRequest>(&body) {
                let base_dir = st.download_dir.clone();
                let sem = Arc::clone(&st.download_semaphore);
                let tracker = Arc::clone(&st.download_tracker);
                let spotdown_cdp = st.spotdown_cdp.lock().await.clone();
                let prefer_flac = batch.prefer_flac.unwrap_or(st.prefer_flac_flag);
                let count = batch.tracks.len();

                let sub_folder = match (batch.context_type.as_deref(), &batch.context_name, &batch.artist_name) {
                    (Some("playlist"), Some(cname), _) => format!("{}/Playlists/{}", base_dir, sanitize(cname)),
                    (Some("album"), Some(cname), Some(aname)) => format!("{}/{}/{}", base_dir, sanitize(aname), sanitize(cname)),
                    (Some("artist"), _, Some(aname)) => format!("{}/{}/Top Canciones", base_dir, sanitize(aname)),
                    _ => format!("{}/Lotes", base_dir),
                };

                for (idx, t) in batch.tracks.into_iter().enumerate() {
                    let sem_clone = Arc::clone(&sem);
                    let tracker_clone = Arc::clone(&tracker);
                    let folder_clone = sub_folder.clone();
                    let spotdown_clone = spotdown_cdp.clone();
                    let t_num = t.track_number.unwrap_or((idx + 1) as u32);
                    let file_name = format!("{:02} - {} - {}", t_num, sanitize(&t.artist), sanitize(&t.name));

                    trigger_hybrid_download(
                        &t.name,
                        &t.artist,
                        &folder_clone,
                        &file_name,
                        prefer_flac,
                        sem_clone,
                        tracker_clone,
                        t.spotify_url,
                        spotdown_clone
                    );
                }

                let res = json!({
                    "status": "queued",
                    "queued_tracks": count,
                    "target_dir": sub_folder,
                    "message": format!("Se encolaron {} pistas para descarga híbrida rápida.", count)
                });

                return ("200 OK", "application/json", res.to_string());
            }

            ("400 Bad Request", "application/json", json!({ "error": "Formato de lote inválido" }).to_string())
        }

        ("GET", "/api/downloads/state") => {
            let st = state.lock().await;
            let tracker = st.download_tracker.lock().await;

            let mut active = serde_json::Map::new();
            let mut completed_keys = Vec::new();

            for (k, v) in tracker.iter() {
                if v.status == "completed" {
                    completed_keys.push(k.clone());
                } else if v.status == "queued" || v.status == "downloading" {
                    active.insert(k.clone(), json!({
                        "artist": v.artist,
                        "title": v.title,
                        "status": v.status,
                        "updated_at": v.updated_at
                    }));
                }
            }

            // Escanear recursivamente archivos descargados existentes en disco
            let mut disk_files = Vec::new();
            fn scan_stems(dir: &std::path::Path, list: &mut Vec<String>) {
                if let Ok(entries) = std::fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            let ext = path.extension().unwrap_or_default().to_string_lossy().to_lowercase();
                            if ext == "mp3" || ext == "flac" || ext == "m4a" || ext == "ogg" || ext == "opus" {
                                if let Some(stem) = path.file_stem() {
                                    list.push(stem.to_string_lossy().to_string());
                                }
                            }
                        } else if path.is_dir() {
                            scan_stems(&path, list);
                        }
                    }
                }
            }
            scan_stems(std::path::Path::new(&st.download_dir), &mut disk_files);

            let res = json!({
                "active": active,
                "completed_keys": completed_keys,
                "disk_files": disk_files,
                "download_dir": st.download_dir
            });

            ("200 OK", "application/json", res.to_string())
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
            
            // Recorrer recursivamente la carpeta de descargas
            fn scan_dir(dir: &std::path::Path, list: &mut Vec<serde_json::Value>) {
                if let Ok(entries) = std::fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() {
                            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                            let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                            let ext = path.extension().unwrap_or_default().to_string_lossy().to_string();
                            list.push(json!({
                                "name": name,
                                "path": path.to_string_lossy(),
                                "size_bytes": size,
                                "extension": ext
                            }));
                        } else if path.is_dir() {
                            scan_dir(&path, list);
                        }
                    }
                }
            }

            scan_dir(std::path::Path::new(&st.download_dir), &mut files);
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_track_key() {
        assert_eq!(
            normalize_track_key("Binomio de Oro", "Olvídala"),
            "binomio de oro:olvídala"
        );
        assert_eq!(
            normalize_track_key("  Daniel Calderón & Los Gigantes ", " Me Parte El Corazón "),
            "daniel calderón los gigantes:me parte el corazón"
        );
        assert_eq!(
            normalize_track_key("Menudo!", "Súbete a Mi Moto (1981)"),
            "menudo:súbete a mi moto 1981"
        );
    }

    #[test]
    fn test_build_ytdlp_args_fast_mode() {
        let query = "ytsearch1:Olvídala Binomio de Oro audio";
        let out_tmpl = "/home/user/Descargas/Spotify/test.%(ext)s";
        let args = build_ytdlp_args(query, out_tmpl, false, true);

        // Validar extractor Android/Web para evitar throttling de YouTube
        assert!(args.contains(&"--extractor-args".to_string()));
        assert!(args.contains(&"youtube:player_client=android,web".to_string()));

        // Validar multihilos de fragmentos
        assert!(args.contains(&"--concurrent-fragments".to_string()));
        assert!(args.contains(&"4".to_string()));

        // Validar selección de stream de audio ligero prioritario (~128k-160k)
        assert!(args.contains(&"-f".to_string()));
        assert!(args.contains(&"ba[abr<=160]/ba[ext=m4a]/ba/b".to_string()));

        // Validar extracción de audio ultra rápida (calidad 5 + LAME 4 threads)
        assert!(args.contains(&"-x".to_string()));
        assert!(args.contains(&"--audio-format".to_string()));
        assert!(args.contains(&"mp3".to_string()));
        assert!(args.contains(&"--audio-quality".to_string()));
        assert!(args.contains(&"5".to_string()));
        assert!(args.contains(&"--postprocessor-args".to_string()));
        assert!(args.contains(&"ExtractAudio:-threads 4".to_string()));

        // Validar plantilla de salida y consulta
        assert_eq!(args[args.len() - 2], out_tmpl);
        assert_eq!(args[args.len() - 1], query);
    }

    #[test]
    fn test_build_ytdlp_args_flac_mode() {
        let query = "ytsearch1:Olvídala Binomio de Oro flac";
        let out_tmpl = "/home/user/Descargas/Spotify/test.%(ext)s";
        let args = build_ytdlp_args(query, out_tmpl, true, false);

        assert!(args.contains(&"-x".to_string()));
        assert!(args.contains(&"--audio-format".to_string()));
        assert!(args.contains(&"flac".to_string()));
        assert!(!args.contains(&"--audio-quality".to_string()));
    }

    #[test]
    fn test_track_download_state_lifecycle() {
        let key = normalize_track_key("Menudo", "Súbete a Mi Moto");
        let mut state = TrackDownloadState {
            key: key.clone(),
            artist: "Menudo".to_string(),
            title: "Súbete a Mi Moto".to_string(),
            status: "queued".to_string(),
            file_path: None,
            updated_at: 1000,
        };

        assert_eq!(state.status, "queued");
        assert!(state.file_path.is_none());

        // Simular inicio de descarga
        state.status = "downloading".to_string();
        state.updated_at = 1005;
        assert_eq!(state.status, "downloading");

        // Simular éxito de descarga
        state.status = "completed".to_string();
        state.file_path = Some("/home/user/Descargas/Spotify/Menudo - Súbete a Mi Moto.mp3".to_string());
        state.updated_at = 1010;
        assert_eq!(state.status, "completed");
        assert!(state.file_path.is_some());

        // Validar serialización JSON
        let json_val = serde_json::to_value(&state).expect("Serialización fallida");
        assert_eq!(json_val["status"], "completed");
        assert_eq!(json_val["key"], key);
    }

    #[test]
    fn test_batch_download_request_parsing() {
        let payload = r#"{
            "context_type": "playlist",
            "context_name": "Vallenatos Virales",
            "artist_name": "Varios Artistas",
            "tracks": [
                {
                    "name": "Ayer Y Hoy",
                    "artist": "La Combinación Vallenata",
                    "track_number": 1,
                    "spotify_url": "https://open.spotify.com/track/12345"
                },
                {
                    "name": "Me Parte El Corazón",
                    "artist": "Daniel Calderón",
                    "track_number": 2,
                    "spotify_url": null
                }
            ]
        }"#;

        let req: BatchDownloadRequest = serde_json::from_str(payload).expect("Parseo de JSON batch fallido");
        assert_eq!(req.context_type.as_deref(), Some("playlist"));
        assert_eq!(req.context_name.as_deref(), Some("Vallenatos Virales"));
        assert_eq!(req.tracks.len(), 2);
        assert_eq!(req.tracks[0].name, "Ayer Y Hoy");
        assert_eq!(req.tracks[0].spotify_url.as_deref(), Some("https://open.spotify.com/track/12345"));
        assert!(req.tracks[1].spotify_url.is_none());
    }
}
