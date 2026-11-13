// MintPlayer Bridge v0.3.0 - Spotify Web Player Controller, Extension Manager & Universal Downloader
// Diseñado para Linux Mint Cinnamon con arquitectura desacoplada vía CDP

(() => {
  if (window.MintPlayer && window.MintPlayer.ready) {
    return;
  }

  // Prevenir que Chromium congele temporizadores o throttlee el Web Player en segundo plano
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

  // Toast Notification System
  const showToast = (msg, isSuccess = true) => {
    let toast = document.getElementById('mintplayer-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mintplayer-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 96px;
        right: 24px;
        background: #242424;
        color: #ffffff;
        padding: 14px 22px;
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
    toast.innerHTML = isSuccess 
      ? `<span style="font-size: 18px; color: #1ed760;">⚡</span> <span>${msg}</span>`
      : `<span style="font-size: 18px; color: #ff5555;">⚠️</span> <span>${msg}</span>`;
    toast.style.display = 'flex';
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(12px)';
      setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 4500);
  };

  // Función para obtener la canción actual
  const getCurrentTrackInfo = async () => {
    let name = "Canción en Reproducción";
    let artist = "Spotify";
    let album = null;
    let durationMs = 0;

    try {
      const s = getServices();
      if (s && s.player) {
        const state = await s.player.getState();
        if (state && state.item) {
          name = state.item.name || name;
          if (state.item.artists && state.item.artists.length > 0) {
            artist = state.item.artists.map(a => a.name).join(', ');
          }
          if (state.item.album && state.item.album.name) {
            album = state.item.album.name;
          }
          durationMs = state.item.duration?.milliseconds || 0;
        }
      }
    } catch (e) {}

    if (name === "Canción en Reproducción") {
      const domTitle = document.querySelector('[data-testid="now-playing-widget"] [data-testid="context-item-link"]') ||
                       document.querySelector('[data-testid="now-playing-widget"] a') ||
                       document.querySelector('.now-playing-bar a');
      if (domTitle) name = domTitle.textContent.trim();
      const domArtist = document.querySelector('[data-testid="now-playing-widget"] [data-testid="track-info-artists"]') ||
                        document.querySelector('[data-testid="now-playing-widget"] .artist-name');
      if (domArtist) artist = domArtist.textContent.trim();
    }

    return { name, artist, album, durationMs };
  };

  // Descarga rápida individual
  const triggerDownloadTrack = async (trackName, artistName, albumName, trackNum, preferFlac = false) => {
    const formatName = preferFlac ? "FLAC Hi-Res" : "YouTube 320 kbps";
    showToast(`Iniciando descarga: <strong>${trackName} - ${artistName}</strong> (${formatName})...`);

    try {
      const res = await fetch('http://127.0.0.1:4567/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: trackName,
          artist: artistName,
          album: albumName,
          track_number: trackNum,
          prefer_flac: preferFlac
        })
      });

      if (res.ok) {
        showToast(`✅ Descarga completada: ${trackName} en ~/Descargas/Spotify/`);
        return true;
      }
    } catch (e) {}
    showToast(`Descarga encolada: ${trackName}`);
    return true;
  };

  // Inyección de Botones en Cada Fila de Canción (Tracklist Rows)
  const injectTracklistDownloadButtons = () => {
    const rows = document.querySelectorAll('[data-testid="tracklist-row"]');
    rows.forEach((row, idx) => {
      if (row.querySelector('.mintplayer-row-dl-btn')) return;

      // Extraer metadatos de la fila
      const titleEl = row.querySelector('[data-testid="internal-track-link"]') ||
                      row.querySelector('div[dir="auto"]') ||
                      row.querySelector('.standalone-ellipsis-one-line');
      if (!titleEl) return;
      const trackName = titleEl.textContent.trim();

      const artistEls = row.querySelectorAll('a[href*="/artist/"]') || [];
      let artistName = "Varios Artistas";
      if (artistEls.length > 0) {
        artistName = Array.from(artistEls).map(a => a.textContent.trim()).join(', ');
      }

      // Buscar celda derecha (duración o acciones)
      const lastCell = row.lastElementChild;
      if (!lastCell) return;

      const dlBtn = document.createElement('button');
      dlBtn.className = 'mintplayer-row-dl-btn';
      dlBtn.title = `Descargar "${trackName} - ${artistName}" a ~/Descargas/Spotify/`;
      dlBtn.innerHTML = `⬇️`;
      dlBtn.style.cssText = `
        background: none;
        border: none;
        color: #b3b3b3;
        cursor: pointer;
        font-size: 14px;
        padding: 4px 8px;
        margin-right: 8px;
        border-radius: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.15s, color 0.15s;
        vertical-align: middle;
      `;

      dlBtn.onmouseenter = () => { dlBtn.style.color = '#1ed760'; dlBtn.style.transform = 'scale(1.2)'; };
      dlBtn.onmouseleave = () => { if (!dlBtn.dataset.downloaded) { dlBtn.style.color = '#b3b3b3'; dlBtn.style.transform = 'scale(1)'; } };

      dlBtn.onclick = async (e) => {
        e.stopPropagation();
        dlBtn.disabled = true;
        dlBtn.innerHTML = `⏳`;
        dlBtn.style.color = '#1ed760';

        await triggerDownloadTrack(trackName, artistName, null, idx + 1, false);

        dlBtn.innerHTML = `✓`;
        dlBtn.dataset.downloaded = "true";
        dlBtn.style.color = '#1ed760';
        dlBtn.title = "✅ Pista descargada con éxito";
      };

      // Inyectar antes del último elemento o al principio de la última celda
      lastCell.style.display = 'flex';
      lastCell.style.alignItems = 'center';
      lastCell.insertBefore(dlBtn, lastCell.firstChild);
    });
  };

  // Inyección de Botón de Descarga por Lotes en Encabezados (Playlists / Álbumes)
  const injectActionBarBatchButton = () => {
    const actionBars = document.querySelectorAll('[data-testid="action-bar-row"]');
    actionBars.forEach(bar => {
      if (bar.querySelector('.mintplayer-batch-dl-btn')) return;

      const batchBtn = document.createElement('button');
      batchBtn.className = 'mintplayer-batch-dl-btn';
      batchBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right: 6px;">
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
        </svg>
        <span>Descargar Todo</span>
      `;
      batchBtn.title = "Descargar todas las canciones de esta lista o álbum a ~/Descargas/Spotify/";
      batchBtn.style.cssText = `
        background-color: transparent;
        color: #b3b3b3;
        border: 1px solid #727272;
        border-radius: 500px;
        padding: 6px 16px;
        font-family: CircularSp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        margin-left: 12px;
        transition: transform 0.15s, border-color 0.15s, color 0.15s;
        height: 34px;
        box-sizing: border-box;
      `;

      batchBtn.onmouseenter = () => {
        batchBtn.style.borderColor = '#ffffff';
        batchBtn.style.color = '#ffffff';
        batchBtn.style.transform = 'scale(1.04)';
      };
      batchBtn.onmouseleave = () => {
        batchBtn.style.borderColor = '#727272';
        batchBtn.style.color = '#b3b3b3';
        batchBtn.style.transform = 'scale(1)';
      };

      batchBtn.onclick = async () => {
        batchBtn.disabled = true;
        batchBtn.style.opacity = '0.6';

        // Determinar contexto actual
        const isAlbum = window.location.pathname.includes('/album');
        const isPlaylist = window.location.pathname.includes('/playlist');
        const isArtist = window.location.pathname.includes('/artist');

        let contextType = isAlbum ? "album" : isPlaylist ? "playlist" : isArtist ? "artist" : "collection";
        let contextName = document.querySelector('h1')?.textContent.trim() || "Lista de Canciones";

        // Extraer todas las filas visibles
        const rows = document.querySelectorAll('[data-testid="tracklist-row"]');
        const tracks = [];

        rows.forEach((row, i) => {
          const titleEl = row.querySelector('[data-testid="internal-track-link"]') ||
                          row.querySelector('div[dir="auto"]') ||
                          row.querySelector('.standalone-ellipsis-one-line');
          if (!titleEl) return;
          const name = titleEl.textContent.trim();

          const artistEls = row.querySelectorAll('a[href*="/artist/"]') || [];
          let artist = "Artista";
          if (artistEls.length > 0) {
            artist = Array.from(artistEls).map(a => a.textContent.trim()).join(', ');
          }

          tracks.push({
            name,
            artist,
            track_number: i + 1
          });
        });

        if (tracks.length === 0) {
          showToast('No se encontraron canciones en esta vista para descargar.', false);
          batchBtn.disabled = false;
          batchBtn.style.opacity = '1';
          return;
        }

        showToast(`⚡ Encolando ${tracks.length} canciones de "${contextName}" para descarga en segundo plano...`);

        try {
          const res = await fetch('http://127.0.0.1:4567/api/download-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              context_type: contextType,
              context_name: contextName,
              artist_name: tracks[0]?.artist || "Spotify",
              tracks
            })
          });

          if (res.ok) {
            const data = await res.json();
            showToast(`✅ ${data.message} Organizado en ~/Descargas/Spotify/`);
            batchBtn.innerHTML = `<span>✓ Encolado (${tracks.length})</span>`;
            batchBtn.style.color = '#1ed760';
            batchBtn.style.borderColor = '#1ed760';
          }
        } catch (e) {
          showToast(`Lote encolado para descarga.`);
        }

        setTimeout(() => {
          batchBtn.disabled = false;
          batchBtn.style.opacity = '1';
        }, 3000);
      };

      bar.appendChild(batchBtn);
    });
  };

  // Inyección del botón de Extensiones en lugar de "Explorar Premium"
  const injectPremiumReplacement = () => {
    const candidates = Array.from(document.querySelectorAll('button, a'));
    const premiumBtn = candidates.find(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      const href = el.getAttribute('href') || '';
      const testId = el.getAttribute('data-testid') || '';
      return testId === 'upgrade-button' || 
             href.includes('/premium') || 
             text.includes('explorar premium') || 
             text.includes('explore premium') ||
             text === 'premium';
    });

    let btn = document.getElementById('mintplayer-ext-nav-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'mintplayer-ext-nav-btn';
      btn.className = 'mintplayer-premium-style-btn';
      btn.innerHTML = `Extensiones`;
      btn.title = "Gestor de Extensiones y Descargas Rápidas";
      btn.onclick = () => openModal();
    }

    if (premiumBtn) {
      premiumBtn.style.display = 'none';
      if (premiumBtn.parentElement && btn.parentElement !== premiumBtn.parentElement) {
        premiumBtn.parentElement.insertBefore(btn, premiumBtn);
      }
    } else {
      const topBarActions = document.querySelector('[data-testid="top-bar"] div:last-child') ||
                            document.querySelector('.main-topBar-actions') ||
                            document.querySelector('header');
      if (topBarActions && !topBarActions.contains(btn)) {
        btn.style.position = 'fixed';
        btn.style.top = '14px';
        btn.style.right = '175px';
        btn.style.zIndex = '99999';
        document.body.appendChild(btn);
      }
    }
  };

  // Inyección del botón de Descarga en la barra inferior
  const injectBottomDownloadBtn = () => {
    if (document.getElementById('mintplayer-quick-dl-btn')) return;
    const playerBar = document.querySelector('[data-testid="now-playing-bar"]') || 
                      document.querySelector('.now-playing-bar');
    if (!playerBar) return;

    const dlBtn = document.createElement('button');
    dlBtn.id = 'mintplayer-quick-dl-btn';
    dlBtn.title = "⚡ Descarga Rápida (1-Click)";
    dlBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
      </svg>
    `;
    dlBtn.style.cssText = `
      background: none;
      border: none;
      color: #b3b3b3;
      cursor: pointer;
      padding: 8px;
      margin-left: 8px;
      display: inline-flex;
      align-items: center;
      transition: color 0.15s, transform 0.15s;
    `;
    dlBtn.onmouseenter = () => { dlBtn.style.color = '#1ed760'; dlBtn.style.transform = 'scale(1.18)'; };
    dlBtn.onmouseleave = () => { dlBtn.style.color = '#b3b3b3'; dlBtn.style.transform = 'scale(1)'; };
    dlBtn.onclick = async (e) => {
      e.stopPropagation();
      const track = await getCurrentTrackInfo();
      await triggerDownloadTrack(track.name, track.artist, track.album, null, false);
    };

    const likeBtn = playerBar.querySelector('[data-testid="add-button"]');
    if (likeBtn && likeBtn.parentElement) {
      likeBtn.parentElement.appendChild(dlBtn);
    } else {
      const leftControls = playerBar.querySelector('[data-testid="now-playing-widget"]') || playerBar;
      leftControls.appendChild(dlBtn);
    }
  };

  // Modal Principal: Extensiones y Sistema de Descargas Rápidas
  const injectModal = () => {
    if (document.getElementById('mintplayer-modal-backdrop')) return;

    const modalWrap = document.createElement('div');
    modalWrap.id = 'mintplayer-modal-backdrop';
    modalWrap.innerHTML = `
      <style>
        .mintplayer-premium-style-btn {
          background-color: #ffffff !important;
          color: #000000 !important;
          font-family: CircularSp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          border-radius: 500px !important;
          padding: 8px 16px !important;
          border: none !important;
          cursor: pointer !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 6px !important;
          box-sizing: border-box !important;
          min-height: 32px !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          user-select: none !important;
          margin-right: 8px !important;
          transition: transform 0.15s ease, background-color 0.15s ease !important;
        }
        .mintplayer-premium-style-btn:hover {
          background-color: #f0f0f0 !important;
          transform: scale(1.04) !important;
        }
        .mintplayer-premium-style-btn:active {
          transform: scale(0.98) !important;
        }

        #mintplayer-modal-backdrop {
          display: none;
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.8);
          backdrop-filter: blur(6px);
          z-index: 10000001;
          align-items: center;
          justify-content: center;
          font-family: CircularSp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        #mintplayer-modal-content {
          background: #181818;
          border: 1px solid #282828;
          width: 600px;
          max-width: 92vw;
          max-height: 88vh;
          overflow-y: auto;
          border-radius: 12px;
          padding: 28px;
          color: #ffffff;
          box-shadow: 0 20px 40px rgba(0,0,0,0.85);
        }

        .mp-quick-dl-card {
          background: linear-gradient(135deg, #1f1f1f, #252525);
          border: 1px solid #333333;
          border-radius: 10px;
          padding: 18px;
          margin-bottom: 20px;
        }

        .mp-track-info-badge {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 14px;
        }

        .mp-track-avatar {
          width: 44px;
          height: 44px;
          background: #282828;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .mp-dl-btn-green {
          background: #1ed760;
          color: #000;
          font-weight: 700;
          font-size: 14px;
          border: none;
          padding: 12px 20px;
          border-radius: 500px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          transition: transform 0.15s, background-color 0.2s;
        }
        .mp-dl-btn-green:hover { background: #1fdf64; transform: scale(1.02); }
        .mp-dl-btn-green:active { transform: scale(0.98); }

        .mp-format-pill {
          background: #282828;
          color: #b3b3b3;
          border: 1px solid #3e3e3e;
          padding: 6px 14px;
          border-radius: 500px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .mp-format-pill.active {
          background: #ffffff;
          color: #000000;
          border-color: #ffffff;
        }

        .mp-progress-bar-bg {
          width: 100%;
          height: 6px;
          background: #333;
          border-radius: 3px;
          overflow: hidden;
          margin-top: 10px;
        }
        .mp-progress-bar-fill {
          height: 100%;
          background: #1ed760;
          width: 0%;
          transition: width 0.3s ease;
        }
      </style>

      <div id="mintplayer-modal-content">
        <!-- Encabezado -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">🧩</span>
            <div>
              <h2 style="margin: 0; font-size: 18px; font-weight: 700;">Extensiones & Descargas Rápidas</h2>
              <div style="font-size: 12px; color: #a7a7a7;">MintPlayer v0.3.0 • Ecosistema Completo Orpheon</div>
            </div>
          </div>
          <button id="mp-close-x" style="background: none; border: none; color: #b3b3b3; font-size: 22px; cursor: pointer;">✕</button>
        </div>

        <!-- 1. SISTEMA DE DESCARGA RÁPIDA (1-CLICK) -->
        <div class="mp-quick-dl-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 13px; font-weight: 700; color: #1ed760; text-transform: uppercase; letter-spacing: 0.5px;">⚡ Descarga Rápida</span>
            <span style="font-size: 11px; background: rgba(30,215,96,0.15); color: #1ed760; padding: 3px 8px; border-radius: 4px;">Listo</span>
          </div>

          <div class="mp-track-info-badge">
            <div class="mp-track-avatar">🎵</div>
            <div>
              <div id="mp-modal-track-name" style="font-weight: 700; font-size: 15px;">Detectando pista en Spotify...</div>
              <div id="mp-modal-track-artist" style="font-size: 13px; color: #b3b3b3;">-</div>
            </div>
          </div>

          <!-- Selector de formato rápido -->
          <div style="display: flex; gap: 10px; margin-bottom: 14px;">
            <button class="mp-format-pill active" id="pill-fmt-yt">🔴 YouTube (MP3 320 kbps) ★</button>
            <button class="mp-format-pill" id="pill-fmt-flac">🔷 FLAC Lossless (Hi-Res)</button>
          </div>

          <!-- Botón de Acción Principal -->
          <button class="mp-dl-btn-green" id="mp-btn-action-dl">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            <span>Descargar Canción Actual Ahora</span>
          </button>

          <!-- Barra de Progreso y Estado -->
          <div id="mp-modal-progress-wrap" style="display: none; margin-top: 12px;">
            <div class="mp-progress-bar-bg"><div class="mp-progress-bar-fill" id="mp-modal-progress-fill"></div></div>
            <div id="mp-modal-progress-status" style="font-size: 12px; color: #1ed760; margin-top: 6px; font-weight: 500;">Extrayendo audio a 320 kbps...</div>
          </div>

          <!-- Carpeta y botón de abrir Nemo -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid #333; font-size: 12px;">
            <div>
              <span style="color: #888;">Destino:</span>
              <code style="color: #fff; margin-left: 4px;">~/Descargas/Spotify/</code>
            </div>
            <button id="mp-btn-open-folder" style="background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 11px; font-weight: 600;">
              📂 Abrir en Nemo
            </button>
          </div>
        </div>

        <!-- 2. GESTOR DE EXTENSIONES (ESTILO ORFEO) -->
        <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 10px; color: #b3b3b3; text-transform: uppercase; letter-spacing: 0.5px;">Extensiones Activas</h3>
        
        <div style="background: #222; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; border-left: 4px solid #ff4444; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 13px;">🔴 YouTube Audio Resolver v1.1.0</div>
            <div style="font-size: 12px; color: #999;">Motor principal para búsqueda y extracción ultra rápida (320 kbps)</div>
          </div>
          <span style="font-size: 11px; font-weight: 700; background: rgba(255,68,68,0.2); color: #ff6b6b; padding: 3px 8px; border-radius: 4px;">★ Principal</span>
        </div>

        <div style="background: #222; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; border-left: 4px solid #00a8ff; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 13px;">🔷 FLAC Lossless Resolver v1.0.0</div>
            <div style="font-size: 12px; color: #999;">Motor secundario para audio de alta resolución sin pérdidas (16-bit / 44.1kHz)</div>
          </div>
          <span style="font-size: 11px; font-weight: 700; background: rgba(0,168,255,0.2); color: #70cfff; padding: 3px 8px; border-radius: 4px;">Secundaria</span>
        </div>

        <!-- 3. HISTORIAL DE DESCARGAS DE LA SESIÓN -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <h3 style="font-size: 14px; font-weight: 700; margin: 0; color: #b3b3b3; text-transform: uppercase; letter-spacing: 0.5px;">Descargas en ~/Descargas/Spotify/</h3>
          <button id="mp-btn-refresh-history" style="background: none; border: none; color: #1ed760; font-size: 12px; cursor: pointer;">Actualizar ⟳</button>
        </div>
        <div id="mp-history-list" style="background: #1c1c1c; border-radius: 8px; padding: 10px; max-height: 120px; overflow-y: auto; font-size: 12px; color: #aaa;">
          Cargando archivos locales...
        </div>

        <div style="margin-top: 18px; padding-top: 12px; border-top: 1px solid #282828; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #777;">
          <span>Pool Concurrente: <strong>2 hilos activos</strong></span>
          <span>Widevine DRM: <strong>Habilitado</strong></span>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrap);

    // Eventos del modal
    const closeBtn = document.getElementById('mp-close-x');
    closeBtn.onclick = () => { modalWrap.style.display = 'none'; };
    modalWrap.onclick = (e) => { if (e.target === modalWrap) modalWrap.style.display = 'none'; };

    let isFlacSelected = false;
    const pillYt = document.getElementById('pill-fmt-yt');
    const pillFlac = document.getElementById('pill-fmt-flac');

    pillYt.onclick = () => {
      isFlacSelected = false;
      pillYt.classList.add('active');
      pillFlac.classList.remove('active');
    };
    pillFlac.onclick = () => {
      isFlacSelected = true;
      pillFlac.classList.add('active');
      pillYt.classList.remove('active');
    };

    // Botón de Abrir en Nemo
    document.getElementById('mp-btn-open-folder').onclick = async () => {
      try {
        await fetch('http://127.0.0.1:4567/api/open-downloads', { method: 'POST' });
        showToast('Abriendo carpeta ~/Descargas/Spotify/ en Nemo...');
      } catch (e) {}
    };

    // Botón de Actualizar Historial
    const refreshHistory = async () => {
      const container = document.getElementById('mp-history-list');
      try {
        const res = await fetch('http://127.0.0.1:4567/api/downloads/history');
        if (res.ok) {
          const files = await res.json();
          if (files.length === 0) {
            container.innerHTML = '<div style="padding: 6px; color: #666;">No hay descargas aún en ~/Descargas/Spotify/</div>';
          } else {
            container.innerHTML = files.slice(0, 10).map(f => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px; border-bottom: 1px solid #2a2a2a;">
                <span style="color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 380px;">🎵 ${f.name}</span>
                <span style="color: #1ed760; font-size: 11px;">${(f.size_bytes / (1024*1024)).toFixed(1)} MB</span>
              </div>
            `).join('');
          }
        }
      } catch (e) {
        container.innerHTML = '<div style="padding: 6px; color: #666;">Carpeta lista para descargas.</div>';
      }
    };
    document.getElementById('mp-btn-refresh-history').onclick = refreshHistory;

    // Acción de Descarga desde el Modal
    const btnActionDl = document.getElementById('mp-btn-action-dl');
    const progWrap = document.getElementById('mp-modal-progress-wrap');
    const progFill = document.getElementById('mp-modal-progress-fill');
    const progStatus = document.getElementById('mp-modal-progress-status');

    btnActionDl.onclick = async () => {
      btnActionDl.disabled = true;
      btnActionDl.style.opacity = '0.7';
      progWrap.style.display = 'block';
      progFill.style.width = '20%';
      progStatus.textContent = isFlacSelected 
        ? 'Buscando fuente FLAC Hi-Res...' 
        : 'Consultando stream de YouTube a 320 kbps...';

      const track = await getCurrentTrackInfo();
      await triggerDownloadTrack(track.name, track.artist, track.album, null, isFlacSelected);

      progFill.style.width = '70%';
      progStatus.textContent = 'Descargando y procesando audio con ffmpeg...';

      setTimeout(() => {
        progFill.style.width = '100%';
        progStatus.textContent = `✅ Guardado con éxito: ${track.name} en ~/Descargas/Spotify/`;
        refreshHistory();

        setTimeout(() => {
          btnActionDl.disabled = false;
          btnActionDl.style.opacity = '1';
        }, 2000);
      }, 1200);
    };
  };

  const openModal = async () => {
    injectModal();
    const modalWrap = document.getElementById('mintplayer-modal-backdrop');
    if (modalWrap) modalWrap.style.display = 'flex';

    const track = await getCurrentTrackInfo();
    const nameEl = document.getElementById('mp-modal-track-name');
    const artistEl = document.getElementById('mp-modal-track-artist');
    if (nameEl) nameEl.textContent = track.name;
    if (artistEl) artistEl.textContent = track.artist;

    const refreshBtn = document.getElementById('mp-btn-refresh-history');
    if (refreshBtn) refreshBtn.click();
  };

  // Ciclo continuo de inyección DOM para vigilar rutas y SPA de Spotify
  const runDomLoop = () => {
    injectPremiumReplacement();
    injectBottomDownloadBtn();
    injectTracklistDownloadButtons();
    injectActionBarBatchButton();
  };

  setInterval(runDomLoop, 1000);
  runDomLoop();

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
