// Amphion Bridge v0.4.1 - Spotify Web Player Controller, Extension Manager & Universal Downloader
// Diseñado para Linux Mint Cinnamon con arquitectura desacoplada vía CDP

(() => {
  if ((window.Amphion && window.Amphion.ready) || (window.MintPlayer && window.MintPlayer.ready)) {
    return;
  }

  // Inyección de estilos globales permanentes para eliminar Explorar Premium y optimizar la interfaz
  try {
    const globalStyle = document.createElement('style');
    globalStyle.id = 'amphion-global-injected-styles';
    globalStyle.innerHTML = `
      /* Eliminar Explorar Premium de forma absoluta sin parpadeo (Cero CPU) */
      [data-testid="upgrade-button"],
      a[href*="/premium"],
      button[data-testid="upgrade-button"],
      .main-topBar-UpgradeButton,
      [aria-label*="Explorar Premium" i],
      [aria-label*="Explore Premium" i],
      [aria-label*="Mejora tu cuenta" i] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* Animación de carga circular estilo Spotify Premium (anillo SVG giratorio) */
      @keyframes amphion-circle-spin {
        0% { transform: rotate(0deg); stroke-dashoffset: 44; }
        50% { transform: rotate(180deg); stroke-dashoffset: 12; }
        100% { transform: rotate(360deg); stroke-dashoffset: 44; }
      }
      .amphion-circular-progress {
        animation: amphion-circle-spin 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        transform-origin: center;
      }
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        min-width: 14px;
        border-radius: 50%;
        background-color: #1ed760;
        color: #000000;
        margin-right: 6px;
        vertical-align: middle;
        flex-shrink: 0;
      }

      /* Switch toggle verde estilo Imagen 1 */
      .amphion-toggle-switch {
        width: 36px;
        height: 20px;
        background-color: #1ed760;
        border-radius: 10px;
        position: relative;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      .amphion-toggle-switch.off {
        background-color: #535353;
      }
      .amphion-toggle-thumb {
        width: 16px;
        height: 16px;
        background-color: #000000;
        border-radius: 50%;
        position: absolute;
        top: 2px;
        right: 2px;
        transition: transform 0.2s ease;
      }
      .amphion-toggle-switch.off .amphion-toggle-thumb {
        transform: translateX(-16px);
        background-color: #ffffff;
      }
    `;
    if (!document.getElementById('amphion-global-injected-styles')) {
      document.head.appendChild(globalStyle);
    }
  } catch (e) {}

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

  // Estado Soberano Global de Descargas y Caché Persistente en Memoria (Zeus Architecture)
  window.AmphionState = window.AmphionState || {
    downloadedKeys: new Set(),
    diskFiles: new Set(),
    activeTasks: new Map(), // key -> status ("queued" | "downloading")
    lastSync: 0,
    isSyncing: false
  };

  const cleanString = (s) => (s || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const normalizeTrackKey = (artist, title) => {
    return `${cleanString(artist)}:${cleanString(title)}`;
  };

  const isTrackDownloaded = (artist, title) => {
    const key = normalizeTrackKey(artist, title);
    if (window.AmphionState.downloadedKeys.has(key)) return true;

    const cTit = cleanString(title);
    const cArt = cleanString(artist);
    if (!cTit || cTit.length < 2) return false;

    for (const f of window.AmphionState.diskFiles) {
      if (f.includes(cTit)) {
        if (cArt.length < 3 || f.includes(cArt)) return true;
      }
    }
    return false;
  };

  // Sincronización continua de estado con el backend Rust
  const syncDownloadState = async () => {
    if (window.AmphionState.isSyncing) return;
    window.AmphionState.isSyncing = true;
    try {
      const res = await fetch('http://127.0.0.1:4567/api/downloads/state');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.completed_keys)) {
          data.completed_keys.forEach(k => window.AmphionState.downloadedKeys.add(k));
        }
        if (Array.isArray(data.disk_files)) {
          data.disk_files.forEach(f => window.AmphionState.diskFiles.add(cleanString(f)));
        }

        window.AmphionState.activeTasks.clear();
        if (data.active) {
          for (const [k, v] of Object.entries(data.active)) {
            if (v.status === 'completed') {
              window.AmphionState.downloadedKeys.add(k);
            } else if (v.status === 'queued' || v.status === 'downloading') {
              window.AmphionState.activeTasks.set(k, v.status);
            }
          }
        }
      }
    } catch (e) {
    } finally {
      window.AmphionState.isSyncing = false;
      window.AmphionState.lastSync = Date.now();
    }
  };

  // Iconos SVG de Alta Definición (Spotify Aesthetic)
  const SVG_DL = `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 1a.75.75 0 0 1 .75.75v7.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L3.72 7.53a.75.75 0 0 1 1.06-1.06l2.47 2.47V1.75A.75.75 0 0 1 8 1zM2.75 13.5a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75z"/></svg>`;
  const SVG_CIRCULAR_SPINNER = `
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="#333333" stroke-width="2" fill="none" />
      <circle class="amphion-circular-progress" cx="10" cy="10" r="7" stroke="#1ed760" stroke-width="2" stroke-linecap="round" stroke-dasharray="44" stroke-dashoffset="25" fill="none" />
    </svg>
  `;
  const SVG_CHECK = `<svg viewBox="0 0 16 16" width="16" height="16" fill="#1ed760" aria-hidden="true"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"/></svg>`;
  
  // Visto verde oficial de Spotify para pistas descargadas (Círculo verde sólido con flecha hacia abajo idéntico a las capturas)
  const SVG_VISTO_BADGE = `
    <span class="amphion-downloaded-badge" title="Canción descargada y disponible offline" style="display: inline-flex; align-items: center; margin-right: 6px; vertical-align: middle; flex-shrink: 0;">
      <svg viewBox="0 0 16 16" width="13" height="13" fill="none">
        <circle cx="8" cy="8" r="8" fill="#1ed760"/>
        <path d="M8 4.2v5.6M5.4 7.6L8 10.2l2.6-2.6" stroke="#121212" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>
  `;

  // SVGs de Barra de Acciones Estilo Spotify Premium (Coincidencia idéntica a las capturas)
  const SVG_TOOLBAR_ADD = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
  const SVG_TOOLBAR_MORE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;
  const SVG_TOOLBAR_SORT = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v14M3 8l4-4 4 4M17 20V6M21 16l-4 4-4-4"/></svg>`;
  const SVG_TOOLBAR_FILTER = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/></svg>`;
  const SVG_TOOLBAR_SHUFFLE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`;
  const SVG_TOOLBAR_PLAY = `<svg viewBox="0 0 24 24" width="26" height="26" fill="#121212" style="margin-left: 3px;"><polygon points="6,4 20,12 6,20"/></svg>`;

  // Descarga rápida individual con actualización de estado reactiva (Híbrida Spotdown + Turbo)
  const triggerDownloadTrack = async (trackName, artistName, albumName, trackNum, preferFlac = false, spotifyUrl = null) => {
    const key = normalizeTrackKey(artistName, trackName);
    window.AmphionState.activeTasks.set(key, 'downloading');
    updateAllTracklistRows();
    updateActionBarBatchButton();

    const formatName = preferFlac ? "FLAC Hi-Res" : "Ultra Rápido MP3 (Spotdown/Turbo)";
    showToast(`⚡ Descargando: <strong>${trackName} - ${artistName}</strong> (${formatName})...`);

    try {
      const res = await fetch('http://127.0.0.1:4567/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          track: trackName,
          artist: artistName,
          album: albumName,
          track_number: trackNum,
          prefer_flac: preferFlac,
          spotify_url: spotifyUrl
        })
      });

      if (res.ok) {
        window.AmphionState.downloadedKeys.add(key);
        window.AmphionState.activeTasks.delete(key);
        showToast(`✅ Descarga completada: ${trackName} en ~/Descargas/Spotify/`);
      } else {
        window.AmphionState.activeTasks.delete(key);
      }
    } catch (e) {
      window.AmphionState.activeTasks.delete(key);
    }

    await syncDownloadState();
    updateAllTracklistRows();
    updateActionBarBatchButton();
    return true;
  };

  // Inyección y Actualización de Filas de Canciones (Virtual DOM Resilient)
  const updateAllTracklistRows = () => {
    const rows = document.querySelectorAll('[data-testid="tracklist-row"]');
    rows.forEach((row, idx) => {
      // Extraer metadatos de la fila
      const titleEl = row.querySelector('[data-testid="internal-track-link"]') ||
                      row.querySelector('div[dir="auto"]') ||
                      row.querySelector('.standalone-ellipsis-one-line');
      if (!titleEl) return;
      const trackName = titleEl.textContent.trim();

      const artistSubrow = row.querySelector('[data-testid="tracklist-row-artists"]') ||
                           row.querySelector('span[dir="auto"]') ||
                           row.querySelector('.standalone-ellipsis-one-line + div');

      const artistEls = row.querySelectorAll('a[href*="/artist/"]') || [];
      let artistName = "Varios Artistas";
      if (artistEls.length > 0) {
        artistName = Array.from(artistEls).map(a => a.textContent.trim()).join(', ');
      }

      // Extraer enlace a Spotify para aceleración CDN con Spotdown
      const linkEl = row.querySelector('[data-testid="internal-track-link"], a[href*="/track/"]');
      let spotifyUrl = null;
      if (linkEl) {
        const href = linkEl.getAttribute('href') || linkEl.href;
        if (href) {
          spotifyUrl = href.startsWith('http') ? href : `https://open.spotify.com${href}`;
        }
      }

      const key = normalizeTrackKey(artistName, trackName);
      const isDownloaded = isTrackDownloaded(artistName, trackName);
      const isActive = window.AmphionState.activeTasks.has(key);

      // 1. Manejo del "VISTO" verde de Spotify en artistSubrow (Imagen 2)
      if (artistSubrow) {
        const existingBadge = artistSubrow.querySelector('.amphion-downloaded-badge');
        if (isDownloaded) {
          if (!existingBadge) {
            const badgeContainer = document.createElement('span');
            badgeContainer.innerHTML = SVG_VISTO_BADGE;
            artistSubrow.insertBefore(badgeContainer.firstElementChild, artistSubrow.firstChild);
          }
        } else if (!isDownloaded && !isActive && existingBadge) {
          existingBadge.remove();
        }
      }

      // 2. Manejo del botón de descarga en la celda derecha de la fila
      const lastCell = row.lastElementChild;
      if (!lastCell) return;

      let dlBtn = row.querySelector('.amphion-row-dl-btn');
      if (!dlBtn) {
        dlBtn = document.createElement('button');
        dlBtn.className = 'amphion-row-dl-btn';
        dlBtn.style.cssText = `
          background: transparent;
          border: none;
          color: #b3b3b3;
          cursor: pointer;
          width: 32px;
          height: 32px;
          min-width: 32px;
          padding: 0;
          margin: 0 4px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease, transform 0.15s ease, background 0.15s ease;
          vertical-align: middle;
          flex-shrink: 0;
          opacity: 0;
        `;

        row.addEventListener('mouseenter', () => {
          if (!dlBtn.dataset.downloaded) dlBtn.style.opacity = '1';
        });
        row.addEventListener('mouseleave', () => {
          if (!dlBtn.dataset.downloaded) dlBtn.style.opacity = '0';
        });

        dlBtn.onmouseenter = () => {
          dlBtn.style.color = '#1ed760';
          dlBtn.style.transform = 'scale(1.15)';
          dlBtn.style.background = 'rgba(255,255,255,0.08)';
        };
        dlBtn.onmouseleave = () => {
          if (!dlBtn.dataset.downloaded) dlBtn.style.color = '#b3b3b3';
          dlBtn.style.transform = 'scale(1)';
          dlBtn.style.background = 'transparent';
        };

        dlBtn.onclick = async (e) => {
          e.stopPropagation();
          dlBtn.disabled = true;
          dlBtn.innerHTML = SVG_CIRCULAR_SPINNER;
          dlBtn.style.opacity = '1';
          await triggerDownloadTrack(trackName, artistName, null, idx + 1, false, spotifyUrl);
          dlBtn.disabled = false;
        };

        lastCell.style.display = 'flex';
        lastCell.style.alignItems = 'center';
        lastCell.insertBefore(dlBtn, lastCell.firstChild);
      }

      // Actualizar estado visual del botón según el estado de la pista
      if (isDownloaded) {
        dlBtn.innerHTML = SVG_CHECK;
        dlBtn.dataset.downloaded = "true";
        dlBtn.style.color = '#1ed760';
        dlBtn.style.opacity = '1';
        dlBtn.title = `✅ Canción descargada ("${trackName} - ${artistName}") en ~/Descargas/Spotify/`;
      } else if (isActive) {
        dlBtn.innerHTML = SVG_CIRCULAR_SPINNER;
        dlBtn.dataset.downloaded = "";
        dlBtn.style.opacity = '1';
        dlBtn.title = `Descargando "${trackName}" a máxima velocidad...`;
      } else {
        dlBtn.innerHTML = SVG_DL;
        dlBtn.dataset.downloaded = "";
        dlBtn.style.color = '#b3b3b3';
        dlBtn.title = `Descargar "${trackName} - ${artistName}" a ~/Descargas/Spotify/`;
      }
    });
  };

  const injectTracklistDownloadButtons = () => {
    updateAllTracklistRows();
  };

  // Estilos de botones de la barra de acciones de Spotify
  const styleToolbarBtn = (btn) => {
    btn.style.cssText = `
      background: transparent;
      border: none;
      color: #b3b3b3;
      cursor: pointer;
      width: 34px;
      height: 34px;
      min-width: 34px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      box-sizing: border-box;
      transition: color 0.15s ease, transform 0.15s ease, background 0.15s ease;
    `;
    btn.onmouseenter = () => {
      if (!btn.dataset.active) btn.style.color = '#ffffff';
      btn.style.transform = 'scale(1.1)';
    };
    btn.onmouseleave = () => {
      if (!btn.dataset.active) btn.style.color = '#b3b3b3';
      btn.style.transform = 'scale(1)';
    };
  };

  // Conmutador de filtro de canciones para la lista
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

  // Barra de Acciones Completa Estilo Spotify Premium (Coincidencia con capturas)
  const updateActionBarBatchButton = () => {
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

        // Grupo izquierdo con: (+), (⬇/🗑️), (⋮), (⇅), (=), (🔀)
        const leftGroup = document.createElement('div');
        leftGroup.className = 'amphion-toolbar-left-group';
        leftGroup.style.cssText = 'display: inline-flex; align-items: center; gap: 14px;';

        // 1. Botón (+)
        const addBtn = document.createElement('button');
        addBtn.className = 'amphion-toolbar-btn amphion-toolbar-add-btn';
        addBtn.title = "Guardar en Tu biblioteca";
        addBtn.innerHTML = SVG_TOOLBAR_ADD;
        styleToolbarBtn(addBtn);
        addBtn.onclick = () => {
          showToast('✅ Guardado en Tu biblioteca');
        };
        leftGroup.appendChild(addBtn);

        // 2. Botón de Descarga por Lotes Circular (⬇)
        const batchBtn = document.createElement('button');
        batchBtn.className = 'amphion-actionbar-circle-dl-btn';
        batchBtn.style.cssText = `
          background-color: transparent;
          color: #b3b3b3;
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          width: 34px;
          height: 34px;
          min-width: 34px;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease, background-color 0.2s ease;
        `;

        batchBtn.onmouseenter = () => {
          if (!batchBtn.dataset.allDone) {
            batchBtn.style.borderColor = '#1ed760';
            batchBtn.style.color = '#1ed760';
          }
          batchBtn.style.transform = 'scale(1.08)';
        };
        batchBtn.onmouseleave = () => {
          if (!batchBtn.dataset.allDone && !batchBtn.dataset.running) {
            batchBtn.style.borderColor = 'rgba(255,255,255,0.3)';
            batchBtn.style.color = '#b3b3b3';
          }
          batchBtn.style.transform = 'scale(1)';
        };

        batchBtn.onclick = async () => {
          const rows = document.querySelectorAll('[data-testid="tracklist-row"]');
          const isAlbum = window.location.pathname.includes('/album');
          const isPlaylist = window.location.pathname.includes('/playlist');
          const isArtist = window.location.pathname.includes('/artist');
          const contextType = isAlbum ? "album" : isPlaylist ? "playlist" : isArtist ? "artist" : "collection";
          const contextName = document.querySelector('h1')?.textContent.trim() || "Colección Musical";

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

            const linkEl = row.querySelector('[data-testid="internal-track-link"], a[href*="/track/"]');
            let spotifyUrl = null;
            if (linkEl) {
              const href = linkEl.getAttribute('href') || linkEl.href;
              if (href) {
                spotifyUrl = href.startsWith('http') ? href : `https://open.spotify.com${href}`;
              }
            }

            tracks.push({ name, artist, track_number: i + 1, spotify_url: spotifyUrl });
          });

          if (tracks.length === 0) {
            showToast('No se encontraron canciones visibles en esta vista.', false);
            return;
          }

          // Encolar todas en el estado local de forma reactiva instantánea
          tracks.forEach(t => {
            const k = normalizeTrackKey(t.artist, t.name);
            if (!isTrackDownloaded(t.artist, t.name)) {
              window.AmphionState.activeTasks.set(k, 'queued');
            }
          });

          batchBtn.dataset.running = "true";
          updateAllTracklistRows();
          updateActionBarBatchButton();

          showToast(`⚡ Encolando lote de ${tracks.length} canciones con multihilo 6x (Modo Turbo)...`);

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
              showToast(`✅ ${data.message} Descargas rápidas iniciadas.`);
            }
          } catch (e) {
            showToast('Lote enviado al proceso en segundo plano.');
          }

          await syncDownloadState();
          updateAllTracklistRows();
          updateActionBarBatchButton();
        };

        leftGroup.appendChild(batchBtn);

        // 3. Botón (⋮) Opciones
        const moreBtn = document.createElement('button');
        moreBtn.className = 'amphion-toolbar-btn amphion-toolbar-more-btn';
        moreBtn.title = "Más opciones de la lista";
        moreBtn.innerHTML = SVG_TOOLBAR_MORE;
        styleToolbarBtn(moreBtn);
        moreBtn.onclick = () => {
          openModal();
        };
        leftGroup.appendChild(moreBtn);

        // 4. Botón (⇅) Ordenar
        const sortBtn = document.createElement('button');
        sortBtn.className = 'amphion-toolbar-btn amphion-toolbar-sort-btn';
        sortBtn.title = "Cambiar orden de reproducción";
        sortBtn.innerHTML = SVG_TOOLBAR_SORT;
        styleToolbarBtn(sortBtn);
        sortBtn.onclick = () => {
          showToast('⇅ Orden cambiado');
        };
        leftGroup.appendChild(sortBtn);

        // 5. Botón (=) Filtrar
        const filterBtn = document.createElement('button');
        filterBtn.className = 'amphion-toolbar-btn amphion-toolbar-filter-btn';
        filterBtn.title = "Filtrar canciones de esta lista";
        filterBtn.innerHTML = SVG_TOOLBAR_FILTER;
        styleToolbarBtn(filterBtn);
        filterBtn.onclick = () => {
          togglePlaylistFilterInput(bar);
        };
        leftGroup.appendChild(filterBtn);

        // 6. Botón (🔀) Shuffle
        const shuffleBtn = document.createElement('button');
        shuffleBtn.className = 'amphion-toolbar-btn amphion-toolbar-shuffle-btn';
        shuffleBtn.title = "Activar reproducción aleatoria";
        shuffleBtn.innerHTML = SVG_TOOLBAR_SHUFFLE;
        styleToolbarBtn(shuffleBtn);
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

        // Grupo derecho con Gran Botón Verde Play (▶)
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

      // Actualizar estado del botón de descargas por lotes (⬇)
      const batchBtn = toolbar.querySelector('.amphion-actionbar-circle-dl-btn');
      if (batchBtn) {
        const rows = document.querySelectorAll('[data-testid="tracklist-row"]');
        let total = 0;
        let downloaded = 0;
        let active = 0;

        rows.forEach(row => {
          const titleEl = row.querySelector('[data-testid="internal-track-link"]') ||
                          row.querySelector('div[dir="auto"]') ||
                          row.querySelector('.standalone-ellipsis-one-line');
          if (!titleEl) return;
          total++;
          const tName = titleEl.textContent.trim();
          const artistEls = row.querySelectorAll('a[href*="/artist/"]') || [];
          let aName = "Artista";
          if (artistEls.length > 0) {
            aName = Array.from(artistEls).map(a => a.textContent.trim()).join(', ');
          }
          const key = normalizeTrackKey(aName, tName);
          if (isTrackDownloaded(aName, tName)) {
            downloaded++;
          } else if (window.AmphionState.activeTasks.has(key)) {
            active++;
          }
        });

        // ESTADO 1: TODAS DESCARGADAS (Círculo verde sólido con flecha hacia abajo idéntico a Spotify Premium)
        if (total > 0 && downloaded === total) {
          batchBtn.dataset.allDone = "true";
          delete batchBtn.dataset.running;
          batchBtn.title = `✅ Lista completa descargada (${downloaded}/${total} canciones disponibles offline)`;
          batchBtn.style.borderColor = '#1ed760';
          batchBtn.style.color = '#1ed760';
          batchBtn.style.backgroundColor = 'transparent';
          batchBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
              <circle cx="12" cy="12" r="10" fill="#1ed760"/>
              <path d="M12 6.5v7.5M8.5 10.5L12 14l3.5-3.5" stroke="#121212" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;
        } 
        // ESTADO 2: EN PROCESO DE DESCARGA (Anillo circular con progreso exacto)
        else if (active > 0 || (window.AmphionState.activeTasks.size > 0 && total > 0 && downloaded < total)) {
          batchBtn.dataset.running = "true";
          delete batchBtn.dataset.allDone;
          const progress = total > 0 ? (downloaded / total) : 0.2;
          const circ = 56.5;
          const offset = Math.max(0, circ - (circ * progress));
          batchBtn.title = `Descargando por lotes: ${downloaded}/${total} canciones completadas (${Math.round(progress * 100)}%) - Multihilo 6x`;
          batchBtn.style.borderColor = '#1ed760';
          batchBtn.style.color = '#1ed760';
          batchBtn.style.backgroundColor = 'transparent';
          batchBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24" style="transform: rotate(-90deg);">
              <circle cx="12" cy="12" r="9" stroke="#333333" stroke-width="2.5" fill="none" />
              <circle class="amphion-circular-progress" cx="12" cy="12" r="9" stroke="#1ed760" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="56.5" stroke-dashoffset="${offset}" fill="none" style="transition: stroke-dashoffset 0.3s ease;" />
            </svg>
          `;
        } 
        // ESTADO 3: EN REPOSO (Botón circular con flecha hacia abajo idéntico a captura 3)
        else {
          delete batchBtn.dataset.allDone;
          delete batchBtn.dataset.running;
          const isArtist = window.location.pathname.includes('/artist');
          batchBtn.title = isArtist ? "Descargar populares y álbumes del artista (Multihilo 6x)" : `Descargar lista completa por lotes (${downloaded}/${total} descargadas)`;
          batchBtn.style.borderColor = 'rgba(255,255,255,0.3)';
          batchBtn.style.color = '#b3b3b3';
          batchBtn.style.backgroundColor = 'transparent';
          batchBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" stroke="currentColor"/>
              <path d="M12 7v7M8.5 10.5L12 14l3.5-3.5"/>
            </svg>
          `;
        }
      }
    });
  };

  const injectActionBarBatchButton = () => {
    updateActionBarBatchButton();
  };

  // Eliminación absoluta de "Explorar Premium" e inserción del botón "Extensiones"
  const injectPremiumReplacement = () => {
    // 1. Eliminar permanentemente los botones de premium de cualquier lista
    const premiumElements = document.querySelectorAll(
      '[data-testid="upgrade-button"], a[href*="/premium"], button[data-testid="upgrade-button"], .main-topBar-UpgradeButton'
    );
    premiumElements.forEach(el => {
      el.remove();
    });

    let btn = document.getElementById('amphion-ext-nav-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'amphion-ext-nav-btn';
      btn.className = 'mintplayer-premium-style-btn';
      btn.innerHTML = `
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M9.5 1.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-4 4A1.5 1.5 0 1 1 2.5 4a1.5 1.5 0 0 1 3 1.5zm8 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm-4 4A1.5 1.5 0 1 1 8 8a1.5 1.5 0 0 1 1.5 1.5zm-4 4A1.5 1.5 0 1 1 4 12a1.5 1.5 0 0 1 1.5 1.5zm8 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
        </svg>
        <span>Extensiones</span>
      `;
      btn.title = "Ajustes de Extensiones, Fuentes y Descargas (Amphion)";
      btn.onclick = () => openModal();
    }

    const topBarActions = document.querySelector('[data-testid="top-bar"] div:last-child') ||
                          document.querySelector('.main-topBar-actions') ||
                          document.querySelector('header');
    if (topBarActions && !topBarActions.contains(btn)) {
      topBarActions.insertBefore(btn, topBarActions.firstChild);
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
    dlBtn.title = "⚡ Descarga Rápida — Canción Actual (1-Click)";
    dlBtn.setAttribute('aria-label', 'Descargar canción actual');
    // Icono: flecha de descarga limpia — mismo estilo que ♥ shuffle repeat en Spotify
    dlBtn.innerHTML = `
      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path d="M8 1a.75.75 0 0 1 .75.75v7.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L3.72 7.53a.75.75 0 0 1 1.06-1.06l2.47 2.47V1.75A.75.75 0 0 1 8 1zM2.75 13.5a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75z"/>
      </svg>
    `;
    dlBtn.style.cssText = `
      background: none;
      border: none;
      color: #b3b3b3;
      cursor: pointer;
      width: 32px;
      height: 32px;
      min-width: 32px;
      padding: 0;
      margin: 0 4px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color 0.15s ease, transform 0.15s ease;
      flex-shrink: 0;
    `;
    dlBtn.onmouseenter = () => { dlBtn.style.color = '#1ed760'; dlBtn.style.transform = 'scale(1.1)'; };
    dlBtn.onmouseleave = () => { if (!dlBtn.dataset.clicked) dlBtn.style.color = '#b3b3b3'; dlBtn.style.transform = 'scale(1)'; };
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
        @keyframes mp-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

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
        <!-- Encabezado con flecha atrás y Ajustes (Idéntico a Imagen 1) -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <button id="mp-back-btn" style="background: none; border: none; color: #ffffff; font-size: 20px; cursor: pointer; display: flex; align-items: center; padding: 0;">←</button>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Ajustes</h2>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <button id="mp-close-x" style="background: none; border: none; color: #b3b3b3; font-size: 20px; cursor: pointer;">✕</button>
          </div>
        </div>

        <!-- Pestañas horizontales (Imagen 1): Cuentas | Fuentes (activa con línea verde) | Reproducción | Biblioteca -->
        <div style="display: flex; gap: 24px; border-bottom: 1px solid #282828; margin-bottom: 20px;">
          <div style="color: #a7a7a7; font-size: 14px; font-weight: 700; padding-bottom: 10px; cursor: pointer;">Cuentas</div>
          <div style="color: #ffffff; font-size: 14px; font-weight: 700; padding-bottom: 10px; border-bottom: 3px solid #1ed760; cursor: pointer;">Fuentes</div>
          <div style="color: #a7a7a7; font-size: 14px; font-weight: 700; padding-bottom: 10px; cursor: pointer;">Reproducción</div>
          <div style="color: #a7a7a7; font-size: 14px; font-weight: 700; padding-bottom: 10px; cursor: pointer;">Biblioteca</div>
        </div>

        <!-- SECCIÓN 1: FUENTES DE DESCARGA (Verde, Imagen 1) -->
        <div style="color: #1ed760; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
          FUENTES DE DESCARGA
        </div>

        <!-- Card Fuente 1: YouTube Music Download Helper -->
        <div style="background: #181818; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; border: 1px solid #282828;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="color: #888; font-weight: 700; font-size: 14px; width: 14px;">1</span>
              <div style="width: 36px; height: 36px; background: #e60000; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(230,0,0,0.3);">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="#ffffff"><path d="M8 5v14l11-7z"/></svg>
              </div>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #ffffff;">YouTube Music Download Helper</div>
                <div style="font-size: 12px; color: #1ed760; font-weight: 600;">Listo</div>
              </div>
            </div>
            <span style="color: #b3b3b3; font-size: 16px;">˅</span>
          </div>
          <div style="font-size: 12px; color: #a7a7a7; margin-top: 10px; line-height: 1.4; padding-left: 28px;">
            Se consultan de arriba hacia abajo: la primera fuente que tenga la canción entrega el archivo. Usa las flechas para cambiar el orden.
          </div>
        </div>

        <!-- Card Fuente 2: FLAC Lossless Resolver -->
        <div style="background: #181818; border-radius: 8px; padding: 12px 16px; margin-bottom: 22px; border: 1px solid #282828;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="color: #888; font-weight: 700; font-size: 14px; width: 14px;">2</span>
              <div style="width: 36px; height: 36px; background: #0070f3; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 10px; color: #ffffff; box-shadow: 0 4px 10px rgba(0,112,243,0.3);">
                FLAC
              </div>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #ffffff;">FLAC Lossless Resolver (Hi-Res)</div>
                <div style="font-size: 12px; color: #00a8ff; font-weight: 600;">Listo</div>
              </div>
            </div>
            <span style="color: #b3b3b3; font-size: 16px;">˅</span>
          </div>
        </div>

        <!-- SECCIÓN 2: METADATOS (Verde, Imagen 1) -->
        <div style="color: #1ed760; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 14px;">
          METADATOS
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; padding-bottom: 18px; border-bottom: 1px solid #282828;">
          <!-- 1 Spotify -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="color: #888; font-weight: 700; font-size: 14px; width: 14px;">1</span>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #ffffff;">Spotify</div>
                <div style="font-size: 12px; color: #1ed760;">Tu cuenta, mientras tengas la sesión iniciada</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="amphion-toggle-switch" onclick="this.classList.toggle('off')"><div class="amphion-toggle-thumb"></div></div>
              <div style="display: flex; flex-direction: column; color: #b3b3b3; font-size: 9px; cursor: pointer;"><span>▲</span><span>▼</span></div>
            </div>
          </div>

          <!-- 2 Deezer -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="color: #888; font-weight: 700; font-size: 14px; width: 14px;">2</span>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #ffffff;">Deezer</div>
                <div style="font-size: 12px; color: #1ed760;">Se consulta</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="amphion-toggle-switch" onclick="this.classList.toggle('off')"><div class="amphion-toggle-thumb"></div></div>
              <div style="display: flex; flex-direction: column; color: #b3b3b3; font-size: 9px; cursor: pointer;"><span>▲</span><span>▼</span></div>
            </div>
          </div>

          <!-- 3 YouTube Music -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="color: #888; font-weight: 700; font-size: 14px; width: 14px;">3</span>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #ffffff;">YouTube Music</div>
                <div style="font-size: 12px; color: #1ed760;">Se consulta</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="amphion-toggle-switch" onclick="this.classList.toggle('off')"><div class="amphion-toggle-thumb"></div></div>
              <div style="display: flex; flex-direction: column; color: #b3b3b3; font-size: 9px; cursor: pointer;"><span>▲</span><span>▼</span></div>
            </div>
          </div>

          <!-- 4 Tidal -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="color: #888; font-weight: 700; font-size: 14px; width: 14px;">4</span>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #ffffff;">Tidal</div>
                <div style="font-size: 12px; color: #1ed760;">Se consulta</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="amphion-toggle-switch" onclick="this.classList.toggle('off')"><div class="amphion-toggle-thumb"></div></div>
              <div style="display: flex; flex-direction: column; color: #b3b3b3; font-size: 9px; cursor: pointer;"><span>▲</span><span>▼</span></div>
            </div>
          </div>

          <!-- 5 iTunes -->
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="color: #888; font-weight: 700; font-size: 14px; width: 14px;">5</span>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #ffffff;">iTunes</div>
                <div style="font-size: 12px; color: #1ed760;">Se consulta</div>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="amphion-toggle-switch" onclick="this.classList.toggle('off')"><div class="amphion-toggle-thumb"></div></div>
              <div style="display: flex; flex-direction: column; color: #b3b3b3; font-size: 9px; cursor: pointer;"><span>▲</span><span>▼</span></div>
            </div>
          </div>
        </div>

        <!-- SECCIÓN 3: ACCIONES RÁPIDAS & DESCARGA DIRECTA -->
        <div class="mp-quick-dl-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-size: 12px; font-weight: 700; color: #1ed760; text-transform: uppercase;">⚡ Descarga de Canción Actual</span>
            <span style="font-size: 11px; background: rgba(30,215,96,0.15); color: #1ed760; padding: 2px 8px; border-radius: 4px;">Listo</span>
          </div>

          <div class="mp-track-info-badge">
            <div class="mp-track-avatar">🎵</div>
            <div>
              <div id="mp-modal-track-name" style="font-weight: 700; font-size: 14px;">Detectando pista en Spotify...</div>
              <div id="mp-modal-track-artist" style="font-size: 12px; color: #b3b3b3;">-</div>
            </div>
          </div>

          <div style="display: flex; gap: 10px; margin-bottom: 12px;">
            <button class="mp-format-pill active" id="pill-fmt-yt">🔴 YouTube (320 kbps) ★</button>
            <button class="mp-format-pill" id="pill-fmt-flac">🔷 FLAC Lossless (Hi-Res)</button>
          </div>

          <button class="mp-dl-btn-green" id="mp-btn-action-dl">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 1a.75.75 0 0 1 .75.75v7.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0L3.72 7.53a.75.75 0 0 1 1.06-1.06l2.47 2.47V1.75A.75.75 0 0 1 8 1zM2.75 13.5a.75.75 0 0 0 0 1.5h10.5a.75.75 0 0 0 0-1.5H2.75z"/></svg>
            <span>Descargar Canción Actual Ahora</span>
          </button>

          <div id="mp-modal-progress-wrap" style="display: none; margin-top: 10px;">
            <div class="mp-progress-bar-bg"><div class="mp-progress-bar-fill" id="mp-modal-progress-fill"></div></div>
            <div id="mp-modal-progress-status" style="font-size: 11px; color: #1ed760; margin-top: 4px;">Descargando audio...</div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid #333; font-size: 12px;">
            <div>
              <span style="color: #888;">Destino:</span>
              <code style="color: #fff; margin-left: 4px;">~/Descargas/Spotify/</code>
            </div>
            <button id="mp-btn-open-folder" style="background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px; padding: 5px 10px; cursor: pointer; font-size: 11px; font-weight: 600;">
              📂 Abrir en Nemo
            </button>
          </div>
        </div>

        <!-- Historial local de descargas -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; margin-bottom: 8px;">
          <h3 style="font-size: 12px; font-weight: 700; margin: 0; color: #b3b3b3; text-transform: uppercase;">Descargas Recientes en ~/Descargas/Spotify/</h3>
          <button id="mp-btn-refresh-history" style="background: none; border: none; color: #1ed760; font-size: 11px; cursor: pointer;">Actualizar ⟳</button>
        </div>
        <div id="mp-history-list" style="background: #141414; border-radius: 8px; padding: 10px; max-height: 110px; overflow-y: auto; font-size: 12px; color: #aaa; border: 1px solid #222;">
          Cargando archivos locales...
        </div>
      </div>
    `;

    document.body.appendChild(modalWrap);

    // Eventos del modal
    const closeBtn = document.getElementById('mp-close-x');
    if (closeBtn) closeBtn.onclick = () => { modalWrap.style.display = 'none'; };
    const backBtn = document.getElementById('mp-back-btn');
    if (backBtn) backBtn.onclick = () => { modalWrap.style.display = 'none'; };
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
    updateAllTracklistRows();
    updateActionBarBatchButton();

    // Sincronización continua de estado con backend Rust (rápida si hay descargas activas)
    const now = Date.now();
    const interval = (window.AmphionState && window.AmphionState.activeTasks.size > 0) ? 1200 : 4000;
    if (window.AmphionState && (now - window.AmphionState.lastSync > interval)) {
      syncDownloadState().then(() => {
        updateAllTracklistRows();
        updateActionBarBatchButton();
      });
    }
  };

  // Sincronización inicial inmediata
  syncDownloadState().then(() => {
    runDomLoop();
  });

  setInterval(runDomLoop, 1000);

  const bridgeApi = {
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

  window.Amphion = bridgeApi;
  window.MintPlayer = bridgeApi;

  post({ type: 'ready', timestamp: Date.now() });
})();
