# Amphion 🎵

[![Descargar Amphion .deb](https://img.shields.io/badge/Descargar%20Amphion-v0.7.4%20.deb%20(Linux%20Mint%20%2F%20Ubuntu)-1DB954?style=for-the-badge&logo=linux&logoColor=white)](https://github.com/darwinsin822/amphion/releases/latest/download/amphion_0.7.4_amd64.deb)
[![Última Versión](https://img.shields.io/github/v/release/darwinsin822/amphion?style=for-the-badge&color=1ed760)](https://github.com/darwinsin822/amphion/releases/latest)

> 🚀 **¿Quieres instalar Amphion en tu equipo?**  
> 👉 **[Descargar instalador directo (.deb v0.7.4)](https://github.com/darwinsin822/amphion/releases/latest/download/amphion_0.7.4_amd64.deb)** *(1.5 MB — compatible con Linux Mint, Ubuntu y Debian)*

---

> **Streaming puro de Spotify sobre el Web Player oficial, con interfaz Premium inyectada y conector SpotDown Multi-Servicio, para Linux Mint Cinnamon**

Amphion es un lanzador nativo en **Rust** que abre el Web Player oficial de Spotify en una ventana de aplicación y le inyecta una capa de interfaz Premium vía Chrome DevTools Protocol (CDP). No hay servidor local, no hay panel duplicado y no se almacenan credenciales.

---

## 🏛️ El Mito y la Aplicación

| 🖥️ Captura de Amphion (Linux Mint) | ⚡ Anfión: Dios y Músico de la Lira Divina |
| :---: | :---: |
| ![Amphion Screenshot](assets/amphion_screenshot.png) | ![Anfión](assets/amphion_god.jpg) |

> *En la mitología griega, **Anfión** (hijo de Zeus y Antíope) recibió de Hermes una lira de oro. Su música era tan virtuosa y celestial que las piedras y bloques de mármol cobraban vida y levitaban al son de sus melodías para edificar las monumentales murallas de Tebas. Este reproductor adopta su nombre como símbolo de armonía, agilidad y pureza acústica.*

---

## Características

* 🚀 **Un solo binario nativo:** sin Electron, sin servidor HTTP local y sin procesos auxiliares.
* 🎧 **Base 100% Spotify Web Player:** la reproducción, la biblioteca y el catálogo son los oficiales de `open.spotify.com`.
* ⬇️ **Descargador Multi-Servicio (SpotDown v2 · Estilo Sakukelly Linux):**
  * 🟢 **SpotDown**, 🔵 **SoundLoaders** y 🟣 **SpotMate** integrados con panel selector popup.
  * 🔴 **Badge dinámico pulsante** en el botón superior cuando se detecta una canción o playlist activa.
  * 💬 **Tooltip interactivo con vista previa** de la URL detectada al pasar el cursor.
  * ⌨️ **Atajo de teclado global `Alt + D`** para abrir el panel de descargas al instante.
  * 🖱️ **Menú contextual con clic derecho** en cada fila de las listas de canciones.
  * ✨ **Animación de confirmación** visual pos-clic (`✓ Listo`).
* ✨ **Capa Amphion:** barra de acciones de reproducción y modal de ajustes con datos reales inyectados sobre la interfaz original.
* 🎨 **Motor de temas:** 16 paletas (Spotify, AMOLED, Nord, Dracula, Catppuccin, Vallenato Gold, Cyberpunk, Synthwave, Vaporwave, Miami Vice, Lime Punch, Magma, Aurora, Bubblegum, Electric Blue, Tropical) aplicadas sobre las variables CSS del Web Player y recordadas entre sesiones.
* 🖼️ **Fondo personalizado:** elegí una imagen local, ajustá desenfoque y oscurecido; las superficies del reproductor se vuelven translúcidas para dejar ver el fondo.
* 🛡️ **Bloqueo de publicidad:** bloqueo de endpoints de anuncios por CDP más un guardián que silencia y salta los cortes de voz.
* 🛡️ **Zero Credentials Storage:** el inicio de sesión ocurre en la página oficial de Spotify; Amphion no guarda contraseñas.
* 🔁 **Guardián CDP:** si Spotify recarga la SPA o se pierde el WebSocket, Amphion reconecta y reinyecta la interfaz automáticamente.
* 📦 **Paquete nativo `.deb`:** instalación con un clic e integración en el menú de Linux Mint.

---

## 📦 Instalación en Linux Mint / Ubuntu

### Opción 1: Descarga e Instalación Fácil (Recomendada)
1. **[Descarga aquí el paquete `amphion_0.7.4_amd64.deb`](https://github.com/darwinsin822/amphion/releases/latest/download/amphion_0.7.4_amd64.deb)**.
2. Abre tu carpeta de **Descargas**, haz doble clic sobre el archivo descargado y presiona **«Instalar paquete»** (o con clic derecho > *Abrir con Instalador de paquetes GDebi*).
3. ¡Listo! Abre **Amphion** desde el menú de inicio de tu sistema.

#### O instala en 1 comando desde la terminal:
```bash
wget https://github.com/darwinsin822/amphion/releases/latest/download/amphion_0.7.4_amd64.deb
sudo apt install ./amphion_0.7.4_amd64.deb
```

### Opción 2: Compilar desde el código fuente
Requisitos: Rust (`cargo`), `build-essential` y Google Chrome o Chromium.
```bash
git clone https://github.com/darwinsin822/amphion.git
cd amphion
cargo build --release
./target/release/amphion
```

O para generar tu propio instalador `.deb`:
```bash
./scripts/build_deb.sh
```

Para abrir Spotify en segundo plano:
```bash
./target/release/amphion --daemon
```

---

## Licencia
MIT. Desarrollado por Darwin Pinargote Franco.
