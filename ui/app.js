// ==========================================================================
// MintPlayer & Orpheon Edition — Frontend Controller
// Optimizado por el Escuadrón Tortugas Ninja & Zeus
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  let isPlaying = false;
  let progressSec = 27;
  let durationSec = 199; // 3:19
  let timerInterval = null;

  // Canción activa por defecto (la misma de la captura de Darwin)
  let currentTrack = {
    name: "Zapateando Juyayay",
    artist: "Jayac",
    album: "LA FUERZA DEL CANTO",
    duration_ms: 199000,
    uri: "spotify:track:juyayay"
  };

  // Elementos DOM
  const btnPlay = document.getElementById('btn-main-playback');
  const btnNext = document.getElementById('btn-next-track');
  const btnPrev = document.getElementById('btn-prev-track');
  const playSvg = document.getElementById('main-play-svg');
  const timeCurrent = document.getElementById('scrub-time-current');
  const timeTotal = document.getElementById('scrub-time-total');
  const progressFill = document.getElementById('scrub-progress-fill');
  const progressThumb = document.getElementById('scrub-thumb-dot');
  const scrubTrack = document.getElementById('scrub-bar-track');

  // Textos de reproducción activa
  const footerSong = document.getElementById('footer-song-name');
  const footerArtist = document.getElementById('footer-artist-name');
  const npTrackTitle = document.getElementById('np-track-title');
  const npTrackArtist = document.getElementById('np-track-artist');
  const npHeaderArtist = document.getElementById('np-header-artist');

  // Navegación de Vistas
  const views = document.querySelectorAll('.content-scroll-area');
  const navBtns = document.querySelectorAll('[data-view]');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.view;
      if (!targetView) return;

      views.forEach(v => v.classList.remove('active'));
      const activeEl = document.getElementById(`view-${targetView}`);
      if (activeEl) activeEl.classList.add('active');

      if (targetView === 'search') {
        document.getElementById('spotify-search-input').focus();
      }
    });
  });

  // Clicks en Daily Mixes
  document.querySelectorAll('.daily-mix-card').forEach(card => {
    card.addEventListener('click', () => {
      const mixNum = card.dataset.mix;
      const desc = card.querySelector('.mix-desc').textContent;
      setTrack({
        name: `Mix Diario ${mixNum} - Selección`,
        artist: desc.split(',')[0] || 'Varios Artistas',
        album: `Mix diario ${mixNum}`,
        duration_ms: 215000,
        uri: `spotify:playlist:mix_${mixNum}`
      });
    });
  });

  // Clicks en elementos de biblioteca
  document.querySelectorAll('.lib-item').forEach(item => {
    item.addEventListener('click', () => {
      document.querySelectorAll('.lib-item').forEach(i => i.classList.remove('active', 'playing'));
      item.classList.add('active', 'playing');
      const title = item.querySelector('.lib-item-title').textContent;
      const sub = item.querySelector('.lib-item-sub').textContent;

      if (title.includes('Jayac') || title.includes('me gusta')) {
        setTrack({
          name: "Zapateando Juyayay",
          artist: "Jayac",
          album: "LA FUERZA DEL CANTO",
          duration_ms: 199000,
          uri: "spotify:track:juyayay"
        });
      } else {
        setTrack({
          name: title,
          artist: sub.split('•')[1]?.trim() || "Spotify",
          album: title,
          duration_ms: 180000,
          uri: "spotify:track:custom"
        });
      }
    });
  });

  function setTrack(track) {
    currentTrack = track;
    // Expuesto para el panel de descargas (fuera de este alcance de DOMContentLoaded)
    window.__amphionCurrentTrack = track;
    footerSong.textContent = track.name;
    footerArtist.textContent = track.artist;
    npTrackTitle.textContent = track.name;
    npTrackArtist.textContent = track.artist;
    npHeaderArtist.textContent = track.artist;

    progressSec = 0;
    durationSec = Math.floor((track.duration_ms || 180000) / 1000);
    timeTotal.textContent = formatTime(durationSec);

    updatePlaybackState(true);
  }

  function updatePlaybackState(playing) {
    isPlaying = playing;
    if (isPlaying) {
      playSvg.innerHTML = '<path d="M5.7 3a.7.7 0 0 0-.7.7v16.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7H5.7zm10 0a.7.7 0 0 0-.7.7v16.6a.7.7 0 0 0 .7.7h2.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7h-2.6z"/>';
      if (!timerInterval) {
        timerInterval = setInterval(() => {
          progressSec++;
          if (progressSec > durationSec) {
            progressSec = 0;
          }
          renderScrubber();
        }, 1000);
      }
    } else {
      playSvg.innerHTML = '<path d="m7.05 3.606 13.49 7.788a.7.7 0 0 1 0 1.212L7.05 20.394A.7.7 0 0 1 6 19.788V4.212a.7.7 0 0 1 1.05-.606z"/>';
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  }

  function renderScrubber() {
    timeCurrent.textContent = formatTime(progressSec);
    const pct = Math.min(100, (progressSec / durationSec) * 100);
    progressFill.style.width = `${pct}%`;
    progressThumb.style.left = `${pct}%`;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Controles
  btnPlay.addEventListener('click', async () => {
    updatePlaybackState(!isPlaying);
    try {
      await fetch('/api/toggle-play', { method: 'POST' });
    } catch (e) {}
  });

  btnNext.addEventListener('click', async () => {
    progressSec = 0;
    renderScrubber();
    try {
      const res = await fetch('/api/next', { method: 'POST' });
      if (res.ok) {
        const t = await res.json();
        setTrack(t);
      }
    } catch (e) {}
  });

  btnPrev.addEventListener('click', async () => {
    progressSec = 0;
    renderScrubber();
    try {
      const res = await fetch('/api/prev', { method: 'POST' });
      if (res.ok) {
        const t = await res.json();
        setTrack(t);
      }
    } catch (e) {}
  });

  // Scrubber click
  scrubTrack.addEventListener('click', (ev) => {
    const rect = scrubTrack.getBoundingClientRect();
    const pos = (ev.clientX - rect.left) / rect.width;
    progressSec = Math.floor(pos * durationSec);
    renderScrubber();
  });

  // Búsqueda en barra superior
  const searchInput = document.getElementById('spotify-search-input');
  searchInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const q = searchInput.value.trim();
      if (!q) return;

      views.forEach(v => v.classList.remove('active'));
      document.getElementById('view-search').classList.add('active');

      const container = document.getElementById('search-results-table');
      container.innerHTML = '<div style="padding: 24px; color: #b3b3b3;">Buscando canciones...</div>';

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const tracks = await res.json();
          container.innerHTML = '';
          tracks.forEach((t, i) => {
            const row = document.createElement('div');
            row.className = 'lib-item';
            row.style.margin = '4px 0';
            row.innerHTML = `
              <div class="lib-item-cover liked-cover-gradient">🎵</div>
              <div class="lib-item-meta" style="flex:1;">
                <div class="lib-item-title">${t.name}</div>
                <div class="lib-item-sub">${t.artists.map(a => a.name).join(', ')}</div>
              </div>
              <button class="filter-pill" style="margin-right: 12px;">+ Agregar a Cola</button>
            `;
            row.addEventListener('click', () => setTrack({
              ...t,
              artist: (t.artists || []).map(a => a.name).join(', '),
              album: t.album ? t.album.name : null
            }));
            container.appendChild(row);
          });
        }
      } catch (err) {
        container.innerHTML = '<div style="padding: 24px; color: #f44;">Error al buscar</div>';
      }
    }
  });

  renderScrubber();
});

  // ==========================================================================
  // Panel de Descargas — Motor único YouTube 320 kbps (calidad Premium)
  // ==========================================================================
  const btnDownload = document.getElementById('btn-trigger-download');
  const progressContainer = document.getElementById('download-progress-container');
  const progressFillBar = document.getElementById('download-progress-fill');
  const progressStatusText = document.getElementById('download-status-text');

  const normalizeKey = (artist, title) => {
    const clean = (v) => (v || '')
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return `${clean(artist)}:${clean(title)}`;
  };

  if (btnDownload) {
    btnDownload.addEventListener('click', async () => {
      const track = window.__amphionCurrentTrack;
      if (!track) return;

      btnDownload.disabled = true;
      btnDownload.style.opacity = '0.6';
      if (progressContainer) progressContainer.style.display = 'block';
      if (progressFillBar) {
        progressFillBar.style.background = '#1ed760';
        progressFillBar.style.width = '8%';
      }
      if (progressStatusText) {
        progressStatusText.textContent = 'Conectando con YouTube a 320 kbps...';
      }

      const key = normalizeKey(track.artist, track.name);

      try {
        const res = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            track: track.name,
            artist: track.artist,
            album: track.album || null,
            track_number: null
          })
        });

        if (!res.ok) {
          if (progressStatusText) progressStatusText.textContent = 'No se pudo iniciar la descarga.';
          return;
        }

        // Seguimiento real del progreso hasta que el archivo exista en disco.
        for (let i = 0; i < 240; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const stateRes = await fetch('/api/downloads/state');
          if (!stateRes.ok) continue;
          const state = await stateRes.json();

          if ((state.completed_keys || []).includes(key)) {
            if (progressFillBar) progressFillBar.style.width = '100%';
            if (progressStatusText) {
              progressStatusText.textContent = `✅ Descargada en ~/Descargas/Spotify/ · ${track.name}`;
            }
            break;
          }

          if (state.failed && state.failed[key]) {
            if (progressFillBar) {
              progressFillBar.style.width = '100%';
              progressFillBar.style.background = '#ff5555';
            }
            if (progressStatusText) {
              progressStatusText.textContent = `⚠️ ${state.failed[key].error}`;
            }
            break;
          }

          const active = state.active && state.active[key];
          const pct = active && typeof active.progress === 'number' ? Math.round(active.progress) : 0;
          if (progressFillBar) progressFillBar.style.width = `${Math.max(8, pct)}%`;
          if (progressStatusText) {
            progressStatusText.textContent = pct > 0
              ? `Descargando y convirtiendo a MP3 320 kbps… ${pct}%`
              : 'Extrayendo audio de YouTube...';
          }
        }
      } catch (err) {
        if (progressStatusText) progressStatusText.textContent = 'Sin conexión con el motor de descargas.';
      } finally {
        btnDownload.disabled = false;
        btnDownload.style.opacity = '1';
      }
    });
  }

  // ==========================================================================
  // Bloqueo de anuncios por CDP (apagado por defecto)
  // ==========================================================================
  const adblockToggle = document.getElementById('adblock-toggle');
  if (adblockToggle) {
    adblockToggle.addEventListener('change', async () => {
      try {
        await fetch('/api/settings/adblock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: adblockToggle.checked })
        });
      } catch (err) {
        adblockToggle.checked = !adblockToggle.checked;
        console.error('No se pudo cambiar el módulo de anuncios', err);
      }
    });
  }
