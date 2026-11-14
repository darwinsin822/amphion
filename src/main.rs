mod adblock;
mod api;
mod cdp;
mod extensions;
mod queue;
mod server;

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
    println!("🏛️ Amphion v0.6.1 — Reproductor Soberano de Spotify para Linux Mint Cinnamon");
    println!("=========================================================================");
    println!("🚀 Modo de Streaming Puro en Alta Fidelidad (320 kbps)");

    let args: Vec<String> = std::env::args().collect();
    let _is_login_mode = args.iter().any(|a| a == "--login" || a == "-l");
    let is_daemon = args.iter().any(|a| a == "--daemon" || a == "-d");

    let queue = Arc::new(Mutex::new(QueueManager::new()));
    let mut ext_mgr = ExtensionManager::new();
    let _ = ext_mgr.load_all();
    let extensions = Arc::new(Mutex::new(ext_mgr));
    let adblock = Arc::new(Mutex::new(adblock::AdBlockManager::new(None)));

    let app_state = Arc::new(Mutex::new(AppState {
        api: None,
        cdp: None,
        queue: Arc::clone(&queue),
        extensions: Arc::clone(&extensions),
        is_playing: false,
        adblock: Arc::clone(&adblock),
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
    println!("💉 [3/3] Inyectando puente Web Player y Gestor de Streaming Amphion...");
    session.evaluate(BRIDGE_JS, false).await?;

    {
        let mut st = app_state.lock().await;
        st.cdp = Some(Arc::clone(&session));
    }
    adblock.lock().await.set_cdp(Arc::clone(&session));

    // Guardián de inyección: sobrevive a recargas completas de la SPA.
    // Si el WebSocket CDP se cierra, reconecta a la pestaña y reinyecta el puente.
    let guard_state = Arc::clone(&app_state);
    let guard_initial = Arc::clone(&session);
    tokio::spawn(async move {
        let mut current = guard_initial;
        loop {
            tokio::time::sleep(Duration::from_secs(3)).await;

            let alive = current
                .evaluate("!!(window.Amphion && window.Amphion.ready)", true)
                .await
                .ok()
                .and_then(|v| v.get("value").and_then(|x| x.as_bool()))
                .unwrap_or(false);

            if alive {
                continue;
            }

            // Primer intento: misma pestaña/sesión.
            if current.evaluate(BRIDGE_JS, false).await.is_ok() {
                println!("💉 [Guard] Puente Amphion reinyectado en la pestaña actual.");
                continue;
            }

            // Segundo intento: reconectar al target de Spotify y reinyectar.
            let Ok(ws_url) = find_or_create_spotify_tab(cdp_port).await else { continue };
            let Ok(new_session) = CdpSession::connect(&ws_url).await else { continue };
            let _ = new_session.evaluate(BRIDGE_JS, false).await;

            {
                let st = guard_state.lock().await;
                st.adblock.lock().await.set_cdp(Arc::clone(&new_session));
            }
            current = Arc::clone(&new_session);
            println!("🔌 [Guard] CDP reconectado y puente Amphion reinyectado.");
        }
    });

    // Comprobar token en bucle corto
    for _i in 1..=5 {
        tokio::time::sleep(Duration::from_millis(800)).await;
        let token_eval = session.evaluate(
            "(window.Amphion || window.MintPlayer) && (window.Amphion || window.MintPlayer).getToken ? (window.Amphion || window.MintPlayer).getToken() : null",
            true
        ).await;

        if let Ok(val) = token_eval {
            if let Some(obj) = val.get("value") {
                if let Some(token) = obj.get("accessToken").and_then(|t| t.as_str()) {
                    let is_anon = obj.get("isAnonymous").and_then(|a| a.as_bool()).unwrap_or(true);
                    let display_token = if token.len() >= 12 {
                        format!("{}...{}", &token[..8], &token[token.len()-4..])
                    } else {
                        "***".to_string()
                    };
                    println!("🔑 Token detectado: {} (Anónimo: {})", display_token, is_anon);
                    let mut st = app_state.lock().await;
                    st.api = Some(api::SpotifyApi::new(token.to_string()));
                    break;
                }
            }
        }
    }

    println!("\n🖥️ Web Player oficial de Spotify cargado con éxito.");
    println!("🎶 Modo Streaming Puro Activo — Sin descargas, máxima ligereza y fluidez.");
    println!("🎶 Amphion activo. Presiona Ctrl+C para salir.");
    tokio::signal::ctrl_c().await?;
    println!("\nCerrando Amphion...");

    Ok(())
}
