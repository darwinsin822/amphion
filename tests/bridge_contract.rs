//! Contrato de la capa Amphion inyectada en el Web Player de Spotify.

const BRIDGE: &str = include_str!("../src/bridge.js");

#[test]
fn capa_amphion_sin_servidor_local() {
    assert!(
        !BRIDGE.contains("127.0.0.1:4567"),
        "La interfaz no debe depender del panel local eliminado"
    );
}

#[test]
fn boton_premium_presente() {
    assert!(BRIDGE.contains("amphion-premium-pill-btn"));
    assert!(BRIDGE.contains("'Premium'"));
}

#[test]
fn barra_de_reproduccion_presente() {
    assert!(BRIDGE.contains("amphion-spotify-premium-toolbar"));
    assert!(BRIDGE.contains("SVG_TOOLBAR_PLAY"));
    assert!(BRIDGE.contains("SVG_TOOLBAR_SHUFFLE"));
}

#[test]
fn sin_modulo_de_descargas() {
    assert!(!BRIDGE.contains("/api/download"));
    assert!(!BRIDGE.contains("amphion-row-dl-btn"));
    assert!(!BRIDGE.contains("syncDownloadState"));
}

#[test]
fn guardian_de_anuncios_presente() {
    assert!(BRIDGE.contains("startAdGuard"));
    assert!(BRIDGE.contains("skipAdvertisement"));
    assert!(BRIDGE.contains("volume-bar-toggle-mute-button"));
    assert!(BRIDGE.contains("context-item-info-ad"));
}
