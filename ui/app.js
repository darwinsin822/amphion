// MintPlayer Frontend Logic
document.addEventListener('DOMContentLoaded', () => {
  // Manejo de Vistas
  const navButtons = document.querySelectorAll('.nav-item');
  const sections = document.querySelectorAll('.content-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      navButtons.forEach(b => b.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      const target = document.getElementById(`view-${view}`);
      if (target) target.classList.add('active');
    });
  });

  // Estado del Reproductor
  let isPlaying = false;
  let currentTrack = null;
  let queue = [];
  let currentIndex = 0;

  const btnPlay = document.getElementById('btn-play');
  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');
  const currentTitle = document.getElementById('current-title');
  const currentArtist = document.getElementById('current-artist');
  const currentArt = document.getElementById('current-art');
  const progressFill = document.getElementById('progress-fill');
  const timeCurrent = document.getElementById('time-current');
  const timeTotal = document.getElementById('time-total');

  // Consulta de estado al backend Rust
  async function fetchStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          document.getElementById('user-display-name').textContent = data.user.display_name || data.user.id;
          document.getElementById('user-plan-badge').textContent = `Spotify ${data.user.product || 'Free'}`;
        }
        if (data.current_track) {
          updateNowPlaying(data.current_track, data.is_playing);
        }
        if (data.queue) {
          queue = data.queue.tracks || [];
          currentIndex = data.queue.current_index || 0;
          renderQueue();
        }
      }
    } catch (e) {
      console.log('Esperando conexión con el backend de MintPlayer...');
    }
  }

  function updateNowPlaying(track, playing) {
    currentTrack = track;
    isPlaying = playing;
    currentTitle.textContent = track.name;
    currentArtist.textContent = track.artists ? track.artists.map(a => a.name).join(', ') : 'Desconocido';
    btnPlay.textContent = isPlaying ? '⏸' : '▶';

    if (track.album && track.album.images && track.album.images.length > 0) {
      currentArt.src = track.album.images[0].url;
    }

    const durSec = Math.floor((track.duration_ms || 180000) / 1000);
    timeTotal.textContent = formatTime(durSec);
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Controles de Reproducción
  btnPlay.addEventListener('click', async () => {
    try {
      await fetch('/api/toggle-play', { method: 'POST' });
      isPlaying = !isPlaying;
      btnPlay.textContent = isPlaying ? '⏸' : '▶';
    } catch (e) {
      console.error(e);
    }
  });

  btnNext.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/next', { method: 'POST' });
      if (res.ok) {
        const track = await res.json();
        updateNowPlaying(track, true);
      }
    } catch (e) {
      console.error(e);
    }
  });

  btnPrev.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/prev', { method: 'POST' });
      if (res.ok) {
        const track = await res.json();
        updateNowPlaying(track, true);
      }
    } catch (e) {
      console.error(e);
    }
  });

  // Renderizar Cola de Reproducción Estricta
  function renderQueue() {
    const list = document.getElementById('queue-list');
    list.innerHTML = '';

    queue.forEach((t, idx) => {
      const row = document.createElement('div');
      row.className = `track-row ${idx === currentIndex ? 'playing' : ''}`;
      row.innerHTML = `
        <span class="track-num">${idx + 1}</span>
        <div class="track-details">
          <div class="track-name">${t.name}</div>
          <div class="track-artists">${t.artists ? t.artists.map(a => a.name).join(', ') : ''}</div>
        </div>
        <span class="track-duration">${formatTime(Math.floor((t.duration_ms || 0) / 1000))}</span>
        <button class="btn-ctrl btn-move-up" title="Subir">▲</button>
        <button class="btn-ctrl btn-move-down" title="Bajar">▼</button>
      `;

      row.querySelector('.btn-move-up').addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (idx > 0) reorderQueue(idx, idx - 1);
      });

      row.querySelector('.btn-move-down').addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (idx < queue.length - 1) reorderQueue(idx, idx + 1);
      });

      row.addEventListener('click', () => {
        playTrackAt(idx);
      });

      list.appendChild(row);
    });
  }

  async function reorderQueue(from, to) {
    try {
      await fetch('/api/queue/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to })
      });
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  }

  async function playTrackAt(index) {
    try {
      await fetch('/api/queue/play-index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
      fetchStatus();
    } catch (e) {
      console.error(e);
    }
  }

  // Búsqueda
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const searchResults = document.getElementById('search-results');

  searchBtn.addEventListener('click', performSearch);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  async function performSearch() {
    const q = searchInput.value.trim();
    if (!q) return;

    searchResults.innerHTML = '<div style="color: #888; padding: 20px;">Buscando...</div>';
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const tracks = await res.json();
        searchResults.innerHTML = '';
        tracks.forEach((t, i) => {
          const row = document.createElement('div');
          row.className = 'track-row';
          row.innerHTML = `
            <span class="track-num">${i + 1}</span>
            <div class="track-details">
              <div class="track-name">${t.name}</div>
              <div class="track-artists">${t.artists ? t.artists.map(a => a.name).join(', ') : ''}</div>
            </div>
            <button class="btn-primary" style="padding: 6px 14px; font-size: 0.8rem;">+ Agregar a Cola</button>
          `;
          row.querySelector('button').addEventListener('click', async (ev) => {
            ev.stopPropagation();
            await fetch('/api/queue/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(t)
            });
            fetchStatus();
          });
          searchResults.appendChild(row);
        });
      }
    } catch (e) {
      searchResults.innerHTML = '<div style="color: #f66;">Error al buscar canciones</div>';
    }
  }

  // Polling de estado cada 2 segundos
  fetchStatus();
  setInterval(fetchStatus, 2000);
});
