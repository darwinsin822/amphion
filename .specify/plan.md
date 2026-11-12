# Plan Técnico y Hoja de Ruta — MintPlayer

- **Proyecto:** MintPlayer
- **Objetivo en 1 frase:** Construir un reproductor de Spotify para Linux Mint Cinnamon en Rust, desacoplado mediante Chrome headless (CDP/Widevine) con cola estricta en orden, extensiones sandboxed y empaquetado final en `.deb`.
- **Modo Atenea:** FULL SPEC (PERA + SDD + ODD).
- **Entorno:** Linux Mint Cinnamon (amd64), Rust 1.98.1, Cargo 1.98.1, Google Chrome 157 (Widevine integrado).
- **Ruta de Trabajo:** `/home/darwinsin/.gemini/antigravity/scratch/mintplayer`

---

## Decisiones de Arquitectura Consolidadas (Modelo Orpheon / MySpoti)
1. **Autenticación Delegada e Inyección de Puente:**
   - No se solicitan ni almacenan contraseñas de Spotify.
   - El inicio de sesión se realiza en la página oficial (`open.spotify.com`).
   - El puente inyectado (`bridge.js`) extrae el token legítimo de `TokenProvider` mediante el árbol de React, eliminando la necesidad de que el usuario configure un Client ID o una App de Desarrollador en Spotify.
2. **Control de Reproducción Desacoplado:**
   - La app host emite órdenes sobre `PlayerAPI` del Web Player vía CDP (`play`, `pause`, `resume`, `skipToNext`, `skipToPrevious`).
   - Se elude la restricción de cuenta Premium de la Web API REST.
3. **Cola Estricta en Orden:**
   - La cola de reproducción es gestionada por la app local.
   - Si el Web Player intenta forzar modo aleatorio (comportamiento gratuito de Spotify), la app intercepta el cambio y fuerza la siguiente pista en orden secuencial exacto.

---

## Fases de Construcción y Compuertas (Gate 1 a Gate 6)

### Fase 0 — Núcleo CDP y Extracción de Token (Compuerta Gate 3)
- [x] Repositorio Git inicializado con especificaciones SDD en `.specify/`.
- [x] Conexión CDP asíncrona en Rust (`src/cdp.rs`) con WebSockets y `rustls`.
- [x] Puente JavaScript inyectable (`src/bridge.js`) para `TokenProvider` y `PlayerAPI`.
- [ ] Binario ejecutable compilado con soporte para modo `--login` (ventana visual) y `--headless` (segundo plano).
- [ ] Prueba de ejecución de verificación (exit 0).

### Fase 1 — Interfaz y Gestión de Biblioteca (Compuerta Gate 4)
- [ ] Interfaz nativa optimizada para Cinnamon (Cinnamon Dark Theme / Adwaita).
- [ ] Vistas principales: Inicio, Explorar/Búsqueda, Biblioteca, Playlists, Artistas y Álbumes.
- [ ] Gestor de Cola de reproducción estricta (reordenar canciones, avance automático sin shuffle).
- [ ] Panel de control inferior: controles de reproducción, barra de progreso y carátula.

### Fase 2 — Motor de Extensiones Sandboxed
- [ ] Sandbox de extensiones aislado en QuickJS / JavaScript seguro.
- [ ] Especificación de manifiesto (`manifest.json`) con permisos explícitos aprobados por el usuario.
- [ ] API expuesta: `provideAudio()`, `provideDownload()`, `provideLyrics()`, `onTrackChange()`.
- [ ] Extensión de ejemplo funcional (fuente de letras y fuentes alternativas).

### Fase 3 — Descargas Offline y Módulo de Anuncios
- [ ] Base de datos SQLite para metadatos locales y biblioteca offline.
- [ ] Gestor de descargas con cola, verificación de duración y soporte de audio local.
- [ ] Sincronización automática de playlists descargadas.
- [ ] Módulo opcional de bloqueo de anuncios (desactivado por defecto, advertencia TOS visible).

### Fase 4 — Pulido e Instalador .deb para Linux Mint
- [ ] Integración de sistema: MPRIS (teclas multimedia, OSD Cinnamon) e icono en bandeja.
- [ ] Verificación de métricas de rendimiento (arranque < 1s, consumo bajo de RAM).
- [ ] Generación de estructura Debian (`DEBIAN/control`, `.desktop`, iconos PNG).
- [ ] Empaquetado binario `mintplayer_0.1.0_amd64.deb` mediante `dpkg-deb`.
- [ ] Verificación de instalación limpia.
