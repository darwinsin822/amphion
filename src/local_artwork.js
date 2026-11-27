// Extractores puros de carátulas locales; compatibles con navegador y Node.js.
(function installArtworkApi(root, factory) {
  const api = factory();
  if (root) root.AmphionLocalArtwork = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createArtworkApi() {
  'use strict';

  // La mayoría de las etiquetas están al principio; se amplía bajo demanda
  // para ID3/FLAC y se consulta el final del archivo para contenedores MP4.
  const MAX_HEAD_BYTES = 256 * 1024;
  const MAX_TAIL_BYTES = 2 * 1024 * 1024;
  const MAX_METADATA_BYTES = 16 * 1024 * 1024;

  const readU32 = (bytes, offset) => (
    offset + 4 <= bytes.length
      ? (((bytes[offset] << 24) | (bytes[offset + 1] << 16)
        | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0)
      : 0
  );

  const readLeU16 = (bytes, offset) => (
    offset + 2 <= bytes.length ? bytes[offset] | (bytes[offset + 1] << 8) : 0
  );

  const readLeU32 = (bytes, offset) => (
    offset + 4 <= bytes.length
      ? ((bytes[offset] | (bytes[offset + 1] << 8)
        | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0)
      : 0
  );

  const readSynchsafe = (bytes, offset) => (
    offset + 4 <= bytes.length
      ? ((bytes[offset] & 0x7f) << 21) | ((bytes[offset + 1] & 0x7f) << 14)
        | ((bytes[offset + 2] & 0x7f) << 7) | (bytes[offset + 3] & 0x7f)
      : 0
  );

  const asciiAt = (bytes, offset, value) => {
    if (offset < 0 || offset + value.length > bytes.length) return false;
    for (let i = 0; i < value.length; i++) {
      if (bytes[offset + i] !== value.charCodeAt(i)) return false;
    }
    return true;
  };

  const findAscii = (bytes, value, start = 0) => {
    for (let i = Math.max(0, start); i <= bytes.length - value.length; i++) {
      if (asciiAt(bytes, i, value)) return i;
    }
    return -1;
  };

  const findUtf16Le = (bytes, value, start = 0) => {
    for (let i = Math.max(0, start); i + value.length * 2 <= bytes.length; i++) {
      let found = true;
      for (let j = 0; j < value.length; j++) {
        if (bytes[i + j * 2] !== value.charCodeAt(j) || bytes[i + j * 2 + 1] !== 0) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    return -1;
  };

  const sniffImageMime = (bytes) => {
    if (!bytes || bytes.length < 4) return '';
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (bytes.length >= 8 && asciiAt(bytes, 1, 'PNG') && bytes[0] === 0x89) return 'image/png';
    if (bytes.length >= 12 && asciiAt(bytes, 0, 'RIFF') && asciiAt(bytes, 8, 'WEBP')) return 'image/webp';
    return '';
  };

  const imageBlob = (bytes, offset, length) => {
    if (!bytes || offset < 0 || length <= 0 || offset + length > bytes.length) return null;
    const view = bytes.subarray(offset, offset + length);
    const mime = sniffImageMime(view);
    return mime ? new Blob([view], { type: mime }) : null;
  };

  const parseId3Artwork = (bytes, start = 0) => {
    if (!asciiAt(bytes, start, 'ID3') || start + 10 > bytes.length) return null;
    const version = bytes[start + 3];
    if (version < 2 || version > 4) return null;
    const tagSize = readSynchsafe(bytes, start + 6);
    const tagEnd = Math.min(bytes.length, start + 10 + tagSize);
    let cursor = start + 10;

    while (cursor + 6 <= tagEnd) {
      const isV2 = version === 2;
      const headerSize = isV2 ? 6 : 10;
      const frameId = String.fromCharCode(...bytes.subarray(cursor, cursor + (isV2 ? 3 : 4)));
      if (!frameId.trim() || /^\0+$/.test(frameId)) break;

      const frameSize = isV2
        ? ((bytes[cursor + 3] << 16) | (bytes[cursor + 4] << 8) | bytes[cursor + 5])
        : (version === 4 ? readSynchsafe(bytes, cursor + 4) : readU32(bytes, cursor + 4));
      if (frameSize <= 0 || cursor + headerSize + frameSize > tagEnd) break;

      if (frameId === 'APIC' || frameId === 'PIC') {
        const frameEnd = cursor + headerSize + frameSize;
        let pos = cursor + headerSize + 1;
        const encoding = bytes[cursor + headerSize];
        let mime;
        if (frameId === 'PIC') {
          mime = String.fromCharCode(...bytes.subarray(pos, pos + 3)).toLowerCase();
          mime = mime === 'png' ? 'image/png' : 'image/jpeg';
          pos += 3;
        } else {
          const mimeEnd = bytes.indexOf(0, pos);
          if (mimeEnd < 0 || mimeEnd >= frameEnd) return null;
          mime = String.fromCharCode(...bytes.subarray(pos, mimeEnd)).toLowerCase();
          pos = mimeEnd + 1;
        }
        pos++; // Picture type.
        const terminatorWidth = encoding === 1 || encoding === 2 ? 2 : 1;
        while (pos + terminatorWidth <= frameEnd) {
          const terminated = terminatorWidth === 1
            ? bytes[pos] === 0
            : bytes[pos] === 0 && bytes[pos + 1] === 0;
          if (terminated) {
            pos += terminatorWidth;
            break;
          }
          pos += terminatorWidth;
        }
        const blob = imageBlob(bytes, pos, frameEnd - pos);
        if (blob) return blob;
      }
      cursor += headerSize + frameSize;
    }
    return null;
  };

  const parseFlacPictureBlock = (bytes, start = 0, end = bytes.length) => {
    let pos = start;
    if (pos + 8 > end) return null;
    pos += 4; // Picture type.
    const mimeLength = readU32(bytes, pos);
    pos += 4 + mimeLength;
    if (pos + 4 > end) return null;
    const descriptionLength = readU32(bytes, pos);
    pos += 4 + descriptionLength;
    if (pos + 20 > end) return null;
    pos += 16; // Width, height, bit depth and indexed-color count.
    const pictureLength = readU32(bytes, pos);
    pos += 4;
    return imageBlob(bytes, pos, Math.min(pictureLength, end - pos));
  };

  const parseFlacArtwork = (bytes) => {
    if (!asciiAt(bytes, 0, 'fLaC')) return null;
    let pos = 4;
    while (pos + 4 <= bytes.length) {
      const blockHeader = bytes[pos];
      const blockType = blockHeader & 0x7f;
      const blockLength = (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
      const blockStart = pos + 4;
      const blockEnd = blockStart + blockLength;
      if (blockEnd > bytes.length) return null;
      if (blockType === 6) {
        const blob = parseFlacPictureBlock(bytes, blockStart, blockEnd);
        if (blob) return blob;
      }
      pos = blockEnd;
      if (blockHeader & 0x80) break;
    }
    return null;
  };

  const flacMetadataLength = (bytes) => {
    if (!asciiAt(bytes, 0, 'fLaC')) return 0;
    let pos = 4;
    while (pos + 4 <= bytes.length) {
      const header = bytes[pos];
      const blockLength = (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
      const blockEnd = pos + 4 + blockLength;
      if (blockEnd > bytes.length) return blockEnd;
      pos = blockEnd;
      if (header & 0x80) return pos;
    }
    return 0;
  };

  const parseMp4Artwork = (bytes) => {
    let covr = findAscii(bytes, 'covr');
    while (covr >= 0) {
      const data = findAscii(bytes, 'data', covr + 4);
      if (data >= 4 && data - 4 + 16 <= bytes.length) {
        const atomStart = data - 4;
        const atomSize = readU32(bytes, atomStart);
        const payloadStart = atomStart + 16;
        const payloadLength = Math.min(atomSize - 16, bytes.length - payloadStart);
        const blob = imageBlob(bytes, payloadStart, payloadLength);
        if (blob) return blob;
      }
      covr = findAscii(bytes, 'covr', covr + 4);
    }
    return null;
  };

  const parseOggArtwork = (bytes) => {
    let text;
    try {
      text = new TextDecoder('latin1').decode(bytes);
    } catch (e) {
      return null;
    }
    const pictureMatch = text.match(/METADATA_BLOCK_PICTURE=([A-Za-z0-9+/=]+)/i);
    if (pictureMatch) {
      try {
        const decoded = Uint8Array.from(atob(pictureMatch[1]), (char) => char.charCodeAt(0));
        const blob = parseFlacPictureBlock(decoded);
        if (blob) return blob;
      } catch (e) {}
    }
    const coverMatch = text.match(/COVERART=([A-Za-z0-9+/=]+)/i);
    if (coverMatch) {
      try {
        const decoded = Uint8Array.from(atob(coverMatch[1]), (char) => char.charCodeAt(0));
        return imageBlob(decoded, 0, decoded.length);
      } catch (e) {}
    }
    return null;
  };

  const parseWmaArtwork = (bytes) => {
    const key = 'WM/Picture';
    let nameOffset = findUtf16Le(bytes, key);
    const keyBytes = key.length * 2;
    while (nameOffset >= 2) {
      const descriptorStart = nameOffset - 2;
      if (readLeU16(bytes, descriptorStart) === keyBytes) {
        const dataLength = readLeU32(bytes, nameOffset + keyBytes + 2);
        const valueStart = nameOffset + keyBytes + 6;
        const valueEnd = valueStart + dataLength;
        if (dataLength > 8 && valueEnd <= bytes.length) {
          let mimeStart = valueStart + 1; // ASF picture type byte.
          let mimeEnd = mimeStart;
          while (mimeEnd + 1 < valueEnd && (bytes[mimeEnd] !== 0 || bytes[mimeEnd + 1] !== 0)) {
            mimeEnd += 2;
          }
          let descriptionEnd = mimeEnd + 2;
          while (descriptionEnd + 1 < valueEnd
            && (bytes[descriptionEnd] !== 0 || bytes[descriptionEnd + 1] !== 0)) {
            descriptionEnd += 2;
          }
          const imageLengthOffset = descriptionEnd + 2;
          const imageStart = imageLengthOffset + 4;
          const imageLength = readLeU32(bytes, imageLengthOffset);
          const blob = imageBlob(bytes, imageStart, Math.min(imageLength, valueEnd - imageStart));
          if (blob) return blob;
        }
      }
      nameOffset = findUtf16Le(bytes, key, nameOffset + 2);
    }
    return null;
  };

  const readEmbeddedArtwork = async (file) => {
    if (!file || typeof file.slice !== 'function' || !Number.isFinite(file.size)) return null;
    const extension = String(file.name || '').split('.').pop().toLowerCase();
    let headLength = Math.min(file.size, MAX_HEAD_BYTES);
    let head = new Uint8Array(await file.slice(0, headLength).arrayBuffer());
    let blob = null;

    if (['mp3', 'aac', 'wav'].includes(extension)) {
      let id3Offset = asciiAt(head, 0, 'ID3') ? 0 : -1;
      if (id3Offset < 0 && extension === 'wav') id3Offset = findAscii(head, 'ID3', 1);
      if (id3Offset >= 0 && id3Offset + 10 <= head.length) {
        const tagEnd = id3Offset + 10 + readSynchsafe(head, id3Offset + 6);
        if (tagEnd > headLength && tagEnd <= MAX_METADATA_BYTES && tagEnd <= file.size) {
          headLength = tagEnd;
          head = new Uint8Array(await file.slice(0, headLength).arrayBuffer());
        }
        blob = parseId3Artwork(head, id3Offset);
      }
    } else if (extension === 'flac') {
      blob = parseFlacArtwork(head);
      if (!blob) {
        const metadataEnd = flacMetadataLength(head);
        if (metadataEnd > headLength && metadataEnd <= MAX_METADATA_BYTES && metadataEnd <= file.size) {
          headLength = metadataEnd;
          head = new Uint8Array(await file.slice(0, headLength).arrayBuffer());
          blob = parseFlacArtwork(head);
        }
      }
    } else if (['ogg', 'opus'].includes(extension)) {
      blob = parseOggArtwork(head);
    } else if (extension === 'wma') {
      blob = parseWmaArtwork(head);
    } else if (['m4a', 'mp4'].includes(extension)) {
      blob = parseMp4Artwork(head);
      if (!blob && file.size > MAX_HEAD_BYTES) {
        const tailStart = Math.max(MAX_HEAD_BYTES, file.size - MAX_TAIL_BYTES);
        const tail = new Uint8Array(await file.slice(tailStart).arrayBuffer());
        blob = parseMp4Artwork(tail);
      }
    }
    return blob;
  };

  return Object.freeze({
    parseId3Artwork,
    parseFlacArtwork,
    parseMp4Artwork,
    parseOggArtwork,
    parseWmaArtwork,
    readEmbeddedArtwork,
    sniffImageMime
  });
});
