//! Contrato de la capa Amphion inyectada en el Web Player de Spotify.

const BRIDGE: &str = include_str!("../src/bridge.js");

#[test]
fn capa_amphion_sin_servidor_local() {
    assert!(!BRIDGE.contains("127.0.0.1:4567"));
}

#[test]
fn boton_de_ajustes_presente() {
    assert!(BRIDGE.contains("amphion-premium-pill-btn"));
    assert!(BRIDGE.contains("const PREMIUM_LABEL = 'Amphion';"));
}

#[test]
fn barra_de_reproduccion_presente() {
    assert!(BRIDGE.contains("amphion-spotify-premium-toolbar"));
    assert!(BRIDGE.contains("SVG_TOOLBAR_PLAY"));
    assert!(BRIDGE.contains("SVG_TOOLBAR_SHUFFLE"));
}

#[test]
fn guardian_de_anuncios_presente() {
    assert!(BRIDGE.contains("startAdGuard"));
    assert!(BRIDGE.contains("skipAdvertisement"));
    assert!(BRIDGE.contains("volume-bar-toggle-mute-button"));
    assert!(BRIDGE.contains("context-item-info-ad"));
}

#[test]
fn motor_de_temas_presente() {
    assert!(BRIDGE.contains("amphion-theme"));
    assert!(BRIDGE.contains("applyTheme"));
    assert!(BRIDGE.contains("THEMES"));
}

#[test]
fn panel_de_ajustes_sin_datos_inventados() {
    // Nada de calidad 320 kbps: el Web Player no la ofrece.
    assert!(!BRIDGE.contains("320 kbps"));
    // No hay gapless ni normalización implementados por Amphion.
    assert!(!BRIDGE.contains("Gapless"));
    assert!(!BRIDGE.contains("Normalización de volumen"));
    // La cuenta se lee del DOM, no se escribe a mano.
    assert!(!BRIDGE.contains("Darwin Pinargote"));
    assert!(BRIDGE.contains("user-widget-link"));
}

#[test]
fn estado_del_panel_es_verificable() {
    assert!(BRIDGE.contains("window.__AMPHION_ADBLOCK__"));
    assert!(BRIDGE.contains("readNowPlaying"));
    assert!(BRIDGE.contains("refreshSettingsStatus"));
    assert!(BRIDGE.contains("amphion-st-endpoints"));
}

#[test]
fn incluye_temas_dopaminicos() {
    for tema in ["cyberpunk", "synthwave", "vaporwave", "miami", "limepunch", "magma", "aurora", "bubblegum", "electric", "tropical"] {
        assert!(BRIDGE.contains(tema), "falta el tema {tema}");
    }
}

#[test]
fn fondo_personalizado_presente() {
    assert!(BRIDGE.contains("amphion-wallpaper-layer"));
    assert!(BRIDGE.contains("amphion-wallpaper-veil"));
    assert!(BRIDGE.contains("data-amphion-glass"));
    assert!(BRIDGE.contains("downscaleToDataUrl"));
    assert!(BRIDGE.contains("WALLPAPER_MAX_SIDE"));
}

#[test]
fn corrige_desborde_de_la_cola() {
    // El encabezado "Siguiente en la fila de reproducción" desbordaba el viewport.
    assert!(BRIDGE.contains("div:has(> h2 + button)"));
    assert!(BRIDGE.contains("overflow-wrap: anywhere"));
}

#[test]
fn spotdown_conectado_con_navegador() {
    assert!(BRIDGE.contains("spotdown.org"));
    assert!(BRIDGE.contains("SVG_TOOLBAR_SPOTDOWN"));
    assert!(BRIDGE.contains("openSpotDown"));
    assert!(BRIDGE.contains("amphion-spotdown-btn"));
    assert!(BRIDGE.contains("amphion-spotdown-toolbar-btn"));
}
