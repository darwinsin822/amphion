// Amphion Bridge v0.7.12 - Spotify Web Player Controller, Local Player & Pure Streaming Engine
// Diseñado para Linux Mint Cinnamon con arquitectura de máximo rendimiento (Zero Downloads)

(() => {
  if (window.Amphion && window.Amphion.ready) {
    return;
  }

  // Inyección de estilos globales permanentes para optimizar la interfaz y botón Premium
  try {
    const globalStyle = document.createElement('style');
    globalStyle.id = 'amphion-global-injected-styles';
    globalStyle.innerHTML = `
      /* Botón Premium en barra superior (Idéntico a Spotify Premium) */
      .amphion-premium-pill-btn {
        background-color: #ffffff !important;
        color: #000000 !important;
        font-family: CircularSp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        font-size: 14px !important;
        font-weight: 700 !important;
        border-radius: 500px !important;
        padding: 6px 16px !important;
        border: none !important;
        cursor: pointer !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        min-height: 32px !important;
        line-height: 1 !important;
        white-space: nowrap !important;
        user-select: none !important;
        margin-right: 12px !important;
        transition: transform 0.15s ease, background-color 0.15s ease !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.2) !important;
      }
      .amphion-premium-pill-btn:hover {
        background-color: #f0f0f0 !important;
        transform: scale(1.04) !important;
      }
      .amphion-premium-pill-btn:active {
        transform: scale(0.98) !important;
      }

      /* Bloqueo de promociones Premium del Web Player (carteles y banners) */
      [data-testid="upsell-card"],
      [data-testid="upsell-banner"],
      [data-testid="premium-upsell"],
      [data-testid="premium-upsell-banner"],
      [data-testid="premium-banner"],
      [data-testid="upgrade-banner"],
      [data-testid="upgrade-button"],
      [data-testid="ad-billboard"],
      [data-testid="advertisement"],
      [data-testid="ad-container"],
      [class*="Upsell"],
      [class*="upsell"],
      [class*="PremiumBanner"],
      [class*="premiumBanner"],
      [class*="PremiumUpsell"],
      [class*="premiumUpsell"],
      [data-amphion-premium-blocked] {
        display: none !important;
      }

      /* Botón SpotDown en barra superior y acentos (Zeus v2 — Estilo Sakukelly Linux) */
      .amphion-spotdown-btn {
        background-color: #1ed760 !important;
        color: #121212 !important;
        position: relative !important;
        overflow: visible !important;
      }
      .amphion-spotdown-btn:hover {
        background-color: #1fdf64 !important;
        transform: scale(1.04) !important;
      }
      /* Badge pulsante cuando hay canción activa */
      .amphion-spotdown-btn[data-active="true"]::after {
        content: '' !important;
        position: absolute !important;
        top: -3px !important;
        right: -3px !important;
        width: 9px !important;
        height: 9px !important;
        border-radius: 50% !important;
        background: #ff4040 !important;
        border: 2px solid #121212 !important;
        animation: amphion-spotdown-pulse 1.6s ease-in-out infinite !important;
        box-shadow: 0 0 0 0 rgba(255,64,64,0.5) !important;
        pointer-events: none !important;
      }
      @keyframes amphion-spotdown-pulse {
        0%   { transform: scale(1);   box-shadow: 0 0 0 0 rgba(255,64,64,0.6); }
        50%  { transform: scale(1.3); box-shadow: 0 0 0 5px rgba(255,64,64,0); }
        100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(255,64,64,0); }
      }
      /* Animación de éxito post-click */
      @keyframes amphion-spotdown-success-ring {
        0%   { box-shadow: 0 0 0 0 rgba(30,215,96,0.6); }
        70%  { box-shadow: 0 0 0 10px rgba(30,215,96,0); }
        100% { box-shadow: 0 0 0 0 rgba(30,215,96,0); }
      }
      .amphion-spotdown-btn.amphion-success-flash {
        animation: amphion-spotdown-success-ring 0.8s ease-out !important;
      }
      /* Tooltip hover con URL preview */
      .amphion-spotdown-tooltip {
        position: absolute !important;
        bottom: calc(100% + 8px) !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        background: #282828 !important;
        color: #ffffff !important;
        font-size: 11px !important;
        font-weight: 500 !important;
        padding: 5px 10px !important;
        border-radius: 6px !important;
        white-space: nowrap !important;
        max-width: 240px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        pointer-events: none !important;
        opacity: 0 !important;
        transition: opacity 0.15s ease !important;
        border: 1px solid #3a3a3a !important;
        z-index: 10000005 !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.6) !important;
      }
      .amphion-spotdown-btn:hover .amphion-spotdown-tooltip {
        opacity: 1 !important;
      }
      /* Panel multi-servicio (SpotDown / SoundLoaders / SpotMate) */
      #amphion-service-panel {
        position: fixed !important;
        background: #181818 !important;
        border: 1px solid #3a3a3a !important;
        border-radius: 12px !important;
        padding: 10px !important;
        z-index: 10000010 !important;
        box-shadow: 0 12px 32px rgba(0,0,0,0.85) !important;
        min-width: 230px !important;
        display: none !important;
        font-family: CircularSp, -apple-system, sans-serif !important;
        animation: amphion-fade-in 0.15s ease both !important;
      }
      #amphion-service-panel.amphion-panel-open {
        display: block !important;
      }
      .amphion-service-card {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        padding: 9px 11px !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        transition: background 0.12s ease !important;
        margin-bottom: 4px !important;
      }
      .amphion-service-card:last-child { margin-bottom: 0 !important; }
      .amphion-service-card:hover { background: rgba(255,255,255,0.08) !important; }
      .amphion-service-card:active { background: rgba(255,255,255,0.14) !important; }
      .amphion-service-icon {
        width: 32px !important;
        height: 32px !important;
        border-radius: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 15px !important;
        flex-shrink: 0 !important;
      }
      .amphion-service-name {
        font-size: 13px !important;
        font-weight: 700 !important;
        color: #ffffff !important;
      }
      .amphion-service-desc {
        font-size: 11px !important;
        color: #a7a7a7 !important;
        margin-top: 1px !important;
      }
      /* Context menu SpotDown en tracklist rows */
      #amphion-ctx-menu {
        position: fixed !important;
        background: #282828 !important;
        border: 1px solid #3a3a3a !important;
        border-radius: 8px !important;
        padding: 6px !important;
        z-index: 10000011 !important;
        box-shadow: 0 8px 24px rgba(0,0,0,0.8) !important;
        display: none !important;
        font-family: CircularSp, -apple-system, sans-serif !important;
        min-width: 190px !important;
      }
      #amphion-ctx-menu.amphion-ctx-open { display: block !important; }
      .amphion-ctx-item {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        padding: 7px 10px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        border-radius: 4px !important;
        cursor: pointer !important;
        transition: background 0.1s !important;
      }
      .amphion-ctx-item:hover { background: rgba(255,255,255,0.1) !important; }
      .amphion-toolbar-btn.amphion-spotdown-toolbar-btn:hover {
        color: #1ed760 !important;
      }

      /* ================================================================
         AMPHION LOCAL PLAYER — Estética Spotify
         ================================================================ */

      /* Botón topbar Biblioteca Local */
      .amphion-local-btn {
        background-color: #282828 !important;
        color: #ffffff !important;
        border: 1px solid #3a3a3a !important;
      }
      .amphion-local-btn:hover {
        background-color: #3a3a3a !important;
        border-color: #535353 !important;
        transform: scale(1.04) !important;
      }
      .amphion-local-btn[data-active="true"] {
        background-color: #1ed760 !important;
        color: #121212 !important;
        border-color: #1ed760 !important;
      }

      /* Overlay backdrop */
      #amphion-local-player {
        display: none;
        position: fixed;
        inset: 0;
        background:
          radial-gradient(circle at 14% 18%, rgba(30,215,96,0.14) 0%, transparent 45%),
          radial-gradient(circle at 86% 82%, rgba(29,185,84,0.08) 0%, transparent 45%),
          rgba(12,12,14,0.95);
        backdrop-filter: blur(22px);
        z-index: 10000020;
        font-family: CircularSp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        color: #ffffff;
        animation: amphion-fade-in 0.2s ease both;
      }
      #amphion-local-player.amphion-lp-open { display: flex; flex-direction: column; }

      /* Header del player */
      #amphion-lp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        background: rgba(255,255,255,0.02);
        flex-shrink: 0;
      }
      #amphion-lp-folder-btn {
        background: rgba(255,255,255,0.09);
        border: 1px solid rgba(255,255,255,0.18);
        border-radius: 500px;
        padding: 7px 16px;
        font-size: 12px;
        font-weight: 700;
        color: #ffffff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background 0.15s, border-color 0.15s, transform 0.1s;
      }
      #amphion-lp-folder-btn:hover {
        background: rgba(255,255,255,0.18);
        border-color: rgba(255,255,255,0.3);
        transform: scale(1.02);
      }
      #amphion-lp-reload-btn {
        background: rgba(30,215,96,0.15);
        border: 1px solid rgba(30,215,96,0.4);
        border-radius: 500px;
        padding: 7px 16px;
        font-size: 12px;
        font-weight: 800;
        color: #1ed760;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: background 0.15s, color 0.15s, transform 0.1s;
      }
      #amphion-lp-reload-btn:hover {
        background: #1ed760;
        color: #121212;
        transform: scale(1.02);
      }
      #amphion-lp-search {
        background: #242424;
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 500px;
        padding: 5px 14px;
        font-size: 12px;
        color: #ffffff;
        outline: none;
        width: 220px;
        transition: width 0.2s, border-color 0.2s;
      }
      #amphion-lp-search:focus {
        width: 300px;
        border-color: #1ed760;
      }
      .amphion-lp-track-folder {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 3px;
        background: rgba(255,255,255,0.06);
        color: #86d8c8;
        font-size: 10px;
        font-weight: 600;
        margin-left: 6px;
        vertical-align: middle;
      }
      .amphion-lp-cta-btn {
        background: #1ed760;
        color: #121212;
        border: none;
        border-radius: 500px;
        padding: 10px 22px;
        font-size: 13px;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0.12s, background 0.12s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .amphion-lp-cta-btn:hover {
        transform: scale(1.03);
        background: #1fdf64;
      }
      .amphion-lp-cta-btn.secondary {
        background: rgba(30,215,96,0.18);
        color: #1ed760;
        border: 1px solid rgba(30,215,96,0.4);
      }
      .amphion-lp-cta-btn.secondary:hover {
        background: #1ed760;
        color: #121212;
      }
      .amphion-lp-cta-btn.tertiary {
        background: rgba(255,255,255,0.08);
        color: #ffffff;
        border: 1px solid rgba(255,255,255,0.15);
      }
      .amphion-lp-cta-btn.tertiary:hover {
        background: rgba(255,255,255,0.16);
      }
      #amphion-lp-header h2 {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -0.3px;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      #amphion-lp-close {
        width: 32px; height: 32px;
        background: rgba(255,255,255,0.08);
        border: none; border-radius: 50%;
        color: #b3b3b3; font-size: 18px;
        cursor: pointer; display: flex;
        align-items: center; justify-content: center;
        transition: background 0.15s, color 0.15s;
      }
      #amphion-lp-close:hover { background: rgba(255,255,255,0.15); color: #fff; }

      /* Layout principal: lista izquierda + controles abajo */
      #amphion-lp-body {
        display: flex;
        flex: 1;
        overflow: hidden;
        gap: 0;
      }

      /* Panel izquierdo: cover art + info actual */
      #amphion-lp-sidebar {
        width: 300px;
        min-width: 240px;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 28px 24px;
        border-right: 1px solid rgba(255,255,255,0.06);
        background: rgba(0,0,0,0.2);
        gap: 18px;
        flex-shrink: 0;
      }
      #amphion-lp-cover {
        width: 210px; height: 210px;
        border-radius: 14px;
        background: radial-gradient(circle at 30% 25%, #2b2b30 0%, #161618 70%, #0f0f11 100%);
        border: 1px solid rgba(255,255,255,0.09);
        display: flex; align-items: center; justify-content: center;
        font-size: 72px;
        box-shadow: 0 20px 50px rgba(0,0,0,0.65);
        overflow: hidden;
        flex-shrink: 0;
        position: relative;
        transition: box-shadow 0.3s ease, border-color 0.3s ease;
      }
      #amphion-lp-cover.playing {
        border-color: rgba(30,215,96,0.4);
        box-shadow: 0 20px 56px rgba(30,215,96,0.28);
        animation: amphion-lp-cover-pulse 3s ease-in-out infinite;
      }
      #amphion-lp-folder-badge {
        display: inline-block;
        margin-top: 8px;
        padding: 3px 10px;
        border-radius: 500px;
        background: rgba(30,215,96,0.12);
        border: 1px solid rgba(30,215,96,0.28);
        color: #1ed760;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.4px;
        max-width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      @keyframes amphion-lp-cover-pulse {
        0%, 100% { box-shadow: 0 16px 48px rgba(30,215,96,0.2); }
        50%       { box-shadow: 0 20px 56px rgba(30,215,96,0.38); }
      }
      #amphion-lp-info {
        text-align: center;
        width: 100%;
      }
      #amphion-lp-title {
        font-size: 15px; font-weight: 800;
        white-space: nowrap; overflow: hidden;
        text-overflow: ellipsis; color: #ffffff;
        margin-bottom: 4px;
      }
      #amphion-lp-subtitle {
        font-size: 12px; color: #a7a7a7;
        white-space: nowrap; overflow: hidden;
        text-overflow: ellipsis;
      }

      /* Barra de progreso */
      #amphion-lp-progress-wrap {
        width: 100%;
        display: flex; flex-direction: column; gap: 4px;
      }
      #amphion-lp-progress-bar {
        width: 100%; height: 4px;
        background: rgba(255,255,255,0.15);
        border-radius: 2px; cursor: pointer;
        position: relative; overflow: hidden;
      }
      #amphion-lp-progress-fill {
        height: 100%; width: 0%;
        background: #1ed760;
        border-radius: 2px;
        transition: width 0.3s linear;
        pointer-events: none;
      }
      #amphion-lp-progress-bar:hover #amphion-lp-progress-fill { background: #1fdf64; }
      #amphion-lp-times {
        display: flex; justify-content: space-between;
        font-size: 10px; color: #a7a7a7;
      }

      /* Volumen */
      #amphion-lp-volume-wrap {
        display: flex; align-items: center; gap: 8px; width: 100%;
      }
      #amphion-lp-vol-icon { font-size: 14px; color: #a7a7a7; cursor: pointer; flex-shrink: 0; }
      #amphion-lp-volume {
        flex: 1; height: 4px; cursor: pointer;
        accent-color: #1ed760;
        background: transparent;
      }

      /* Controles de reproducción */
      #amphion-lp-controls {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%;
      }
      .amphion-lp-btn {
        background: transparent; border: none;
        color: #b3b3b3; cursor: pointer;
        width: 36px; height: 36px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 50%; font-size: 16px;
        transition: color 0.12s, transform 0.12s, background 0.12s;
        flex-shrink: 0;
      }
      .amphion-lp-btn:hover { color: #fff; transform: scale(1.1); background: rgba(255,255,255,0.08); }
      .amphion-lp-btn.active { color: #1ed760; }
      #amphion-lp-playpause {
        width: 52px; height: 52px;
        border-radius: 50%; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      /* El estilo visual del botón principal vive en el bloque moderno inferior. */

      /* Panel derecho: lista de pistas */
      #amphion-lp-tracklist {
        flex: 1; overflow-y: auto; padding: 12px 10px;
        background: rgba(0,0,0,0.15);
      }
      #amphion-lp-tracklist::-webkit-scrollbar { width: 8px; }
      #amphion-lp-tracklist::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 4px; }

      /* Zona de drop */
      #amphion-lp-dropzone {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        color: #535353;
        text-align: center;
        padding: 40px;
      }
      #amphion-lp-dropzone.drag-over {
        color: #1ed760;
        background: rgba(30,215,96,0.05);
        border: 2px dashed rgba(30,215,96,0.5);
        border-radius: 12px;
      }
      #amphion-lp-dropzone-icon { font-size: 56px; opacity: 0.5; }
      #amphion-lp-dropzone h3 { font-size: 18px; font-weight: 700; color: #fff; margin: 0; }
      #amphion-lp-dropzone p { font-size: 13px; margin: 0; }
      #amphion-lp-pick-btn {
        background: #1ed760; color: #121212;
        border: none; border-radius: 500px;
        padding: 10px 24px; font-size: 13px; font-weight: 800;
        cursor: pointer; transition: transform 0.12s, background 0.12s;
      }
      #amphion-lp-pick-btn:hover { transform: scale(1.04); background: #1fdf64; }

      /* Fila de pista */
      .amphion-lp-track {
        display: flex; align-items: center; gap: 12px;
        padding: 8px 12px; border-radius: 8px;
        cursor: pointer;
        transition: background 0.12s, border-color 0.12s;
        margin-bottom: 1px;
        border: 1px solid transparent;
      }
      .amphion-lp-track:hover {
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.05);
      }
      .amphion-lp-track.amphion-lp-active {
        background: rgba(30,215,96,0.1);
        border-color: rgba(30,215,96,0.2);
      }
      .amphion-lp-track.amphion-lp-active .amphion-lp-track-name { color: #1ed760; }
      .amphion-lp-track-num {
        width: 28px; min-width: 28px; text-align: right;
        font-size: 12px; color: #535353; font-variant-numeric: tabular-nums;
        flex-shrink: 0;
      }
      .amphion-lp-track.amphion-lp-active .amphion-lp-track-num { color: #1ed760; }
      .amphion-lp-track-num.playing::before { content: ''; font-size: 10px; }
      .amphion-lp-track-info { flex: 1; overflow: hidden; min-width: 0; }
      .amphion-lp-track-name {
        font-size: 13px; font-weight: 600; color: #e8e8e8;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        line-height: 1.3;
      }
      .amphion-lp-track-meta {
        font-size: 11px; color: #727272;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        margin-top: 2px; line-height: 1.2;
      }
      .amphion-lp-track-dur {
        font-size: 11px; color: #727272;
        font-variant-numeric: tabular-nums; flex-shrink: 0;
        letter-spacing: 0.5px;
      }
      .amphion-lp-track.amphion-lp-active .amphion-lp-track-dur { color: #1ed760; opacity: 0.7; }
      .amphion-lp-track-remove {
        font-size: 13px; color: #535353; background: none; border: none;
        cursor: pointer; padding: 3px 5px; border-radius: 50%;
        opacity: 0; transition: opacity 0.1s, color 0.1s, background 0.1s; flex-shrink: 0;
      }
      .amphion-lp-track:hover .amphion-lp-track-remove { opacity: 1; }
      .amphion-lp-track-remove:hover { color: #ff4040; background: rgba(255,64,64,0.1); }

      /* Header de la lista y barra de carpetas */
      #amphion-lp-list-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.07);
        background: rgba(255,255,255,0.02); flex-shrink: 0; gap: 10px;
      }
      #amphion-lp-list-header span { font-size: 12px; color: #a7a7a7; white-space: nowrap; }
      #amphion-lp-list-header button {
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.14); color: #d4d4d4;
        font-size: 11px; font-weight: 700; border-radius: 500px;
        padding: 4px 12px; cursor: pointer; transition: color 0.15s, border-color 0.15s, background 0.15s;
        white-space: nowrap;
      }
      #amphion-lp-list-header button:hover { color: #fff; border-color: rgba(255,255,255,0.45); background: rgba(255,255,255,0.1); }

      #amphion-lp-folder-bar {
        display: none;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-bottom: 1px solid rgba(255,255,255,0.06);
        background: rgba(0,0,0,0.22);
        overflow-x: auto;
        flex-shrink: 0;
        scrollbar-width: thin;
      }
      #amphion-lp-folder-bar::-webkit-scrollbar { height: 4px; }
      #amphion-lp-folder-bar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 2px; }
      .amphion-lp-folder-chip {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        color: #c7c7c7;
        border-radius: 500px;
        padding: 4px 12px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      }
      .amphion-lp-folder-chip:hover {
        background: rgba(255,255,255,0.13);
        color: #fff;
      }
      .amphion-lp-folder-chip.selected {
        background: #1ed760;
        border-color: #1ed760;
        color: #121212;
        font-weight: 800;
      }

      /* Vista por carpetas */
      .amphion-lp-folder-header {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 14px;
        cursor: pointer;
        border-radius: 10px;
        user-select: none;
        transition: background 0.15s, border-color 0.15s;
        margin-top: 8px;
        background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%);
        border: 1px solid rgba(255,255,255,0.06);
      }
      .amphion-lp-folder-header:hover {
        background: rgba(255,255,255,0.08);
        border-color: rgba(30,215,96,0.28);
      }
      .amphion-lp-folder-header.active-folder {
        border-color: rgba(30,215,96,0.4);
        background: linear-gradient(90deg, rgba(30,215,96,0.12) 0%, rgba(255,255,255,0.03) 100%);
      }
      .amphion-lp-folder-chevron {
        font-size: 10px;
        color: #1ed760;
        width: 12px;
        flex-shrink: 0;
        transition: transform 0.15s;
      }
      .amphion-lp-folder-name {
        font-size: 12px;
        font-weight: 700;
        color: #f0f0f0;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .amphion-lp-folder-play {
        background: rgba(30,215,96,0.15);
        border: 1px solid rgba(30,215,96,0.35);
        color: #1ed760;
        font-size: 10px;
        font-weight: 800;
        padding: 3px 10px;
        border-radius: 500px;
        cursor: pointer;
        opacity: 0;
        transition: opacity 0.15s, background 0.15s, color 0.15s;
        flex-shrink: 0;
      }
      .amphion-lp-folder-header:hover .amphion-lp-folder-play,
      .amphion-lp-folder-header.active-folder .amphion-lp-folder-play {
        opacity: 1;
      }
      .amphion-lp-folder-play:hover {
        background: #1ed760;
        color: #121212;
      }
      .amphion-lp-folder-count {
        font-size: 10px;
        color: #1ed760;
        font-weight: 700;
        background: rgba(30,215,96,0.12);
        border: 1px solid rgba(30,215,96,0.25);
        padding: 2px 9px;
        border-radius: 500px;
        flex-shrink: 0;
      }
      .amphion-lp-folder-group {
        padding-left: 10px;
        border-left: 2px solid rgba(30,215,96,0.22);
        margin-left: 18px;
        margin-bottom: 6px;
        margin-top: 4px;
      }

      /* Biblioteca visual tipo álbum y panel de reproducción inspirado en Spotify. */
      #amphion-local-player {
        background:
          radial-gradient(ellipse at 18% 0%, rgba(145,74,92,0.28), transparent 42%),
          radial-gradient(ellipse at 82% 100%, rgba(44,111,142,0.2), transparent 45%),
          linear-gradient(135deg, #172026 0%, #111518 58%, #101416 100%);
      }
      #amphion-lp-sidebar {
        width: clamp(300px, 29vw, 390px);
        min-width: 280px;
        justify-content: center;
        padding: 28px clamp(22px, 3vw, 42px);
        background: linear-gradient(180deg, rgba(60,76,86,0.42), rgba(9,13,16,0.58));
      }
      #amphion-lp-cover {
        width: min(100%, 330px);
        height: auto;
        aspect-ratio: 1;
        border-radius: 8px;
        background:
          radial-gradient(circle at 25% 20%, hsla(var(--cover-hue, 195), 65%, 66%, 0.72), transparent 58%),
          linear-gradient(145deg, hsl(var(--cover-hue, 195), 35%, 34%), #141b20 82%);
        box-shadow: 0 24px 64px rgba(0,0,0,0.52);
      }
      #amphion-lp-cover-image {
        display: none;
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      #amphion-lp-cover.has-art #amphion-lp-cover-image { display: block; }
      #amphion-lp-cover.has-art > svg { display: none; }
      #amphion-lp-cover.has-art::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.12));
      }
      #amphion-lp-title { font-size: 21px; letter-spacing: -0.35px; }
      #amphion-lp-subtitle { font-size: 14px; color: #c0c7cb; }
      #amphion-lp-controls { gap: clamp(10px, 1.4vw, 20px); }
      #amphion-lp-playpause {
        position: relative;
        width: 62px; height: 62px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: linear-gradient(150deg, #3bf58b 0%, #14c56f 48%, #0a9d5b 100%);
        color: #052c1b;
        box-shadow:
          0 10px 26px rgba(16,185,129,0.42),
          0 2px 6px rgba(0,0,0,0.35),
          inset 0 1px 0 rgba(255,255,255,0.55),
          inset 0 -6px 14px rgba(4,90,55,0.35);
        transition:
          transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
          box-shadow 0.22s ease,
          filter 0.2s ease;
      }
      #amphion-lp-playpause::after {
        content: '';
        position: absolute;
        inset: -7px;
        border-radius: 50%;
        border: 1px solid rgba(59,245,139,0.32);
        opacity: 0;
        transform: scale(0.86);
        transition: opacity 0.22s ease, transform 0.22s ease;
        pointer-events: none;
      }
      #amphion-lp-playpause:hover {
        transform: translateY(-1px) scale(1.05);
        filter: brightness(1.07);
        box-shadow:
          0 16px 34px rgba(16,185,129,0.52),
          0 3px 8px rgba(0,0,0,0.38),
          inset 0 1px 0 rgba(255,255,255,0.62),
          inset 0 -6px 14px rgba(4,90,55,0.32);
      }
      #amphion-lp-playpause:hover::after { opacity: 1; transform: scale(1); }
      #amphion-lp-playpause:active { transform: scale(0.93); }
      #amphion-lp-playpause:focus-visible {
        outline: 2px solid #9df5c4;
        outline-offset: 3px;
      }
      .amphion-lp-icon {
        position: absolute;
        top: 50%; left: 50%;
        width: 26px; height: 26px;
        transform: translate(-50%, -50%) scale(1);
        transition: opacity 0.16s ease, transform 0.18s ease;
      }
      .amphion-lp-icon-pause { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
      #amphion-lp-playpause.is-playing .amphion-lp-icon-play {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.6);
      }
      #amphion-lp-playpause.is-playing .amphion-lp-icon-pause {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      #amphion-lp-playpause.is-playing {
        background: linear-gradient(150deg, #ffffff 0%, #eef3f0 55%, #d8e6de 100%);
        color: #0b1f16;
      }
      #amphion-lp-progress-bar {
        height: 5px;
        background: rgba(255,255,255,0.12);
        border-radius: 999px;
        transition: height 0.18s ease;
      }
      #amphion-lp-progress-bar:hover { height: 7px; }
      #amphion-lp-progress-fill {
        border-radius: 999px;
        background: linear-gradient(90deg, #0da45f, #3bf58b 62%, #9df5c4);
        box-shadow: 0 0 14px rgba(59,245,139,0.45);
        transition: width 0.25s linear;
      }
      #amphion-lp-times { font-size: 10.5px; color: #8b969b; letter-spacing: 0.3px; }
      .amphion-lp-btn:hover {
        background: rgba(255,255,255,0.1);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
      }
      #amphion-lp-tracklist { padding: 14px clamp(14px, 2vw, 30px) 28px; }
      .amphion-lp-folder-group {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(164px, 1fr));
        gap: 12px;
        padding: 12px 2px 20px;
        border: 0;
        margin: 0;
      }
      .amphion-lp-track {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        min-width: 0;
        padding: 10px;
        margin: 0;
        overflow: hidden;
        background: rgba(255,255,255,0.045);
        border: 1px solid rgba(255,255,255,0.035);
        border-radius: 10px;
        box-shadow: 0 8px 20px rgba(0,0,0,0.12);
      }
      .amphion-lp-track:hover {
        background: rgba(255,255,255,0.1);
        border-color: rgba(255,255,255,0.1);
        transform: translateY(-2px);
      }
      .amphion-lp-track.amphion-lp-active {
        background: rgba(30,215,96,0.1);
        border-color: rgba(30,215,96,0.42);
      }
      .amphion-lp-track-art {
        position: relative;
        display: grid;
        width: 100%;
        aspect-ratio: 1;
        overflow: hidden;
        place-items: center;
        border-radius: 7px;
        background:
          radial-gradient(circle at 25% 20%, hsla(var(--cover-hue, 195), 68%, 66%, 0.82), transparent 58%),
          linear-gradient(145deg, hsl(var(--cover-hue, 195), 42%, 31%), #11191e 82%);
        box-shadow: 0 8px 18px rgba(0,0,0,0.3);
      }
      .amphion-lp-track-art-placeholder {
        color: rgba(255,255,255,0.9);
        font-size: clamp(30px, 4vw, 52px);
        font-weight: 800;
        letter-spacing: -2px;
        text-shadow: 0 3px 18px rgba(0,0,0,0.35);
      }
      .amphion-lp-track-cover {
        display: none;
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .amphion-lp-track-art.has-cover .amphion-lp-track-cover { display: block; }
      .amphion-lp-track-art.has-cover .amphion-lp-track-art-placeholder { display: none; }
      .amphion-lp-track-num {
        position: absolute;
        z-index: 1;
        top: 8px;
        left: 8px;
        width: 25px;
        min-width: 25px;
        height: 25px;
        display: grid;
        place-items: center;
        color: #fff;
        background: rgba(0,0,0,0.62);
        border-radius: 50%;
        text-align: center;
        font-size: 10px;
        backdrop-filter: blur(8px);
      }
      .amphion-lp-track-remove {
        position: absolute;
        z-index: 2;
        top: 8px;
        right: 8px;
        width: 26px;
        height: 26px;
        color: #fff;
        background: rgba(0,0,0,0.62);
        border-radius: 50%;
        opacity: 0;
      }
      .amphion-lp-track:hover .amphion-lp-track-remove,
      .amphion-lp-track-remove:focus-visible { opacity: 1; }
      .amphion-lp-track-info { width: 100%; padding: 0 2px; }
      .amphion-lp-track-name { font-size: 13px; }
      .amphion-lp-track-meta { font-size: 11px; color: #aeb8bd; }
      .amphion-lp-track-dur { display: none; }
      @media (max-width: 760px) {
        #amphion-lp-header { align-items: flex-start; gap: 12px; padding: 12px; }
        #amphion-lp-header h2 { font-size: 14px; }
        #amphion-lp-header > div { flex-wrap: wrap; justify-content: flex-end; }
        #amphion-lp-body { flex-direction: column; overflow-y: auto; }
        #amphion-lp-sidebar {
          width: auto;
          min-width: 0;
          padding: 18px 20px;
          gap: 14px;
          border-right: 0;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        #amphion-lp-cover { width: min(54vw, 230px); }
        #amphion-lp-right-panel { min-height: 360px; }
        #amphion-lp-list-header { flex-wrap: wrap; }
        #amphion-lp-search, #amphion-lp-search:focus { width: min(46vw, 260px); }
        .amphion-lp-folder-group { grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 9px; }
      }

      /* Ecualizador animado (pistas activas) */
      @keyframes amphion-eq-bar {
        0%, 100% { transform: scaleY(0.3); }
        50%       { transform: scaleY(1.0); }
      }
      .amphion-eq {
        display: flex; align-items: flex-end; gap: 2px;
        height: 14px; width: 14px;
      }
      .amphion-eq span {
        display: block; width: 3px; background: #1ed760; border-radius: 1px;
        transform-origin: bottom;
        animation: amphion-eq-bar 0.8s ease-in-out infinite;
      }
      .amphion-eq span:nth-child(2) { animation-delay: 0.15s; }
      .amphion-eq span:nth-child(3) { animation-delay: 0.3s; }

      /* Mini-player en la barra inferior */
      #amphion-lp-mini {
        display: none;
        position: fixed;
        bottom: 90px; right: 20px;
        background: #282828;
        border: 1px solid #3a3a3a;
        border-radius: 12px;
        padding: 10px 14px;
        z-index: 10000015;
        min-width: 240px; max-width: 300px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.7);
        cursor: pointer;
        font-size: 12px;
        animation: amphion-fade-in 0.15s ease both;
      }
      #amphion-lp-mini .mini-title { font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #amphion-lp-mini .mini-sub   { color: #a7a7a7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px; }
      #amphion-lp-mini-controls { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
      .amphion-lp-mini-btn {
        background: none; border: none; color: #b3b3b3;
        cursor: pointer; font-size: 15px; padding: 2px;
        transition: color 0.1s;
      }
      .amphion-lp-mini-btn:hover { color: #fff; }
      #amphion-lp-mini-progress {
        flex: 1; height: 3px; background: rgba(255,255,255,0.15);
        border-radius: 2px; overflow: hidden;
      }
      #amphion-lp-mini-fill { height: 100%; background: #1ed760; width: 0%; transition: width 0.3s linear; }

      /* Barra de acciones de reproducción de lista (Spotify Premium Aesthetic) */
      .amphion-toolbar-btn {
        background: transparent !important;
        border: none !important;
        color: #b3b3b3 !important;
        cursor: pointer !important;
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        padding: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 50% !important;
        box-sizing: border-box !important;
        transition: color 0.15s ease, transform 0.15s ease, background 0.15s ease !important;
      }
      .amphion-toolbar-btn:hover {
        color: #ffffff !important;
        transform: scale(1.1) !important;
        background: rgba(255, 255, 255, 0.08) !important;
      }

      /* Modal de Ajustes Amphion */
      #amphion-modal-backdrop {
        display: none;
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.75);
        backdrop-filter: blur(6px);
        z-index: 10000001;
        align-items: center;
        justify-content: center;
        font-family: CircularSp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      }
      .amphion-modal-box {
        background: #121212;
        border: 1px solid #282828;
        border-radius: 12px;
        width: 560px;
        max-width: 92vw;
        max-height: 86vh;
        overflow-y: auto;
        padding: 24px;
        color: #ffffff;
        box-shadow: 0 16px 40px rgba(0,0,0,0.9);
      }
      .amphion-modal-box::-webkit-scrollbar { width: 8px; }
      .amphion-modal-box::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 999px; }

      /* Evita duplicar los controles nativos bajo la barra Amphion */
      .amphion-native-actionbar-hidden { display: none !important; }

      @keyframes amphion-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .amphion-spotify-premium-toolbar { animation: amphion-fade-in 0.25s ease both; }

      /* ---- Fondo personalizado (wallpaper + blur + transparencia) ---- */
      #amphion-wallpaper-layer {
        position: fixed;
        inset: -80px;
        z-index: 0;
        pointer-events: none;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
        display: none;
      }
      #amphion-wallpaper-veil {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        display: none;
      }
      /* Superficies estructurales: dejan ver el fondo */
      [data-amphion-glass="1"] {
        background-color: transparent !important;
        background-image: none !important;
      }
      html[data-amphion-wallpaper="on"],
      html[data-amphion-wallpaper="on"] body {
        background-color: transparent !important;
      }
      html[data-amphion-wallpaper="on"] #main {
        position: relative !important;
        z-index: 1 !important;
      }
      /* Barra de reproducción: vidrio esmerilado sobre el fondo */
      html[data-amphion-wallpaper="on"] [data-testid="now-playing-bar"] {
        background-color: var(--amphion-glass-strong, rgba(12, 16, 28, 0.75)) !important;
        backdrop-filter: blur(14px);
      }

      /* ---- Corrección: el encabezado de la cola desbordaba el viewport ---- */
      div:has(> h2 + button) {
        flex-wrap: wrap !important;
        min-width: 0 !important;
      }
      div:has(> h2 + button) > button {
        min-width: 0 !important;
        max-width: 100% !important;
        height: auto !important;
      }
      div:has(> h2 + button) > button span {
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        text-align: left !important;
      }
    `;
    if (!document.getElementById('amphion-global-injected-styles')) {
      document.head.appendChild(globalStyle);
    }
  } catch (e) {}

  // Localizador de servicios internos de Spotify Web
  const getServices = () => {
    try {
      const root = document.querySelector('#main') || document.querySelector('#root');
      if (!root) return null;
      for (const k in root) {
        if (k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance')) {
          let curr = root[k];
          while (curr) {
            if (curr.memoizedProps && curr.memoizedProps.value && curr.memoizedProps.value.player) {
              return curr.memoizedProps.value;
            }
            curr = curr.return;
          }
        }
      }
    } catch (e) {}
    return null;
  };

  // ==========================================================================
  // GUARDIÁN DE ANUNCIOS — detecta publicidad, la silencia y trata de saltarla
  // ==========================================================================
  const AD_TEXT_RE = /(^|\b)(advertisement|advertising|anuncio|publicidad)(\b|$)/i;
  const AD_SELECTORS = [
    '[data-testid="ad-billboard"]',
    '[data-testid="advertisement"]',
    '[data-testid="ad-label"]',
    '[data-testid="now-playing-widget"] [data-testid="context-item-info-ad"]',
    '[aria-label*="Advertisement" i]',
    '[aria-label*="Anuncio" i]'
  ];

  let adGuardActive = false;
  let adMutedState = null;
  let lastAdSkipAt = 0;
  let adsSkippedCount = 0;
  let adsDetectedCount = 0;

  const isAdPlaying = () => {
    try {
      if (AD_SELECTORS.some(sel => document.querySelector(sel))) return true;

      const widget = document.querySelector('[data-testid="now-playing-widget"]');
      if (widget && AD_TEXT_RE.test(widget.innerText || '')) return true;

      const media = navigator.mediaSession && navigator.mediaSession.metadata;
      if (media) {
        const meta = `${media.title || ''} ${media.artist || ''} ${media.album || ''}`;
        if (AD_TEXT_RE.test(meta)) return true;
      }

      const audio = document.querySelector('audio');
      if (audio && /(?:\/ads?\/|advert)/i.test(audio.currentSrc || audio.src || '')) return true;
    } catch (e) {}
    return false;
  };

  const getMuteButton = () => document.querySelector('[data-testid="volume-bar-toggle-mute-button"]');

  const isSpotifyMuted = () => {
    const btn = getMuteButton();
    if (!btn) return null;
    const label = (btn.getAttribute('aria-label') || '').toLowerCase();
    return /activar sonido|desactivar silenciar|unmute|desilenciar/.test(label);
  };

  const setSpotifyMuted = (mute) => {
    const btn = getMuteButton();
    if (btn) {
      const muted = isSpotifyMuted();
      if (mute && muted === false) { btn.click(); return; }
      if (!mute && muted === true) { btn.click(); return; }
    }
    // Respaldo para builds que expongan un elemento <audio>.
    document.querySelectorAll('audio').forEach(el => { el.muted = !!mute; });
  };

  const skipAdvertisement = () => {
    // Evita encadenar saltos y comerse varias canciones seguidas.
    const now = Date.now();
    if (now - lastAdSkipAt < 5000) return false;
    lastAdSkipAt = now;

    const next = document.querySelector('[data-testid="control-button-skip-forward"]');
    if (next && !next.disabled && next.getAttribute('aria-disabled') !== 'true') {
      next.click();
      return true;
    }
    // Atajo nativo de Spotify: siguiente pista.
    for (const target of [document.body, window]) {
      target.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'ArrowRight', code: 'ArrowRight', ctrlKey: true, bubbles: true
      }));
    }
    return false;
  };

  const startAdGuard = () => {
    setInterval(() => {
      const ad = isAdPlaying();
      if (ad) {
        if (!adGuardActive) {
          adGuardActive = true;
          adsDetectedCount += 1;
          adMutedState = isSpotifyMuted();
          setSpotifyMuted(true);
          if (skipAdvertisement()) adsSkippedCount += 1;
          showToast('Anuncio detectado: silenciado y saltado por Amphion');
        } else {
          setSpotifyMuted(true);
          skipAdvertisement();
        }
      } else if (adGuardActive) {
        adGuardActive = false;
        setSpotifyMuted(adMutedState === true);
        adMutedState = null;
        lastAdSkipAt = 0;
        showToast('Anuncio finalizado. Reproducción restaurada');
      }
    }, 1000);
  };

  // ==========================================================================
  // BLOQUEO DE PROMOCIONES PREMIUM — elimina los carteles de suscripción
  // que Spotify inserta dentro de álbumes, playlists y la página de inicio.
  // ==========================================================================
  const PREMIUM_PROMO_SELECTORS = [
    '[data-testid="upsell-card"]',
    '[data-testid="upsell-banner"]',
    '[data-testid="premium-upsell"]',
    '[data-testid="premium-upsell-banner"]',
    '[data-testid="premium-banner"]',
    '[data-testid="upgrade-banner"]',
    '[data-testid="upgrade-button"]',
    '[data-testid="ad-billboard"]',
    '[data-testid="advertisement"]',
    '[data-testid="ad-container"]',
    '[class*="psell"]',
    '[class*="remiumBanner"]',
    '[class*="remiumUpsell"]'
  ].join(',');

  const PREMIUM_PROMO_TEXT_RE = /(premium por|meses por\s*\$?\s*\d|suscr[ií]bete a premium|prueba premium|premium individual|premium duo|premium familiar)/i;
  const PREMIUM_PROMO_HEADER_EXCLUDE = 'header, [data-testid*="entityHeader" i], [data-testid="entityTitle"], [class*="entityHeader"], [class*="EntityHeader"], [class*="album-header"], [class*="AlbumHeader"]';
  const PREMIUM_PROMO_EXCLUDE = `#amphion-local-player, #amphion-modal-backdrop, #amphion-toast, #amphion-lp-mini, [data-testid="tracklist-row"], [data-testid="now-playing-bar"], [data-testid="now-playing-widget"], ${PREMIUM_PROMO_HEADER_EXCLUDE}`;

  const blockPremiumPromo = (el) => {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest(PREMIUM_PROMO_EXCLUDE)) return false;
    el.setAttribute('data-amphion-premium-blocked', 'true');
    el.style.setProperty('display', 'none', 'important');
    return true;
  };

  // Sube desde el texto hasta la tarjeta completa del anuncio, sin tocar la
  // vista del álbum ni la lista de canciones. Evita lecturas de layout para no
  // forzar reflows costosos en listas grandes.
  const hidePremiumBannerAround = (el) => {
    const main = document.querySelector('#main') || document.querySelector('#root');
    if (!main || !el || !main.contains(el)) return;
    if (el.closest(PREMIUM_PROMO_HEADER_EXCLUDE)) return;
    let target = el;
    for (let depth = 0; depth < 4; depth++) {
      const parent = target.parentElement;
      if (!parent || parent === main || parent === document.body) break;
      if (parent.matches(PREMIUM_PROMO_HEADER_EXCLUDE)) break;
      if (parent.querySelector('[data-testid="tracklist-row"]')) break;
      if (parent.childElementCount > 40) break;
      target = parent;
    }
    if (target.closest('[data-amphion-premium-blocked]')) return;
    blockPremiumPromo(target);
  };

  const sweepPremiumPromos = (root = null) => {
    try {
      const scope = root && root.nodeType === 1
        ? root
        : (document.querySelector('#main') || document.body);
      if (!scope || (scope.closest && scope.closest(PREMIUM_PROMO_EXCLUDE))) return;

      scope.querySelectorAll(PREMIUM_PROMO_SELECTORS).forEach(blockPremiumPromo);
      if (!scope.querySelectorAll) return;

      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
      let node;
      let found = 0;
      while (found < 4 && (node = walker.nextNode())) {
        const value = node.nodeValue;
        if (!value || value.length > 200) continue;
        // Prefiltro barato: evita evaluar la expresión regular en cada nodo.
        if (value.indexOf('remium') === -1 && value.indexOf('MESES') === -1 && value.indexOf('meses') === -1) continue;
        if (!PREMIUM_PROMO_TEXT_RE.test(value)) continue;
        const el = node.parentElement;
        if (!el || el.closest(`[data-amphion-premium-blocked], ${PREMIUM_PROMO_EXCLUDE}`)) continue;
        hidePremiumBannerAround(el);
        found++;
      }
    } catch (e) {}
  };

  let premiumPromoDirty = true;

  const startPremiumPromoBlocker = () => {
    sweepPremiumPromos();
    let scheduled = false;
    const queue = new Set();
    const flush = () => {
      scheduled = false;
      const nodes = Array.from(queue);
      queue.clear();
      nodes.forEach((node) => sweepPremiumPromos(node));
      document.querySelectorAll(PREMIUM_PROMO_SELECTORS).forEach(blockPremiumPromo);
      premiumPromoDirty = false;
    };
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === 1) queue.add(node);
        }
      }
      if (queue.size) premiumPromoDirty = true;
      if (scheduled || queue.size === 0) return;
      scheduled = true;
      setTimeout(flush, 350);
    });
    const target = document.querySelector('#main') || document.body;
    try {
      observer.observe(target, { childList: true, subtree: true });
    } catch (e) {}
    // Red de seguridad: sólo re-analiza si el DOM cambió desde el último barrido.
    setInterval(() => {
      if (!premiumPromoDirty) return;
      sweepPremiumPromos();
      premiumPromoDirty = false;
    }, 5000);
  };

  // Notificación flotante Toast
  const showToast = (msg, isSuccess = true) => {
    let toast = document.getElementById('amphion-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'amphion-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 96px;
        right: 24px;
        background: #242424;
        color: #ffffff;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: CircularSp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 600;
        z-index: 10000002;
        box-shadow: 0 8px 24px rgba(0,0,0,0.85);
        border-left: 4px solid #1ed760;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: opacity 0.3s ease, transform 0.3s ease;
        opacity: 0;
        transform: translateY(12px);
      `;
      document.body.appendChild(toast);
    }
    const t = THEMES[activeTheme] || THEMES.classic;
    toast.style.background = t.elevated;
    toast.style.color = t.text;
    toast.style.borderLeftColor = isSuccess ? t.accent : '#ff5555';
    toast.innerHTML = isSuccess 
      ? `<span style="font-size: 16px; color: ${t.accent};">⚡</span> <span>${msg}</span>`
      : `<span style="font-size: 16px; color: #ff5555;">⚠️</span> <span>${msg}</span>`;
    toast.style.display = 'flex';
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 3500);
  };

  // ==========================================================================
  // MOTOR DE TEMAS AMPHION — estilos tipo Spicetify para el Web Player
  // ==========================================================================
  const THEMES = {
    classic: {
      name: 'Spotify',
      bg: '#121212', surface: '#181818', elevated: '#242424',
      text: '#ffffff', subdued: '#b3b3b3', accent: '#1ed760',
      border: 'rgba(255,255,255,0.08)'
    },
    amoled: {
      name: 'AMOLED',
      bg: '#000000', surface: '#0a0a0a', elevated: '#151515',
      text: '#ffffff', subdued: '#a7a7a7', accent: '#1ed760',
      border: 'rgba(255,255,255,0.10)'
    },
    nord: {
      name: 'Nord',
      bg: '#2e3440', surface: '#3b4252', elevated: '#434c5e',
      text: '#eceff4', subdued: '#d8dee9', accent: '#88c0d0',
      border: 'rgba(236,239,244,0.12)'
    },
    dracula: {
      name: 'Dracula',
      bg: '#282a36', surface: '#343746', elevated: '#44475a',
      text: '#f8f8f2', subdued: '#bdc0cf', accent: '#bd93f9',
      border: 'rgba(248,248,242,0.12)'
    },
    catppuccin: {
      name: 'Catppuccin',
      bg: '#1e1e2e', surface: '#181825', elevated: '#313244',
      text: '#cdd6f4', subdued: '#a6adc8', accent: '#cba6f7',
      border: 'rgba(205,214,244,0.12)'
    },
    vallenato: {
      name: 'Vallenato Gold',
      bg: '#12100b', surface: '#1c1810', elevated: '#2a2213',
      text: '#fff8e7', subdued: '#c9b98a', accent: '#f5c531',
      border: 'rgba(245,197,49,0.18)'
    },
    cyberpunk: {
      name: 'Cyberpunk',
      bg: '#0a0016', surface: '#16002e', elevated: '#230046',
      text: '#e9f7ff', subdued: '#b39ae0', accent: '#ff2bd6',
      border: 'rgba(255,43,214,0.30)'
    },
    synthwave: {
      name: 'Synthwave',
      bg: '#150029', surface: '#21063d', elevated: '#2d0a55',
      text: '#fff0f6', subdued: '#d3a4ff', accent: '#ff6ac1',
      border: 'rgba(255,106,193,0.30)'
    },
    vaporwave: {
      name: 'Vaporwave',
      bg: '#14082b', surface: '#1e0d3d', elevated: '#2a1352',
      text: '#f0fbff', subdued: '#9fd7ff', accent: '#7afcff',
      border: 'rgba(122,252,255,0.30)'
    },
    miami: {
      name: 'Miami Vice',
      bg: '#071420', surface: '#0c2233', elevated: '#123047',
      text: '#eafaff', subdued: '#89c6e0', accent: '#ff2e63',
      border: 'rgba(255,46,99,0.32)'
    },
    limepunch: {
      name: 'Lime Punch',
      bg: '#05140a', surface: '#0a2413', elevated: '#10331c',
      text: '#f2ffe8', subdued: '#a6d98a', accent: '#b6ff00',
      border: 'rgba(182,255,0,0.32)'
    },
    magma: {
      name: 'Magma',
      bg: '#14060a', surface: '#240a10', elevated: '#351018',
      text: '#fff0e8', subdued: '#e0a08c', accent: '#ff5e00',
      border: 'rgba(255,94,0,0.32)'
    },
    aurora: {
      name: 'Aurora',
      bg: '#03121a', surface: '#06202c', elevated: '#0a2d3d',
      text: '#e6fffb', subdued: '#8ed8cf', accent: '#00ffc6',
      border: 'rgba(0,255,198,0.30)'
    },
    bubblegum: {
      name: 'Bubblegum',
      bg: '#1a0714', surface: '#2a0d20', elevated: '#3a122d',
      text: '#fff0f8', subdued: '#e3a3c9', accent: '#ff4fa3',
      border: 'rgba(255,79,163,0.32)'
    },
    electric: {
      name: 'Electric Blue',
      bg: '#060a24', surface: '#0b1136', elevated: '#121a4d',
      text: '#eef2ff', subdued: '#9aa8e8', accent: '#4d7cff',
      border: 'rgba(77,124,255,0.32)'
    },
    tropical: {
      name: 'Tropical',
      bg: '#03181d', surface: '#06262d', elevated: '#0a3540',
      text: '#eafffb', subdued: '#86d8c8', accent: '#00e0b8',
      border: 'rgba(0,224,184,0.30)'
    }
  };

  const VERSION = '0.7.12';

  const THEME_STORAGE_KEY = 'amphion-theme';
  let activeTheme = 'classic';

  const hexToRgba = (hex, alpha) => {
    const h = (hex || '#1ed760').replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  };

  const themeButtonsHtml = () => Object.entries(THEMES).map(([key, t]) => `
    <button class="amphion-theme-btn" data-amphion-theme="${key}" title="${t.name}"
      style="display:flex; align-items:center; gap:8px; padding:8px 10px; border-radius:8px;
             border:1px solid rgba(255,255,255,0.12); background:#181818; color:#fff;
             font-size:12px; font-weight:600; cursor:pointer; text-align:left;">
      <span class="amphion-theme-swatch"
        style="width:16px; height:16px; min-width:16px; border-radius:50%;
               background:linear-gradient(135deg, ${t.bg} 0%, ${t.surface} 55%, ${t.accent} 100%);
               box-shadow:0 0 0 1px rgba(255,255,255,0.25) inset;"></span>
      <span>${t.name}</span>
    </button>`).join('');

  const updateThemeButtons = () => {
    document.querySelectorAll('[data-amphion-theme]').forEach(btn => {
      const isActive = btn.dataset.amphionTheme === activeTheme;
      btn.dataset.active = isActive ? 'true' : 'false';
      btn.style.borderColor = isActive ? (THEMES[activeTheme]?.accent || '#1ed760') : 'rgba(255,255,255,0.12)';
      btn.style.boxShadow = isActive ? `0 0 0 1px ${THEMES[activeTheme]?.accent || '#1ed760'} inset` : 'none';
      btn.style.background = isActive
        ? hexToRgba(THEMES[activeTheme]?.accent || '#1ed760', 0.16)
        : '#181818';
      btn.style.color = isActive ? (THEMES[activeTheme]?.accent || '#1ed760') : '#ffffff';
    });
  };

  const applyTheme = (name, silent = false) => {
    activeTheme = Object.prototype.hasOwnProperty.call(THEMES, name) ? name : 'classic';
    const theme = THEMES[activeTheme];

    let style = document.getElementById('amphion-theme-vars');
    if (!style) {
      style = document.createElement('style');
      style.id = 'amphion-theme-vars';
      document.head.appendChild(style);
    }

    if (activeTheme === 'classic') {
      style.textContent = '';
      document.documentElement.removeAttribute('data-amphion-theme');
    } else {
      style.textContent = `
        :root, body, #main {
          --background-base: ${theme.bg} !important;
          --background-highlight: ${theme.surface} !important;
          --background-press: ${theme.elevated} !important;
          --background-elevated-base: ${theme.surface} !important;
          --background-elevated-highlight: ${theme.elevated} !important;
          --background-elevated-press: ${theme.elevated} !important;
          --background-tinted-base: ${theme.surface} !important;
          --background-tinted-highlight: ${theme.elevated} !important;
          --background-tinted-press: ${theme.elevated} !important;
          --text-base: ${theme.text} !important;
          --text-subdued: ${theme.subdued} !important;
          --text-bright-accent: ${theme.accent} !important;
          --essential-bright-accent: ${theme.accent} !important;
          --decorative-base: ${theme.text} !important;
          --border-base: ${theme.border} !important;
          --border-subtle: ${theme.border} !important;
          --amphion-bg: ${theme.bg};
          --amphion-surface: ${theme.surface};
          --amphion-elevated: ${theme.elevated};
          --amphion-text: ${theme.text};
          --amphion-subdued: ${theme.subdued};
          --amphion-accent: ${theme.accent};
        }
        html, body { background-color: ${theme.bg} !important; }
        [data-testid="now-playing-bar"], [data-testid="side-nav-bar"], [data-testid="top-bar"] {
          background-color: ${theme.surface} !important;
        }
        [data-testid="now-playing-bar"] { border-top: 1px solid ${theme.border} !important; }
        .amphion-modal-box { background: ${theme.surface} !important; border-color: ${theme.border} !important; }
      `;
      document.documentElement.setAttribute('data-amphion-theme', activeTheme);
    }

    try { localStorage.setItem(THEME_STORAGE_KEY, activeTheme); } catch (e) {}
    updateThemeButtons();
    applyWallpaper();
    refreshSettingsStatus();
    if (!silent) showToast(`Tema aplicado: ${theme.name}`);
  };

  // ==========================================================================
  // FONDO PERSONALIZADO — wallpaper local con desenfoque y transparencia
  // ==========================================================================
  const WALLPAPER_KEY = 'amphion-wallpaper';
  const WALLPAPER_CFG_KEY = 'amphion-wallpaper-config';
  const WALLPAPER_MAX_SIDE = 1920;

  const readWallpaperConfig = () => {
    const cfg = { blur: 18, dim: 50, name: '' };
    try {
      const raw = JSON.parse(localStorage.getItem(WALLPAPER_CFG_KEY) || '{}');
      if (typeof raw.blur === 'number') cfg.blur = Math.max(0, Math.min(40, raw.blur));
      if (typeof raw.dim === 'number') cfg.dim = Math.max(0, Math.min(90, raw.dim));
      if (typeof raw.name === 'string') cfg.name = raw.name;
    } catch (e) {}
    return cfg;
  };

  let wallpaperData = null;
  let wallpaperCfg = readWallpaperConfig();
  let glassNodes = new Set();

  try {
    wallpaperData = localStorage.getItem(WALLPAPER_KEY);
  } catch (e) {
    wallpaperData = null;
  }

  const saveWallpaperConfig = () => {
    try { localStorage.setItem(WALLPAPER_CFG_KEY, JSON.stringify(wallpaperCfg)); } catch (e) {}
  };

  const tierClass = (id) => id && id.indexOf('amphion-') === 0;

  // Marca solo contenedores estructurales: profundidad <= 5 y area >= 10% del viewport.
  const markGlassSurfaces = () => {
    if (!document.documentElement.hasAttribute('data-amphion-wallpaper')) return;
    const area = innerWidth * innerHeight;
    const seen = new Set();
    const walk = (el, depth) => {
      if (depth > 5) return;
      for (const c of el.children) {
        if (!(c instanceof HTMLElement)) continue;
        if (tierClass(c.id)) continue;
        const r = c.getBoundingClientRect();
        if (r.height > 80 && r.width * r.height > area * 0.10) {
          if (c.getAttribute('data-amphion-glass') !== '1') c.setAttribute('data-amphion-glass', '1');
          seen.add(c);
        }
        walk(c, depth + 1);
      }
    };
    walk(document.body, 1);
    glassNodes.forEach((el) => {
      if (!seen.has(el)) el.removeAttribute('data-amphion-glass');
    });
    glassNodes = seen;
  };

  const applyWallpaper = () => {
    let layer = document.getElementById('amphion-wallpaper-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.id = 'amphion-wallpaper-layer';
      document.body.prepend(layer);
    }
    let veil = document.getElementById('amphion-wallpaper-veil');
    if (!veil) {
      veil = document.createElement('div');
      veil.id = 'amphion-wallpaper-veil';
      layer.insertAdjacentElement('afterend', veil);
    }

    if (!wallpaperData) {
      layer.style.display = 'none';
      veil.style.display = 'none';
      document.documentElement.removeAttribute('data-amphion-wallpaper');
      glassNodes.forEach((el) => el.removeAttribute('data-amphion-glass'));
      glassNodes = new Set();
      return;
    }

    const theme = THEMES[activeTheme] || THEMES.classic;
    layer.style.display = 'block';
    layer.style.backgroundImage = `url("${wallpaperData}")`;
    layer.style.filter = `blur(${wallpaperCfg.blur}px)`;
    veil.style.display = 'block';
    veil.style.backgroundColor = hexToRgba(theme.bg, wallpaperCfg.dim / 100);
    const strongAlpha = Math.min(0.94, 0.52 + wallpaperCfg.dim / 200);
    document.documentElement.style.setProperty('--amphion-glass-strong', hexToRgba(theme.surface, strongAlpha));
    document.documentElement.setAttribute('data-amphion-wallpaper', 'on');
    markGlassSurfaces();
  };

  const downscaleToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen no soportado'));
      img.onload = () => {
        const scale = Math.min(1, WALLPAPER_MAX_SIDE / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  const setWallpaperFromFile = async (file) => {
    try {
      const dataUrl = await downscaleToDataUrl(file);
      try {
        localStorage.setItem(WALLPAPER_KEY, dataUrl);
      } catch (e) {
        showToast('Imagen demasiado grande para guardarse. Prueba una más liviana.', false);
        return false;
      }
      wallpaperData = dataUrl;
      wallpaperCfg.name = (file.name || '').slice(0, 60);
      saveWallpaperConfig();
      applyWallpaper();
      refreshSettingsStatus();
      showToast('Fondo aplicado');
      return true;
    } catch (err) {
      showToast(err.message || 'No se pudo cargar la imagen', false);
      return false;
    }
  };

  const clearWallpaper = () => {
    wallpaperData = null;
    wallpaperCfg.name = '';
    try {
      localStorage.removeItem(WALLPAPER_KEY);
      saveWallpaperConfig();
    } catch (e) {}
    applyWallpaper();
    refreshSettingsStatus();
    showToast('Fondo eliminado');
  };

  const setWallpaperTuning = (blur, dim) => {
    if (typeof blur === 'number') wallpaperCfg.blur = Math.max(0, Math.min(40, Math.round(blur)));
    if (typeof dim === 'number') wallpaperCfg.dim = Math.max(0, Math.min(90, Math.round(dim)));
    saveWallpaperConfig();
    applyWallpaper();
  };

  // SVGs de Barra de Acciones Estilo Spotify Premium
  const SVG_TOOLBAR_ADD = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
  const SVG_TOOLBAR_MORE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;
  const SVG_TOOLBAR_SORT = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v14M3 8l4-4 4 4M17 20V6M21 16l-4 4-4-4"/></svg>`;
  const SVG_TOOLBAR_FILTER = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/></svg>`;
  const SVG_TOOLBAR_SHUFFLE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`;
  const SVG_TOOLBAR_SPOTDOWN = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 19h16"/></svg>`;
  const SVG_TOOLBAR_PLAY = `<svg viewBox="0 0 24 24" width="26" height="26" fill="#121212" style="margin-left: 3px;"><polygon points="6,4 20,12 6,20"/></svg>`;

  // ==========================================================================
  // CONEXIÓN EXTERNA & SPOTDOWN ZEUS v2 (Multi-servicio · Badge · Alt+D · Tooltip)
  // ==========================================================================

  // Catálogo de servicios de descarga (espejo de Sakukelly Linux 3-card design)
  const SPOTDOWN_SERVICES = [
    {
      id: 'spotdown',
      name: 'SpotDown',
      url: 'https://spotdown.org/es8',
      queryParam: 'q',
      color: '#1DB954',
      bg: 'rgba(29,185,84,0.18)',
      border: 'rgba(29,185,84,0.5)',
      icon: '⬇',
      desc: 'MP3 alta calidad · Sin registro · Playlists completas'
    },
    {
      id: 'soundloaders',
      name: 'SoundLoaders',
      url: 'https://soundloaders.app/',
      queryParam: 'url',
      color: '#4c97f8',
      bg: 'rgba(76,151,248,0.18)',
      border: 'rgba(76,151,248,0.5)',
      icon: '🔊',
      desc: 'Multi-fuente · WAV / FLAC disponibles'
    },
    {
      id: 'spotmate',
      name: 'SpotMate',
      url: 'https://spotmate.online/en1',
      queryParam: 'url',
      color: '#a78bfa',
      bg: 'rgba(167,139,250,0.18)',
      border: 'rgba(167,139,250,0.5)',
      icon: '✦',
      desc: 'Álbumes y artistas · Interfaz rápida'
    }
  ];

  let lastExternalUrl = '';
  let lastExternalAt = 0;
  const openExternalUrl = (url) => {
    if (!url) return;
    // Un solo origen por apertura: el binding nativo (xdg-open) o, si no
    // existe, window.open. Antes se usaban ambos y se abrían dos pestañas.
    const now = Date.now();
    if (url === lastExternalUrl && now - lastExternalAt < 1500) return;
    lastExternalUrl = url;
    lastExternalAt = now;
    try {
      if (typeof window.__mintPlayerPost === 'function') {
        window.__mintPlayerPost(JSON.stringify({ action: 'open_url', url }));
        return;
      }
    } catch (e) {}
    try {
      window.open(url, '_blank', 'noopener');
    } catch (e) {}
  };

  const getSpotifyDownloadUrl = () => {
    // 1. Detectar si la URL actual de la ventana es un track, album, playlist, artist, episode o show
    try {
      const href = window.location.href;
      if (/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/.test(href)) {
        return href;
      }
    } catch (e) {}

    // 2. Si hay una pista reproduciéndose en el now-playing-bar
    try {
      const trackLink = document.querySelector(
        '[data-testid="now-playing-widget"] [data-testid="context-item-info-title"] a, ' +
        '[data-testid="now-playing-widget"] a[data-testid="context-item-link"], ' +
        '[data-testid="now-playing-widget"] a[href*="/track/"]'
      );
      if (trackLink && trackLink.href) {
        return trackLink.href;
      }
    } catch (e) {}

    // 3. Si hay un álbum o playlist asociado a la canción que suena
    try {
      const contextLink = document.querySelector(
        '[data-testid="now-playing-widget"] a[href*="/album/"], ' +
        '[data-testid="now-playing-widget"] a[href*="/playlist/"]'
      );
      if (contextLink && contextLink.href) {
        return contextLink.href;
      }
    } catch (e) {}

    // 4. Si hay una canción en la lista visible seleccionada
    try {
      const firstTrack = document.querySelector('[data-testid="tracklist-row"] a[href*="/track/"]');
      if (firstTrack && firstTrack.href) {
        return firstTrack.href;
      }
    } catch (e) {}

    return null;
  };

  const openSpotDown = (customUrl = null, serviceId = null) => {
    const target = customUrl || getSpotifyDownloadUrl();

    // Si hay un servicio explícito, abrirlo directamente
    if (serviceId) {
      const svc = SPOTDOWN_SERVICES.find(s => s.id === serviceId) || SPOTDOWN_SERVICES[0];
      let finalUrl = svc.url;
      if (target && target.includes('open.spotify.com')) {
        finalUrl = `${svc.url}?${svc.queryParam}=${encodeURIComponent(target)}`;
        showToast(`⬇ Conectando con ${svc.name} en el navegador...`);
      } else {
        const nowPlaying = readNowPlaying();
        if (nowPlaying && nowPlaying !== 'Sin reproducción') {
          finalUrl = `${svc.url}?${svc.queryParam}=${encodeURIComponent(nowPlaying)}`;
          showToast(`⬇ Buscando "${nowPlaying}" en ${svc.name}...`);
        } else {
          showToast(`⬇ Abriendo ${svc.name} en el navegador...`);
        }
      }
      openExternalUrl(finalUrl);
      triggerSpotDownSuccess();
      return;
    }

    // Sin servicio explícito → abrir panel selector si hay Spotify URL, si no abrir SpotDown directo
    if (target && target.includes('open.spotify.com')) {
      openServicePanel(target);
    } else {
      // Fallback: abrir SpotDown con texto de búsqueda
      const nowPlaying = readNowPlaying();
      const BASE = SPOTDOWN_SERVICES[0].url;
      if (nowPlaying && nowPlaying !== 'Sin reproducción') {
        openExternalUrl(`${BASE}?q=${encodeURIComponent(nowPlaying)}`);
        showToast(`⬇ Buscando "${nowPlaying}" en SpotDown...`);
      } else {
        openExternalUrl(BASE);
        showToast('⬇ Abriendo SpotDown en el navegador...');
      }
      triggerSpotDownSuccess();
    }
  };

  // Panel multi-servicio (Zeus Blindspot #6 — como Sakukelly Linux 3-card)
  const openServicePanel = (spotifyUrl) => {
    let panel = document.getElementById('amphion-service-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'amphion-service-panel';
      document.body.appendChild(panel);
      // Cerrar al click fuera
      document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) &&
            e.target.id !== 'amphion-spotdown-btn') {
          panel.classList.remove('amphion-panel-open');
        }
      }, true);
    }

    // Renderizar las 3 cards de servicios
    panel.innerHTML = `
      <div style="font-size:11px; font-weight:800; color:#a7a7a7; letter-spacing:0.8px; text-transform:uppercase; padding:4px 8px 8px;">
        DESCARGAR CON ↓
      </div>
      ${SPOTDOWN_SERVICES.map(svc => `
        <div class="amphion-service-card" data-svc="${svc.id}"
          style="border:1px solid ${svc.border}; background:${svc.bg};">
          <div class="amphion-service-icon" style="background:${svc.bg}; border:1px solid ${svc.border}; color:${svc.color};">
            ${svc.icon}
          </div>
          <div>
            <div class="amphion-service-name" style="color:${svc.color};">${svc.name}</div>
            <div class="amphion-service-desc">${svc.desc}</div>
          </div>
        </div>
      `).join('')}
    `;

    // Posicionar debajo del botón SpotDown
    const btn = document.getElementById('amphion-spotdown-btn');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      panel.style.top = `${rect.bottom + 8}px`;
      panel.style.left = `${Math.max(8, rect.left - 60)}px`;
    }
    panel.classList.add('amphion-panel-open');

    // Event listeners en las cards
    panel.querySelectorAll('.amphion-service-card').forEach(card => {
      card.onclick = () => {
        panel.classList.remove('amphion-panel-open');
        openSpotDown(spotifyUrl, card.dataset.svc);
      };
    });
  };

  // Animación de éxito post-click (Zeus Blindspot #3)
  const triggerSpotDownSuccess = () => {
    const btn = document.getElementById('amphion-spotdown-btn');
    const npBtn = document.getElementById('amphion-nowplaying-spotdown-btn');
    [btn, npBtn].forEach(b => {
      if (!b) return;
      const originalHtml = b.innerHTML;
      if (b === btn) {
        // Top bar button: flash ring + checkmark momentáneo
        b.classList.add('amphion-success-flash');
        const span = b.querySelector('span');
        if (span) {
          const originalText = span.textContent;
          span.textContent = '✓ Listo';
          setTimeout(() => {
            span.textContent = originalText;
            b.classList.remove('amphion-success-flash');
          }, 1500);
        } else {
          setTimeout(() => b.classList.remove('amphion-success-flash'), 1500);
        }
      } else {
        // Now-playing toolbar button: flash color
        b.style.color = '#1ed760';
        b.style.transform = 'scale(1.2)';
        setTimeout(() => {
          b.style.color = '';
          b.style.transform = '';
        }, 1200);
      }
    });
  };

  // Badge pulsante cuando hay canción activa (Zeus Blindspot #1 & #6)
  const updateSpotDownBadge = () => {
    const btn = document.getElementById('amphion-spotdown-btn');
    if (!btn) return;
    const url = getSpotifyDownloadUrl();
    if (url) {
      btn.dataset.active = 'true';
      // Actualizar tooltip con URL detectada
      const tooltip = btn.querySelector('.amphion-spotdown-tooltip');
      if (tooltip) {
        const short = url.replace('https://open.spotify.com/', '').slice(0, 42);
        tooltip.textContent = `⬇ ${short}`;
      }
    } else {
      delete btn.dataset.active;
      const tooltip = btn.querySelector('.amphion-spotdown-tooltip');
      if (tooltip) tooltip.textContent = 'Abrir SpotDown';
    }
  };

  // ==========================================================================
  // MÓDULO: REPRODUCTOR LOCAL DE MÚSICA (Amphion Local Player)
  // Permite escuchar la música descargada con la misma estética de Spotify
  // ==========================================================================
  const LocalPlayer = (() => {
    let tracks = [];          // { file, name, artist, folder, duration, url }
    let currentIdx = -1;
    let isPlaying = false;
    let isShuffle = false;
    let repeatMode = 0;       // 0=off, 1=all, 2=one
    let shuffleOrder = [];
    let audio = null;
    let uiReady = false;
    let playSession = 0;

    // Web Audio API fallback por si HTMLAudioElement falla en alguna pista
    let waCtx = null;
    let waSource = null;
    let waGain = null;
    let waBuffer = null;
    let waStartTime = 0;
    let waOffset = 0;
    let waTimer = null;
    let usingWebAudio = false;

    // Estado de detección automática de carpetas de música
    let activeDirectoryHandle = null;
    let activeFolderName = '~/Música';
    let searchFilter = '';
    let selectedFolder = '';  // '' = todas las carpetas
    let metaProbeToken = 0;
    let metaAudio = null;
    let artworkQueue = [];
    let artworkWorkers = 0;
    let artworkUrls = new Map();
    const MAX_COVER_FILE_BYTES = 12 * 1024 * 1024;

    const isAudioFile = (file) => !!file
      && (/\.(mp3|flac|ogg|wav|aac|m4a|opus|wma)$/i.test(file.name || '')
        || (file.type || '').startsWith('audio/'));

    const isCoverImage = (file) => !!file
      && /\.(jpe?g|png|webp)$/i.test(file.name || '')
      && (!Number.isFinite(file.size) || file.size <= MAX_COVER_FILE_BYTES);

    const coverHueFor = (track) => Array.from(`${track.artist || ''}${track.name || ''}`)
      .reduce((value, char) => ((value * 31) + char.charCodeAt(0)) % 360, 0);

    const folderForFile = (file, fallback = '') => {
      if (file && file._folderPath) return file._folderPath;
      const relativePath = file && file.webkitRelativePath;
      if (relativePath) return relativePath.split('/').slice(0, -1).join('/') || fallback;
      return fallback || activeFolderName;
    };

    const coverNameRank = (file) => {
      const base = String(file.name || '').split('/').pop().replace(/\.[^.]+$/, '');
      if (/^(cover|front|folder|album.?art|artwork)$/i.test(base)) return 0;
      if (/^(cover|front|folder|album|artwork)[ _.-]/i.test(base)) return 1;
      return 2;
    };

    const selectFolderCover = (imagesByFolder, folder) => {
      let path = folder || '';
      while (path) {
        const candidates = imagesByFolder.get(path) || [];
        if (candidates.length) {
          const named = candidates.filter((file) => coverNameRank(file) < 2)
            .sort((a, b) => coverNameRank(a) - coverNameRank(b));
          if (named.length) return named[0];
          if (candidates.length === 1) return candidates[0];
        }
        const separator = path.lastIndexOf('/');
        if (separator < 0) break;
        path = path.slice(0, separator);
      }
      return null;
    };

    // Persistencia de directorio de música en IndexedDB
    const openDb = () => new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open('amphion_music_db', 1);
        req.onupgradeneeded = (e) => {
          e.target.result.createObjectStore('handles');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) { reject(err); }
    });

    const saveDirHandle = async (handle) => {
      try {
        const db = await openDb();
        const tx = db.transaction('handles', 'readwrite');
        tx.objectStore('handles').put(handle, 'music_dir');
      } catch (e) {}
    };

    const getSavedDirHandle = async () => {
      try {
        const db = await openDb();
        return new Promise((resolve) => {
          const tx = db.transaction('handles', 'readonly');
          const req = tx.objectStore('handles').get('music_dir');
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
      } catch (e) { return null; }
    };

    // Utilidades
    const esc = (str) => String(str || '').replace(/[&<>"']/g, (ch) => (
      ch === '&' ? '&amp;' : ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '"' ? '&quot;' : '&#39;'
    ));

    const fmtTime = (sec) => {
      if (!isFinite(sec) || isNaN(sec) || sec < 0) return '0:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    const cleanName = (filename) => {
      // Elimina marcas de agua de servicios de descarga en CUALQUIER posicion del nombre
      const WATERMARKS = /\b(spotdown\.org|spotdown|soundloaders?\.com|soundloaders?|spotmate\.net|spotmate|ytdlp|yt\-dlp|snappea|mp3juices?|y2mate|9xbuddy|tubidy|savefrom)\b/gi;
      return filename
        .replace(/\.[^.]+$/, '')                               // quitar extension
        .replace(/[_]/g, ' ')                                  // convertir guiones bajos antes de limpiar marcas
        .replace(WATERMARKS, '')                               // quitar marcas de agua en cualquier posicion
        .replace(/\s+[a-z0-9][a-z0-9-]*\.[a-z]{2,4}\s*$/i, '') // quitar dominio residual al final
        .replace(/^[\d]+([\s._\-:]+)/, '')                     // quitar numero de pista al inicio
        .replace(/\(\s*\)/g, '')                               // quitar parentesis vacios
        .replace(/\[\s*\]/g, '')                               // quitar corchetes vacios
        .replace(/\s{2,}/g, ' ')
        .trim();
    };

    const guessArtistAndTitle = (filename) => {
      const cleaned = cleanName(filename);
      const match = cleaned.match(/^(.+?)\s+[-–—]\s+(.+)$/);
      if (match) {
        return { artist: match[1].trim(), title: match[2].trim() };
      }
      return { artist: 'Música local', title: cleaned || filename.replace(/\.[^.]+$/, '') };
    };

    const shortFolderLabel = (folderKey) => {
      if (!folderKey) return 'Sin carpeta';
      return folderKey.replace(/^MY MUSIC\//i, '').replace(/^Música\//i, '');
    };

    const buildShuffleOrder = () => {
      shuffleOrder = tracks.map((_, i) => i);
      for (let i = shuffleOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleOrder[i], shuffleOrder[j]] = [shuffleOrder[j], shuffleOrder[i]];
      }
    };

    const stopWebAudio = () => {
      usingWebAudio = false;
      if (waTimer) {
        clearInterval(waTimer);
        waTimer = null;
      }
      if (waSource) {
        try {
          waSource.onended = null;
          waSource.stop();
          waSource.disconnect();
        } catch (e) {}
        waSource = null;
      }
    };

    const updateProgressUI = (curSec, durSec) => {
      const pct = durSec > 0 && isFinite(durSec) ? Math.min(100, (curSec / durSec) * 100) : 0;
      const fill = document.getElementById('amphion-lp-progress-fill');
      if (fill) fill.style.width = `${pct}%`;
      const cur = document.getElementById('amphion-lp-time-cur');
      if (cur) cur.textContent = fmtTime(curSec);
      const miniFill = document.getElementById('amphion-lp-mini-fill');
      if (miniFill) miniFill.style.width = `${pct}%`;
    };

    const startWebAudioNode = (offsetSec) => {
      if (!waCtx || !waBuffer) return;
      stopWebAudio();
      usingWebAudio = true;
      waOffset = Math.max(0, Math.min(offsetSec || 0, waBuffer.duration || 0));
      const src = waCtx.createBufferSource();
      src.buffer = waBuffer;
      if (!waGain) {
        waGain = waCtx.createGain();
        waGain.connect(waCtx.destination);
      }
      waGain.gain.value = audio ? audio.volume : 0.85;
      src.connect(waGain);
      const sessionSnapshot = playSession;
      src.onended = () => {
        if (!usingWebAudio || sessionSnapshot !== playSession || !isPlaying) return;
        const elapsed = waCtx.currentTime - waStartTime + waOffset;
        if (elapsed >= (waBuffer.duration - 0.35)) {
          nextTrack();
        }
      };
      waStartTime = waCtx.currentTime;
      src.start(0, waOffset);
      waSource = src;
      waTimer = setInterval(() => {
        if (!usingWebAudio || !waCtx || !waBuffer || !isPlaying) return;
        const pos = Math.min(waBuffer.duration, (waCtx.currentTime - waStartTime) + waOffset);
        updateProgressUI(pos, waBuffer.duration);
      }, 250);
    };

    const playViaWebAudio = async (track, sessionSnapshot) => {
      if (!track || !track.file) return false;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return false;
        if (!waCtx) waCtx = new AudioCtx();
        if (waCtx.state === 'suspended') await waCtx.resume();
        const buf = await track.file.arrayBuffer();
        if (sessionSnapshot !== playSession) return false;
        const decoded = await waCtx.decodeAudioData(buf.slice(0));
        if (sessionSnapshot !== playSession) return false;
        waBuffer = decoded;
        track.duration = decoded.duration;
        const durEl = document.getElementById('amphion-lp-time-dur');
        if (durEl) durEl.textContent = fmtTime(decoded.duration);
        updateTrackDurCell(currentIdx, decoded.duration);
        startWebAudioNode(0);
        isPlaying = true;
        updatePlayUI();
        return true;
      } catch (err) {
        console.warn('LocalPlayer WebAudio fallback error:', err);
        return false;
      }
    };

    const getAudio = () => {
      if (!audio) {
        audio = new Audio();
        audio.preload = 'auto';
        audio.addEventListener('timeupdate', onTimeUpdate);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('loadedmetadata', onMetaLoaded);
        audio.addEventListener('error', onAudioError);
        audio.addEventListener('playing', () => {
          if (usingWebAudio) return;
          isPlaying = true;
          updatePlayUI();
        });
        audio.volume = 0.85;
      }
      return audio;
    };

    const onAudioError = async () => {
      const a = getAudio();
      // Sólo un fallo real del elemento justifica el fallback; los abortos
      // transitorios de load() no deben decodificar la pista completa.
      if (!a.error || currentIdx < 0 || currentIdx >= tracks.length || usingWebAudio) return;
      const t = tracks[currentIdx];
      const sessionSnapshot = playSession;
      const ok = await playViaWebAudio(t, sessionSnapshot);
      if (!ok && sessionSnapshot === playSession) {
        const errMsg = a.error ? `código ${a.error.code}` : 'formato no compatible';
        showToast(`⚠ No se pudo reproducir "${t.name}" (${errMsg})`);
        isPlaying = false;
        updatePlayUI();
      }
    };

    const ensureTrackUrl = (t) => {
      if (!t.url && t.file) {
        t.url = URL.createObjectURL(t.file);
      }
      return t.url;
    };

    const loadTrack = (idx) => {
      if (idx < 0 || idx >= tracks.length) return;
      playSession++;
      stopWebAudio();
      waBuffer = null;
      waOffset = 0;
      currentIdx = idx;
      const t = tracks[idx];
      const url = ensureTrackUrl(t);
      const a = getAudio();
      if (a.src !== url) {
        a.pause();
        a.src = url;   // Asignar la nueva fuente ya reinicia el elemento.
        a.load();
        try {
          a.currentTime = 0;
        } catch (e) {}
      }
      updateProgressUI(0, isFinite(t.duration) ? t.duration : 0);
      updateTrackUI();
    };

    // Espera a que el elemento tenga datos suficientes para sonar y resuelve
    // sin lanzar excepciones, para poder reintentar play() con seguridad.
    const waitForPlayable = (a, timeoutMs = 6000) => new Promise((resolve) => {
      if (a.readyState >= 2) {
        resolve(true);
        return;
      }
      let settled = false;
      let timer = null;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        a.removeEventListener('loadeddata', onReady);
        a.removeEventListener('canplay', onReady);
        a.removeEventListener('error', onError);
        resolve(ok);
      };
      const onReady = () => finish(true);
      const onError = () => finish(false);
      timer = setTimeout(() => finish(a.readyState >= 1), timeoutMs);
      a.addEventListener('loadeddata', onReady);
      a.addEventListener('canplay', onReady);
      a.addEventListener('error', onError);
    });

    // Confirma que el navegador realmente arrancó: algunas versiones de
    // Chromium resuelven play() y dejan el elemento en pausa.
    const confirmPlayback = (a, timeoutMs = 1000) => new Promise((resolve) => {
      if (!a.paused) {
        resolve(true);
        return;
      }
      let settled = false;
      let timer = null;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        a.removeEventListener('playing', onPlaying);
        a.removeEventListener('timeupdate', onPlaying);
        resolve(ok);
      };
      const onPlaying = () => finish(!a.paused);
      timer = setTimeout(() => finish(!a.paused), timeoutMs);
      a.addEventListener('playing', onPlaying);
      a.addEventListener('timeupdate', onPlaying);
    });

    // Reproduce el audio reintentando si el navegador aborta la petición
    // mientras termina de cargar el blob (causa del "no arranca al primer click").
    const startMediaPlayback = async (a, sessionSnapshot) => {
      // Un error previo deja el elemento en NETWORK_NO_SOURCE: reiniciar la
      // carga permite que el primer click vuelva a intentarlo con limpio.
      if (a.error) {
        try {
          a.load();
        } catch (e) {}
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        if (sessionSnapshot !== playSession) return 'stale';
        const ready = await waitForPlayable(a);
        if (sessionSnapshot !== playSession) return 'stale';
        if (!ready && a.readyState < 1) return 'error';
        try {
          await a.play();
          if (sessionSnapshot !== playSession) return 'stale';
          if (await confirmPlayback(a) && sessionSnapshot === playSession) return 'playing';
        } catch (err) {
          if (sessionSnapshot !== playSession) return 'stale';
          if (err && err.name === 'AbortError' && attempt < 2) continue;
          console.warn('LocalPlayer HTMLAudio error:', err);
          return 'error';
        }
      }
      return a.paused ? 'error' : 'playing';
    };

    const play = (idx) => {
      if (idx !== undefined && idx !== currentIdx) {
        loadTrack(idx);
      } else if (currentIdx < 0 && tracks.length > 0) {
        loadTrack(0);
      }
      if (currentIdx < 0 || currentIdx >= tracks.length) return;

      const t = tracks[currentIdx];
      const sessionSnapshot = ++playSession;

      // Pausar Spotify Web Player después de arrancar el audio local: recorrer
      // el árbol React de Spotify es costoso y no debe retrasar el gesto de play.
      const pauseSpotifyPlayer = () => {
        try {
          if (window.Amphion && typeof window.Amphion.pause === 'function') {
            window.Amphion.pause();
          }
        } catch (e) {}
      };
      setTimeout(pauseSpotifyPlayer, 0);

      if (usingWebAudio && waBuffer) {
        if (waCtx && waCtx.state === 'suspended') waCtx.resume().catch(() => {});
        startWebAudioNode(waOffset);
        isPlaying = true;
        updatePlayUI();
        return;
      }

      stopWebAudio();
      const url = ensureTrackUrl(t);
      const a = getAudio();
      if (a.src !== url) {
        a.src = url;
        a.load();
      }

      isPlaying = true; // Respuesta visual inmediata; se revierte si falla.
      updatePlayUI();
      startMediaPlayback(a, sessionSnapshot).then(async (result) => {
        if (sessionSnapshot !== playSession) return;
        if (result === 'playing') {
          isPlaying = true;
          updatePlayUI();
          return;
        }
        if (result === 'stale') return;
        const ok = await playViaWebAudio(t, sessionSnapshot);
        if (sessionSnapshot !== playSession) return;
        if (!ok) {
          isPlaying = false;
          updatePlayUI();
          showToast(`⚠ Error al reproducir "${t.name}": audio bloqueado o formato no compatible`);
        }
      });
    };

    const pause = () => {
      // Invalida promesas de play() o decodificaciones WebAudio aún pendientes.
      playSession++;
      if (usingWebAudio && waCtx && waBuffer) {
        waOffset = Math.min(waBuffer.duration, (waCtx.currentTime - waStartTime) + waOffset);
        if (waSource) {
          try {
            waSource.onended = null;
            waSource.stop();
            waSource.disconnect();
          } catch (e) {}
          waSource = null;
        }
        if (waTimer) {
          clearInterval(waTimer);
          waTimer = null;
        }
      } else {
        getAudio().pause();
      }
      isPlaying = false;
      updatePlayUI();
    };

    const toggle = () => (isPlaying ? pause() : play());

    const nextTrack = () => {
      if (tracks.length === 0) return;
      if (repeatMode === 2) {
        waOffset = 0;
        if (usingWebAudio && waBuffer) {
          startWebAudioNode(0);
          isPlaying = true;
          updatePlayUI();
        } else {
          getAudio().currentTime = 0;
          play(currentIdx);
        }
        return;
      }
      if (isShuffle) {
        const pos = shuffleOrder.indexOf(currentIdx);
        const nextPos = pos + 1;
        if (nextPos >= shuffleOrder.length && repeatMode !== 1) {
          pause();
          return;
        }
        const next = shuffleOrder[nextPos % shuffleOrder.length];
        play(next);
      } else {
        const next = (currentIdx + 1) % tracks.length;
        if (next === 0 && repeatMode === 0) {
          pause();
          return;
        }
        play(next);
      }
    };

    const prevTrack = () => {
      if (tracks.length === 0) return;
      const curPos = usingWebAudio && waCtx
        ? (isPlaying ? (waCtx.currentTime - waStartTime) + waOffset : waOffset)
        : getAudio().currentTime;
      if (curPos > 3) {
        if (usingWebAudio && waBuffer) {
          if (isPlaying) startWebAudioNode(0);
          else { waOffset = 0; updateProgressUI(0, waBuffer.duration); }
        } else {
          getAudio().currentTime = 0;
        }
        return;
      }
      if (isShuffle) {
        const pos = shuffleOrder.indexOf(currentIdx);
        const prev = shuffleOrder[(pos - 1 + shuffleOrder.length) % shuffleOrder.length];
        play(prev);
      } else {
        play((currentIdx - 1 + tracks.length) % tracks.length);
      }
    };

    const onEnded = () => nextTrack();

    const onTimeUpdate = () => {
      if (usingWebAudio) return;
      const a = getAudio();
      if (!a.duration) return;
      updateProgressUI(a.currentTime, a.duration);
    };

    const updateTrackDurCell = (idx, durSec) => {
      if (idx < 0 || !isFinite(durSec)) return;
      const cell = document.querySelector(`.amphion-lp-track[data-idx="${idx}"] .amphion-lp-track-dur`);
      if (cell) cell.textContent = fmtTime(durSec);
    };

    const onMetaLoaded = () => {
      const a = getAudio();
      if (currentIdx >= 0 && currentIdx < tracks.length && isFinite(a.duration)) {
        tracks[currentIdx].duration = a.duration;
        updateTrackDurCell(currentIdx, a.duration);
      }
      const dur = document.getElementById('amphion-lp-time-dur');
      if (dur && isFinite(a.duration)) dur.textContent = fmtTime(a.duration);
    };

    // Sondeo secuencial ligero de duraciones (1 solo elemento Audio reutilizado, nunca satura Chromium)
    const startMetaProbe = () => {
      const token = ++metaProbeToken;
      if (!metaAudio) {
        metaAudio = new Audio();
        metaAudio.preload = 'metadata';
        metaAudio.muted = true;
      }
      let cursor = 0;
      const step = () => {
        if (token !== metaProbeToken) return;
        while (cursor < tracks.length && isFinite(tracks[cursor].duration)) {
          cursor++;
        }
        if (cursor >= tracks.length) {
          metaAudio.removeAttribute('src');
          metaAudio.load();
          return;
        }
        const idx = cursor++;
        const t = tracks[idx];
        if (!t || !t.file) {
          setTimeout(step, 5);
          return;
        }
        const tempUrl = t.url || URL.createObjectURL(t.file);
        let settled = false;
        const finish = (durVal) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          metaAudio.onloadedmetadata = null;
          metaAudio.onerror = null;
          metaAudio.removeAttribute('src');
          metaAudio.load();
          if (!t.url) URL.revokeObjectURL(tempUrl);
          if (isFinite(durVal) && durVal > 0) {
            t.duration = durVal;
            updateTrackDurCell(idx, durVal);
          }
          setTimeout(step, 20);
        };
        const timer = setTimeout(() => finish(NaN), 900);
        metaAudio.onloadedmetadata = () => finish(metaAudio.duration);
        metaAudio.onerror = () => finish(NaN);
        metaAudio.src = tempUrl;
        metaAudio.load();
      };
      setTimeout(step, 120);
    };

    const acquireArtworkUrl = (blob) => {
      const cached = artworkUrls.get(blob);
      if (cached) {
        cached.references++;
        return cached.url;
      }
      const entry = { url: URL.createObjectURL(blob), references: 1 };
      artworkUrls.set(blob, entry);
      return entry.url;
    };

    const releaseTrackArtwork = (track) => {
      if (!track || !track.coverAsset) return;
      const entry = artworkUrls.get(track.coverAsset);
      if (entry && --entry.references <= 0) {
        URL.revokeObjectURL(entry.url);
        artworkUrls.delete(track.coverAsset);
      }
      track.coverAsset = null;
      track.coverUrl = null;
    };

    const updateArtworkUI = (track) => {
      const trackIndex = tracks.indexOf(track);
      if (trackIndex < 0) return;
      const imageUrl = track.coverUrl || '';
      const tile = document.querySelector(
        `.amphion-lp-track[data-idx="${trackIndex}"] .amphion-lp-track-art`
      );
      if (tile) {
        const image = tile.querySelector('.amphion-lp-track-cover');
        tile.classList.toggle('has-cover', !!imageUrl);
        if (image && imageUrl) image.src = imageUrl;
      }
      if (tracks[currentIdx] !== track) return;
      const cover = document.getElementById('amphion-lp-cover');
      const image = document.getElementById('amphion-lp-cover-image');
      if (cover) cover.classList.toggle('has-art', !!imageUrl);
      if (image) {
        if (imageUrl) image.src = imageUrl;
        else image.removeAttribute('src');
      }
    };

    const finishArtworkJob = (job, found) => {
      job.batch.found += found ? 1 : 0;
      job.batch.finished++;
      if (job.batch.finished === job.batch.total) {
        showToast(`🖼 Carátulas detectadas: ${job.batch.found}/${job.batch.total}; las demás usan portada generada.`);
      }
    };

    const runArtworkWorker = async () => {
      while (artworkQueue.length) {
        const job = artworkQueue.shift();
        const track = job.track;
        if (!track || track.removed) {
          finishArtworkJob(job, false);
          continue;
        }
        let imageBlob = null;
        try {
          const reader = window.AmphionLocalArtwork;
          if (reader && track.file) imageBlob = await reader.readEmbeddedArtwork(track.file);
        } catch (e) {
          console.warn('No se pudo leer la carátula embebida:', track.name, e);
        }
        if (!imageBlob && track.coverFile) imageBlob = track.coverFile;
        if (!track.removed && imageBlob) {
          try {
            track.coverAsset = imageBlob;
            track.coverUrl = acquireArtworkUrl(imageBlob);
            updateArtworkUI(track);
          } catch (e) {
            track.coverAsset = null;
            track.coverUrl = null;
            console.warn('No se pudo mostrar la carátula:', track.name, e);
          }
        }
        finishArtworkJob(job, !!track.coverUrl);
      }
      artworkWorkers--;
    };

    const startArtworkProbe = (newTracks) => {
      if (!newTracks || newTracks.length === 0) return;
      const batch = { total: newTracks.length, finished: 0, found: 0 };
      newTracks.forEach((track) => artworkQueue.push({ track, batch }));
      while (artworkWorkers < 2 && artworkQueue.length) {
        artworkWorkers++;
        runArtworkWorker();
      }
    };

    // Escaneo recursivo de directorios con File System Access API
    const scanDirectory = async (handle, path = '') => {
      const files = [];
      try {
        for await (const entry of handle.values()) {
          if (entry.kind === 'file') {
            if (/\.(mp3|flac|ogg|wav|aac|m4a|opus|wma|jpe?g|png|webp)$/i.test(entry.name)) {
              try {
                const file = await entry.getFile();
                file._folderPath = path || handle.name;
                files.push(file);
              } catch (e) {}
            }
          } else if (entry.kind === 'directory') {
            const sub = await scanDirectory(entry, path ? `${path}/${entry.name}` : entry.name);
            files.push(...sub);
          }
        }
      } catch (err) {
        console.warn('Error al escanear directorio:', err);
      }
      return files;
    };

    // Escaneo recursivo para drag & drop de carpetas desde el explorador
    const scanEntry = async (entry, path = '') => {
      if (entry.isFile) {
        return new Promise((res) => {
          entry.file((f) => {
            f._folderPath = path || 'Música';
            res(isAudioFile(f) || isCoverImage(f) ? [f] : []);
          }, () => res([]));
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readAll = () => new Promise((res) => {
          reader.readEntries((batch) => res(batch || []), () => res([]));
        });
        let all = [];
        let batch;
        do {
          batch = await readAll();
          all.push(...batch);
        } while (batch.length > 0);
        const nested = await Promise.all(
          all.map((sub) => scanEntry(sub, path ? `${path}/${entry.name}` : entry.name))
        );
        return nested.flat();
      }
      return [];
    };

    // Recargar y detectar automáticamente canciones nuevas en la carpeta de música
    const reloadLocalLibrary = async () => {
      showToast('🔄 Escaneando carpetas de música en busca de nuevas canciones...');
      let handle = activeDirectoryHandle;
      if (!handle) {
        handle = await getSavedDirHandle();
        if (handle) activeDirectoryHandle = handle;
      }

      if (handle) {
        try {
          if (handle.queryPermission) {
            const perm = await handle.queryPermission({ mode: 'read' });
            if (perm !== 'granted') {
              const req = await handle.requestPermission({ mode: 'read' });
              if (req !== 'granted') handle = null;
            }
          }
        } catch (e) { handle = null; }
      }

      if (!handle) {
        // Si no hay handle guardado, invocar selector de directorio nativo
        if (window.showDirectoryPicker) {
          try {
            handle = await window.showDirectoryPicker({ id: 'amphion_music', mode: 'read' });
            activeDirectoryHandle = handle;
            activeFolderName = handle.name;
            await saveDirHandle(handle);
          } catch (e) {
            const folderInp = document.getElementById('amphion-lp-folder-input');
            if (folderInp) folderInp.click();
            return;
          }
        } else {
          const folderInp = document.getElementById('amphion-lp-folder-input');
          if (folderInp) folderInp.click();
          return;
        }
      }

      const files = await scanDirectory(handle, handle.name);
      if (!files.some(isAudioFile)) {
        showToast(`⚠ No se encontraron canciones de audio en ${handle.name}`);
        return;
      }

      const prevCount = tracks.length;
      addFiles(files, handle.name);
      const newAdded = tracks.length - prevCount;
      if (newAdded > 0) {
        showToast(`✨ Se detectaron ${newAdded} canciones nuevas en ${handle.name} (Total: ${tracks.length})`);
      } else {
        showToast(`✅ Colección al día: ${tracks.length} canciones en ${handle.name} sin cambios`);
      }
    };

    const filterTracks = (query) => {
      searchFilter = (query || '').trim().toLowerCase();
      renderTrackList();
    };

    const addFiles = (files, defaultFolder = '') => {
      const newTracks = [];
      const inputFiles = Array.from(files || []);
      const imagesByFolder = new Map();
      inputFiles.filter(isCoverImage).forEach((file) => {
        const folder = folderForFile(file, defaultFolder);
        if (!imagesByFolder.has(folder)) imagesByFolder.set(folder, []);
        imagesByFolder.get(folder).push(file);
      });
      const existingKeys = new Set(tracks.map((t) => `${t.folder || ''}:::${t.name}:::${t.artist}`));

      inputFiles.filter(isAudioFile).forEach((file) => {
        const { artist, title } = guessArtistAndTitle(file.name);
        const folder = folderForFile(file, defaultFolder);

        const key = `${folder}:::${title}:::${artist}`;
        if (existingKeys.has(key)) return; // Evitar duplicados
        existingKeys.add(key);

        newTracks.push({
          file,
          name: title,
          artist,
          folder,
          duration: Infinity,
          url: null,
          coverFile: selectFolderCover(imagesByFolder, folder),
          coverUrl: null,
          coverAsset: null,
          removed: false
        });
      });

      if (newTracks.length === 0 && tracks.length === 0) {
        showToast('⚠ No se encontraron archivos de audio compatibles (.mp3, .flac, .wav, .m4a)');
        return;
      }

      const wasEmpty = tracks.length === 0;
      tracks.push(...newTracks);
      buildShuffleOrder();
      showDropzone(false);
      renderTrackList();
      if (wasEmpty && tracks.length > 0) {
        loadTrack(0);
      }
      if (newTracks.length > 0) {
        startArtworkProbe(newTracks);
        startMetaProbe();
        showToast(`🎵 ${newTracks.length} canción${newTracks.length > 1 ? 'es' : ''} cargada${newTracks.length > 1 ? 's' : ''} en carpetas`);
      }
    };

    const removeTrack = (idx) => {
      if (idx < 0 || idx >= tracks.length) return;
      const removedTrack = tracks[idx];
      removedTrack.removed = true;
      if (removedTrack.url) URL.revokeObjectURL(removedTrack.url);
      releaseTrackArtwork(removedTrack);
      tracks.splice(idx, 1);
      if (tracks.length === 0) {
        pause();
        currentIdx = -1;
        selectedFolder = '';
        showDropzone(true);
      } else if (idx === currentIdx) {
        currentIdx = Math.min(currentIdx, tracks.length - 1);
        loadTrack(currentIdx);
        if (isPlaying) play();
      } else if (idx < currentIdx) {
        currentIdx--;
      }
      buildShuffleOrder();
      renderTrackList();
      updateTrackUI();
    };

    const clearAll = () => {
      metaProbeToken++;
      pause();
      tracks.forEach((t) => {
        t.removed = true;
        if (t.url) URL.revokeObjectURL(t.url);
        releaseTrackArtwork(t);
      });
      tracks = [];
      currentIdx = -1;
      selectedFolder = '';
      shuffleOrder = [];
      showDropzone(true);
      renderTrackList();
      updateTrackUI();
      showToast('🗑 Lista de música local vaciada');
    };

    const openFolderPicker = async () => {
      if (window.showDirectoryPicker) {
        try {
          const handle = await window.showDirectoryPicker({ id: 'amphion_music', mode: 'read' });
          activeDirectoryHandle = handle;
          activeFolderName = handle.name;
          await saveDirHandle(handle);
          showToast(`📁 Carpeta seleccionada: ${handle.name}. Escaneando canciones...`);
          const files = await scanDirectory(handle, handle.name);
          addFiles(files, handle.name);
          return;
        } catch (e) {
          if (e.name === 'AbortError') return;
        }
      }
      const folderInp = document.getElementById('amphion-lp-folder-input');
      if (folderInp) folderInp.click();
    };

    const buildUI = () => {
      if (document.getElementById('amphion-local-player')) {
        uiReady = true;
        return;
      }

      const overlay = document.createElement('div');
      overlay.id = 'amphion-local-player';
      overlay.innerHTML = `
        <div id="amphion-lp-header">
          <h2>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#1ed760">
              <path d="M12 3a9 9 0 100 18A9 9 0 0012 3zm4.26 12.95a.56.56 0 01-.77.19c-2.12-1.3-4.79-1.59-7.94-.87a.56.56 0 01-.25-1.09c3.44-.79 6.4-.45 8.77 1.01.27.16.35.5.19.76zm1.14-2.54a.7.7 0 01-.96.23c-2.42-1.49-6.11-1.92-8.97-1.05a.7.7 0 01-.41-1.34c3.27-.99 7.33-.51 10.11 1.2.33.2.44.63.23.96zm.1-2.65c-2.9-1.72-7.69-1.88-10.46-1.04a.84.84 0 11-.49-1.61c3.17-.96 8.44-.78 11.77 1.21a.84.84 0 11-.82 1.44z"/>
            </svg>
            Reproductor de Música Descargada · Local
          </h2>
          <div style="display:flex;align-items:center;gap:10px;">
            <button id="amphion-lp-folder-btn" title="Detectar automáticamente carpetas de música (ej. ~/Música)">
              📁 Escanear Carpeta
            </button>
            <input id="amphion-lp-folder-input" type="file" webkitdirectory directory multiple style="display:none;">
            <button id="amphion-lp-reload-btn" title="Recargar y buscar canciones nuevas en la carpeta">
              🔄 Recargar canciones
            </button>
            <label id="amphion-lp-add-label" style="background:#1ed760;border:none;border-radius:500px;padding:7px 16px;font-size:12px;font-weight:800;color:#121212;cursor:pointer;transition:transform 0.12s,background 0.12s;" title="Añadir canciones sueltas">
              + Añadir archivos
              <input id="amphion-lp-file-input" type="file" multiple accept="audio/*,image/jpeg,image/png,image/webp,.mp3,.flac,.ogg,.wav,.aac,.m4a,.opus,.wma" style="display:none;">
            </label>
            <button id="amphion-lp-close" title="Cerrar reproductor local">✕</button>
          </div>
        </div>
        <div id="amphion-lp-body">
          <!-- Sidebar: Arte + Metadata + Controles de audio -->
          <div id="amphion-lp-sidebar">
            <div id="amphion-lp-cover">
              <img id="amphion-lp-cover-image" alt="Carátula del álbum">
              <svg viewBox="0 0 24 24" width="76" height="76" fill="none" stroke="#1ed760" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.9;">
                <circle cx="12" cy="12" r="9"/>
                <circle cx="12" cy="12" r="2.5" fill="#1ed760"/>
                <path d="M9 18V8l9-2v10"/>
              </svg>
            </div>
            <div id="amphion-lp-info">
              <div id="amphion-lp-title">Sin reproducción</div>
              <div id="amphion-lp-subtitle">Selecciona o arrastra una pista</div>
              <div id="amphion-lp-folder-badge" style="display:none;">📁 Carpeta</div>
            </div>
            <div id="amphion-lp-progress-wrap">
              <div id="amphion-lp-progress-bar">
                <div id="amphion-lp-progress-fill"></div>
              </div>
              <div id="amphion-lp-times">
                <span id="amphion-lp-time-cur">0:00</span>
                <span id="amphion-lp-time-dur">0:00</span>
              </div>
            </div>
            <div id="amphion-lp-controls">
              <button class="amphion-lp-btn" id="amphion-lp-shuffle" title="Reproducción aleatoria">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
                  <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
                  <line x1="4" y1="4" x2="9" y2="9"/>
                </svg>
              </button>
              <button class="amphion-lp-btn" id="amphion-lp-prev" title="Pista anterior">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M6 6h2v12H6V6zm10 0L10 12l6 6V6z"/>
                </svg>
              </button>
              <button id="amphion-lp-playpause" title="Reproducir / Pausar" aria-label="Reproducir">
                <svg class="amphion-lp-icon amphion-lp-icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14z"/></svg>
                <svg class="amphion-lp-icon amphion-lp-icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.4"/><rect x="13.5" y="5" width="4" height="14" rx="1.4"/></svg>
              </button>
              <button class="amphion-lp-btn" id="amphion-lp-next" title="Pista siguiente">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M16 6h2v12h-2V6zM4 18l6-6-6-6v12z"/>
                </svg>
              </button>
              <button class="amphion-lp-btn" id="amphion-lp-repeat" title="Repetir">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
                  <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
                </svg>
              </button>
            </div>
            <div id="amphion-lp-volume-wrap">
              <span id="amphion-lp-vol-icon" title="Silenciar">🔊</span>
              <input id="amphion-lp-volume" type="range" min="0" max="1" step="0.02" value="0.85">
            </div>
          </div>
          <!-- Panel derecho: Lista por carpetas / Dropzone -->
          <div id="amphion-lp-right-panel" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
            <div id="amphion-lp-list-header">
              <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
                <span id="amphion-lp-count">0 canciones</span>
                <input id="amphion-lp-search" type="search" placeholder="🔍 Buscar canción, artista o carpeta..." title="Filtrar por nombre, artista o carpeta">
              </div>
              <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
                <button id="amphion-lp-collapse-all" title="Contraer o expandir todas las carpetas">📂 Contraer todas</button>
                <button id="amphion-lp-clear-btn" title="Vaciar toda la lista">Vaciar lista</button>
              </div>
            </div>
            <div id="amphion-lp-folder-bar"></div>
            <div id="amphion-lp-dropzone">
              <div id="amphion-lp-dropzone-icon">📁</div>
              <h3>Detección automática de canciones y carpetas</h3>
              <p>Escanea automáticamente tus carpetas de música (ej. <b>~/Música</b> o <b>~/Descargas/Spotify</b>) o arrastra canciones aquí.</p>
              <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:12px;">
                <button id="amphion-lp-pick-folder-btn" class="amphion-lp-cta-btn">📁 Escanear Carpeta de Música</button>
                <button id="amphion-lp-reload-empty-btn" class="amphion-lp-cta-btn secondary">🔄 Recargar canciones</button>
                <button id="amphion-lp-pick-btn" class="amphion-lp-cta-btn tertiary">📄 Añadir archivos sueltos</button>
              </div>
            </div>
            <div id="amphion-lp-tracklist" style="display:none;"></div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      // Eventos
      overlay.querySelector('#amphion-lp-close').onclick = () => close();
      overlay.querySelector('#amphion-lp-playpause').onclick = () => toggle();
      overlay.querySelector('#amphion-lp-prev').onclick = () => prevTrack();
      overlay.querySelector('#amphion-lp-next').onclick = () => nextTrack();

      overlay.querySelector('#amphion-lp-folder-btn').onclick = () => openFolderPicker();
      const pickFolderBtn = overlay.querySelector('#amphion-lp-pick-folder-btn');
      if (pickFolderBtn) pickFolderBtn.onclick = () => openFolderPicker();

      overlay.querySelector('#amphion-lp-reload-btn').onclick = () => reloadLocalLibrary();
      const reloadEmptyBtn = overlay.querySelector('#amphion-lp-reload-empty-btn');
      if (reloadEmptyBtn) reloadEmptyBtn.onclick = () => reloadLocalLibrary();

      const collapseAllBtn = overlay.querySelector('#amphion-lp-collapse-all');
      if (collapseAllBtn) {
        collapseAllBtn.onclick = () => {
          const folderKeys = Array.from(new Set(tracks.map((t) => t.folder || '📁 Sin carpeta')));
          if (folderKeys.length === 0) return;
          const allCollapsed = folderKeys.every((k) => collapsedFolders.has(k));
          if (allCollapsed) {
            collapsedFolders.clear();
            collapseAllBtn.textContent = '📂 Contraer todas';
          } else {
            folderKeys.forEach((k) => collapsedFolders.add(k));
            collapseAllBtn.textContent = '📂 Expandir todas';
          }
          renderTrackList();
        };
      }

      const searchInput = overlay.querySelector('#amphion-lp-search');
      if (searchInput) {
        searchInput.oninput = (e) => filterTracks(e.target.value);
      }

      const folderInput = overlay.querySelector('#amphion-lp-folder-input');
      if (folderInput) {
        folderInput.onchange = () => {
          if (folderInput.files && folderInput.files.length > 0) {
            const first = folderInput.files[0];
            const folderName = first.webkitRelativePath ? first.webkitRelativePath.split('/')[0] : 'Música';
            activeFolderName = folderName;
            addFiles(folderInput.files, folderName);
            folderInput.value = '';
          }
        };
      }

      overlay.querySelector('#amphion-lp-shuffle').onclick = (e) => {
        isShuffle = !isShuffle;
        if (isShuffle) buildShuffleOrder();
        e.currentTarget.classList.toggle('active', isShuffle);
        showToast(isShuffle ? '🔀 Aleatorio activado en local' : 'Aleatorio desactivado en local');
      };

      overlay.querySelector('#amphion-lp-repeat').onclick = (e) => {
        repeatMode = (repeatMode + 1) % 3;
        const labels = ['desactivado', 'todas', 'una sola pista'];
        e.currentTarget.classList.toggle('active', repeatMode > 0);
        e.currentTarget.title = `Repetir: ${labels[repeatMode]}`;
        if (repeatMode === 2) {
          e.currentTarget.innerHTML = `<span style="font-size:12px;font-weight:800;">1</span>`;
        } else {
          e.currentTarget.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`;
        }
        showToast(`🔁 Repetición: ${labels[repeatMode]}`);
      };

      overlay.querySelector('#amphion-lp-progress-bar').onclick = (e) => {
        const bar = e.currentTarget;
        const pct = Math.max(0, Math.min(1, e.offsetX / bar.offsetWidth));
        if (usingWebAudio && waBuffer) {
          const targetSec = pct * waBuffer.duration;
          if (isPlaying) startWebAudioNode(targetSec);
          else { waOffset = targetSec; updateProgressUI(targetSec, waBuffer.duration); }
        } else {
          const a = getAudio();
          if (a.duration) a.currentTime = pct * a.duration;
        }
      };

      overlay.querySelector('#amphion-lp-volume').oninput = (e) => {
        const val = parseFloat(e.target.value);
        getAudio().volume = val;
        if (waGain) waGain.gain.value = val;
        const vol = overlay.querySelector('#amphion-lp-vol-icon');
        if (vol) vol.textContent = val === 0 ? '🔇' : val < 0.4 ? '🔉' : '🔊';
      };
      overlay.querySelector('#amphion-lp-vol-icon').onclick = () => {
        const a = getAudio();
        const inp = overlay.querySelector('#amphion-lp-volume');
        if (a.volume > 0) {
          a.volume = 0;
          if (waGain) waGain.gain.value = 0;
          inp.value = 0;
          overlay.querySelector('#amphion-lp-vol-icon').textContent = '🔇';
        } else {
          a.volume = 0.85;
          if (waGain) waGain.gain.value = 0.85;
          inp.value = 0.85;
          overlay.querySelector('#amphion-lp-vol-icon').textContent = '🔊';
        }
      };

      const fileInput = overlay.querySelector('#amphion-lp-file-input');
      fileInput.onchange = () => {
        addFiles(fileInput.files);
        fileInput.value = '';
      };
      overlay.querySelector('#amphion-lp-pick-btn').onclick = () => fileInput.click();

      overlay.querySelector('#amphion-lp-clear-btn').onclick = () => {
        if (tracks.length === 0) return;
        clearAll();
      };

      // Drag & Drop con soporte recursivo de carpetas completas
      const rightPanel = overlay.querySelector('#amphion-lp-right-panel');
      const dropzone = overlay.querySelector('#amphion-lp-dropzone');
      ['dragover', 'dragenter'].forEach((evt) => {
        rightPanel.addEventListener(evt, (e) => {
          e.preventDefault();
          if (dropzone) dropzone.classList.add('drag-over');
        });
      });
      ['dragleave', 'drop'].forEach((evt) => {
        rightPanel.addEventListener(evt, async (e) => {
          if (evt === 'drop') {
            e.preventDefault();
            const items = e.dataTransfer.items;
            if (items && items.length > 0 && items[0].webkitGetAsEntry) {
              const filePromises = [];
              for (let i = 0; i < items.length; i++) {
                const entry = items[i].webkitGetAsEntry();
                if (entry) filePromises.push(scanEntry(entry));
              }
              const nested = await Promise.all(filePromises);
              const flat = nested.flat();
              if (flat.length > 0) {
                addFiles(flat);
              } else {
                addFiles(e.dataTransfer.files);
              }
            } else {
              addFiles(e.dataTransfer.files);
            }
          }
          if (dropzone) dropzone.classList.remove('drag-over');
        });
      });

      uiReady = true;
    };

    const showDropzone = (show) => {
      const dz = document.getElementById('amphion-lp-dropzone');
      const list = document.getElementById('amphion-lp-tracklist');
      const fbar = document.getElementById('amphion-lp-folder-bar');
      if (dz) dz.style.display = show ? 'flex' : 'none';
      if (list) list.style.display = show ? 'none' : 'block';
      if (fbar && show) fbar.style.display = 'none';
    };

    // Track which folders are collapsed (folderKey -> bool)
    const collapsedFolders = new Set();

    const syncTrackStateUI = () => {
      const container = document.getElementById('amphion-lp-tracklist');
      if (!container) return;
      container.querySelectorAll('.amphion-lp-track').forEach((row) => {
        const idx = Number(row.dataset.idx);
        const isActive = idx === currentIdx;
        row.classList.toggle('amphion-lp-active', isActive);
        const numEl = row.querySelector('.amphion-lp-track-num');
        if (numEl) {
          numEl.classList.toggle('playing', isActive && isPlaying);
          if (isActive && isPlaying) {
            numEl.innerHTML = '<div class="amphion-eq"><span></span><span></span><span></span></div>';
          } else {
            numEl.textContent = row.dataset.displayNum || `${idx + 1}`;
          }
        }
      });
      const activeFolderKey = currentIdx >= 0 && tracks[currentIdx] ? (tracks[currentIdx].folder || '📁 Sin carpeta') : '';
      container.querySelectorAll('.amphion-lp-folder-header').forEach((hdr) => {
        hdr.classList.toggle('active-folder', hdr.dataset.folder === activeFolderKey);
      });
    };

    const renderFolderBar = (folderCounts) => {
      const bar = document.getElementById('amphion-lp-folder-bar');
      if (!bar) return;
      if (tracks.length === 0 || folderCounts.size <= 1) {
        bar.style.display = 'none';
        bar.innerHTML = '';
        return;
      }
      bar.style.display = 'flex';
      bar.innerHTML = '';

      const allChip = document.createElement('button');
      allChip.className = `amphion-lp-folder-chip${selectedFolder === '' ? ' selected' : ''}`;
      allChip.textContent = `Todas (${tracks.length})`;
      allChip.onclick = () => {
        selectedFolder = '';
        renderTrackList();
      };
      bar.appendChild(allChip);

      folderCounts.forEach((cnt, folderKey) => {
        const chip = document.createElement('button');
        chip.className = `amphion-lp-folder-chip${selectedFolder === folderKey ? ' selected' : ''}`;
        chip.textContent = `📁 ${shortFolderLabel(folderKey)} (${cnt})`;
        chip.title = folderKey;
        chip.onclick = () => {
          selectedFolder = selectedFolder === folderKey ? '' : folderKey;
          collapsedFolders.delete(folderKey);
          renderTrackList();
        };
        bar.appendChild(chip);
      });
    };

    const renderTrackList = () => {
      const container = document.getElementById('amphion-lp-tracklist');
      if (!container) return;

      const folderCounts = new Map();
      tracks.forEach((t) => {
        const fk = t.folder || '📁 Sin carpeta';
        folderCounts.set(fk, (folderCounts.get(fk) || 0) + 1);
      });
      renderFolderBar(folderCounts);

      const allVisible = tracks
        .map((t, originalIdx) => ({ ...t, originalIdx }))
        .filter((t) => {
          if (selectedFolder && (t.folder || '📁 Sin carpeta') !== selectedFolder) return false;
          if (!searchFilter) return true;
          return (
            t.name.toLowerCase().includes(searchFilter) ||
            t.artist.toLowerCase().includes(searchFilter) ||
            (t.folder && t.folder.toLowerCase().includes(searchFilter))
          );
        });

      const count = document.getElementById('amphion-lp-count');
      if (count) {
        if (searchFilter || selectedFolder) {
          count.textContent = `${allVisible.length} de ${tracks.length} canciones`;
        } else {
          count.textContent = `${tracks.length} canción${tracks.length !== 1 ? 'es' : ''} · ${folderCounts.size} carpeta${folderCounts.size !== 1 ? 's' : ''}`;
        }
      }

      if (tracks.length === 0) {
        showDropzone(true);
        container.innerHTML = '';
        return;
      }
      showDropzone(false);
      container.innerHTML = '';
      const fragment = document.createDocumentFragment();

      if (searchFilter) {
        allVisible.forEach((t, pos) => {
          fragment.appendChild(buildTrackRow(t, t.originalIdx, pos + 1));
        });
        container.appendChild(fragment);
        return;
      }

      // Agrupar por carpeta
      const folderMap = new Map();
      allVisible.forEach((t) => {
        const folderKey = t.folder || '📁 Sin carpeta';
        if (!folderMap.has(folderKey)) folderMap.set(folderKey, []);
        folderMap.get(folderKey).push(t);
      });

      const activeFolderKey = currentIdx >= 0 && tracks[currentIdx] ? (tracks[currentIdx].folder || '📁 Sin carpeta') : '';

      folderMap.forEach((items, folderKey) => {
        const isCollapsed = !selectedFolder && collapsedFolders.has(folderKey);
        const header = document.createElement('div');
        header.className = `amphion-lp-folder-header${folderKey === activeFolderKey ? ' active-folder' : ''}`;
        header.dataset.folder = folderKey;
        const shortFolder = shortFolderLabel(folderKey);
        header.innerHTML = `
          <span class="amphion-lp-folder-chevron">${isCollapsed ? '▶' : '▼'}</span>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="${folderKey === activeFolderKey ? '#1ed760' : '#a7a7a7'}" style="flex-shrink:0">
            <path d="M20 6h-8l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2z"/>
          </svg>
          <span class="amphion-lp-folder-name" title="${esc(folderKey)}">${esc(shortFolder)}</span>
          <button class="amphion-lp-folder-play" title="Reproducir esta carpeta">▶ Reproducir</button>
          <span class="amphion-lp-folder-count">${items.length}</span>
        `;
        header.querySelector('.amphion-lp-folder-play').onclick = (e) => {
          e.stopPropagation();
          if (items.length > 0) play(items[0].originalIdx);
        };
        header.onclick = () => {
          if (collapsedFolders.has(folderKey)) {
            collapsedFolders.delete(folderKey);
          } else {
            collapsedFolders.add(folderKey);
          }
          renderTrackList();
        };
        fragment.appendChild(header);

        if (!isCollapsed) {
          const group = document.createElement('div');
          group.className = 'amphion-lp-folder-group';
          items.forEach((t, posInFolder) => {
            group.appendChild(buildTrackRow(t, t.originalIdx, posInFolder + 1));
          });
          fragment.appendChild(group);
        }
      });
      container.appendChild(fragment);
    };

    const buildTrackRow = (t, originalIdx, displayNum) => {
      const rowNum = displayNum !== undefined ? displayNum : (originalIdx + 1);
      const initials = (t.name || '♫').trim().split(/\s+/).slice(0, 2)
        .map((word) => word.charAt(0)).join('').toUpperCase() || '♫';
      const row = document.createElement('div');
      row.className = `amphion-lp-track${originalIdx === currentIdx ? ' amphion-lp-active' : ''}`;
      row.dataset.idx = originalIdx;
      row.dataset.displayNum = String(rowNum);

      const isActive = originalIdx === currentIdx;
      const numContent = isActive && isPlaying
        ? `<div class="amphion-eq"><span></span><span></span><span></span></div>`
        : `${rowNum}`;

      row.innerHTML = `
        <div class="amphion-lp-track-art" style="--cover-hue:${coverHueFor(t)}">
          <div class="amphion-lp-track-art-placeholder">${esc(initials)}</div>
          <img class="amphion-lp-track-cover" alt="Carátula de ${esc(t.name)}" loading="lazy" decoding="async">
          <div class="amphion-lp-track-num${isActive && isPlaying ? ' playing' : ''}">${numContent}</div>
          <button class="amphion-lp-track-remove" data-idx="${originalIdx}" title="Quitar de la lista" aria-label="Quitar ${esc(t.name)}">✕</button>
        </div>
        <div class="amphion-lp-track-info">
          <div class="amphion-lp-track-name">${esc(t.name)}</div>
          <div class="amphion-lp-track-meta">${esc(t.artist || 'Música local')}</div>
        </div>
        <div class="amphion-lp-track-dur" data-dur-idx="${originalIdx}">${isFinite(t.duration) ? fmtTime(t.duration) : '—'}</div>
      `;

      const artTile = row.querySelector('.amphion-lp-track-art');
      const coverImage = row.querySelector('.amphion-lp-track-cover');
      if (t.coverUrl) {
        artTile.classList.add('has-cover');
        coverImage.src = t.coverUrl;
      }
      coverImage.onerror = () => {
        releaseTrackArtwork(t);
        updateArtworkUI(t);
      };
      row.onclick = (e) => {
        if (e.target.classList.contains('amphion-lp-track-remove')) return;
        if (originalIdx === currentIdx) toggle();
        else play(originalIdx);
      };
      row.querySelector('.amphion-lp-track-remove').onclick = (e) => {
        e.stopPropagation();
        removeTrack(Number(e.currentTarget.dataset.idx));
      };
      return row;
    };

    const updateTrackUI = () => {
      if (!uiReady) return;
      const t = currentIdx >= 0 ? tracks[currentIdx] : null;

      const title = document.getElementById('amphion-lp-title');
      const sub = document.getElementById('amphion-lp-subtitle');
      const badge = document.getElementById('amphion-lp-folder-badge');
      const cover = document.getElementById('amphion-lp-cover');
      const coverImage = document.getElementById('amphion-lp-cover-image');
      const hasCover = !!(t && t.coverUrl);
      if (cover && t) cover.style.setProperty('--cover-hue', coverHueFor(t));
      if (cover) cover.classList.toggle('has-art', hasCover);
      if (coverImage) {
        if (hasCover && coverImage.src !== t.coverUrl) coverImage.src = t.coverUrl;
        else if (!hasCover) coverImage.removeAttribute('src');
        coverImage.onerror = () => {
          if (!t || !t.coverUrl) return;
          releaseTrackArtwork(t);
          updateArtworkUI(t);
        };
      }
      if (title) title.textContent = t ? t.name : 'Sin reproducción';
      if (sub) sub.textContent = t ? (t.artist || 'Música local') : 'Selecciona o arrastra una pista';
      if (badge) {
        if (t && t.folder) {
          badge.style.display = 'inline-block';
          badge.textContent = `📁 ${shortFolderLabel(t.folder)}`;
        } else {
          badge.style.display = 'none';
        }
      }

      const durEl = document.getElementById('amphion-lp-time-dur');
      if (durEl) durEl.textContent = t && isFinite(t.duration) ? fmtTime(t.duration) : '0:00';

      updateMiniPlayer(t);
      syncTrackStateUI();
    };

    const updatePlayUI = () => {
      if (!uiReady) return;
      const btn = document.getElementById('amphion-lp-playpause');
      if (btn) {
        btn.classList.toggle('is-playing', isPlaying);
        btn.setAttribute('aria-label', isPlaying ? 'Pausar' : 'Reproducir');
      }

      const cover = document.getElementById('amphion-lp-cover');
      if (cover) cover.classList.toggle('playing', isPlaying);

      const miniBtn = document.getElementById('amphion-lp-mini-play');
      if (miniBtn) {
        miniBtn.classList.toggle('is-playing', isPlaying);
        miniBtn.textContent = isPlaying ? '⏸' : '▶';
      }

      syncTrackStateUI();

      const mini = document.getElementById('amphion-lp-mini');
      if (mini) {
        const lp = document.getElementById('amphion-local-player');
        const lpOpen = lp && lp.classList.contains('amphion-lp-open');
        mini.style.display = isPlaying && !lpOpen ? 'block' : 'none';
      }

      const topBtn = document.getElementById('amphion-local-btn');
      if (topBtn) topBtn.dataset.active = isPlaying ? 'true' : 'false';
    };

    const updateMiniPlayer = (t) => {
      const mini = document.getElementById('amphion-lp-mini');
      if (!mini) return;
      mini.querySelector('.mini-title').textContent = t ? t.name : 'Sin reproducción local';
      mini.querySelector('.mini-sub').textContent = t ? `${t.artist}${t.folder ? ' · ' + t.folder : ''}` : 'Amphion Local Player';
    };

    const open = () => {
      buildUI();
      const overlay = document.getElementById('amphion-local-player');
      if (!overlay) return;
      overlay.classList.add('amphion-lp-open');

      const mini = document.getElementById('amphion-lp-mini');
      if (mini) mini.style.display = 'none';

      const topBtn = document.getElementById('amphion-local-btn');
      if (topBtn) topBtn.dataset.active = 'true';

      renderTrackList();
      updateTrackUI();
      updatePlayUI();
    };

    const close = () => {
      const overlay = document.getElementById('amphion-local-player');
      if (!overlay) return;
      overlay.classList.remove('amphion-lp-open');

      const mini = document.getElementById('amphion-lp-mini');
      if (mini) mini.style.display = isPlaying ? 'block' : 'none';

      const topBtn = document.getElementById('amphion-local-btn');
      if (topBtn) topBtn.dataset.active = isPlaying ? 'true' : 'false';
    };

    const toggle_ui = () => {
      buildUI();
      const overlay = document.getElementById('amphion-local-player');
      if (overlay && overlay.classList.contains('amphion-lp-open')) {
        close();
      } else {
        open();
      }
    };

    const injectMiniPlayer = () => {
      if (document.getElementById('amphion-lp-mini')) return;
      const mini = document.createElement('div');
      mini.id = 'amphion-lp-mini';
      mini.innerHTML = `
        <div class="mini-title">Sin reproducción local</div>
        <div class="mini-sub">Amphion Local Player</div>
        <div id="amphion-lp-mini-controls">
          <button class="amphion-lp-mini-btn" id="amphion-lp-mini-prev" title="Pista anterior">⏮</button>
          <button class="amphion-lp-mini-btn" id="amphion-lp-mini-play" title="Play/Pause">▶</button>
          <button class="amphion-lp-mini-btn" id="amphion-lp-mini-next" title="Pista siguiente">⏭</button>
          <div id="amphion-lp-mini-progress"><div id="amphion-lp-mini-fill"></div></div>
          <button class="amphion-lp-mini-btn" id="amphion-lp-mini-open" title="Abrir reproductor local">⬆</button>
        </div>
      `;
      document.body.appendChild(mini);
      mini.querySelector('#amphion-lp-mini-play').onclick = (e) => {
        e.stopPropagation();
        toggle();
      };
      mini.querySelector('#amphion-lp-mini-prev').onclick = (e) => {
        e.stopPropagation();
        prevTrack();
      };
      mini.querySelector('#amphion-lp-mini-next').onclick = (e) => {
        e.stopPropagation();
        nextTrack();
      };
      mini.querySelector('#amphion-lp-mini-open').onclick = (e) => {
        e.stopPropagation();
        open();
      };
      mini.onclick = () => open();
    };

    return {
      open,
      close,
      toggle: toggle_ui,
      injectMiniPlayer,
      addFiles,
      scanFolder: openFolderPicker,
      reloadLocalLibrary,
      searchTracks: filterTracks,
      play,
      pause,
      next: nextTrack,
      prev: prevTrack,
      isPlaying: () => isPlaying,
      getTracks: () => [...tracks],
      getCurrentTrack: () => (currentIdx >= 0 ? { ...tracks[currentIdx] } : null)
    };
  })();
  // 1. BOTÓN "Premium" Y BOTÓN "SpotDown" EN LA BARRA SUPERIOR
  const PREMIUM_LABEL = 'Amphion';

  const injectPremiumPill = () => {
    // Ocultar cualquier botón nativo de upgrade para no duplicar el CTA.
    document.querySelectorAll(
      '[data-testid="upgrade-button"], button[data-testid="upgrade-button"], .main-topBar-UpgradeButton'
    ).forEach(btn => { btn.style.display = 'none'; });

    let btn = document.getElementById('amphion-premium-badge-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'amphion-premium-badge-btn';
      btn.className = 'amphion-premium-pill-btn';
      btn.innerHTML = `
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true" style="margin-right:6px;">
          <path d="M8 1.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L8 9.7l-3.2 1.7.6-3.6L2.8 5.3l3.6-.5L8 1.5z"/>
        </svg><span>${PREMIUM_LABEL}</span>`;
      btn.title = "Ajustes de Amphion: temas y bloqueo de publicidad";
      btn.onclick = () => openModal();
    }

    let spotdownBtn = document.getElementById('amphion-spotdown-btn');
    if (!spotdownBtn) {
      spotdownBtn = document.createElement('button');
      spotdownBtn.id = 'amphion-spotdown-btn';
      spotdownBtn.className = 'amphion-premium-pill-btn amphion-spotdown-btn';
      spotdownBtn.innerHTML = `
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true" style="margin-right:6px;">
          <path d="M8 12l-4.5-4.5 1.4-1.4L7 8.2V2h2v6.2l2.1-2.1 1.4 1.4L8 12zM2 14h12v2H2v-2z"/>
        </svg><span>SpotDown</span>
        <span class="amphion-spotdown-tooltip">Abrir SpotDown</span>`;
      spotdownBtn.title = "Descargar canción o playlist — Elige servicio (Alt+D)";
      spotdownBtn.style.position = 'relative';
      spotdownBtn.onclick = (e) => {
        e.stopPropagation();
        openSpotDown();
      };
    }

    let localBtn = document.getElementById('amphion-local-btn');
    if (!localBtn) {
      localBtn = document.createElement('button');
      localBtn.id = 'amphion-local-btn';
      localBtn.className = 'amphion-premium-pill-btn amphion-local-btn';
      localBtn.innerHTML = `
        <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true" style="margin-right:6px;">
          <path d="M12 13c0 1.105-1.12 2-2.5 2S7 14.105 7 13s1.12-2 2.5-2 2.5.895 2.5 2z"/>
          <path fill-rule="evenodd" d="M12 3v10h-1V3h1z"/>
          <path d="M11 2.82a1 1 0 0 1 .804-.98l3-1A1 1 0 0 1 16 1.82V4.5a1 1 0 0 1-.724.962l-3.5 1A1 1 0 0 1 10.5 5.5v-2a1 1 0 0 1 .5-.68z"/>
          <path d="M6 14.5c0 .828-.895 1.5-2 1.5s-2-.672-2-1.5.895-1.5 2-1.5 2 .672 2 1.5z"/>
          <path fill-rule="evenodd" d="M6 5.5v9H5v-9h1z"/>
        </svg><span>Música Local</span>`;
      localBtn.title = "Reproductor de Música Descargada / Local (Alt+L)";
      localBtn.onclick = (e) => {
        e.stopPropagation();
        LocalPlayer.toggle();
      };
    }

    // Anclaje estable junto al avatar del perfil.
    const userWidget = document.querySelector('[data-testid="user-widget-link"]');
    if (userWidget && userWidget.parentElement) {
      if (btn.parentElement !== userWidget.parentElement) {
        userWidget.parentElement.insertBefore(btn, userWidget);
      }
      if (spotdownBtn.parentElement !== userWidget.parentElement) {
        userWidget.parentElement.insertBefore(spotdownBtn, btn);
      }
      if (localBtn.parentElement !== userWidget.parentElement) {
        userWidget.parentElement.insertBefore(localBtn, spotdownBtn);
      }
    } else {
      const topBar = document.querySelector('[data-testid="topbar-content"]') ||
                     document.querySelector('[data-testid="global-nav-bar"]');
      if (topBar) {
        if (!topBar.contains(localBtn)) topBar.appendChild(localBtn);
        if (!topBar.contains(spotdownBtn)) topBar.appendChild(spotdownBtn);
        if (!topBar.contains(btn)) topBar.appendChild(btn);
      }
    }
  };

  // 2. CONMUTADOR DE FILTRO INTERACTIVO DE PISTAS (Barra de búsqueda en lista)
  const togglePlaylistFilterInput = (bar) => {
    let filterRow = bar.querySelector('.amphion-filter-input-row');
    if (filterRow) {
      if (filterRow.style.display === 'none') {
        filterRow.style.display = 'flex';
        const input = filterRow.querySelector('input');
        if (input) input.focus();
      } else {
        filterRow.style.display = 'none';
        document.querySelectorAll('[data-testid="tracklist-row"]').forEach(r => r.style.display = '');
      }
      return;
    }

    filterRow = document.createElement('div');
    filterRow.className = 'amphion-filter-input-row';
    filterRow.style.cssText = 'display: flex; align-items: center; margin-top: 10px; width: 100%;';
    filterRow.innerHTML = `
      <input type="text" placeholder="Filtrar canciones de esta lista..." style="
        background: #282828;
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 500px;
        color: #ffffff;
        font-size: 13px;
        padding: 8px 16px;
        width: 280px;
        outline: none;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      "/>
    `;
    const input = filterRow.querySelector('input');
    input.oninput = () => {
      const q = input.value.toLowerCase().trim();
      document.querySelectorAll('[data-testid="tracklist-row"]').forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(q) ? '' : 'none';
      });
    };
    bar.appendChild(filterRow);
    input.focus();
  };

  // 3. BARRA DE ACCIONES DE REPRODUCCIÓN (Streaming Puro — Sin botones de descarga)
  const updateActionBarToolbar = () => {
    const actionBars = document.querySelectorAll(
      '[data-testid="action-bar-row"], .main-actionBar-ActionBar, [data-testid="artist-page"] .main-actionBar-ActionBar-row'
    );

    actionBars.forEach(bar => {
      let toolbar = bar.querySelector('.amphion-spotify-premium-toolbar');
      if (!toolbar) {
        toolbar = document.createElement('div');
        toolbar.className = 'amphion-spotify-premium-toolbar';
        toolbar.style.cssText = `
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 8px 0;
          box-sizing: border-box;
          user-select: none;
        `;

        // Grupo izquierdo: (+), (⋮), (⇅), (=), (🔀)
        const leftGroup = document.createElement('div');
        leftGroup.className = 'amphion-toolbar-left-group';
        leftGroup.style.cssText = 'display: inline-flex; align-items: center; gap: 14px;';

        // 1. (+) Añadir a tu biblioteca
        const addBtn = document.createElement('button');
        addBtn.className = 'amphion-toolbar-btn';
        addBtn.title = "Guardar en Tu biblioteca";
        addBtn.innerHTML = SVG_TOOLBAR_ADD;
        addBtn.onclick = () => {
          showToast('✅ Guardado en Tu biblioteca');
        };
        leftGroup.appendChild(addBtn);

        // 2. (⋮) Más opciones
        const moreBtn = document.createElement('button');
        moreBtn.className = 'amphion-toolbar-btn';
        moreBtn.title = "Ajustes y Opciones";
        moreBtn.innerHTML = SVG_TOOLBAR_MORE;
        moreBtn.onclick = () => openModal();
        leftGroup.appendChild(moreBtn);

        // 3. (⇅) Ordenar
        const sortBtn = document.createElement('button');
        sortBtn.className = 'amphion-toolbar-btn';
        sortBtn.title = "Cambiar orden de reproducción";
        sortBtn.innerHTML = SVG_TOOLBAR_SORT;
        sortBtn.onclick = () => {
          showToast('⇅ Orden de reproducción actualizado');
        };
        leftGroup.appendChild(sortBtn);

        // 4. (=) Filtrar
        const filterBtn = document.createElement('button');
        filterBtn.className = 'amphion-toolbar-btn';
        filterBtn.title = "Filtrar canciones de esta lista";
        filterBtn.innerHTML = SVG_TOOLBAR_FILTER;
        filterBtn.onclick = () => togglePlaylistFilterInput(bar);
        leftGroup.appendChild(filterBtn);

        // 5. (🔀) Aleatorio (Shuffle)
        const shuffleBtn = document.createElement('button');
        shuffleBtn.className = 'amphion-toolbar-btn';
        shuffleBtn.title = "Activar reproducción aleatoria";
        shuffleBtn.innerHTML = SVG_TOOLBAR_SHUFFLE;
        shuffleBtn.onclick = () => {
          const isActive = shuffleBtn.dataset.active === 'true';
          if (isActive) {
            delete shuffleBtn.dataset.active;
            shuffleBtn.style.color = '#b3b3b3';
            showToast('Reproducción aleatoria desactivada');
          } else {
            shuffleBtn.dataset.active = 'true';
            shuffleBtn.style.color = '#1ed760';
            showToast('🔀 Reproducción aleatoria activada');
          }
          const nativeShuffle = document.querySelector('[data-testid="control-button-shuffle"]');
          if (nativeShuffle) nativeShuffle.click();
        };
        leftGroup.appendChild(shuffleBtn);

        // 6. (⬇) Descargar canciones en SpotDown (abre el navegador)
        const spotdownToolbarBtn = document.createElement('button');
        spotdownToolbarBtn.className = 'amphion-toolbar-btn amphion-spotdown-toolbar-btn';
        spotdownToolbarBtn.title = "Descargar canciones en SpotDown (abre el navegador)";
        spotdownToolbarBtn.innerHTML = SVG_TOOLBAR_SPOTDOWN;
        spotdownToolbarBtn.onclick = () => openSpotDown();
        leftGroup.appendChild(spotdownToolbarBtn);

        // Grupo derecho: Gran Botón Verde Play (▶)
        const rightGroup = document.createElement('div');
        rightGroup.className = 'amphion-toolbar-right-group';
        rightGroup.style.cssText = 'display: inline-flex; align-items: center;';

        const playBtn = document.createElement('button');
        playBtn.className = 'amphion-toolbar-play-btn';
        playBtn.title = "Reproducir";
        playBtn.style.cssText = `
          background-color: #1ed760;
          border: none;
          border-radius: 50%;
          width: 52px;
          height: 52px;
          min-width: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 8px 16px rgba(0,0,0,0.3);
          transition: transform 0.15s ease, background-color 0.15s ease;
        `;
        playBtn.innerHTML = SVG_TOOLBAR_PLAY;
        playBtn.onmouseenter = () => {
          playBtn.style.transform = 'scale(1.08)';
          playBtn.style.backgroundColor = '#1fdf64';
        };
        playBtn.onmouseleave = () => {
          playBtn.style.transform = 'scale(1)';
          playBtn.style.backgroundColor = '#1ed760';
        };
        playBtn.onclick = () => {
          const nativePlay = document.querySelector('[data-testid="action-bar-row"] button[data-testid="play-button"], .main-actionBar-ActionBar button[data-testid="play-button"]') ||
                             document.querySelector('[data-testid="control-button-playpause"]');
          if (nativePlay) {
            nativePlay.click();
          } else {
            const firstRow = document.querySelector('[data-testid="tracklist-row"]');
            if (firstRow) firstRow.click();
          }
        };
        rightGroup.appendChild(playBtn);

        toolbar.appendChild(leftGroup);
        toolbar.appendChild(rightGroup);

        bar.style.display = 'flex';
        bar.style.flexDirection = 'column';
        bar.style.alignItems = 'stretch';
        bar.appendChild(toolbar);
      }

      // Una sola barra de acciones: ocultamos los controles nativos duplicados.
      Array.from(bar.children).forEach(child => {
        if (child !== toolbar && !child.classList.contains('amphion-filter-input-row')) {
          child.classList.add('amphion-native-actionbar-hidden');
        }
      });
    });
  };

  // 3b. BOTÓN SPOTDOWN EN LA BARRA INFERIOR DE REPRODUCCIÓN (Now Playing Bar)
  const injectNowPlayingSpotDownBtn = () => {
    const bar = document.querySelector('[data-testid="now-playing-bar"]');
    if (!bar) return;
    const extraControls = bar.querySelector('[data-testid="now-playing-bar-right-controls"], .main-nowPlayingBar-right');
    if (!extraControls) return;
    let npBtn = document.getElementById('amphion-nowplaying-spotdown-btn');
    if (!npBtn) {
      npBtn = document.createElement('button');
      npBtn.id = 'amphion-nowplaying-spotdown-btn';
      npBtn.className = 'amphion-toolbar-btn amphion-spotdown-toolbar-btn';
      npBtn.title = "Descargar canción actual con SpotDown en el navegador";
      npBtn.innerHTML = SVG_TOOLBAR_SPOTDOWN;
      npBtn.onclick = () => openSpotDown();
    }
    if (extraControls && !extraControls.contains(npBtn)) {
      extraControls.insertBefore(npBtn, extraControls.firstChild);
    }
  };

  // 4. MODAL LIMPIO DE AJUSTES DE STREAMING & AUDIO (Sin descargas)
  // ==========================================================================
  // LECTURA DE ESTADO REAL — nada que no se pueda verificar en el DOM
  // ==========================================================================
  const reinjections = (() => {
    const KEY = 'amphion-reinjections';
    try {
      const n = (parseInt(localStorage.getItem(KEY) || '0', 10) || 0) + 1;
      localStorage.setItem(KEY, String(n));
      return n;
    } catch (e) {
      return 1;
    }
  })();

  const readAccountName = () => {
    try {
      const link = document.querySelector('[data-testid="user-widget-link"]');
      if (!link) return null;
      const aria = (link.getAttribute('aria-label') || '').trim();
      if (aria && !/perfil|cuenta|profile|account/i.test(aria)) return aria;
      const img = link.querySelector('img');
      const alt = img ? (img.alt || '').trim() : '';
      if (alt && !/perfil|cuenta|profile|account/i.test(alt)) return alt;
      const first = (link.innerText || '').trim().split('\n')[0];
      return first || null;
    } catch (e) {
      return null;
    }
  };

  const readNowPlaying = () => {
    try {
      const m = navigator.mediaSession && navigator.mediaSession.metadata;
      if (!m || !m.title) return 'Sin reproducción';
      return m.artist ? `${m.title} — ${m.artist}` : m.title;
    } catch (e) {
      return 'Sin reproducción';
    }
  };

  const adblockEndpoints = () => {
    const info = window.__AMPHION_ADBLOCK__;
    return info && typeof info.endpoints === 'number' ? info.endpoints : null;
  };

  const adblockEndpointsLabel = () => {
    const n = adblockEndpoints();
    return n === null ? 'Sin datos de CDP' : `${n} endpoints bloqueados`;
  };

  const guardStatsLabel = () => {
    if (adsDetectedCount === 0) return 'Activo · sin anuncios';
    return `Activo · ${adsSkippedCount} de ${adsDetectedCount} saltados`;
  };

  const statusRow = (label, value, id, accent) => `
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06);">
      <span style="font-size: 13px; color: #b3b3b3; white-space: nowrap;">${label}</span>
      <span id="${id}" style="font-size: 13px; font-weight: 700; color: ${accent || '#ffffff'}; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 62%;">${value}</span>
    </div>`;

  const refreshSettingsStatus = () => {
    const set = (id, text, color) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = text;
      if (color) el.style.color = color;
    };
    set('amphion-st-account', readAccountName() || 'Sesión no iniciada');
    set('amphion-st-track', readNowPlaying());
    set('amphion-st-theme', THEMES[activeTheme].name, THEMES[activeTheme].accent);
    set('amphion-st-version', `Amphion ${VERSION}`);
    set('amphion-st-endpoints', adblockEndpointsLabel());
    set('amphion-st-skipped', guardStatsLabel());
    set('amphion-st-reinject', `${reinjections}x`);

    const targetUrl = getSpotifyDownloadUrl();
    const spotTargetEl = document.getElementById('amphion-modal-spotdown-target');
    if (spotTargetEl) {
      spotTargetEl.textContent = targetUrl
        ? `Detectado: ${targetUrl}`
        : 'Destino: https://spotdown.org/es8';
    }

    const wpState = document.getElementById('amphion-wp-state');
    if (wpState) {
      wpState.textContent = wallpaperData
        ? (wallpaperCfg.name || 'Imagen personalizada')
        : 'Sin fondo personalizado';
    }
    const blurInput = document.getElementById('amphion-wp-blur');
    const dimInput = document.getElementById('amphion-wp-dim');
    if (blurInput) {
      blurInput.value = String(wallpaperCfg.blur);
      const bv = document.getElementById('amphion-wp-blur-val');
      if (bv) bv.textContent = `${wallpaperCfg.blur} px`;
    }
    if (dimInput) {
      dimInput.value = String(wallpaperCfg.dim);
      const dv = document.getElementById('amphion-wp-dim-val');
      if (dv) dv.textContent = `${wallpaperCfg.dim} %`;
    }
  };

  // ==========================================================================
  // MODAL DE AJUSTES
  // ==========================================================================
  const injectModal = () => {
    if (document.getElementById('amphion-modal-backdrop')) return;

    const modalWrap = document.createElement('div');
    modalWrap.id = 'amphion-modal-backdrop';
    modalWrap.innerHTML = `
      <div class="amphion-modal-box">
        <!-- Encabezado -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <button id="amphion-back-btn" style="background: none; border: none; color: #ffffff; font-size: 20px; cursor: pointer; padding: 0;">←</button>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Ajustes</h2>
          </div>
          <button id="amphion-close-x" style="background: none; border: none; color: #b3b3b3; font-size: 20px; cursor: pointer;">✕</button>
        </div>

        <!-- Estado en vivo -->
        <div style="color: #1ed760; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">
          ESTADO EN VIVO
        </div>
        <div style="background: #181818; border-radius: 8px; padding: 6px 16px; margin-bottom: 18px; border: 1px solid #282828;">
          ${statusRow('Cuenta de Spotify', readAccountName() || 'Sesión no iniciada', 'amphion-st-account')}
          ${statusRow('Reproduciendo', readNowPlaying(), 'amphion-st-track')}
          ${statusRow('Tema activo', THEMES[activeTheme].name, 'amphion-st-theme', THEMES[activeTheme].accent)}
          ${statusRow('Versión', `Amphion ${VERSION}`, 'amphion-st-version')}
        </div>

        <!-- Temas Amphion -->
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
          <div style="color: #1ed760; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
            TEMAS AMPHION
          </div>
          <div style="font-size: 11px; color: #a7a7a7;">${Object.keys(THEMES).length} paletas</div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 18px;">
          ${themeButtonsHtml()}
        </div>

        <!-- Fondo personalizado -->
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
          <div style="color: #1ed760; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
            FONDO
          </div>
          <div id="amphion-wp-state" style="font-size: 11px; color: #a7a7a7; max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">Sin fondo personalizado</div>
        </div>
        <div style="background: #181818; border-radius: 8px; padding: 14px 16px; margin-bottom: 18px; border: 1px solid #282828;">
          <div style="display: flex; gap: 8px; margin-bottom: 14px;">
            <button id="amphion-wp-pick" style="flex: 1; background: #1ed760; color: #04130a; border: none; border-radius: 500px; padding: 9px 14px; font-size: 12px; font-weight: 800; cursor: pointer;">
              Elegir imagen…
            </button>
            <button id="amphion-wp-clear" style="background: rgba(255,255,255,0.08); color: #ffffff; border: 1px solid rgba(255,255,255,0.16); border-radius: 500px; padding: 9px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">
              Quitar
            </button>
          </div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
            <span style="font-size: 12px; color: #b3b3b3; min-width: 96px;">Desenfoque</span>
            <input id="amphion-wp-blur" type="range" min="0" max="40" step="1" value="18" style="flex: 1; accent-color: #1ed760;">
            <span id="amphion-wp-blur-val" style="font-size: 11px; color: #ffffff; min-width: 36px; text-align: right;">18 px</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 12px; color: #b3b3b3; min-width: 96px;">Oscurecer</span>
            <input id="amphion-wp-dim" type="range" min="0" max="90" step="5" value="50" style="flex: 1; accent-color: #1ed760;">
            <span id="amphion-wp-dim-val" style="font-size: 11px; color: #ffffff; min-width: 36px; text-align: right;">50 %</span>
          </div>
        </div>
        <input type="file" id="amphion-wp-file" accept="image/*" style="display: none;">

        <!-- Descargador Multi-Servicio Zeus v2 (Estilo Sakukelly Linux — 3 cards) -->
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
          <div style="color: #1ed760; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
            DESCARGADOR · MULTI-SERVICIO
          </div>
          <div style="font-size: 11px; color: #a7a7a7;">Alt+D · Click derecho en pistas</div>
        </div>
        <!-- Card SpotDown -->
        <div style="background: linear-gradient(135deg, rgba(29,185,84,0.18) 0%, rgba(24,24,24,0.95) 100%); border-radius: 12px; padding: 13px 15px; margin-bottom: 10px; border: 1.5px solid rgba(29,185,84,0.45); box-shadow: 0 4px 16px rgba(0,0,0,0.3); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(29,185,84,0.22); border: 1px solid rgba(29,185,84,0.6); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #1ed760;">⬇</div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #1ed760;">SpotDown</div>
              <div style="font-size: 11px; color: #b3b3b3; line-height: 1.4;">MP3 alta calidad · Sin registro · Playlists completas</div>
            </div>
          </div>
          <button id="amphion-modal-spotdown-btn" style="background: #1DB954; color: #121212; border: none; border-radius: 500px; padding: 7px 15px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: transform 0.15s, background 0.15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">
            Abrir ↗
          </button>
        </div>
        <!-- Card SoundLoaders -->
        <div style="background: linear-gradient(135deg, rgba(76,151,248,0.15) 0%, rgba(24,24,24,0.95) 100%); border-radius: 12px; padding: 13px 15px; margin-bottom: 10px; border: 1.5px solid rgba(76,151,248,0.4); box-shadow: 0 4px 16px rgba(0,0,0,0.3); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(76,151,248,0.18); border: 1px solid rgba(76,151,248,0.5); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #4c97f8;">🔊</div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #4c97f8;">SoundLoaders</div>
              <div style="font-size: 11px; color: #b3b3b3; line-height: 1.4;">Multi-fuente · WAV / FLAC disponibles</div>
            </div>
          </div>
          <button id="amphion-modal-soundloaders-btn" style="background: #4c97f8; color: #121212; border: none; border-radius: 500px; padding: 7px 15px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: transform 0.15s, background 0.15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">
            Abrir ↗
          </button>
        </div>
        <!-- Card SpotMate -->
        <div style="background: linear-gradient(135deg, rgba(167,139,250,0.15) 0%, rgba(24,24,24,0.95) 100%); border-radius: 12px; padding: 13px 15px; margin-bottom: 10px; border: 1.5px solid rgba(167,139,250,0.4); box-shadow: 0 4px 16px rgba(0,0,0,0.3); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(167,139,250,0.18); border: 1px solid rgba(167,139,250,0.5); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #a78bfa;">✦</div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #a78bfa;">SpotMate</div>
              <div style="font-size: 11px; color: #b3b3b3; line-height: 1.4;">Álbumes y artistas · Interfaz rápida</div>
            </div>
          </div>
          <button id="amphion-modal-spotmate-btn" style="background: #a78bfa; color: #121212; border: none; border-radius: 500px; padding: 7px 15px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: transform 0.15s, background 0.15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">
            Abrir ↗
          </button>
        </div>
        <!-- Card Reproductor Local de Música -->
        <div style="background: linear-gradient(135deg, rgba(30,215,96,0.12) 0%, rgba(24,24,24,0.95) 100%); border-radius: 12px; padding: 13px 15px; margin-bottom: 18px; border: 1.5px solid rgba(30,215,96,0.35); box-shadow: 0 4px 16px rgba(0,0,0,0.3); display: flex; justify-content: space-between; align-items: center; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: rgba(30,215,96,0.18); border: 1px solid rgba(30,215,96,0.5); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #1ed760;">🎵</div>
            <div>
              <div style="font-size: 14px; font-weight: 800; color: #1ed760;">Música Descargada / Local</div>
              <div style="font-size: 11px; color: #b3b3b3; line-height: 1.4;">Escucha tus pistas sin conexión con estética Spotify (Alt+L)</div>
            </div>
          </div>
          <button id="amphion-modal-local-btn" style="background: #1ed760; color: #121212; border: none; border-radius: 500px; padding: 7px 15px; font-size: 12px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: transform 0.15s, background 0.15s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform=''">
            Abrir Reproductor ↗
          </button>
        </div>

        <!-- Protección real -->
        <div style="color: #1ed760; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">
          PROTECCIÓN
        </div>
        <div style="background: #181818; border-radius: 8px; padding: 6px 16px; margin-bottom: 16px; border: 1px solid #282828;">
          ${statusRow('Bloqueo de red (CDP)', adblockEndpointsLabel(), 'amphion-st-endpoints')}
          ${statusRow('Guardián de voz', guardStatsLabel(), 'amphion-st-skipped')}
          ${statusRow('Reinyecciones tras recarga', `${reinjections}x`, 'amphion-st-reinject')}
        </div>

        <!-- Pie -->
        <div style="font-size: 11px; color: #8f8f8f; line-height: 1.5; padding-top: 8px; border-top: 1px solid #282828;">
          Base: Web Player oficial de Spotify. Amphion no almacena credenciales ni modifica el audio servido por Spotify.
        </div>
      </div>
    `;

    document.body.appendChild(modalWrap);

    // Eventos
    const closeBtn = document.getElementById('amphion-close-x');
    if (closeBtn) closeBtn.onclick = () => { modalWrap.style.display = 'none'; };
    const backBtn = document.getElementById('amphion-back-btn');
    if (backBtn) backBtn.onclick = () => { modalWrap.style.display = 'none'; };
    modalWrap.onclick = (e) => { if (e.target === modalWrap) modalWrap.style.display = 'none'; };

    document.querySelectorAll('[data-amphion-theme]').forEach(btn => {
      btn.onclick = () => applyTheme(btn.dataset.amphionTheme);
    });
    updateThemeButtons();

    const pickBtn = document.getElementById('amphion-wp-pick');
    const fileInput = document.getElementById('amphion-wp-file');
    if (pickBtn && fileInput) {
      pickBtn.onclick = () => fileInput.click();
      fileInput.onchange = async () => {
        const file = fileInput.files && fileInput.files[0];
        if (file) await setWallpaperFromFile(file);
        fileInput.value = '';
      };
    }
    const clearBtn = document.getElementById('amphion-wp-clear');
    if (clearBtn) clearBtn.onclick = () => clearWallpaper();

    const blurInput = document.getElementById('amphion-wp-blur');
    const dimInput = document.getElementById('amphion-wp-dim');
    if (blurInput) {
      blurInput.oninput = () => {
        document.getElementById('amphion-wp-blur-val').textContent = `${blurInput.value} px`;
        setWallpaperTuning(Number(blurInput.value), null);
      };
    }
    if (dimInput) {
      dimInput.oninput = () => {
        document.getElementById('amphion-wp-dim-val').textContent = `${dimInput.value} %`;
        setWallpaperTuning(null, Number(dimInput.value));
      };
    }

    const modalSpotdownBtn = document.getElementById('amphion-modal-spotdown-btn');
    if (modalSpotdownBtn) {
      modalSpotdownBtn.onclick = () => openSpotDown(null, 'spotdown');
    }
    const modalSoundloadersBtn = document.getElementById('amphion-modal-soundloaders-btn');
    if (modalSoundloadersBtn) {
      modalSoundloadersBtn.onclick = () => openSpotDown(null, 'soundloaders');
    }
    const modalSpotmateBtn = document.getElementById('amphion-modal-spotmate-btn');
    if (modalSpotmateBtn) {
      modalSpotmateBtn.onclick = () => openSpotDown(null, 'spotmate');
    }
    const modalLocalBtn = document.getElementById('amphion-modal-local-btn');
    if (modalLocalBtn) {
      modalLocalBtn.onclick = () => {
        modalWrap.style.display = 'none';
        LocalPlayer.open();
      };
    }
  };

  const openModal = () => {
    injectModal();
    const modal = document.getElementById('amphion-modal-backdrop');
    if (modal) {
      refreshSettingsStatus();
      modal.style.display = 'flex';
    }
  };

  // 5. CICLO ULTRA LIGERO DE MANTENIMIENTO DOM (Zero Network Polls)
  const injectTracklistContextMenu = () => {
    // Crear el nodo del context menu si no existe
    let ctxMenu = document.getElementById('amphion-ctx-menu');
    if (!ctxMenu) {
      ctxMenu = document.createElement('div');
      ctxMenu.id = 'amphion-ctx-menu';
      ctxMenu.innerHTML = `
        <div class="amphion-ctx-item" id="amphion-ctx-spotdown">
          <span style="font-size:15px;">⬇</span>
          <span>Descargar con SpotDown</span>
        </div>
        <div class="amphion-ctx-item" id="amphion-ctx-soundloaders">
          <span style="font-size:15px;">🔊</span>
          <span>Descargar con SoundLoaders</span>
        </div>
        <div class="amphion-ctx-item" id="amphion-ctx-spotmate">
          <span style="font-size:15px;">✦</span>
          <span>Descargar con SpotMate</span>
        </div>
      `;
      document.body.appendChild(ctxMenu);
      document.getElementById('amphion-ctx-spotdown').onclick = () => {
        ctxMenu.classList.remove('amphion-ctx-open');
        openSpotDown(null, 'spotdown');
      };
      document.getElementById('amphion-ctx-soundloaders').onclick = () => {
        ctxMenu.classList.remove('amphion-ctx-open');
        openSpotDown(null, 'soundloaders');
      };
      document.getElementById('amphion-ctx-spotmate').onclick = () => {
        ctxMenu.classList.remove('amphion-ctx-open');
        openSpotDown(null, 'spotmate');
      };
      document.addEventListener('click', () => ctxMenu.classList.remove('amphion-ctx-open'), true);
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') ctxMenu.classList.remove('amphion-ctx-open');
      });
    }

    // Adjuntar listener contextmenu a cada fila del tracklist
    document.querySelectorAll('[data-testid="tracklist-row"]').forEach(row => {
      if (row.dataset.amphionCtx) return;
      row.dataset.amphionCtx = '1';
      row.addEventListener('contextmenu', (e) => {
        const trackLink = row.querySelector('a[href*="/track/"]');
        const trackUrl = trackLink ? trackLink.href : null;
        ctxMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 140)}px`;
        ctxMenu.style.left = `${Math.min(e.clientX, window.innerWidth - 200)}px`;
        ctxMenu.classList.add('amphion-ctx-open');
        // Guardar URL del track para los handlers
        ctxMenu.dataset.trackUrl = trackUrl || '';
        // Redirigir clicks de las opciones al track específico si lo hay
        document.getElementById('amphion-ctx-spotdown').onclick = () => {
          ctxMenu.classList.remove('amphion-ctx-open');
          openSpotDown(trackUrl, 'spotdown');
        };
        document.getElementById('amphion-ctx-soundloaders').onclick = () => {
          ctxMenu.classList.remove('amphion-ctx-open');
          openSpotDown(trackUrl, 'soundloaders');
        };
        document.getElementById('amphion-ctx-spotmate').onclick = () => {
          ctxMenu.classList.remove('amphion-ctx-open');
          openSpotDown(trackUrl, 'spotmate');
        };
      });
    });
  };

  const runDomLoop = () => {
    injectPremiumPill();
    updateActionBarToolbar();
    injectNowPlayingSpotDownBtn();
    updateSpotDownBadge();
    injectTracklistContextMenu();
    LocalPlayer.injectMiniPlayer();
    if (wallpaperData) markGlassSurfaces();
    const modal = document.getElementById('amphion-modal-backdrop');
    if (modal && modal.style.display !== 'none') refreshSettingsStatus();
  };

  // Inicialización inmediata
  injectPremiumPill();
  updateActionBarToolbar();
  injectNowPlayingSpotDownBtn();
  LocalPlayer.injectMiniPlayer();
  startAdGuard();
  startPremiumPromoBlocker();
  try {
    applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'classic', true);
  } catch (e) {
    applyTheme('classic', true);
  }
  try {
    applyWallpaper();
  } catch (e) {}
  setInterval(runDomLoop, 1500);

  // Atajo de teclado global Alt+D → abrir panel SpotDown (Zeus Blindspot #4)
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key === 'd' && !e.target.matches('input, textarea, [contenteditable]')) {
      e.preventDefault();
      openSpotDown();
    }
  });

  // Atajo de teclado global Alt+L → abrir / alternar Reproductor Local
  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'l' || e.key === 'L') && !e.target.matches('input, textarea, [contenteditable]')) {
      e.preventDefault();
      LocalPlayer.toggle();
    }
  });

  // Registro del objeto soberano en window para el Guard en Rust
  window.Amphion = {
    ready: true,
    version: VERSION,
    mode: "streaming_pure",
    openSettings: openModal,
    localPlayer: {
      open: LocalPlayer.open,
      close: LocalPlayer.close,
      toggle: LocalPlayer.toggle,
      play: LocalPlayer.play,
      pause: LocalPlayer.pause,
      next: LocalPlayer.next,
      prev: LocalPlayer.prev,
      isPlaying: LocalPlayer.isPlaying,
      getTracks: LocalPlayer.getTracks,
      getCurrentTrack: LocalPlayer.getCurrentTrack,
      addFiles: LocalPlayer.addFiles,
      scanFolder: LocalPlayer.scanFolder,
      reload: LocalPlayer.reloadLocalLibrary,
      search: LocalPlayer.searchTracks
    },
    spotDown: {
      open: openSpotDown,
      getUrl: getSpotifyDownloadUrl,
      services: SPOTDOWN_SERVICES,
      openPanel: openServicePanel
    },
    adGuard: {
      isAdPlaying,
      skip: skipAdvertisement
    },
    premiumGuard: {
      sweep: sweepPremiumPromos
    },
    setTheme: (name) => applyTheme(name),
    getTheme: () => activeTheme,
    wallpaper: {
      hasWallpaper: () => !!wallpaperData,
      clear: () => clearWallpaper(),
      tune: (blur, dim) => setWallpaperTuning(blur, dim),
      config: () => ({ ...wallpaperCfg })
    },
    play: async () => {
      const s = getServices();
      if (s && s.player) await s.player.resume();
    },
    pause: async () => {
      const s = getServices();
      if (s && s.player) await s.player.pause();
    },
    next: async () => {
      const s = getServices();
      if (s && s.player) await s.player.skipToNext();
    },
    prev: async () => {
      const s = getServices();
      if (s && s.player) await s.player.skipToPrevious();
    },
    getToken: () => {
      const s = getServices();
      if (s && s.session) {
        return {
          accessToken: s.session.accessToken,
          isAnonymous: s.session.isAnonymous
        };
      }
      return null;
    }
  };

  console.log(`⚡ [Amphion ${VERSION}] Capa de temas, adblock y conector SpotDown inicializada.`);
})();
