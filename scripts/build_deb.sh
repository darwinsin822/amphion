#!/usr/bin/env bash
set -e

VERSION="0.1.0"
ARCH="amd64"
PKG_NAME="mintplayer"
BUILD_DIR="dist/deb/${PKG_NAME}_${VERSION}_${ARCH}"
OUTPUT_DEB="dist/${PKG_NAME}_${VERSION}_${ARCH}.deb"

echo "📦 Preparando estructura del paquete Debian para MintPlayer v${VERSION}..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/DEBIAN"
mkdir -p "$BUILD_DIR/usr/bin"
mkdir -p "$BUILD_DIR/usr/share/applications"
mkdir -p "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps"
mkdir -p "$BUILD_DIR/usr/share/doc/$PKG_NAME"

# 1. Binario optimizado
echo "🚀 Copiando binario optimizado..."
cp target/release/mintplayer "$BUILD_DIR/usr/bin/mintplayer"
strip --strip-all "$BUILD_DIR/usr/bin/mintplayer"
chmod 755 "$BUILD_DIR/usr/bin/mintplayer"

# 2. Entrada de escritorio y assets
echo "🎨 Copiando entrada .desktop e iconos..."
cp assets/mintplayer.desktop "$BUILD_DIR/usr/share/applications/mintplayer.desktop"
chmod 644 "$BUILD_DIR/usr/share/applications/mintplayer.desktop"

cp assets/mintplayer.svg "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/mintplayer.svg"
chmod 644 "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/mintplayer.svg"

# 3. Control Debian
echo "📝 Generando DEBIAN/control..."
cat << EOF > "$BUILD_DIR/DEBIAN/control"
Package: $PKG_NAME
Version: $VERSION
Section: sound
Priority: optional
Architecture: $ARCH
Maintainer: Darwin Sin <darwinsin@uesma.edu.ec>
Depends: google-chrome-stable | chromium | chromium-browser
Recommends: gstreamer1.0-plugins-base, gstreamer1.0-plugins-good
Installed-Size: $(du -ks "$BUILD_DIR/usr" | cut -f1)
Homepage: https://github.com/darwinsin/mintplayer
Description: Reproductor nativo de Spotify ultra ligero para Linux Mint Cinnamon
 MintPlayer es un reproductor nativo desacoplado construido en Rust para Linux Mint.
 Utiliza Google Chrome con Widevine en segundo plano vía CDP para reproducir pistas
 oficiales de Spotify sin requerir suscripción Premium, garantizando reproducción
 estrictamente secuencial, extensiones sandboxed y almacenamiento offline en SQLite.
EOF

# 4. Construcción con dpkg-deb
echo "🔨 Construyendo paquete .deb..."
mkdir -p dist
dpkg-deb --build --root-owner-group "$BUILD_DIR" "$OUTPUT_DEB"

# 5. Copia a Descargas
mkdir -p /home/darwinsin/Descargas /home/darwinsin/Downloads 2>/dev/null || true
cp -f "$OUTPUT_DEB" /home/darwinsin/Descargas/ 2>/dev/null || true
cp -f "$OUTPUT_DEB" /home/darwinsin/Downloads/ 2>/dev/null || true

echo "✅ Paquete generado con éxito en: $OUTPUT_DEB"
echo "📥 Copia disponible en: /home/darwinsin/Descargas/$(basename "$OUTPUT_DEB")"
