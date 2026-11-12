# Plan Técnico y Hoja de Ruta — MintPlayer

- **Objetivo en 1 frase:** Construir un reproductor nativo de Spotify ultra ligero para Linux Mint Cinnamon en Rust y GTK4, desacoplado mediante Chrome headless (CDP/Widevine) con cola estricta en orden, extensiones sandboxed y entregable en paquete `.deb`.
- **Modo Atenea:** FULL SPEC (PERA + SDD + ODD).
- **Entorno Identificado:** Linux Mint Cinnamon (amd64), Rust 1.98.1, Cargo 1.98.1, Google Chrome 157 (Widevine OK).
- **Ruta de Trabajo:** `/home/darwinsin/.gemini/antigravity/scratch/mintplayer`

---

## Fases de Ejecución (Secuenciales)

### Fase 0 — Núcleo de Reproducción y Control CDP (Gate 1 → Gate 3)
- [ ] Configuración del proyecto Cargo (`Cargo.toml`) con dependencias base (async runtime Tokio, CDP/headless Chrome controller, keyring/libsecret, HTTP client).
- [ ] Flujo OAuth 2.0 PKCE con la Web API de Spotify (guía paso a paso para Client ID y redirect local).
- [ ] Lanzador y controlador headless de Google Chrome conectado al Web Player (`open.spotify.com`).
- [ ] Enlace CDP para ejecutar acciones de reproducción (play, pause, next, track info) sin requerir cuenta Premium.
- [ ] Verificación empírica: reproducir pista específica en orden con cuenta gratuita.

### Fase 1 — Interfaz Nativa GTK4/libadwaita y Cola de Reproducción
- [ ] Ventana principal integrada con temas Cinnamon / Adwaita.
- [ ] Vistas: Inicio, Búsqueda, Biblioteca, Playlists, Artistas y Álbumes consumiendo la Web API.
- [ ] Gestor de Cola de reproducción estricta (reordenable, sin shuffle obligatorio de cuentas gratuitas, corrector automático de saltos).
- [ ] Verificación empírica: reproducir una playlist completa en orden de inicio a fin.

### Fase 2 — Motor de Extensiones Sandboxed
- [ ] Sandbox de ejecución aislado (QuickJS runtime incrustado en Rust).
- [ ] Especificación de manifiesto (`manifest.json`) y modelo de permisos declarativos.
- [ ] API de extensiones expuesta: `provideAudio()`, `provideDownload()`, `provideLyrics()`, `onTrackChange()`.
- [ ] Extensión de ejemplo funcional (fuente de letras / fuente alternativa).

### Fase 3 — Descargas Offline, SQLite y Bloqueo de Anuncios
- [ ] Base de datos SQLite para indexación local y metadata offline.
- [ ] Gestor de descargas asíncronas con verificación de duración de audio y soporte GStreamer/ffmpeg.
- [ ] Sincronización automática de playlists descargadas.
- [ ] Módulo opcional de bloqueo de anuncios (desactivado por defecto, advertencia TOS explícita, detección vía CDP + filtro de red).

### Fase 4 — Integración con Linux Mint Cinnamon y Empaquetado .deb
- [ ] Integración MPRIS (teclas multimedia, OSD, control de bloqueo) y bandeja del sistema.
- [ ] Soporte de letras sincronizadas (LRCLIB) y ecualizador local.
- [ ] Auditoría de recursos: arranque en frío < 1 segundo, consumo mínimo de RAM.
- [ ] Estructura debian (`DEBIAN/control`, `.desktop`, iconos de alta resolución, dependencias apt).
- [ ] Generación y prueba de instalación del paquete `mintplayer_0.1.0_amd64.deb`.
