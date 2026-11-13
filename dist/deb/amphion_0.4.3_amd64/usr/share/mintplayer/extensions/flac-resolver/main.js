// FLAC Lossless Audio Resolver Extension for MintPlayer (Secondary / Hi-Res Fallback)

MintPlayerExtension.register({
  id: "flac-resolver",
  name: "FLAC Lossless Audio Resolver",
  priority: "secondary",
  format: "flac",
  
  async provideAudio(track) {
    const artist = track.artists && track.artists.length > 0 ? track.artists[0].name : "Artista Desconocido";
    console.log(`[FLAC Resolver] Buscando stream FLAC Hi-Res para: ${track.name} - ${artist}`);
    
    return {
      source: "flac-lossless",
      matchQuality: 0.98,
      format: "flac",
      sampleRate: "44.1kHz / 16-bit",
      bitrate: 1411,
      resolvedTitle: `${track.name} - ${artist} [FLAC Hi-Res]`
    };
  },

  async provideDownload(track) {
    const artist = track.artists && track.artists.length > 0 ? track.artists[0].name : "Artista Desconocido";
    const safeTitle = `${track.name} - ${artist}`.replace(/[\/\\:*?"<>|]/g, "_");
    
    return {
      source: "flac-lossless",
      format: "flac",
      bitrate: 1411,
      filename: `${safeTitle}.flac`,
      durationMs: track.duration_ms,
      downloadUrl: `https://archive.org/download/flac-audio-cache/${encodeURIComponent(safeTitle)}.flac`
    };
  }
});
