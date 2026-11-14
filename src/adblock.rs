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

}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn toggle_without_cdp_updates_state() {
        let mut manager = AdBlockManager::new(None);
        assert!(!manager.enabled, "Debe iniciar apagado por defecto");
        assert!(manager.set_enabled(true).await.unwrap());
        assert!(manager.enabled);
        assert!(!manager.set_enabled(false).await.unwrap());
        assert!(!manager.enabled);
    }
}
