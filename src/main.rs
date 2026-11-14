mod cdp;

use anyhow::Result;
use cdp::{find_or_create_spotify_tab, CdpSession, ChromeProcess};
use serde_json::json;
use std::sync::Arc;
use std::time::Duration;

const BRIDGE_JS: &str = include_str!("bridge.js");

/// Endpoints de publicidad que el Web Player no necesita para reproducir música.
const AD_URL_PATTERNS: &[&str] = &[
    "*spclient.wg.spotify.com/ad-logic*",
    "*spclient.wg.spotify.com/ads/*",
    "*spclient.wg.spotify.com/gabo-receiver-service*",
    "*adeventtracker.spotify.com*",
    "*ads-fa.spotify.com*",
    "*audio-ak-spotify-com.akamaized.net/ads*",
    "*audio4-ak-spotify-com.akamaized.net/ads*",
    "*pagead2.googlesyndication.com*",
    "*securepubads.g.doubleclick.net*",
    "*pubads.g.doubleclick.net*",
    "*doubleclick.net*",
];

async fn enable_adblock(session: &CdpSession) {
    match session.call("Network.setBlockedURLs", json!({ "urls": AD_URL_PATTERNS })).await {
        Ok(_) => println!("🛡️ Bloqueo de anuncios activo (CDN y ad-logic)."),
        Err(e) => println!("⚠️ No se pudo activar el bloqueo de anuncios: {}", e),
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    println!("🏛️ Amphion v0.6.3 — Streaming puro sobre el Web Player de Spotify");
    println!("=====================================================================");

    let args: Vec<String> = std::env::args().collect();
    let headless = args.iter().any(|a| a == "--daemon" || a == "-d");
    let cdp_port = 9222;

    println!("🚀 [1/3] Abriendo el Web Player oficial de Spotify (headless: {})...", headless);
    let _chrome = ChromeProcess::spawn(cdp_port, headless)?;
    tokio::time::sleep(Duration::from_secs(2)).await;

    println!("🔍 [2/3] Conectando por CDP con la pestaña de Spotify...");
    let ws_url = find_or_create_spotify_tab(cdp_port).await?;
    let session = CdpSession::connect(&ws_url).await?;

    println!("💉 [3/3] Inyectando la capa Amphion Premium...");
    session.evaluate(BRIDGE_JS, false).await?;
    enable_adblock(&session).await;

    // Guardián: sobrevive a recargas de la SPA y a la pérdida del WebSocket CDP.
    let mut current = Arc::clone(&session);
    tokio::spawn(async move {
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

            if current.evaluate(BRIDGE_JS, false).await.is_ok() {
                println!("💉 [Guard] Capa Amphion reinyectada en la pestaña actual.");
                continue;
            }

            let Ok(new_ws) = find_or_create_spotify_tab(cdp_port).await else { continue };
            let Ok(new_session) = CdpSession::connect(&new_ws).await else { continue };
            let _ = new_session.evaluate(BRIDGE_JS, false).await;
            enable_adblock(&new_session).await;
            current = new_session;
            println!("🔌 [Guard] CDP reconectado; capa Amphion restaurada.");
        }
    });

    println!("\n🖥️ Spotify Web Player activo con la interfaz Amphion.");
    println!("🎶 Presiona Ctrl+C para cerrar Amphion.");
    tokio::signal::ctrl_c().await?;

    println!("\nCerrando Amphion...");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn adblock_cubre_endpoints_de_publicidad() {
        assert!(AD_URL_PATTERNS.iter().any(|p| p.contains("ad-logic")));
        assert!(AD_URL_PATTERNS.iter().any(|p| p.contains("doubleclick")));
        assert!(AD_URL_PATTERNS.iter().any(|p| p.contains("/ads")));
    }
}
