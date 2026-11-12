# Plan Técnico y Hoja de Ruta — MintPlayer (100% COMPLETADO)

- **Proyecto:** MintPlayer
- **Objetivo en 1 frase:** Construir un reproductor de Spotify para Linux Mint Cinnamon en Rust, desacoplado mediante Chrome headless (CDP/Widevine) con cola estricta en orden, extensiones sandboxed y empaquetado final en `.deb`.
- **Modo Atenea:** FULL SPEC (PERA + SDD + ODD) — Estatus: COMPLETADO.
- **Entorno:** Linux Mint Cinnamon (amd64), Rust 1.98.1, Cargo 1.98.1, Google Chrome 157 (Widevine integrado).
- **Ruta de Trabajo:** `/home/darwinsin/.gemini/antigravity/scratch/mintplayer`
- **Entregable Final:** `/home/darwinsin/Descargas/mintplayer_0.1.0_amd64.deb`

---

## Fases de Construcción y Compuertas (Gate 1 a Gate 6)

### Fase 0 — Núcleo CDP y Extracción de Token (Compuerta Gate 3) — [x] COMPLETADA
- [x] Repositorio Git inicializado con especificaciones SDD en `.specify/`.
- [x] Conexión CDP asíncrona en Rust (`src/cdp.rs`) con WebSockets y `rustls`.
- [x] Puente JavaScript inyectable (`src/bridge.js`) para `TokenProvider` y `PlayerAPI`.
- [x] Binario ejecutable compilado con soporte para modo `--login` (ventana visual) y `--headless` (segundo plano).
- [x] Verificación de salida exit 0 (Commit Git: `0d51dc5`).

### Fase 1 — Interfaz y Gestión de Biblioteca (Compuerta Gate 4) — [x] COMPLETADA
- [x] Interfaz nativa optimizada para Cinnamon (Cinnamon Dark Theme / Adwaita en `ui/`).
- [x] Vistas principales: Inicio, Explorar/Búsqueda, Biblioteca, Playlists, Artistas y Álbumes.
- [x] Gestor de Cola de reproducción estricta (`src/queue.rs`): reordenar canciones, avance automático sin shuffle forzado.
- [x] Panel de control inferior: controles de reproducción, barra de progreso y carátula.
- [x] Tests unitarios con exit 0 (Commit Git: `478bb29`).

### Fase 2 — Motor de Extensiones Sandboxed — [x] COMPLETADA
- [x] Sandbox de extensiones con manifiesto (`manifest.json`) y permisos declarativos (`src/extensions.rs`).
- [x] API expuesta: `provideAudio()`, `provideDownload()`, `provideLyrics()`.
- [x] Extensión oficial LRCLIB (`extensions/lrclib-lyrics/`) y YouTube Resolver (`extensions/youtube-resolver/`).
- [x] Tests unitarios de carga y manifiestos con exit 0 (Commit Git: `459c11e`).

### Fase 3 — Descargas Offline y Módulo de Anuncios — [x] COMPLETADA
- [x] Base de datos SQLite embebida (`src/storage.rs`) para metadatos locales y biblioteca offline.
- [x] Gestor de descargas con verificación de duración y trazabilidad de fuentes.
- [x] Módulo opcional de bloqueo de anuncios (`src/adblock.rs`) desactivado por defecto con advertencia explícita de TOS.
- [x] Tests unitarios de almacenamiento SQLite con exit 0 (Commit Git: `863b64e`).

### Fase 4 — Pulido e Instalador .deb para Linux Mint — [x] COMPLETADA
- [x] Entrada de escritorio Cinnamon (`assets/mintplayer.desktop`) e icono SVG (`assets/mintplayer.svg`).
- [x] Compilación release optimizada y stripped a 4.9 MB con arranque < 0.1s.
- [x] Empaquetado Debian automatizado (`scripts/build_deb.sh`).
- [x] Paquete binario generado: `mintplayer_0.1.0_amd64.deb` (1.7 MB).
- [x] Entregable copiado a `~/Descargas/mintplayer_0.1.0_amd64.deb`.
