const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'bridge.js'), 'utf8');
const start = source.indexOf("let lastExternalUrl = ''");
const end = source.indexOf('const getSpotifyDownloadUrl =', start);
if (start < 0 || end < 0) {
  throw new Error('No se pudo extraer openExternalUrl de src/bridge.js');
}
const block = source.slice(start, end);

const makeOpener = ({ native = true } = {}) => {
  const calls = { native: [], popup: [] };
  const window = {
    open: (...args) => {
      calls.popup.push(args);
      return null;
    },
  };
  if (native) {
    window.__mintPlayerPost = (payload) => {
      calls.native.push(JSON.parse(payload));
    };
  }
  // eslint-disable-next-line no-new-func
  const factory = new Function('window', `${block}\nreturn openExternalUrl;`);
  return { open: factory(window), calls };
};

test('SpotDown abre una sola pestaña usando el binding nativo', () => {
  const { open, calls } = makeOpener({ native: true });
  open('https://spotdown.org/es8?q=test');
  assert.equal(calls.native.length, 1, 'debe llamar una vez a xdg-open');
  assert.equal(calls.popup.length, 0, 'no debe abrir además una pestaña con window.open');
  assert.deepEqual(calls.native[0], {
    action: 'open_url',
    url: 'https://spotdown.org/es8?q=test',
  });
});

test('SpotDown usa window.open sólo cuando no existe el binding nativo', () => {
  const { open, calls } = makeOpener({ native: false });
  open('https://spotdown.org/es8');
  assert.equal(calls.native.length, 0);
  assert.equal(calls.popup.length, 1);
  assert.equal(calls.popup[0][0], 'https://spotdown.org/es8');
});

test('un doble clic o atajo repetido no duplica la apertura', () => {
  const { open, calls } = makeOpener({ native: true });
  open('https://spotmate.online/en1?url=x');
  open('https://spotmate.online/en1?url=x');
  open('https://spotmate.online/en1?url=x');
  assert.equal(calls.native.length, 1);
});

test('dos URLs distintas sí abren dos veces', () => {
  const { open, calls } = makeOpener({ native: true });
  open('https://spotdown.org/es8?q=uno');
  open('https://spotdown.org/es8?q=dos');
  assert.equal(calls.native.length, 2);
  assert.notEqual(calls.native[0].url, calls.native[1].url);
});
