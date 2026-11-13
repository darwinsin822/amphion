// LRCLIB Synchronized Lyrics Extension for MintPlayer

MintPlayerExtension.register({
  id: "lrclib-lyrics",
  
  async provideLyrics(track) {
    if (!track || !track.name) return null;
    
    const artist = track.artists && track.artists.length > 0 ? track.artists[0].name : "";
    const title = track.name;
    const album = track.album ? track.album.name : "";
    const duration = Math.round((track.duration_ms || 0) / 1000);

    const params = new URLSearchParams({
      track_name: title,
      artist_name: artist,
      album_name: album,
      duration: duration
    });

    try {
      const resp = await fetch(`https://lrclib.net/api/get?${params.toString()}`);
      if (!resp.ok) return null;
      const data = await resp.json();
      return {
        plainLyrics: data.plainLyrics,
        syncedLyrics: data.syncedLyrics,
        source: "LRCLIB"
      };
    } catch (e) {
      console.error("[LRCLIB] Error obteniendo letras:", e);
      return null;
    }
  }
});
