mod cdp;

use anyhow::Result;
use cdp::{ChromeProcess, CdpSession, find_or_create_spotify_tab};
use std::time::Duration;

const BRIDGE_JS: &str = include_str!("bridge.js");

#[tokio::main]
async fn main() -> Result<()> {
    println!("🎵 MintPlayer - Reproductor nativo de Spotify (Linux Mint Cinnamon)");
    println!("==================================================================");

    let args: Vec<String> = std::env::args().collect();
    let is_login_mode = args.iter().any(|a| a == "--login" || a == "-l");

    let port = 9222;
    let headless = !is_login_mode;

    println!("🚀 Iniciando motor Chrome (headless: {}, puerto: {})...", headless, port);
    if is_login_mode {
        println!("💡 Modo Login activo: Chrome se abrirá en pantalla para que inicies sesión.");
    }

    let _chrome = ChromeProcess::spawn(port, headless)?;

    // Esperar brevemente a que el Web Player cargue
    tokio::time::sleep(Duration::from_secs(2)).await;

    println!("🔍 Conectando con la pestaña del Web Player...");
    let ws_url = find_or_create_spotify_tab(port).await?;
    println!("✅ Enlazado por CDP: {}", ws_url);

    let session = CdpSession::connect(&ws_url).await?;
    println!("💉 Inyectando puente MintPlayer (player-bridge)...");

    session.evaluate(BRIDGE_JS, false).await?;

    println!("⏳ Esperando a que el Web Player inicialice sus servicios...");
    let mut authenticated = false;
    for _i in 1..=15 {
        tokio::time::sleep(Duration::from_secs(1)).await;
        let token_eval = session.evaluate(
            "window.MintPlayer && window.MintPlayer.getToken ? window.MintPlayer.getToken() : null",
            true
        ).await;

        if let Ok(val) = token_eval {
            if let Some(obj) = val.get("value") {
                if let Some(token) = obj.get("accessToken").and_then(|t| t.as_str()) {
                    let is_anon = obj.get("isAnonymous").and_then(|a| a.as_bool()).unwrap_or(true);
                    println!("\n🎉 ¡Sesión Web Player detectada!");
                    println!("🔑 Token de acceso: {}...{}", &token[..12], &token[token.len()-6..]);
                    println!("👤 Anónimo: {}", is_anon);

                    if !is_anon {
                        println!("✨ Usuario autenticado correctamente con Spotify.");
                        authenticated = true;
                        break;
                    } else {
                        println!("⚠️ Sesión anónima (aún no iniciaste sesión en Spotify).");
                        println!("👉 Ejecuta 'cargo run -- --login' para iniciar sesión en la ventana de Chrome.");
                        break;
                    }
                }
            }
        }
        print!(".");
        let _ = std::io::Write::flush(&mut std::io::stdout());
    }

    if !authenticated && !is_login_mode {
        println!("\nTip: Si es tu primera vez, ejecuta 'mintplayer --login' para abrir Spotify y autenticarte una sola vez.");
    }

    println!("\nCompuerta Gate 3 (Núcleo CDP): Listo.");
    Ok(())
}
