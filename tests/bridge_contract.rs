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

// ============================================================
// ZEUS v2 — SpotDown Multi-Servicio · Badge · Atajo · Tooltip
// ============================================================
#[test]
fn spotdown_zeus_v2_multi_servicio() {
    // Catálogo de servicios (Zeus Blindspot #6 — como Sakukelly Linux)
    assert!(BRIDGE.contains("SPOTDOWN_SERVICES"));
    assert!(BRIDGE.contains("SoundLoaders"));
    assert!(BRIDGE.contains("SpotMate"));
    assert!(BRIDGE.contains("soundloaders.app"));
    assert!(BRIDGE.contains("spotmate.online"));
    // Panel selector de servicio
    assert!(BRIDGE.contains("openServicePanel"));
    assert!(BRIDGE.contains("amphion-service-panel"));
}

#[test]
fn spotdown_zeus_v2_badge_pulsante() {
    // Badge animado cuando hay canción activa (Zeus Blindspots #1 & #6)
    assert!(BRIDGE.contains("amphion-spotdown-pulse"));
    assert!(BRIDGE.contains("updateSpotDownBadge"));
    assert!(BRIDGE.contains("data-active"));
}

#[test]
fn spotdown_zeus_v2_atajo_teclado() {
    // Atajo global Alt+D (Zeus Blindspot #4)
    assert!(BRIDGE.contains("e.altKey"));
    assert!(BRIDGE.contains("key === 'd'"));
}

#[test]
fn spotdown_zeus_v2_animacion_exito() {
    // Animación visual post-click (Zeus Blindspot #3)
    assert!(BRIDGE.contains("triggerSpotDownSuccess"));
    assert!(BRIDGE.contains("amphion-success-flash"));
    assert!(BRIDGE.contains("amphion-spotdown-success-ring"));
}

#[test]
fn spotdown_zeus_v2_tooltip_hover() {
    // Tooltip con URL preview (Zeus Blindspot #2)
    assert!(BRIDGE.contains("amphion-spotdown-tooltip"));
}

#[test]
fn spotdown_zeus_v2_context_menu() {
    // Context menu en tracklist rows (Zeus Blindspot #5)
    assert!(BRIDGE.contains("amphion-ctx-menu"));
    assert!(BRIDGE.contains("injectTracklistContextMenu"));
    assert!(BRIDGE.contains("amphion-ctx-open"));
    assert!(BRIDGE.contains("contextmenu"));
}

// ============================================================
// REPRODUCTOR DE MÚSICA DESCARGADA / LOCAL (Estética Spotify)
// ============================================================
#[test]
fn reproductor_local_presente() {
    assert!(BRIDGE.contains("LocalPlayer"));
    assert!(BRIDGE.contains("amphion-local-player"));
    assert!(BRIDGE.contains("amphion-local-btn"));
    assert!(BRIDGE.contains("amphion-lp-dropzone"));
    assert!(BRIDGE.contains("amphion-lp-tracklist"));
    assert!(BRIDGE.contains("amphion-lp-mini"));
    assert!(BRIDGE.contains("Música Local"));
}

#[test]
fn reproductor_local_controles_completos() {
    assert!(BRIDGE.contains("amphion-lp-playpause"));
    assert!(BRIDGE.contains("amphion-lp-prev"));
    assert!(BRIDGE.contains("amphion-lp-next"));
    assert!(BRIDGE.contains("amphion-lp-shuffle"));
    assert!(BRIDGE.contains("amphion-lp-repeat"));
    assert!(BRIDGE.contains("amphion-lp-volume"));
    assert!(BRIDGE.contains("amphion-lp-progress-bar"));
    assert!(BRIDGE.contains("localPlayer"));
}

#[test]
fn reproductor_local_atajo_teclado() {
    assert!(BRIDGE.contains("e.altKey"));
    assert!(BRIDGE.contains("e.key === 'l' || e.key === 'L'"));
}

#[test]
fn reproductor_local_deteccion_carpetas() {
    assert!(BRIDGE.contains("amphion-lp-folder-btn"));
    assert!(BRIDGE.contains("amphion-lp-folder-input"));
    assert!(BRIDGE.contains("webkitdirectory"));
    assert!(BRIDGE.contains("scanDirectory"));
    assert!(BRIDGE.contains("showDirectoryPicker"));
}

#[test]
fn reproductor_local_recargar_canciones() {
    assert!(BRIDGE.contains("amphion-lp-reload-btn"));
    assert!(BRIDGE.contains("reloadLocalLibrary"));
    assert!(BRIDGE.contains("Recargar canciones"));
}

#[test]
fn reproductor_local_buscador_filtro() {
    assert!(BRIDGE.contains("amphion-lp-search"));
    assert!(BRIDGE.contains("filterTracks"));
    assert!(BRIDGE.contains("amphion-lp-folder-header"));
}

#[test]
fn reproductor_local_vista_carpetas() {
    assert!(BRIDGE.contains("amphion-lp-folder-header"));
    assert!(BRIDGE.contains("amphion-lp-folder-group"));
    assert!(BRIDGE.contains("collapsedFolders"));
    assert!(BRIDGE.contains("buildTrackRow"));
    assert!(BRIDGE.contains("amphion-lp-folder-bar"));
    assert!(BRIDGE.contains("amphion-lp-collapse-all"));
}

#[test]
fn reproductor_local_audio_funcional() {
    // a.load() es obligatorio para que el audio element cargue cada blob URL
    assert!(BRIDGE.contains("a.load()"));
    assert!(BRIDGE.contains("a.src = t.url"));
    assert!(BRIDGE.contains("playViaWebAudio"));
    assert!(BRIDGE.contains("syncTrackStateUI"));
}

#[test]
fn reproductor_local_limpia_dominios() {
    // cleanName quita marcas de agua (spotdown.org, etc.) en cualquier posicion del nombre
    assert!(BRIDGE.contains("WATERMARKS"), "debe definir regex WATERMARKS para limpiar dominios");
    assert!(BRIDGE.contains("spotdown\\.org"), "WATERMARKS debe incluir spotdown.org");
    assert!(BRIDGE.contains("soundloaders"), "WATERMARKS debe incluir soundloaders");
    assert!(BRIDGE.contains(".replace(WATERMARKS"), "cleanName debe aplicar WATERMARKS");
    assert!(BRIDGE.contains("[a-z0-9][a-z0-9-]*\\.[a-z]{2,4}"), "debe quitar dominio residual al final");
}

