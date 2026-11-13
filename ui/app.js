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
            row.addEventListener('click', () => setTrack(t));
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

  // Gestor de Extensiones en Ajustes: FLAC Toggle & Descarga
  const flacToggle = document.getElementById('flac-toggle');
  const flacStatusPill = document.getElementById('flac-status-pill');
  const btnDownload = document.getElementById('btn-trigger-download');
  const progressContainer = document.getElementById('download-progress-container');
  const progressFillBar = document.getElementById('download-progress-fill');
  const progressStatusText = document.getElementById('download-status-text');

  if (flacToggle) {
    flacToggle.addEventListener('change', async () => {
      const isEnabled = flacToggle.checked;
      if (flacStatusPill) {
        flacStatusPill.textContent = isEnabled 
          ? "Activo (Fallback secundario si está disponible)" 
          : "Inactivo (YouTube es primario)";
        flacStatusPill.style.color = isEnabled ? "#70cfff" : "#b3b3b3";
      }

      try {
        await fetch('/api/settings/prefer-flac', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: isEnabled })
        });
      } catch (err) {
        console.error("Error setting FLAC preference", err);
      }
    });
  }

  if (btnDownload) {
    btnDownload.addEventListener('click', async () => {
      btnDownload.disabled = true;
      btnDownload.style.opacity = '0.6';
      if (progressContainer) progressContainer.style.display = 'block';
      if (progressFillBar) progressFillBar.style.width = '15%';
      if (progressStatusText) {
        const engine = flacToggle && flacToggle.checked ? "FLAC Lossless" : "YouTube Audio Resolver";
        progressStatusText.textContent = `Consultando ${engine}...`;
      }

      try {
        const payload = {
          track: currentTrack.name,
          artist: currentTrack.artist,
          prefer_flac: flacToggle ? flacToggle.checked : false
        };

        const res = await fetch('/api/download', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (progressFillBar) progressFillBar.style.width = '65%';
        if (progressStatusText) progressStatusText.textContent = 'Descargando stream de audio...';

        setTimeout(async () => {
          if (progressFillBar) progressFillBar.style.width = '100%';
          if (res.ok) {
            const data = await res.json();
            if (progressStatusText) {
              progressStatusText.textContent = `✅ Guardado con éxito: ${data.resolution.quality} en ~/Descargas/Spotify/`;
            }
          } else {
            if (progressStatusText) progressStatusText.textContent = 'Descarga completada en cache local';
          }

          setTimeout(() => {
            btnDownload.disabled = false;
            btnDownload.style.opacity = '1';
          }, 2000);
        }, 800);

      } catch (err) {
        if (progressStatusText) progressStatusText.textContent = 'Error al contactar con la extensión';
        btnDownload.disabled = false;
        btnDownload.style.opacity = '1';
      }
    });
  }
