# Plan Técnico y Hoja de Ruta — MintPlayer (v0.2.0)

- **Proyecto:** MintPlayer
- **Objetivo:** Cliente de Spotify para Linux Mint Cinnamon en formato Web App Wrapper con Web Player oficial de Spotify (`open.spotify.com`), autenticación segura mediante cookies de sesión (compatible con cuentas Free), bypass de restricciones Premium por CDP, cola estricta secuencial y Gestor de Extensiones en Ajustes para descarga de música priorizando YouTube como motor primario y FLAC como secundario.
- **Arquitectura:** Web Application Wrapper optimizado en Rust con integración Chrome/CDP (soporte Widevine DRM nativo), servidor de UI desacoplado, motor de extensiones QuickJS, base de datos SQLite y empaquetado `.deb` firmado.
- **Entorno:** Linux Mint Cinnamon (amd64), Rust 1.98.1, Cargo 1.98.1, Google Chrome 157 (Widevine DRM activo).
- **Ruta del Proyecto:** `/home/darwinsin/.gemini/antigravity/scratch/mintplayer`
- **Entregable:** `/home/darwinsin/Descargas/mintplayer_0.2.0_amd64.deb` y firma `.sha256`.

---

## Fases de Construcción y Compuertas (Gate 1 a Gate 6)

### Fase 0 — Núcleo CDP y Extracción de Token — [x] COMPLETADA
- [x] Repositorio Git inicializado con especificaciones SDD en `.specify/`.
- [x] Conexión CDP asíncrona en Rust (`src/cdp.rs`) con WebSockets y `rustls`.
- [x] Puente JavaScript inyectable (`src/bridge.js`) para `TokenProvider` y `PlayerAPI`.
- [x] Soporte para modo `--login` (ventana visual) y `--headless` (segundo plano).
- [x] Verificación de salida exit 0 (Commit Git: `0d51dc5`).

### Fase 1 — Interfaz y Gestión de Biblioteca (1:1 Spotify Desktop) — [x] COMPLETADA
- [x] Interfaz idéntica al reproductor oficial de Spotify adaptada a Linux Mint Cinnamon.
- [x] Vistas: Biblioteca con pins, Inicio personalizado ("Darwin Pinargote Franco"), Daily Mixes 1-4, panel "Now Playing" con carátula de Jayac.
- [x] Gestor de Cola de reproducción estricta (`src/queue.rs`): reordenamiento y avance sin shuffle forzado.
- [x] Panel de control inferior: controles, volumen, progreso.
- [x] Tests unitarios con exit 0 (Commit Git: `478bb29`).

### Fase 2 — Motor de Extensiones Sandboxed — [x] COMPLETADA
- [x] Sandbox de extensiones con manifiesto (`manifest.json`) y permisos declarativos (`src/extensions.rs`).
- [x] API expuesta: `provideAudio()`, `provideDownload()`, `provideLyrics()`.
- [x] Extensión oficial LRCLIB (`extensions/lrclib-lyrics/`).
- [x] Tests unitarios con exit 0 (Commit Git: `459c11e`).

### Fase 3 — Descargas Offline y Módulo de Anuncios — [x] COMPLETADA
- [x] Base de datos SQLite embebida (`src/storage.rs`) para metadatos locales y biblioteca offline.
- [x] Módulo opcional de bloqueo de anuncios (`src/adblock.rs`) desactivado por defecto con advertencia explícita de TOS.
- [x] Tests unitarios con exit 0 (Commit Git: `863b64e`).

### Fase 4 — Pulido e Instalador .deb Inicial — [x] COMPLETADA
- [x] Entrada de escritorio Cinnamon (`assets/mintplayer.desktop`) e icono SVG.
- [x] Empaquetado Debian automatizado (`scripts/build_deb.sh`).
- [x] Paquete binario inicial `mintplayer_0.1.1_amd64.deb` generado y firmado.

### Fase 5 — Reenfoque a Web App Wrapper y Gestor de Extensiones en Ajustes — [x] EN EJECUCIÓN
- [x] Especificación técnica de la integración directa del Web Player oficial (`open.spotify.com`).
- [x] Gestor de Extensiones en la vista de Ajustes (`ui/index.html` y `ui/app.js`):
  - **Primaria (Predeterminada):** Extensión YouTube Audio Resolver (`youtube-resolver`) con flags de bitrate alto.
  - **Secundaria (Fallback):** Extensión FLAC Lossless Resolver (`flac-resolver`) como opción secundaria de alta resolución.
- [x] Creación del paquete de extensión `extensions/flac-resolver/` con manifiesto y script.
- [x] Endpoints en `src/server.rs` para gestión de extensiones, cambio de prioridades y orden de descarga.
- [x] Integración de botón de descarga directa en cola y en panel de reproducción actual con barra de progreso.
- [x] Pruebas unitarias de priorización y fallback de extensiones.
- [x] Construcción del paquete Debian `mintplayer_0.2.0_amd64.deb` firmado con SHA-256.
- [x] Entrega en `~/Descargas/` con verificación de integridad.
