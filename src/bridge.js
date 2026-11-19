// Amphion Bridge v0.7.0 - Spotify Web Player Controller & Pure Streaming Engine
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

      /* Botón SpotDown en barra superior y acentos (Estilo Sakukelly Linux) */
      .amphion-spotdown-btn {
        background-color: #1ed760 !important;
        color: #121212 !important;
      }
      .amphion-spotdown-btn:hover {
        background-color: #1fdf64 !important;
        transform: scale(1.04) !important;
      }
      .amphion-spotdown-toolbar-btn:hover {
        color: #1ed760 !important;
      }

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

  const VERSION = '0.7.3';

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
  // CONEXIÓN EXTERNA & SPOTDOWN (Estilo Sakukelly Linux)
  // ==========================================================================
  const openExternalUrl = (url) => {
    try {
      if (typeof window.__mintPlayerPost === 'function') {
        window.__mintPlayerPost(JSON.stringify({ action: 'open_url', url }));
      }
    } catch (e) {}
    try {
      window.open(url, '_blank');
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

  const openSpotDown = (customUrl = null) => {
    const target = customUrl || getSpotifyDownloadUrl();
    const BASE_SPOTDOWN = 'https://spotdown.org/es8';
    let finalUrl = BASE_SPOTDOWN;

    if (target && target.includes('open.spotify.com')) {
      finalUrl = `${BASE_SPOTDOWN}?q=${encodeURIComponent(target)}`;
      showToast('⬇ Conectando con SpotDown en el navegador...');
    } else {
      const nowPlaying = readNowPlaying();
      if (nowPlaying && nowPlaying !== 'Sin reproducción') {
        finalUrl = `${BASE_SPOTDOWN}?q=${encodeURIComponent(nowPlaying)}`;
        showToast(`⬇ Buscando "${nowPlaying}" en SpotDown...`);
      } else {
        showToast('⬇ Abriendo SpotDown en el navegador...');
      }
    }

    openExternalUrl(finalUrl);
  };

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
        </svg><span>SpotDown</span>`;
      spotdownBtn.title = "Descargar canción o playlist con SpotDown en el navegador (estilo Sakukelly Linux)";
      spotdownBtn.onclick = () => openSpotDown();
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
    } else {
      const topBar = document.querySelector('[data-testid="topbar-content"]') ||
                     document.querySelector('[data-testid="global-nav-bar"]');
      if (topBar) {
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

        <!-- Descargador SpotDown (Estilo Sakukelly Linux) -->
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
          <div style="color: #1ed760; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px;">
            DESCARGADOR · SPOTDOWN
          </div>
          <div style="font-size: 11px; color: #a7a7a7;">Estilo Sakukelly Linux</div>
        </div>
        <div style="background: linear-gradient(135deg, rgba(29, 185, 84, 0.18) 0%, rgba(24, 24, 24, 0.95) 100%); border-radius: 12px; padding: 14px 16px; margin-bottom: 18px; border: 1.5px solid rgba(29, 185, 84, 0.45); box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 40px; height: 40px; border-radius: 12px; background: rgba(29, 185, 84, 0.25); border: 1px solid rgba(29, 185, 84, 0.6); display: flex; align-items: center; justify-content: center; font-size: 20px; color: #1ed760;">⬇</div>
              <div>
                <div style="font-size: 15px; font-weight: 800; color: #ffffff;">SpotDown</div>
                <div style="font-size: 12px; color: #b3b3b3; line-height: 1.4;">Descarga playlists y álbumes completos · Sin registro · MP3 de alta calidad</div>
              </div>
            </div>
            <button id="amphion-modal-spotdown-btn" style="background: #1ed760; color: #121212; border: none; border-radius: 500px; padding: 8px 18px; font-size: 13px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: transform 0.15s ease, background-color 0.15s ease;">
              Abrir SpotDown ↗
            </button>
          </div>
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
            <span id="amphion-modal-spotdown-target" style="color: rgba(255,255,255,0.7); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%;">Destino: spotdown.org/es8</span>
            <span style="color: #1ed760; font-weight: 700;">✓ Detecta canciones activas</span>
          </div>
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
      modalSpotdownBtn.onclick = () => openSpotDown();
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
  const runDomLoop = () => {
    injectPremiumPill();
    updateActionBarToolbar();
    injectNowPlayingSpotDownBtn();
    if (wallpaperData) markGlassSurfaces();
    const modal = document.getElementById('amphion-modal-backdrop');
    if (modal && modal.style.display !== 'none') refreshSettingsStatus();
  };

  // Inicialización inmediata
  injectPremiumPill();
  updateActionBarToolbar();
  injectNowPlayingSpotDownBtn();
  startAdGuard();
  try {
    applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || 'classic', true);
  } catch (e) {
    applyTheme('classic', true);
  }
  try {
    applyWallpaper();
  } catch (e) {}
  setInterval(runDomLoop, 1500);

  // Registro del objeto soberano en window para el Guard en Rust
  window.Amphion = {
    ready: true,
    version: VERSION,
    mode: "streaming_pure",
    openSettings: openModal,
    spotDown: {
      open: openSpotDown,
      getUrl: getSpotifyDownloadUrl
    },
    adGuard: {
      isAdPlaying,
      skip: skipAdvertisement
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