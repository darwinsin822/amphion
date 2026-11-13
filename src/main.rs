mod adblock;
mod api;
mod cdp;
mod extensions;
mod queue;
mod server;
mod storage;

use anyhow::Result;
use cdp::{find_or_create_spotify_tab, CdpSession, ChromeProcess};
use extensions::ExtensionManager;
use queue::QueueManager;
use server::{run_server, AppState};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Mutex;

const BRIDGE_JS: &str = include_str!("bridge.js");

#[tokio::main]
async fn main() -> Result<()> {
    println!("🎵 MintPlayer v0.3.0 — Web App Wrapper de Spotify para Linux Mint Cinnamon");
    println!("=========================================================================");

    let args: Vec<String> = std::env::args().collect();
    let _is_login_mode = args.iter().any(|a| a == "--login" || a == "-l");
    let is_daemon = args.iter().any(|a| a == "--daemon" || a == "-d");

    let queue = Arc::new(Mutex::new(QueueManager::new()));
    let mut ext_mgr = ExtensionManager::new();
    let _ = ext_mgr.load_all();
    let extensions = Arc::new(Mutex::new(ext_mgr));

    let home = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let download_dir = format!("{}/Descargas/Spotify", home);
    let _ = std::fs::create_dir_all(&download_dir);

    let app_state = Arc::new(Mutex::new(AppState {
        api: None,
        cdp: None,
        queue: Arc::clone(&queue),
        extensions: Arc::clone(&extensions),
        is_playing: false,
        adblock_enabled: false,
        prefer_flac_flag: false,
        download_dir,
        download_semaphore: Arc::new(tokio::sync::Semaphore::new(2)),
    }));

    // Iniciar servidor web local en puerto 4567
    let server_state = Arc::clone(&app_state);
    tokio::spawn(async move {
        let _ = run_server(4567, server_state).await;
    });

    let cdp_port = 9222;
    let headless = is_daemon;

    println!("🚀 [1/3] Iniciando Web Player oficial de Spotify (headless: {}, puerto: {})...", headless, cdp_port);
    let _chrome = ChromeProcess::spawn(cdp_port, headless)?;

    tokio::time::sleep(Duration::from_secs(2)).await;

    println!("🔍 [2/3] Conectando con la pestaña del Web Player de Spotify...");
    let ws_url = find_or_create_spotify_tab(cdp_port).await?;
    println!("✅ Enlazado por CDP: {}", ws_url);

    let session = CdpSession::connect(&ws_url).await?;
    println!("💉 [3/3] Inyectando puente Web Player y Gestor de Extensiones MintPlayer...");
    session.evaluate(BRIDGE_JS, false).await?;

    {
        let mut st = app_state.lock().await;
        st.cdp = Some(Arc::clone(&session));
    }

    // Comprobar token en bucle corto
    for _i in 1..=5 {
        tokio::time::sleep(Duration::from_millis(800)).await;
        let token_eval = session.evaluate(
            "window.MintPlayer && window.MintPlayer.getToken ? window.MintPlayer.getToken() : null",
            true
        ).await;

        if let Ok(val) = token_eval {
            if let Some(obj) = val.get("value") {
                if let Some(token) = obj.get("accessToken").and_then(|t| t.as_str()) {
                    let is_anon = obj.get("isAnonymous").and_then(|a| a.as_bool()).unwrap_or(true);
                    println!("🔑 Token detectado: {}...{} (Anónimo: {})", &token[..8], &token[token.len()-4..], is_anon);
                    let mut st = app_state.lock().await;
                    st.api = Some(api::SpotifyApi::new(token.to_string()));
                    break;
                }
            }
        }
    }

    println!("\n🖥️ Web Player oficial de Spotify cargado con éxito.");
    println!("🧩 Gestor de Extensiones inyectado (YouTube primario, FLAC secundario).");
    println!("🌐 Servicio auxiliar de descargas activo en: http://127.0.0.1:4567");


    println!("🎶 MintPlayer activo. Presiona Ctrl+C para salir.");
    tokio::signal::ctrl_c().await?;
    println!("\nCerrando MintPlayer...");

    Ok(())
}
