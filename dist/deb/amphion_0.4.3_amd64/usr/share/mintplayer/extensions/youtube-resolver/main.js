// YouTube Audio Resolver Extension for MintPlayer

MintPlayerExtension.register({
  id: "youtube-resolver",
  
  async provideAudio(track) {
    const artist = track.artists && track.artists.length > 0 ? track.artists[0].name : "";
    const query = `${track.name} ${artist} audio`;
    console.log(`[YouTube Resolver] Buscando audio para: ${query}`);
    
    return {
      source: "youtube",
      matchQuality: 0.95,
      resolvedTitle: `${track.name} - ${artist}`
    };
  },

  async provideDownload(track) {
    const artist = track.artists && track.artists.length > 0 ? track.artists[0].name : "";
    return {
      source: "youtube",
      format: "m4a",
      bitrate: 192,
      durationMs: track.duration_ms,
      downloadUrl: `https://mock-stream.mintplayer.local/download?id=${track.id}`
    };
  }
});
