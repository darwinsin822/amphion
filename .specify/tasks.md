# Registro Detallado de Tareas (Atenea SDD)

## Fase 0: Núcleo CDP y Extracción de Token
- [x] **T0.1:** Inicializar repositorio y estructura canónica `.specify/` (Commit: `4076b5a`).
- [x] **T0.2:** Diseñar e inyectar `src/bridge.js` para `TokenProvider` y `PlayerAPI`.
- [x] **T0.3:** Implementar cliente CDP en Rust con `rustls` (`src/cdp.rs`).
- [ ] **T0.4:** Compilar binario de Fase 0 y validar comandos `--help` / `--login` / `--headless`.
- [ ] **T0.5:** Commit de Fase 0 en Git.

## Fase 1: Interfaz de Usuario y Reproducción Secuencial
- [ ] **T1.1:** Arquitectura de interfaz de usuario desacoplada integrada con Cinnamon.
- [ ] **T1.2:** Motor de Cola Secuencial (Strict Queue Manager) que anula el shuffle forzado.
- [ ] **T1.3:** Navegación de biblioteca, búsqueda y playlists.
- [ ] **T1.4:** Pruebas de reproducción secuencial en orden.

## Fase 2: Motor de Extensiones Sandboxed
- [ ] **T2.1:** Runtime de JavaScript aislado con permisos declarativos.
- [ ] **T2.2:** API del autor de extensiones (`provideAudio`, `provideDownload`, `provideLyrics`).
- [ ] **T2.3:** Extensión de ejemplo para letras y fuentes alternativas.

## Fase 3: Descargas Offline y Módulo de Anuncios
- [ ] **T3.1:** Motor SQLite para indexación local y estado offline.
- [ ] **T3.2:** Cola de descargas con verificación de duración de audio.
- [ ] **T3.3:** Módulo de bloqueo de anuncios opcional con advertencia de TOS.

## Fase 4: Integración con Linux Mint y Paquete .deb
- [ ] **T4.1:** Soporte de MPRIS v2 y control multimedia de Cinnamon.
- [ ] **T4.2:** Icono de bandeja y notificaciones del sistema.
- [ ] **T4.3:** Estructura de paquete Debian (`DEBIAN/control`, `.desktop`, iconos).
- [ ] **T4.4:** Generación del `.deb` con `dpkg-deb` y verificación final de instalación.
