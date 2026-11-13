#!/usr/bin/env bash
set -e

VERSION="0.1.1"
ARCH="amd64"
PKG_NAME="mintplayer"
BUILD_DIR="dist/deb/${PKG_NAME}_${VERSION}_${ARCH}"
OUTPUT_DEB="dist/${PKG_NAME}_${VERSION}_${ARCH}.deb"

echo "📦 [1/6] Preparando estructura del paquete Debian para MintPlayer v${VERSION}..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/DEBIAN"
mkdir -p "$BUILD_DIR/usr/bin"
mkdir -p "$BUILD_DIR/usr/share/applications"
mkdir -p "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps"
mkdir -p "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps"
mkdir -p "$BUILD_DIR/usr/share/doc/$PKG_NAME"

# 1. Binario optimizado
echo "🚀 [2/6] Copiando y limpiando binario release (strip)..."
cp target/release/mintplayer "$BUILD_DIR/usr/bin/mintplayer"
strip --strip-all "$BUILD_DIR/usr/bin/mintplayer"
chmod 755 "$BUILD_DIR/usr/bin/mintplayer"

# 2. Entrada de escritorio y assets de Orpheon / Spotify
echo "🎨 [3/6] Integrando entrada .desktop y logos oficiales de Orpheon..."
cp assets/mintplayer.desktop "$BUILD_DIR/usr/share/applications/mintplayer.desktop"
chmod 644 "$BUILD_DIR/usr/share/applications/mintplayer.desktop"

cp assets/orpheon-logo.svg "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/mintplayer.svg"
chmod 644 "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/mintplayer.svg"

if [ -f "assets/orpheon-logo-512.png" ]; then
  cp assets/orpheon-logo-512.png "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps/mintplayer.png"
  chmod 644 "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps/mintplayer.png"
fi

# 3. Control Debian
echo "📝 [4/6] Generando DEBIAN/control y DEBIAN/md5sums..."
cat << EOF > "$BUILD_DIR/DEBIAN/control"
Package: $PKG_NAME
Version: $VERSION
Section: sound
Priority: optional
Architecture: $ARCH
Maintainer: Darwin Pinargote Franco <darwinsin@uesma.edu.ec>
Depends: google-chrome-stable | chromium | chromium-browser
Recommends: gstreamer1.0-plugins-base, gstreamer1.0-plugins-good
Installed-Size: $(du -ks "$BUILD_DIR/usr" | cut -f1)
Homepage: https://github.com/darwinsin/mintplayer
Description: Reproductor nativo de Spotify ultra ligero para Linux Mint Cinnamon
 MintPlayer (Edicion Spotify & Orpheon) reproduce desde la web oficial de Spotify
 mediante Google Chrome con Widevine en segundo plano via CDP, con diseno visual 1:1
 al cliente oficial de Spotify, cola de reproduccion estrictamente en orden, extensiones
 seguras y almacenamiento offline en SQLite.
EOF

# Generar firmas de integridad md5 para el paquete interno
(cd "$BUILD_DIR" && find usr -type f -exec md5sum {} + > DEBIAN/md5sums)

# 4. Construcción con dpkg-deb
echo "🔨 [5/6] Empaquetando instalador nativo .deb..."
mkdir -p dist
dpkg-deb --build --root-owner-group "$BUILD_DIR" "$OUTPUT_DEB"

# 5. Firma Criptográfica SHA-256 e Integridad
echo "🔐 [6/6] Firmando paquete con hash criptográfico SHA-256..."
sha256sum "$OUTPUT_DEB" > "${OUTPUT_DEB}.sha256"
(cd dist && sha256sum "$(basename "$OUTPUT_DEB")" > SHA256SUMS)

# Copiar a Descargas
mkdir -p /home/darwinsin/Descargas /home/darwinsin/Downloads 2>/dev/null || true
cp -f "$OUTPUT_DEB" /home/darwinsin/Descargas/ 2>/dev/null || true
cp -f "${OUTPUT_DEB}.sha256" /home/darwinsin/Descargas/ 2>/dev/null || true
cp -f "$OUTPUT_DEB" /home/darwinsin/Downloads/ 2>/dev/null || true

echo "=========================================================="
echo "✅ Paquete generado y firmado con éxito: $OUTPUT_DEB"
echo "📜 Firma SHA-256:"
cat "${OUTPUT_DEB}.sha256"
echo "📥 Entregable listo en: /home/darwinsin/Descargas/$(basename "$OUTPUT_DEB")"
echo "=========================================================="
