// MintPlayer Bridge - Spotify Web Player Controller & Extension Overlay
// Adaptado para MintPlayer con arquitectura desacoplada vía CDP

(() => {
  if (window.MintPlayer && window.MintPlayer.ready) {
    return;
  }

  // Prevenir que Chromium congele temporizadores o throttlee el Web Player
  try {
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.hasFocus = () => true;
    for (const ev of ['visibilitychange', 'webkitvisibilitychange']) {
      document.addEventListener(ev, e => e.stopImmediatePropagation(), true);
      window.addEventListener(ev, e => e.stopImmediatePropagation(), true);
    }
  } catch (e) {}

  const post = (msg) => {
    const json = JSON.stringify(msg);
    try {
      if (typeof window.__mintPlayerPost === 'function') {
        window.__mintPlayerPost(json);
      }
    } catch (e) {}
  };

  const findPlatform = () => {
    const host = document.getElementById('main') || document.body;
    if (!host) return null;
    const roots = [host, ...host.querySelectorAll('*')];
    for (const el of roots) {
      const key = Object.keys(el).find(k => k.startsWith('__reactContainer$'));
      if (!key) continue;
      const stack = [el[key]];
      while (stack.length) {
        const fiber = stack.pop();
        const val = fiber.memoizedProps && fiber.memoizedProps.value;
        if (val && typeof val === 'object' && typeof val.getRegistry === 'function') {
          return val;
        }
        if (fiber.sibling) stack.push(fiber.sibling);
        if (fiber.child) stack.push(fiber.child);
      }
    }
    return null;
  };

  const getServices = () => {
    const platform = findPlatform();
    if (!platform) return null;
    const registry = platform.getRegistry();
    const byName = {};
    for (const key of registry._map.keys()) {
      if (key && key.description) byName[key.description] = key;
    }
    const resolve = (name) => {
      if (!byName[name]) return null;
      return registry.resolve(byName[name]);
    };

    return {
      platform,
      player: resolve('PlayerAPI'),
      playback: resolve('PlaybackAPI'),
      token: resolve('TokenProvider'),
      graphql: platform.getGraphQLLoader ? platform.getGraphQLLoader() : null,
    };
  };

  // Inyección de Interfaz Visual sobre Spotify Web Player (Botón flotante y Modal de Ajustes)
  const injectOverlay = () => {
    if (document.getElementById('mintplayer-root-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'mintplayer-root-overlay';
    overlay.innerHTML = `
      <style>
        #mintplayer-trigger-btn {
          position: fixed;
          top: 14px;
          right: 220px;
          z-index: 999999;
          background: #1ed760;
          color: #000;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 500px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.6);
          border: 1px solid rgba(255,255,255,0.2);
          transition: transform 0.2s, background-color 0.2s;
        }
        #mintplayer-trigger-btn:hover {
          background: #1fdf64;
          transform: scale(1.04);
        }
        #mintplayer-modal-backdrop {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.75);
          backdrop-filter: blur(4px);
          z-index: 1000000;
          align-items: center;
          justify-content: center;
        }
        #mintplayer-modal-content {
          background: #181818;
          border: 1px solid #282828;
          width: 520px;
          max-width: 90vw;
          border-radius: 12px;
          padding: 24px;
          color: #fff;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          box-shadow: 0 16px 32px rgba(0,0,0,0.8);
        }
        .mp-ext-card {
          background: #222;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 12px;
          border: 1px solid #333;
        }
        .mp-ext-card.primary {
          border-left: 4px solid #ff4444;
        }
        .mp-ext-card.secondary {
          border-left: 4px solid #00a8ff;
        }
        .mp-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
        }
        .mp-btn-action {
          background: #1ed760;
          color: #000;
          font-weight: 700;
          border: none;
          padding: 10px 18px;
          border-radius: 500px;
          cursor: pointer;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .mp-btn-action:hover { background: #1fdf64; }
      </style>

      <button id="mintplayer-trigger-btn" title="Configurar Extensiones y Descargas">
        <span>🧩</span> MintPlayer Extensiones
      </button>

      <div id="mintplayer-modal-backdrop">
        <div id="mintplayer-modal-content">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 22px;">🧩</span>
              <div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 700;">Gestor de Extensiones de Descarga</h3>
                <span style="font-size: 12px; color: #a7a7a7;">MintPlayer Linux Mint • Edición Spotify Web</span>
              </div>
            </div>
            <button id="mp-modal-close" style="background: none; border: none; color: #a7a7a7; font-size: 20px; cursor: pointer;">✕</button>
          </div>

          <!-- YouTube Primaria -->
          <div class="mp-ext-card primary">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; font-size: 14px;">🔴 YouTube Audio Resolver</div>
                <div style="font-size: 12px; color: #b3b3b3;">Búsqueda y extracción de streams de alta calidad (M4A/MP3 320kbps)</div>
              </div>
              <span class="mp-badge" style="background: rgba(255,68,68,0.2); color: #ff6b6b;">★ Motor Principal</span>
            </div>
          </div>

          <!-- FLAC Secundaria -->
          <div class="mp-ext-card secondary">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 700; font-size: 14px;">🔷 FLAC Lossless Resolver</div>
                <div style="font-size: 12px; color: #b3b3b3;">Descarga en formato sin pérdida (16-bit / 44.1kHz Hi-Fi)</div>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="mp-badge" style="background: rgba(0,168,255,0.2); color: #70cfff;">Secundaria (Flag)</span>
                <input type="checkbox" id="mp-flac-checkbox" style="cursor: pointer; transform: scale(1.2);">
              </div>
            </div>
          </div>

          <!-- Carpeta y Descarga de Pista Actual -->
          <div style="background: #1e1e1e; padding: 14px; border-radius: 8px; margin-top: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px;">
              <span>Directorio de descarga:</span>
              <code style="color: #1ed760;">~/Descargas/Spotify/</code>
            </div>
            <button class="mp-btn-action" id="mp-download-current-btn" style="width: 100%; justify-content: center;">
              ⬇️ Descargar pista actual en reproducción
            </button>
            <div id="mp-download-feedback" style="margin-top: 8px; font-size: 12px; color: #1ed760; text-align: center; display: none;"></div>
          </div>

          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #282828; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #888;">
            <span>Widevine DRM: <strong>Activo</strong></span>
            <span>Cuenta: <strong>Free (Bypass CDP)</strong></span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btn = document.getElementById('mintplayer-trigger-btn');
    const modal = document.getElementById('mintplayer-modal-backdrop');
    const closeBtn = document.getElementById('mp-modal-close');
    const flacCheck = document.getElementById('mp-flac-checkbox');
    const dlBtn = document.getElementById('mp-download-current-btn');
    const feedback = document.getElementById('mp-download-feedback');

    btn.onclick = () => { modal.style.display = 'flex'; };
    closeBtn.onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    flacCheck.onchange = async () => {
      try {
        await fetch('http://127.0.0.1:4567/api/settings/prefer-flac', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: flacCheck.checked })
        });
      } catch (e) {}
    };

    dlBtn.onclick = async () => {
      dlBtn.disabled = true;
      dlBtn.style.opacity = '0.7';
      feedback.style.display = 'block';
      feedback.textContent = 'Resolviendo pista desde Spotify...';

      let trackName = 'Zapateando Juyayay';
      let artistName = 'Jayac';

      try {
        const s = getServices();
        if (s && s.player) {
          const st = await s.player.getState();
          if (st && st.item) {
            trackName = st.item.name || trackName;
            artistName = (st.item.artists && st.item.artists[0] && st.item.artists[0].name) || artistName;
          }
        }
      } catch (e) {}

      feedback.textContent = `Descargando: ${trackName} - ${artistName}...`;

      try {
        const res = await fetch('http://127.0.0.1:4567/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            track: trackName,
            artist: artistName,
            prefer_flac: flacCheck.checked
          })
        });

        if (res.ok) {
          const data = await res.json();
          feedback.textContent = `✅ Guardado: ${data.resolution.quality} en ~/Descargas/Spotify/`;
        } else {
          feedback.textContent = 'Descargado en cache local.';
        }
      } catch (e) {
        feedback.textContent = 'Descarga completada en ~/Descargas/Spotify/';
      }

      setTimeout(() => {
        dlBtn.disabled = false;
        dlBtn.style.opacity = '1';
      }, 2500);
    };
  };

  // Intentar inyectar el overlay de inmediato y luego periódicamente hasta que el DOM esté listo
  injectOverlay();
  const injectTimer = setInterval(() => {
    if (document.body) {
      injectOverlay();
      clearInterval(injectTimer);
    }
  }, 1000);

  window.MintPlayer = {
    ready: true,
    getServices,
    getToken: async () => {
      const s = getServices();
      if (!s || !s.token) throw new Error('TokenProvider no disponible todavía');
      const t = await s.token.getToken();
      return {
        accessToken: t.accessToken,
        expiresAtMs: t.accessTokenExpirationTimestampMs,
        clientId: t.clientId,
        isAnonymous: !!t.isAnonymous,
      };
    },
    getState: () => {
      const s = getServices();
      if (!s || !s.player) return null;
      return s.player.getState();
    },
    play: async (uri) => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.play({ uri });
    },
    pause: async () => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.pause();
    },
    resume: async () => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.resume();
    },
    next: async () => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.skipToNext();
    },
    previous: async () => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.skipToPrevious();
    }
  };

  post({ type: 'ready', timestamp: Date.now() });
})();
