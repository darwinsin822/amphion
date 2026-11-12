use crate::cdp::CdpSession;
use anyhow::Result;
use serde_json::json;
use std::sync::Arc;

pub const ADBLOCK_WARNING: &str = 
    "⚠️ ADVERTENCIA OBLIGATORIA: El bloqueo de publicidad viola los Términos de Servicio de Spotify. \
    Spotify puede detectar este comportamiento y suspender o cancelar tu cuenta. \
    Este módulo se entrega desactivado por defecto bajo tu entera responsabilidad.";

pub struct AdBlockManager {
    pub enabled: bool,
    cdp: Option<Arc<CdpSession>>,
}

impl AdBlockManager {
    pub fn new(cdp: Option<Arc<CdpSession>>) -> Self {
        Self {
            enabled: false, // Regla de oro: apagado por defecto
            cdp,
        }
    }

    pub fn set_cdp(&mut self, cdp: Arc<CdpSession>) {
        self.cdp = Some(cdp);
    }

    pub async fn set_enabled(&mut self, enable: bool) -> Result<bool> {
        self.enabled = enable;

        if let Some(ref cdp) = self.cdp {
            if enable {
                println!("{}", ADBLOCK_WARNING);
                // Bloquear dominios conocidos de publicidad vía CDP Network.setBlockedURLs
                let blocked_patterns = json!({
                    "urls": [
                        "*pubads.g.doubleclick.net*",
                        "*securepubads.g.doubleclick.net*",
                        "*pagead2.googlesyndication.com*",
                        "*video-ak.mp4.spotify.com*",
                        "*audio-ak-spotify-com.akamaized.net/ads/*",
                        "*spclient.wg.spotify.com/ad-logic/*"
                    ]
                });
                cdp.call("Network.setBlockedURLs", blocked_patterns).await?;
                println!("🛡️ Bloqueador de anuncios de MintPlayer activado.");
            } else {
                cdp.call("Network.setBlockedURLs", json!({ "urls": [] })).await?;
                println!("🛡️ Bloqueador de anuncios de MintPlayer desactivado.");
            }
        }

        Ok(self.enabled)
    }

    pub async fn handle_player_state(&self, state: &serde_json::Value) -> Result<bool> {
        if !self.enabled {
            return Ok(false);
        }

        // Detección: si el Web Player reporta que está reproduciendo un anuncio
        let is_ad = state.get("item")
            .and_then(|it| it.get("type"))
            .and_then(|t| t.as_str())
            .map(|s| s == "ad")
            .unwrap_or(false)
            || state.get("currently_playing_type")
                .and_then(|t| t.as_str())
                .map(|s| s == "ad")
                .unwrap_or(false);

        if is_ad {
            println!("⚡ Anuncio de audio detectado. Silenciando y saltando a la siguiente pista...");
            if let Some(ref cdp) = self.cdp {
                // Silenciar y ordenar skip
                let _ = cdp.evaluate("window.MintPlayer && window.MintPlayer.next()", false).await;
            }
            return Ok(true);
        }

        Ok(false)
    }
}
