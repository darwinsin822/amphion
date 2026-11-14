use crate::api::{SpotifyApi, TrackItem};
use crate::cdp::CdpSession;
use crate::extensions::ExtensionManager;
use crate::queue::QueueManager;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
use tokio::net::{TcpListener, TcpStream};
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
    pub progress: f32,
    pub error: Option<String>,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchTrackItem {
    pub name: String,
    pub artist: String,
    pub track_number: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchDownloadRequest {
    pub context_type: Option<String>, // "playlist", "album", "artist"
    pub context_name: Option<String>,
    pub artist_name: Option<String>,
    pub tracks: Vec<BatchTrackItem>,
}

pub struct AppState {
    pub api: Option<SpotifyApi>,
    pub cdp: Option<Arc<CdpSession>>,
    pub queue: Arc<Mutex<QueueManager>>,
    pub extensions: Arc<Mutex<ExtensionManager>>,
    pub is_playing: bool,
    pub adblock: Arc<Mutex<crate::adblock::AdBlockManager>>,
    pub download_dir: String,
    pub download_semaphore: Arc<Semaphore>,
    pub download_tracker: Arc<Mutex<HashMap<String, TrackDownloadState>>>,
    pub disk_cache: DiskCache,
}

/// Cache en memoria del índice de descargas (TTL 2 s).
pub type DiskCache = Arc<Mutex<Option<(Instant, Vec<DownloadedFile>)>>>;

#[derive(Debug, Clone, Serialize)]
pub struct DownloadedFile {
    pub name: String,
    pub stem: String,
    pub path: String,
    pub size_bytes: u64,
    pub extension: String,
}

/// Recorre la carpeta de descargas una sola vez y devuelve metadatos de audio.
fn scan_downloads(dir: &str) -> Vec<DownloadedFile> {
    fn walk(path: &Path, out: &mut Vec<DownloadedFile>) {
        let Ok(entries) = std::fs::read_dir(path) else { return };
        for entry in entries.flatten() {
            let p = entry.path();
            if p.is_file() {
                let ext = p
                    .extension()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_lowercase();
                if AUDIO_EXTENSIONS.contains(&ext.as_str()) {
                    let name = p
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    let stem = p
                        .file_stem()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    out.push(DownloadedFile {
                        name,
                        stem,
                        path: p.to_string_lossy().to_string(),
                        size_bytes: entry.metadata().map(|m| m.len()).unwrap_or(0),
                        extension: ext,
                    });
                }
            } else if p.is_dir() {
                walk(&p, out);
            }
        }
    }

    let mut files = Vec::new();
    walk(Path::new(dir), &mut files);
    files
}

/// Cache de 2 s del índice en disco: la UI consulta el estado cada 1-4 s.
async fn list_downloads_cached(dir: &str, cache: &DiskCache) -> Vec<DownloadedFile> {
    {
        let guard = cache.lock().await;
        if let Some((at, files)) = guard.as_ref() {
            if at.elapsed() < Duration::from_secs(2) {
                return files.clone();
            }
        }
    }

    let dir_owned = dir.to_string();
    let files = tokio::task::spawn_blocking(move || scan_downloads(&dir_owned))
        .await
        .unwrap_or_default();

    *cache.lock().await = Some((Instant::now(), files.clone()));
    files
}

pub async fn run_server(port: u16, state: Arc<Mutex<AppState>>) -> Result<()> {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port)).await?;
    println!("🌐 Servidor de interfaz MintPlayer activo en http://127.0.0.1:{}", port);

    while let Ok((mut socket, _)) = listener.accept().await {
        let state_clone = Arc::clone(&state);
        tokio::spawn(async move {
            if let Some(req_str) = read_http_request(&mut socket).await {
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

// ============================================================================
// MOTOR DE DESCARGA — ÚNICA FUENTE: YOUTUBE (yt-dlp + FFmpeg)
// Calidad fija MP3 320 kbps, equivalente a Spotify Premium.
// ============================================================================

const AUDIO_EXTENSIONS: [&str; 5] = ["mp3", "flac", "m4a", "ogg", "opus"];

pub fn build_ytdlp_args(query: &str, out_tmpl: &str) -> Vec<String> {
    vec![
        // Cliente por defecto de yt-dlp: expone las pistas de audio reales
        // (140/251). Forzar "android" degradaba a video 360p (formato 18).
        "--concurrent-fragments".into(),
        "4".into(),
        "--no-warnings".into(),
        "--no-playlist".into(),
        "--newline".into(),
        "--progress-template".into(),
        "download:%(progress._percent_str)s".into(),
        "--buffer-size".into(),
        "1M".into(),
        "--retries".into(),
        "5".into(),
        "--fragment-retries".into(),
        "5".into(),
        // Mejor pista de audio disponible y transcodificación a MP3 CBR 320 kbps.
        "-f".into(),
        "bestaudio/best".into(),
        "-x".into(),
        "--audio-format".into(),
        "mp3".into(),
        "--audio-quality".into(),
        "320K".into(),
        // Metadatos y carátula incrustados, como una pista descargada de Spotify.
        "--embed-metadata".into(),
        "--embed-thumbnail".into(),
        "--convert-thumbnails".into(),
        "jpg".into(),
        "--no-mtime".into(),
        "-o".into(),
        out_tmpl.into(),
        query.into(),
    ]
}

fn find_existing_audio(dir: &str, stem: &str) -> Option<String> {
    let entries = std::fs::read_dir(dir).ok()?;
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = path
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_lowercase();
        if !AUDIO_EXTENSIONS.contains(&ext.as_str()) {
            continue;
        }
        if path.file_stem().map(|s| s == std::ffi::OsStr::new(stem)).unwrap_or(false) {
            return Some(path.to_string_lossy().to_string());
        }
    }
    None
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

async fn set_track_state(
    tracker: &Arc<Mutex<HashMap<String, TrackDownloadState>>>,
    key: &str,
    status: &str,
    progress: f32,
    file_path: Option<String>,
    error: Option<String>,
) {
    let mut trk = tracker.lock().await;
    if let Some(entry) = trk.get_mut(key) {
        entry.status = status.to_string();
        entry.progress = progress;
        entry.updated_at = now_secs();
        if file_path.is_some() {
            entry.file_path = file_path;
        }
        if error.is_some() {
            entry.error = error;
        }
    }
}

/// Extrae el porcentaje de una línea de progreso de yt-dlp.
pub fn parse_progress_line(line: &str) -> Option<f32> {
    let raw = line.trim().strip_prefix("download:").unwrap_or(line.trim()).trim();
    let num = raw.strip_suffix('%')?.trim();
    num.parse::<f32>().ok().map(|p| p.clamp(0.0, 100.0))
}

/// Descarga una pista desde YouTube manteniendo estado real (cola, progreso,
/// completado o fallido) para que la interfaz Premium pinte el badge correcto.
fn trigger_youtube_download(
    track_name: &str,
    artist: &str,
    target_dir: &str,
    target_filename: &str,
    sem: Arc<Semaphore>,
    tracker: Arc<Mutex<HashMap<String, TrackDownloadState>>>,
) {
    let t_name = track_name.to_string();
    let a_name = artist.to_string();
    let dir = target_dir.to_string();
    let file = target_filename.to_string();
    let key = normalize_track_key(&a_name, &t_name);

    tokio::spawn(async move {
        // Evitar duplicar el mismo trabajo si ya está en curso.
        {
            let trk = tracker.lock().await;
            if let Some(entry) = trk.get(&key) {
                if entry.status == "queued" || entry.status == "downloading" {
                    return;
                }
            }
        }

        {
            let mut trk = tracker.lock().await;
            trk.insert(
                key.clone(),
                TrackDownloadState {
                    key: key.clone(),
                    artist: a_name.clone(),
                    title: t_name.clone(),
                    status: "queued".to_string(),
                    file_path: None,
                    progress: 0.0,
                    error: None,
                    updated_at: now_secs(),
                },
            );
        }

        let Ok(_permit) = sem.acquire().await else { return; };

        if tokio::fs::create_dir_all(&dir).await.is_err() {
            set_track_state(&tracker, &key, "failed", 0.0, None, Some("No se pudo crear la carpeta destino".into())).await;
            return;
        }

        // Si el archivo ya existe en disco, no se vuelve a descargar.
        if let Some(existing) = find_existing_audio(&dir, &file) {
            set_track_state(&tracker, &key, "completed", 100.0, Some(existing), None).await;
            return;
        }

        set_track_state(&tracker, &key, "downloading", 0.0, None, None).await;

        let ytdlp_path = find_ytdlp_binary();
        let query = format!("ytsearch1:{} {} audio", t_name, a_name);
        let out_tmpl = format!("{}/{}.%(ext)s", dir, file);
        let args = build_ytdlp_args(&query, &out_tmpl);

        let mut cmd = tokio::process::Command::new(ytdlp_path);
        cmd.args(&args)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                set_track_state(&tracker, &key, "failed", 0.0, None, Some(format!("No se pudo ejecutar yt-dlp: {}", e))).await;
                return;
            }
        };

        // Progreso real leído del stdout de yt-dlp.
        let stdout = child.stdout.take();
        let progress_tracker = Arc::clone(&tracker);
        let progress_key = key.clone();
        let progress_task = tokio::spawn(async move {
            if let Some(out) = stdout {
                let mut lines = BufReader::new(out).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    // yt-dlp puede emitir "download: 42.3%" o simplemente " 42.3%".
                    if let Some(pct) = parse_progress_line(&line) {
                        let mut trk = progress_tracker.lock().await;
                        if let Some(entry) = trk.get_mut(&progress_key) {
                            entry.progress = pct.clamp(0.0, 99.0);
                            entry.updated_at = now_secs();
                        }
                    }
                }
            }
        });

        // stderr se drena para evitar bloqueos y conservar el último error.
        let stderr = child.stderr.take();
        let stderr_task = tokio::spawn(async move {
            let mut last = String::new();
            if let Some(err) = stderr {
                let mut lines = BufReader::new(err).lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    let l = line.trim();
                    if !l.is_empty() {
                        last = l.chars().take(300).collect();
                    }
                }
            }
            last
        });

        let status = child.wait().await;
        let _ = progress_task.await;
        let err_detail = stderr_task.await.unwrap_or_default();
        let success = status.map(|s| s.success()).unwrap_or(false);

        let mut saved = None;
        if success {
            saved = find_existing_audio(&dir, &file);
        }

        match saved {
            Some(path) => {
                println!("✅ [YouTube 320k] {} - {} → {}", a_name, t_name, path);
                set_track_state(&tracker, &key, "completed", 100.0, Some(path), None).await;
            }
            None => {
                let msg = if err_detail.is_empty() {
                    "yt-dlp no generó el archivo de audio".to_string()
                } else {
                    err_detail
                };
                println!("❌ [YouTube 320k] {} - {}: {}", a_name, t_name, msg);
                set_track_state(&tracker, &key, "failed", 0.0, None, Some(msg)).await;
            }
        }
    });
}

/// Lee la petición completa respetando Content-Length. Necesario para lotes
/// grandes de canciones (una sola lectura de 16 KB truncaba el JSON).
async fn read_http_request(socket: &mut TcpStream) -> Option<String> {
    let mut data: Vec<u8> = Vec::new();
    let mut buf = [0u8; 8192];
    loop {
        let n = socket.read(&mut buf).await.ok()?;
        if n == 0 {
            break;
        }
        data.extend_from_slice(&buf[..n]);
        if data.len() > 8 * 1024 * 1024 {
            break;
        }
        if let Some(pos) = data.windows(4).position(|w| w == b"\r\n\r\n") {
            let header_end = pos + 4;
            let headers = String::from_utf8_lossy(&data[..header_end]).to_lowercase();
            let content_length = headers
                .lines()
                .find_map(|l| l.strip_prefix("content-length:").map(|v| v.trim()))
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
                "download_dir": st.download_dir,
                "user": {
                    "display_name": "Darwin Pinargote Franco",
                    "product": "Free (Bypass CDP Activo)"
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

        ("POST", "/api/download") => {
            let body = extract_body(req);
            let st = state.lock().await;
            let ext_mgr = st.extensions.lock().await;

            let (track_name, artist, album, track_num) = if let Ok(v) = serde_json::from_str::<serde_json::Value>(&body) {
                let t = v.get("track").and_then(|x| x.as_str()).unwrap_or("Canción desconocida");
                let a = v.get("artist").and_then(|x| x.as_str()).unwrap_or("Artista desconocido");
                let alb = v.get("album").and_then(|x| x.as_str()).filter(|s| !s.is_empty()).map(|s| s.to_string());
                let num = v.get("track_number").and_then(|x| x.as_u64()).map(|n| n as u32);
                (t.to_string(), a.to_string(), alb, num)
            } else {
                ("Canción desconocida".to_string(), "Artista desconocido".to_string(), None, None)
            };

            let download_meta = ext_mgr.resolve_download(&track_name, &artist);
            let base_dir = st.download_dir.clone();
            let sem = Arc::clone(&st.download_semaphore);
            let tracker = Arc::clone(&st.download_tracker);

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

            trigger_youtube_download(&track_name, &artist, &target_dir, &filename, sem, tracker);

            let result = json!({
                "status": "queued",
                "message": format!("Descarga YouTube 320 kbps iniciada hacia {}", target_dir),
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

                let sub_folder = match (batch.context_type.as_deref(), &batch.context_name, &batch.artist_name) {
                    (Some("playlist"), Some(cname), _) => format!("{}/Playlists/{}", base_dir, sanitize(cname)),
                    (Some("album"), Some(cname), Some(aname)) => format!("{}/{}/{}", base_dir, sanitize(aname), sanitize(cname)),
                    (Some("artist"), _, Some(aname)) => format!("{}/{}/Top Canciones", base_dir, sanitize(aname)),
                    _ => format!("{}/Lotes", base_dir),
                };

                // Deduplicar por artista+título dentro del mismo lote.
                let mut seen = std::collections::HashSet::new();
                let mut queued = 0usize;
                for (idx, t) in batch.tracks.into_iter().enumerate() {
                    let key = normalize_track_key(&t.artist, &t.name);
                    if !seen.insert(key) {
                        continue;
                    }
                    let t_num = t.track_number.unwrap_or((idx + 1) as u32);
                    let file_name = format!("{:02} - {} - {}", t_num, sanitize(&t.artist), sanitize(&t.name));
                    trigger_youtube_download(
                        &t.name,
                        &t.artist,
                        &sub_folder,
                        &file_name,
                        Arc::clone(&sem),
                        Arc::clone(&tracker),
                    );
                    queued += 1;
                }

                let res = json!({
                    "status": "queued",
                    "queued_tracks": queued,
                    "target_dir": sub_folder,
                    "message": format!("Se encolaron {} pistas para descarga YouTube 320 kbps.", queued)
                });

                return ("200 OK", "application/json", res.to_string());
            }

            ("400 Bad Request", "application/json", json!({ "error": "Formato de lote inválido" }).to_string())
        }

        ("GET", "/api/downloads/state") => {
            let (download_dir, cache) = {
                let st = state.lock().await;
                (st.download_dir.clone(), Arc::clone(&st.disk_cache))
            };

            let files = list_downloads_cached(&download_dir, &cache).await;

            let st = state.lock().await;
            let tracker = st.download_tracker.lock().await;

            let mut active = serde_json::Map::new();
            let mut completed_keys = Vec::new();
            let mut failed = serde_json::Map::new();

            for (k, v) in tracker.iter() {
                match v.status.as_str() {
                    "completed" => completed_keys.push(k.clone()),
                    "failed" => {
                        failed.insert(k.clone(), json!({
                            "artist": v.artist,
                            "title": v.title,
                            "error": v.error.clone().unwrap_or_else(|| "Error desconocido".to_string()),
                            "updated_at": v.updated_at
                        }));
                    }
                    "queued" | "downloading" => {
                        active.insert(k.clone(), json!({
                            "artist": v.artist,
                            "title": v.title,
                            "status": v.status,
                            "progress": v.progress,
                            "updated_at": v.updated_at
                        }));
                    }
                    _ => {}
                }
            }

            let disk_files: Vec<String> = files.iter().map(|f| f.stem.clone()).collect();

            let res = json!({
                "active": active,
                "completed_keys": completed_keys,
                "failed": failed,
                "disk_files": disk_files,
                "download_dir": download_dir
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
            let (download_dir, cache) = {
                let st = state.lock().await;
                (st.download_dir.clone(), Arc::clone(&st.disk_cache))
            };

            let files = list_downloads_cached(&download_dir, &cache).await;
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
                    let uri = serde_json::to_string(&track.uri).unwrap_or_else(|_| "\"\"".to_string());
                    let script = format!("window.MintPlayer && window.MintPlayer.play({})", uri);
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
                    let uri = serde_json::to_string(&track.uri).unwrap_or_else(|_| "\"\"".to_string());
                    let script = format!("window.MintPlayer && window.MintPlayer.play({})", uri);
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
    fn test_build_ytdlp_args_premium_quality() {
        let query = "ytsearch1:Olvídala Binomio de Oro audio";
        let out_tmpl = "/home/user/Descargas/Spotify/test.%(ext)s";
        let args = build_ytdlp_args(query, out_tmpl);

        // Multihilos de fragmentos
        assert!(args.contains(&"--concurrent-fragments".to_string()));
        assert!(args.contains(&"4".to_string()));

        // Mejor audio disponible (Spotify Premium: 320 kbps)
        assert!(args.contains(&"-f".to_string()));
        assert!(args.contains(&"bestaudio/best".to_string()));

        // Conversión a MP3 320 kbps + metadatos/carátula incrustados
        assert!(args.contains(&"-x".to_string()));
        assert!(args.contains(&"--audio-format".to_string()));
        assert!(args.contains(&"mp3".to_string()));
        assert!(args.contains(&"--audio-quality".to_string()));
        assert!(args.contains(&"320K".to_string()));
        assert!(args.contains(&"--embed-metadata".to_string()));
        assert!(args.contains(&"--embed-thumbnail".to_string()));

        // Progreso en tiempo real para la interfaz Premium
        assert!(args.contains(&"--newline".to_string()));
        assert!(args.contains(&"--progress-template".to_string()));

        // Plantilla de salida y consulta
        assert_eq!(args[args.len() - 2], out_tmpl);
        assert_eq!(args[args.len() - 1], query);
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
            progress: 0.0,
            error: None,
            updated_at: 1000,
        };

        assert_eq!(state.status, "queued");
        assert!(state.file_path.is_none());

        // Simular progreso real de descarga
        state.status = "downloading".to_string();
        state.progress = 42.5;
        state.updated_at = 1005;
        assert_eq!(state.progress, 42.5);

        // Simular éxito de descarga
        state.status = "completed".to_string();
        state.progress = 100.0;
        state.file_path = Some("/home/user/Descargas/Spotify/Menudo - Súbete a Mi Moto.mp3".to_string());
        state.updated_at = 1010;
        assert_eq!(state.status, "completed");
        assert!(state.file_path.is_some());

        // Validar serialización JSON
        let json_val = serde_json::to_value(&state).expect("Serialización fallida");
        assert_eq!(json_val["status"], "completed");
        assert_eq!(json_val["key"], key);
        assert_eq!(json_val["progress"], 100.0);
    }

    #[test]
    fn test_parse_progress_line() {
        assert_eq!(parse_progress_line(" 42.3%"), Some(42.3));
        assert_eq!(parse_progress_line("download: 87.5%"), Some(87.5));
        assert_eq!(parse_progress_line("100.0%"), Some(100.0));
        assert_eq!(parse_progress_line("150%"), Some(100.0));
        assert_eq!(parse_progress_line("[download] Destination: x.mp3"), None);
        assert_eq!(parse_progress_line(""), None);
    }

    #[test]
    fn test_sanitize_prevents_path_traversal() {
        assert_eq!(sanitize("../../../etc/passwd"), "___etc_passwd");
        assert_eq!(sanitize("AC/DC: Back in Black?"), "AC_DC_ Back in Black_");
        assert_eq!(sanitize("   "), "Desconocido");
    }

    #[test]
    fn test_find_existing_audio_detects_downloaded_track() {
        let dir = std::env::temp_dir().join(format!("amphion-test-{}", std::process::id()));
        let _ = std::fs::create_dir_all(&dir);
        let file = dir.join("Binomio de Oro - Olvídala.mp3");
        std::fs::write(&file, b"fake-audio").unwrap();

        let found = find_existing_audio(&dir.to_string_lossy(), "Binomio de Oro - Olvídala");
        assert_eq!(found.as_deref(), Some(file.to_string_lossy().as_ref()));

        assert!(find_existing_audio(&dir.to_string_lossy(), "Otra canción").is_none());
        let _ = std::fs::remove_dir_all(&dir);
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
                    "track_number": 1
                },
                {
                    "name": "Me Parte El Corazón",
                    "artist": "Daniel Calderón",
                    "track_number": 2
                }
            ]
        }"#;

        let req: BatchDownloadRequest = serde_json::from_str(payload).expect("Parseo de JSON batch fallido");
        assert_eq!(req.context_type.as_deref(), Some("playlist"));
        assert_eq!(req.context_name.as_deref(), Some("Vallenatos Virales"));
        assert_eq!(req.tracks.len(), 2);
        assert_eq!(req.tracks[0].name, "Ayer Y Hoy");
        assert_eq!(req.tracks[0].track_number, Some(1));
        assert_eq!(req.tracks[1].artist, "Daniel Calderón");
    }
}
