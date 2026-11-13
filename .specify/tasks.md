# Registro Detallado de Tareas (Atenea SDD) — v0.2.0

## Fases Completadas Previamente
- [x] **T0.1 - T0.5:** Núcleo CDP, extracción de Token y evaluate script (Commits `4076b5a`, `0d51dc5`).
- [x] **T1.1 - T1.5:** Interfaz gráfica 1:1 Spotify Desktop y cola secuencial estricta (Commit `478bb29`).
- [x] **T2.1 - T2.6:** Motor de extensiones sandboxed y manifiestos (Commit `459c11e`).
- [x] **T3.1 - T3.5:** Base de datos SQLite y módulo de anuncios con TOS (Commit `863b64e`).
- [x] **T4.1 - T4.5:** Empaquetado inicial y firma criptográfica SHA-256 (Commit `140d71a`).

---

## Fase 5: Reenfoque a Web App Wrapper y Gestor de Extensiones en Ajustes
- [x] **T5.1:** Actualizar planificación técnica y arquitectura en `.specify/plan.md`.
- [ ] **T5.2:** Implementar extensión secundaria `flac-resolver` (`manifest.json` y `main.js`) con metadatos Hi-Res.
- [ ] **T5.3:** Actualizar extensión `youtube-resolver` con atributos de prioridad primaria (`priority: "primary"`).
- [ ] **T5.4:** Implementar en `src/extensions.rs` el algoritmo de resolución con orden de prioridad (YouTube -> FLAC fallback).
- [ ] **T5.5:** Agregar endpoints en `src/server.rs` para `/api/extensions`, `/api/download`, `/api/settings/download-provider`.
- [ ] **T5.6:** Rediseñar la sección de "Ajustes" (`ui/index.html` y `ui/app.js`) incorporando el "Gestor de Extensiones de Descarga" al estilo Orpheon con selector de prioridades, flags secundarias y botón de descarga directa.
- [ ] **T5.7:** Ejecutar suite de pruebas unitarias (`cargo test`) verificando cero regresiones.
- [ ] **T5.8:** Actualizar versión a `0.2.0` en `Cargo.toml` y `scripts/build_deb.sh`.
- [ ] **T5.9:** Compilar binario release optimizado y empaquetar `mintplayer_0.2.0_amd64.deb`.
- [ ] **T5.10:** Generar firma criptográfica SHA-256 y depositar instalador en `~/Descargas/`.
