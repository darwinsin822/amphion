// MintPlayer Bridge - Spotify Web Player Controller
// Adaptado para MintPlayer con arquitectura desacoplada vía CDP

(() => {
  if (window.MintPlayer && window.MintPlayer.ready) {
    return;
  }

  // Prevenir que Chromium congele temporizadores o throttlee el Web Player en segundo plano
  try {
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.hasFocus = () => true;
    for (const ev of ['visibilitychange', 'webkitvisibilitychange']) {
      document.addEventListener(ev, e => e.stopImmediatePropagation(), true);
      window.addEventListener(ev, e => e.stopImmediatePropagation(), true);
    }
  } catch (e) {}

  const post = (msg) => {
    const json = JSON.stringify(msg);
    try {
      if (typeof window.__mintPlayerPost === 'function') {
        window.__mintPlayerPost(json);
      }
    } catch (e) {}
  };

  const findPlatform = () => {
    const host = document.getElementById('main') || document.body;
    if (!host) return null;
    const roots = [host, ...host.querySelectorAll('*')];
    for (const el of roots) {
      const key = Object.keys(el).find(k => k.startsWith('__reactContainer$'));
      if (!key) continue;
      const stack = [el[key]];
      while (stack.length) {
        const fiber = stack.pop();
        const val = fiber.memoizedProps && fiber.memoizedProps.value;
        if (val && typeof val === 'object' && typeof val.getRegistry === 'function') {
          return val;
        }
        if (fiber.sibling) stack.push(fiber.sibling);
        if (fiber.child) stack.push(fiber.child);
      }
    }
    return null;
  };

  const getServices = () => {
    const platform = findPlatform();
    if (!platform) return null;
    const registry = platform.getRegistry();
    const byName = {};
    for (const key of registry._map.keys()) {
      if (key && key.description) byName[key.description] = key;
    }
    const resolve = (name) => {
      if (!byName[name]) return null;
      return registry.resolve(byName[name]);
    };

    return {
      platform,
      player: resolve('PlayerAPI'),
      playback: resolve('PlaybackAPI'),
      token: resolve('TokenProvider'),
      graphql: platform.getGraphQLLoader ? platform.getGraphQLLoader() : null,
    };
  };

  window.MintPlayer = {
    ready: true,
    getServices,
    getToken: async () => {
      const s = getServices();
      if (!s || !s.token) throw new Error('TokenProvider no disponible todavía');
      const t = await s.token.getToken();
      return {
        accessToken: t.accessToken,
        expiresAtMs: t.accessTokenExpirationTimestampMs,
        clientId: t.clientId,
        isAnonymous: !!t.isAnonymous,
      };
    },
    getState: () => {
      const s = getServices();
      if (!s || !s.player) return null;
      return s.player.getState();
    },
    play: async (uri) => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.play({ uri });
    },
    pause: async () => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.pause();
    },
    resume: async () => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.resume();
    },
    next: async () => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.skipToNext();
    },
    previous: async () => {
      const s = getServices();
      if (!s || !s.player) throw new Error('PlayerAPI no disponible');
      return s.player.skipToPrevious();
    }
  };

  post({ type: 'ready', timestamp: Date.now() });
})();
