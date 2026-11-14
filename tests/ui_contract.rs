//! Pruebas de contrato de la interfaz: verifican que no exista ningún rastro de descargas
//! y que la aplicación esté 100% optimizada para streaming puro en alta calidad.

const BRIDGE: &str = include_str!("../src/bridge.js");
const INDEX: &str = include_str!("../ui/index.html");

#[test]
fn bridge_sin_rastros_de_descargas() {
    assert!(
        !BRIDGE.contains("/api/download"),
        "El puente no debe contener ningún endpoint de descarga"
    );
    assert!(
        !BRIDGE.contains("amphion-row-dl-btn"),
        "Las filas no deben contener botones de descarga"
    );
    assert!(
        !BRIDGE.contains("amphion-downloaded-badge"),
        "No deben existir distintivos de canciones descargadas"
    );
    assert!(
        !BRIDGE.contains("amphion-actionbar-circle-dl-btn"),
        "La barra de acciones no debe tener botón de descarga por lotes"
    );
    assert!(
        !BRIDGE.contains("syncDownloadState"),
        "No debe existir bucle de sondeo ni sincronización de descargas"
    );
}

#[test]
fn bridge_contiene_boton_premium() {
    assert!(
        BRIDGE.contains("amphion-premium-pill-btn"),
        "Debe contener la clase del botón Premium"
    );
    assert!(
        BRIDGE.contains("'Premium'"),
        "Debe renderizar exclusivamente la palabra 'Premium'"
    );
}

#[test]
fn bridge_contiene_toolbar_reproduccion_streaming() {
    assert!(
        BRIDGE.contains("amphion-spotify-premium-toolbar"),
        "Debe contener la barra de controles de reproducción"
    );
    assert!(
        BRIDGE.contains("SVG_TOOLBAR_PLAY"),
        "Debe contener el botón de reproducción"
    );
    assert!(
        BRIDGE.contains("SVG_TOOLBAR_SHUFFLE"),
        "Debe contener el botón de aleatorio"
    );
}

#[test]
fn ui_sin_explorar_premium() {
    assert!(
        !INDEX.contains("Explorar Premium"),
        "La interfaz no debe contener 'Explorar Premium'"
    );
}
