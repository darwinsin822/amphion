#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

VERSION=$(grep '^version' Cargo.toml | head -1 | sed 's/.*= "\(.*\)"/\1/')
ARCH="amd64"
PKG="amphion"
BUILD="dist/deb/${PKG}_${VERSION}_${ARCH}"
OUT="dist/${PKG}_${VERSION}_${ARCH}.deb"

echo "📦 Amphion v${VERSION} — empaquetando"
rm -rf "$BUILD"
mkdir -p "$BUILD/DEBIAN" "$BUILD/usr/bin" "$BUILD/usr/share/applications"
mkdir -p "$BUILD/usr/share/icons/hicolor/scalable/apps"
mkdir -p "$BUILD/usr/share/icons/hicolor/512x512/apps"

cargo build --release

cp target/release/amphion "$BUILD/usr/bin/amphion"
strip --strip-all "$BUILD/usr/bin/amphion"
chmod 755 "$BUILD/usr/bin/amphion"
ln -sf amphion "$BUILD/usr/bin/mintplayer"

cp assets/amphion.desktop "$BUILD/usr/share/applications/amphion.desktop"
cp assets/amphion.desktop "$BUILD/usr/share/applications/mintplayer.desktop"
chmod 644 "$BUILD/usr/share/applications/"*.desktop

cp assets/spotify-original.svg "$BUILD/usr/share/icons/hicolor/scalable/apps/amphion.svg"
cp assets/spotify-original.svg "$BUILD/usr/share/icons/hicolor/scalable/apps/mintplayer.svg"
cp assets/spotify-original.svg "$BUILD/usr/share/icons/hicolor/scalable/apps/spotify.svg"
chmod 644 "$BUILD/usr/share/icons/hicolor/scalable/apps/"*.svg

if [ -f assets/spotify-original-512.png ]; then
  cp assets/spotify-original-512.png "$BUILD/usr/share/icons/hicolor/512x512/apps/amphion.png"
  cp assets/spotify-original-512.png "$BUILD/usr/share/icons/hicolor/512x512/apps/mintplayer.png"
  cp assets/spotify-original-512.png "$BUILD/usr/share/icons/hicolor/512x512/apps/spotify.png"
  chmod 644 "$BUILD/usr/share/icons/hicolor/512x512/apps/"*.png
fi

cat > "$BUILD/DEBIAN/control" <<CTL
Package: $PKG
Version: $VERSION
Section: sound
Priority: optional
Architecture: $ARCH
Maintainer: Darwin Pinargote Franco <darwinsin@uesma.edu.ec>
Depends: google-chrome-stable | chromium | chromium-browser
Provides: mintplayer
Replaces: mintplayer
Installed-Size: $(du -ks "$BUILD/usr" | cut -f1)
Homepage: https://github.com/darwinsin/amphion
Description: Amphion - Spotify Web Player con temas y bloqueo de publicidad
 Reproductor nativo que abre el Web Player oficial de Spotify e inyecta
 temas Amphion y bloqueo de publicidad durante la reproducción.
CTL

(cd "$BUILD" && find usr -type f -exec md5sum {} + > DEBIAN/md5sums)
mkdir -p dist
dpkg-deb --build --root-owner-group "$BUILD" "$OUT"
(cd dist && sha256sum "$(basename "$OUT")" > "$(basename "$OUT").sha256")

cp -f "$OUT" "$HOME/Descargas/"
cp -f "${OUT}.sha256" "$HOME/Descargas/"
echo "✅ $OUT"
cat "${OUT}.sha256"
