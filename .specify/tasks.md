# Registro Detallado de Tareas (Atenea SDD) — 100% COMPLETADO

## Fase 0: Núcleo CDP y Extracción de Token
- [x] **T0.1:** Inicializar repositorio y estructura canónica `.specify/` (Commit: `4076b5a`).
- [x] **T0.2:** Diseñar e inyectar `src/bridge.js` para `TokenProvider` y `PlayerAPI`.
- [x] **T0.3:** Implementar cliente CDP en Rust con `rustls` (`src/cdp.rs`).
- [x] **T0.4:** Compilar binario de Fase 0 y validar comandos `--help` / `--login` / `--headless`.
- [x] **T0.5:** Commit de Fase 0 en Git (`0d51dc5`).

## Fase 1: Interfaz de Usuario y Reproducción Secuencial
- [x] **T1.1:** Arquitectura de interfaz de usuario desacoplada integrada con Cinnamon (Adwaita Dark Theme en `ui/`).
- [x] **T1.2:** Motor de Cola Secuencial (`src/queue.rs`) que anula el shuffle forzado y garantiza reproducción en orden.
- [x] **T1.3:** Navegación de biblioteca, búsqueda y playlists vía Spotify Web API (`src/api.rs`).
- [x] **T1.4:** Pruebas unitarias de avance secuencial y reordenamiento pasadas al 100% (`exit 0`).
- [x] **T1.5:** Commit de Fase 1 en Git (`478bb29`).

## Fase 2: Motor de Extensiones Sandboxed
- [x] **T2.1:** Gestor de extensiones en Rust (`src/extensions.rs`) con validación de manifiestos y permisos.
- [x] **T2.2:** API expuesta para autores: `provideAudio()`, `provideDownload()`, `provideLyrics()`.
- [x] **T2.3:** Extensión oficial LRCLIB (`extensions/lrclib-lyrics/`) para letras sincronizadas en tiempo real.
- [x] **T2.4:** Extensión oficial YouTube Resolver (`extensions/youtube-resolver/`) para resolución y descarga de audio alternativo.
- [x] **T2.5:** Suite de pruebas unitarias de carga de extensiones pasada (`exit 0`).
- [x] **T2.6:** Commit de Fase 2 en Git (`459c11e`).

## Fase 3: Descargas Offline y Módulo de Anuncios
- [x] **T3.1:** Motor SQLite embebido estático (`src/storage.rs`) para indexación local y biblioteca offline.
- [x] **T3.2:** Cola de descargas con verificación de duración y trazabilidad de fuente.
- [x] **T3.3:** Módulo opcional de bloqueo de anuncios (`src/adblock.rs`) apagado por defecto con advertencia explícita de TOS.
- [x] **T3.4:** Suite de pruebas unitarias de almacenamiento SQLite pasada (`exit 0`).
- [x] **T3.5:** Commit de Fase 3 en Git (`863b64e`).

## Fase 4: Integración con Linux Mint y Paquete .deb
- [x] **T4.1:** Compilación optimizada en perfil release (`cargo build --release`) con strip binario (~4.9 MB).
- [x] **T4.2:** Icono vectorial SVG nativo (`assets/mintplayer.svg`) y archivo de escritorio Cinnamon (`assets/mintplayer.desktop`).
- [x] **T4.3:** Script automatizado de construcción Debian (`scripts/build_deb.sh`).
- [x] **T4.4:** Paquete nativo Debian generado y verificado con `dpkg-deb`: `mintplayer_0.1.0_amd64.deb` (1.7 MB).
- [x] **T4.5:** Empaquetado entregado en carpeta física `~/Descargas/mintplayer_0.1.0_amd64.deb` listo para instalación.
