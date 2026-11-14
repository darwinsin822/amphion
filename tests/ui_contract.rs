//! Pruebas de contrato de la interfaz: verifican que las eliminaciones y la
//! identidad "Spotify Premium / solo YouTube" no vuelvan a introducirse.

const BRIDGE: &str = include_str!("../src/bridge.js");
const INDEX: &str = include_str!("../ui/index.html");
const APP_JS: &str = include_str!("../ui/app.js");
const EXT_YOUTUBE: &str = include_str!("../extensions/youtube-resolver/manifest.json");

#[test]
fn bridge_no_contiene_spotdown() {
    assert!(
        !BRIDGE.to_lowercase().contains("spotdown"),
        "El puente del Web Player no debe contener restos de Spotdown"
    );
}

#[test]
fn puente_descarga_solo_desde_youtube_320() {
    assert!(BRIDGE.contains("YouTube 320 kbps"));
    assert!(BRIDGE.contains("amphion-row-dl-btn"));
    assert!(BRIDGE.contains("amphion-downloaded-badge"));
    assert!(BRIDGE.contains("amphion-actionbar-circle-dl-btn"));
    assert!(BRIDGE.contains("/api/download"));
}

#[test]
fn interfaz_local_sin_premium_ni_flac() {
    assert!(
        !INDEX.contains("Explorar Premium"),
        "El botón Explorar Premium debe permanecer eliminado"
    );
    assert!(
        !INDEX.to_lowercase().contains("flac"),
        "La interfaz local no debe ofrecer FLAC: solo YouTube"
    );
    assert!(INDEX.contains("MP3 320 kbps"));
}

#[test]
fn panel_de_descargas_consulta_estado_real() {
    assert!(APP_JS.contains("/api/downloads/state"));
    assert!(APP_JS.contains("completed_keys"));
    assert!(APP_JS.contains("failed"));
    assert!(!APP_JS.to_lowercase().contains("prefer-flac"));
}

#[test]
fn extension_unica_es_youtube() {
    assert!(EXT_YOUTUBE.contains("youtube-resolver"));
    assert!(EXT_YOUTUBE.contains("\"priority\": \"primary\""));
}
