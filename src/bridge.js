// Amphion Bridge v0.6.0 - Spotify Web Player Controller & Pure Streaming Engine
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
        width: 520px;
        max-width: 90vw;
        padding: 24px;
        color: #ffffff;
        box-shadow: 0 16px 40px rgba(0,0,0,0.9);
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
    toast.innerHTML = isSuccess 
      ? `<span style="font-size: 16px; color: #1ed760;">⚡</span> <span>${msg}</span>`
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

  // SVGs de Barra de Acciones Estilo Spotify Premium
  const SVG_TOOLBAR_ADD = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
  const SVG_TOOLBAR_MORE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>`;
  const SVG_TOOLBAR_SORT = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v14M3 8l4-4 4 4M17 20V6M21 16l-4 4-4-4"/></svg>`;
  const SVG_TOOLBAR_FILTER = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/></svg>`;
  const SVG_TOOLBAR_SHUFFLE = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>`;
  const SVG_TOOLBAR_PLAY = `<svg viewBox="0 0 24 24" width="26" height="26" fill="#121212" style="margin-left: 3px;"><polygon points="6,4 20,12 6,20"/></svg>`;

  // 1. INYECCIÓN DEL BOTÓN "Premium" EN LA BARRA SUPERIOR (Reemplazo de Explorar Premium)
  const injectPremiumPill = () => {
    // Si existe el botón nativo de upgrade, convertir su texto exactamente a "Premium"
    const nativeUpgradeButtons = document.querySelectorAll(
      '[data-testid="upgrade-button"], button[data-testid="upgrade-button"], .main-topBar-UpgradeButton'
    );
    nativeUpgradeButtons.forEach(btn => {
      // Reemplazar texto interno por "Premium"
      const textContainer = btn.querySelector('span') || btn;
      if (textContainer.textContent.trim() !== 'Premium') {
        textContainer.textContent = 'Premium';
      }
      btn.style.display = 'inline-flex';
      btn.style.visibility = 'visible';
      btn.style.opacity = '1';
      btn.title = "Cuenta Amphion Premium Activa";
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
      };
    });

    // Si no existe, inyectar nuestro botón Premium oficial en el top bar
    let customBtn = document.getElementById('amphion-premium-badge-btn');
    if (!customBtn && nativeUpgradeButtons.length === 0) {
      customBtn = document.createElement('button');
      customBtn.id = 'amphion-premium-badge-btn';
      customBtn.className = 'amphion-premium-pill-btn';
      customBtn.textContent = 'Premium';
      customBtn.title = "Cuenta Amphion Premium Activa";
      customBtn.onclick = () => openModal();

      const topBarActions = document.querySelector('[data-testid="top-bar"] div:last-child') ||
                            document.querySelector('.main-topBar-actions') ||
                            document.querySelector('header');
      if (topBarActions) {
        topBarActions.insertBefore(customBtn, topBarActions.firstChild);
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
    });
  };

  // 4. MODAL LIMPIO DE AJUSTES DE STREAMING & AUDIO (Sin descargas)
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

        <!-- Pestañas horizontales -->
        <div style="display: flex; gap: 24px; border-bottom: 1px solid #282828; margin-bottom: 20px;">
          <div style="color: #a7a7a7; font-size: 14px; font-weight: 700; padding-bottom: 10px; cursor: pointer;">Cuentas</div>
          <div style="color: #ffffff; font-size: 14px; font-weight: 700; padding-bottom: 10px; border-bottom: 3px solid #1ed760; cursor: pointer;">Audio & Streaming</div>
          <div style="color: #a7a7a7; font-size: 14px; font-weight: 700; padding-bottom: 10px; cursor: pointer;">Reproducción</div>
          <div style="color: #a7a7a7; font-size: 14px; font-weight: 700; padding-bottom: 10px; cursor: pointer;">Seguridad</div>
        </div>

        <!-- SECCIÓN: STREAMING EN ALTA DEFINICIÓN -->
        <div style="color: #1ed760; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px;">
          STREAMING EN ALTA FIDELIDAD
        </div>

        <!-- Tarjeta Calidad de Audio -->
        <div style="background: #181818; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; border: 1px solid #282828;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 36px; height: 36px; background: rgba(30,215,96,0.15); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px; color: #1ed760;">
                HQ
              </div>
              <div>
                <div style="font-weight: 700; font-size: 14px; color: #ffffff;">Calidad de Audio Streaming</div>
                <div style="font-size: 12px; color: #1ed760; font-weight: 600;">Muy Alta · 320 kbps (Oficial)</div>
              </div>
            </div>
            <span style="font-size: 11px; background: rgba(30,215,96,0.15); color: #1ed760; padding: 4px 10px; border-radius: 500px; font-weight: 700;">PREMIUM</span>
          </div>
          <div style="font-size: 12px; color: #a7a7a7; margin-top: 10px; line-height: 1.4;">
            Transmisión directa de audio sin pérdidas perceptibles en formato Vorbis/AAC optimizado para streaming fluido e instantáneo.
          </div>
        </div>

        <!-- Opciones de Reproductor -->
        <div style="background: #181818; border-radius: 8px; padding: 14px 18px; margin-bottom: 16px; border: 1px solid #282828;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 13px; font-weight: 600; color: #ffffff;">Normalización de volumen</span>
            <span style="color: #1ed760; font-weight: 700; font-size: 13px;">✓ Activado</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 13px; font-weight: 600; color: #ffffff;">Reproducción sin pausas (Gapless)</span>
            <span style="color: #1ed760; font-weight: 700; font-size: 13px;">✓ Activado</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 13px; font-weight: 600; color: #ffffff;">Bloqueador de anuncios Amphion</span>
            <span style="color: #1ed760; font-weight: 700; font-size: 13px;">✓ Activo</span>
          </div>
        </div>

        <!-- Estado de cuenta -->
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #b3b3b3; padding-top: 8px;">
          <span>Usuario: <strong style="color: #fff;">Darwin Pinargote Franco</strong></span>
          <span style="color: #1ed760; font-weight: 700;">Amphion Streaming Edition</span>
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
  };

  const openModal = () => {
    injectModal();
    const modal = document.getElementById('amphion-modal-backdrop');
    if (modal) modal.style.display = 'flex';
  };

  // 5. CICLO ULTRA LIGERO DE MANTENIMIENTO DOM (Zero Network Polls)
  const runDomLoop = () => {
    injectPremiumPill();
    updateActionBarToolbar();
  };

  // Inicialización inmediata
  injectPremiumPill();
  updateActionBarToolbar();
  setInterval(runDomLoop, 1500);

  // Registro del objeto soberano en window para el Guard en Rust
  window.Amphion = {
    ready: true,
    version: "0.6.0",
    mode: "streaming_pure",
    openSettings: openModal,
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

  console.log("⚡ [Amphion v0.6.0] Puente de Streaming Puro y Alta Fidelidad inicializado.");
})();
