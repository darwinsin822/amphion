const test = require('node:test');
const assert = require('node:assert/strict');
const artwork = require('../src/local_artwork.js');

const concat = (...parts) => {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
};

const u32 = (value) => Uint8Array.of(
  (value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff
);
const le16 = (value) => Uint8Array.of(value & 0xff, (value >>> 8) & 0xff);
const le32 = (value) => Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
const synchsafe = (value) => Uint8Array.of(
  (value >> 21) & 0x7f, (value >> 14) & 0x7f, (value >> 7) & 0x7f, value & 0x7f
);
const text = (value) => new TextEncoder().encode(value);
const utf16le = (value) => concat(...Array.from(value, (char) => Uint8Array.of(char.charCodeAt(0), 0)));
const jpeg = Uint8Array.of(0xff, 0xd8, 0xff, 0xd9);

function flacPictureBlock(image = jpeg) {
  const mime = text('image/jpeg');
  return concat(
    u32(3), u32(mime.length), mime,
    u32(0), // Empty description.
    u32(640), u32(640), u32(24), u32(0),
    u32(image.length), image
  );
}

function id3File() {
  const body = concat(Uint8Array.of(0), text('image/jpeg'), Uint8Array.of(0, 3, 0), jpeg);
  const frame = concat(text('APIC'), u32(body.length), Uint8Array.of(0, 0), body);
  return concat(text('ID3'), Uint8Array.of(3, 0, 0), synchsafe(frame.length), frame);
}

function flacFile() {
  const block = flacPictureBlock();
  return concat(
    text('fLaC'),
    Uint8Array.of(0x86, (block.length >> 16) & 0xff, (block.length >> 8) & 0xff, block.length & 0xff),
    block
  );
}

function m4aFile() {
  const atom = (name, body) => concat(u32(body.length + 8), text(name), body);
  return atom('covr', atom('data', concat(u32(13), u32(0), jpeg)));
}

function wmaFile() {
  const name = utf16le('WM/Picture');
  const mime = concat(utf16le('image/jpeg'), Uint8Array.of(0, 0));
  const description = Uint8Array.of(0, 0);
  const value = concat(Uint8Array.of(3), mime, description, le32(jpeg.length), jpeg);
  return concat(le16(name.length), name, le16(1), le32(value.length), value);
}

const namedFile = (data, name) => {
  const file = new Blob([data]);
  Object.defineProperty(file, 'name', { value: name });
  return file;
};

test('ID3 APIC extrae carátula JPEG y no confía en etiquetas incompletas', () => {
  const tag = id3File();
  assert.equal(artwork.parseId3Artwork(tag).type, 'image/jpeg');
  assert.equal(artwork.parseId3Artwork(tag.subarray(0, 12)), null);
});

test('FLAC PICTURE block extrae bytes de imagen embebidos', () => {
  assert.equal(artwork.parseFlacArtwork(flacFile()).type, 'image/jpeg');
});

test('MP4 covr/data extrae carátula incluida en m4a', () => {
  assert.equal(artwork.parseMp4Artwork(m4aFile()).type, 'image/jpeg');
});

test('Ogg METADATA_BLOCK_PICTURE extrae imagen de Vorbis/Opus', () => {
  const picture = Buffer.from(flacPictureBlock()).toString('base64');
  const comment = text(`METADATA_BLOCK_PICTURE=${picture}\0`);
  assert.equal(artwork.parseOggArtwork(comment).type, 'image/jpeg');
});

test('ASF/WMA WM-Picture extrae la portada embebida', () => {
  assert.equal(artwork.parseWmaArtwork(wmaFile()).type, 'image/jpeg');
});

test('despacha la lectura embebida para los formatos de música admitidos', async () => {
  const ogg = text(`METADATA_BLOCK_PICTURE=${Buffer.from(flacPictureBlock()).toString('base64')}\0`);
  const cases = [
    ['track.mp3', id3File()],
    ['track.aac', id3File()],
    ['track.wav', id3File()],
    ['track.flac', flacFile()],
    ['track.m4a', m4aFile()],
    ['track.ogg', ogg],
    ['track.opus', ogg],
    ['track.wma', wmaFile()]
  ];
  for (const [name, data] of cases) {
    assert.equal((await artwork.readEmbeddedArtwork(namedFile(data, name))).type, 'image/jpeg', name);
  }
});

test('el lector de archivo mantiene el fallback seguro si el formato no tiene arte embebido', async () => {
  const file = namedFile(jpeg, 'track.unsupported');
  assert.equal(await artwork.readEmbeddedArtwork(file), null);
  assert.equal(artwork.sniffImageMime(Uint8Array.of(0, 1, 2, 3)), '');
});
