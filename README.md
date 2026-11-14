# Amphion 🎵

> **Streaming puro de Spotify sobre el Web Player oficial, con interfaz Premium inyectada, para Linux Mint Cinnamon**

Amphion es un lanzador nativo en **Rust** que abre el Web Player oficial de Spotify en una ventana de aplicación y le inyecta una capa de interfaz Premium vía Chrome DevTools Protocol (CDP). No hay servidor local, no hay panel duplicado y no se almacenan credenciales.

---

## Características

* 🚀 **Un solo binario nativo:** sin Electron, sin servidor HTTP local y sin procesos auxiliares.
* 🎧 **Base 100% Spotify Web Player:** la reproducción, la biblioteca y el catálogo son los oficiales de `open.spotify.com`.
* ✨ **Capa Amphion Premium:** botón Premium, barra de acciones de reproducción y modal de ajustes de audio inyectados sobre la interfaz original.
* 🛡️ **Zero Credentials Storage:** el inicio de sesión ocurre en la página oficial de Spotify; Amphion no guarda contraseñas.
* 🔁 **Guardián CDP:** si Spotify recarga la SPA o se pierde el WebSocket, Amphion reconecta y reinyecta la interfaz automáticamente.
* 📦 **Paquete nativo `.deb`:** instalación con un clic e integración en el menú de Linux Mint.

---

## Instalación en Linux Mint

### Opción 1: paquete `.deb`
```bash
sudo apt install ./amphion_0.6.2_amd64.deb
```
O haz doble clic sobre el archivo en `~/Descargas`.

### Opción 2: compilar desde el código fuente
Requisitos: Rust (cargo) y Google Chrome.
```bash
cargo build --release
./target/release/amphion
```

Para abrir Spotify en segundo plano:
```bash
./target/release/amphion --daemon
```

---

## Licencia
MIT. Desarrollado por Darwin Pinargote Franco.
