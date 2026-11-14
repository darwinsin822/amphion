#!/usr/bin/env bash
set -e

VERSION=$(grep "^version" "$(dirname "$0")/../Cargo.toml" | head -1 | sed 's/.*= "\(.*\)"/\1/')
ARCH="amd64"
PKG_NAME="amphion"
BUILD_DIR="dist/deb/${PKG_NAME}_${VERSION}_${ARCH}"
OUTPUT_DEB="dist/${PKG_NAME}_${VERSION}_${ARCH}.deb"

echo "📦 [1/6] Preparando estructura del paquete Debian para Amphion v${VERSION}..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/DEBIAN"
mkdir -p "$BUILD_DIR/usr/bin"
mkdir -p "$BUILD_DIR/usr/share/applications"
mkdir -p "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps"
mkdir -p "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps"
mkdir -p "$BUILD_DIR/usr/share/amphion/extensions"
mkdir -p "$BUILD_DIR/usr/share/mintplayer/extensions"
mkdir -p "$BUILD_DIR/usr/share/doc/$PKG_NAME"

# 1. Compilar binario release si es necesario
echo "🦀 Compilando release binary optimizado con Cargo..."
cargo build --release

# 2. Binario optimizado
echo "🚀 [2/6] Copiando y limpiando binario release (strip)..."
cp target/release/amphion "$BUILD_DIR/usr/bin/amphion"
strip --strip-all "$BUILD_DIR/usr/bin/amphion"
chmod 755 "$BUILD_DIR/usr/bin/amphion"
ln -sf amphion "$BUILD_DIR/usr/bin/mintplayer"

# 3. Copiar extensiones por defecto
echo "🧩 Integrando motor único de descargas (YouTube Resolver)..."
cp -r extensions/* "$BUILD_DIR/usr/share/amphion/extensions/"
cp -r extensions/* "$BUILD_DIR/usr/share/mintplayer/extensions/"

# 4. Entrada de escritorio y assets oficiales de Spotify
echo "🎨 [3/6] Integrando entrada .desktop y logos oficiales de Spotify..."
cp assets/amphion.desktop "$BUILD_DIR/usr/share/applications/amphion.desktop"
cp assets/amphion.desktop "$BUILD_DIR/usr/share/applications/mintplayer.desktop"
chmod 644 "$BUILD_DIR/usr/share/applications/amphion.desktop"
chmod 644 "$BUILD_DIR/usr/share/applications/mintplayer.desktop"

cp assets/spotify-original.svg "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/amphion.svg"
cp assets/spotify-original.svg "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/mintplayer.svg"
cp assets/spotify-original.svg "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/spotify.svg"
chmod 644 "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/amphion.svg"
chmod 644 "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/mintplayer.svg"
chmod 644 "$BUILD_DIR/usr/share/icons/hicolor/scalable/apps/spotify.svg"

if [ -f "assets/spotify-original-512.png" ]; then
  cp assets/spotify-original-512.png "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps/amphion.png"
  cp assets/spotify-original-512.png "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps/mintplayer.png"
  cp assets/spotify-original-512.png "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps/spotify.png"
  chmod 644 "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps/amphion.png"
  chmod 644 "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps/mintplayer.png"
  chmod 644 "$BUILD_DIR/usr/share/icons/hicolor/512x512/apps/spotify.png"
fi

# 5. Control Debian
echo "📝 [4/6] Generando DEBIAN/control y DEBIAN/md5sums..."
cat << EOF > "$BUILD_DIR/DEBIAN/control"
Package: $PKG_NAME
Version: $VERSION
Section: sound
Priority: optional
Architecture: $ARCH
Maintainer: Darwin Pinargote Franco <darwinsin@uesma.edu.ec>
Depends: google-chrome-stable | chromium | chromium-browser
Recommends: gstreamer1.0-plugins-base, gstreamer1.0-plugins-good, yt-dlp, ffmpeg
Provides: mintplayer
Conflicts:
Replaces: mintplayer
Installed-Size: $(du -ks "$BUILD_DIR/usr" | cut -f1)
Homepage: https://github.com/darwinsin/amphion
Description: Amphion - Reproductor Soberano de Spotify para Linux Mint Cinnamon
 Amphion v${VERSION} integra el reproductor oficial de Spotify con aceleración por hardware
 y DRM Widevine nativo sin cortes publicitarios ni restricciones arbitrarias.
 Incluye motor único de descargas YouTube MP3 320 kbps,
 descargas 1-click por canción y por lote en álbumes/playlists directo a ~/Descargas/Spotify/.
EOF

# Generar firmas de integridad md5 para el paquete interno
(cd "$BUILD_DIR" && find usr -type f -exec md5sum {} + > DEBIAN/md5sums)

# 6. Construcción con dpkg-deb
echo "🔨 [5/6] Empaquetando instalador nativo .deb..."
mkdir -p dist
dpkg-deb --build --root-owner-group "$BUILD_DIR" "$OUTPUT_DEB"

# 7. Firma Criptográfica SHA-256 e Integridad
echo "🔐 [6/6] Firmando paquete con hash criptográfico SHA-256..."
(cd "$(dirname "$OUTPUT_DEB")" && sha256sum "$(basename "$OUTPUT_DEB")" > "$(basename "$OUTPUT_DEB").sha256")
(cd dist && sha256sum "$(basename "$OUTPUT_DEB")" > SHA256SUMS)

# Copiar a Descargas
mkdir -p /home/darwinsin/Descargas /home/darwinsin/Downloads 2>/dev/null || true
cp -f "$OUTPUT_DEB" /home/darwinsin/Descargas/ 2>/dev/null || true
cp -f "${OUTPUT_DEB}.sha256" /home/darwinsin/Descargas/ 2>/dev/null || true
cp -f "$OUTPUT_DEB" /home/darwinsin/Downloads/ 2>/dev/null || true

echo "=========================================================="
echo "✅ Paquete v${VERSION} generado y firmado con éxito: $OUTPUT_DEB"
echo "📜 Firma SHA-256:"
cat "${OUTPUT_DEB}.sha256"
echo "📥 Entregable listo en: /home/darwinsin/Descargas/$(basename "$OUTPUT_DEB")"
echo "=========================================================="
