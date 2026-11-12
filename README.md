# MintPlayer 🎵

> **Reproductor nativo de Spotify ultra ligero y desacoplado para Linux Mint Cinnamon**

Construido desde cero en **Rust** con interfaz Adwaita Dark, motor desacoplado sobre Google Chrome headless vía Chrome DevTools Protocol (CDP) con soporte Widevine DRM, gestor de cola secuencial estricta, sistema de extensiones sandboxed y almacenamiento offline en SQLite.

---

## Características Principales

* 🚀 **Arranque Instantáneo y Bajo Consumo de RAM:** Un solo binario nativo en Rust (~12 MB compilado) que reemplaza clientes pesados de Electron.
* 🎧 **Reproducción sin Requisito Premium:** Control de reproducción desacoplado mediante el Web Player oficial (`open.spotify.com`) por CDP interactuando directamente con `PlayerAPI`.
* 🛡️ **Seguridad Total (Zero Credentials Storage):** No almacena contraseñas; el inicio de sesión se realiza en la página oficial de Spotify y los tokens se gestionan de forma segura.
* 📋 **Cola de Reproducción Estricta:** La app es dueña absoluta de la cola; avanza secuencialmente pista tras pista sin forzar modo aleatorio (shuffle desactivado por defecto).
* 🧩 **Ecosistema de Extensiones:** Extensiones sandboxed con manifiesto declarativo y permisos explícitos (`provideAudio`, `provideDownload`, `provideLyrics`).
* 📥 **Almacenamiento Offline en SQLite:** Indexación de metadatos locales y sincronización de bibliotecas.
* 📦 **Paquete Nativo .deb:** Instalable con un solo clic en Linux Mint Cinnamon con integración de menú de escritorio.

---

## Instalación en Linux Mint

### Opción 1: Instalar el paquete `.deb`
```bash
sudo apt install ./mintplayer_0.1.0_amd64.deb
```
O simplemente haz doble clic sobre el archivo descargado en tu carpeta `~/Descargas`.

### Opción 2: Compilar desde el código fuente
Requisitos: Rust (cargo) y Google Chrome instalados en el sistema.
```bash
# Compilar binario optimizado
cargo build --release

# Ejecutar en modo visual para primer inicio de sesión
./target/release/mintplayer --login

# Ejecutar normalmente
./target/release/mintplayer
```

---

## Licencia
Licencia MIT. Desarrollado con 🦉 **Atenea 2.0 (PERA + SDD)**.
