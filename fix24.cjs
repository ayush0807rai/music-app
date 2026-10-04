const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const handlePlaySong = \(index, listToSet, sourceName\) => \{[\s\S]*?audioRef\.current\.play\(\)\.catch\(err => console\.log\(err\)\);\r?\n\s+\}\r?\n\s+\};/m;

const replacement = `const handlePlaySong = (index, listToSet, sourceName) => {
    const queueWithIds = listToSet.map(s => s._play_id ? s : { ...s, _play_id: Math.random().toString() });
    const track = queueWithIds[index];
    setPlaybackHistory(prev => [...prev, playbackIndex]);
    setPlaybackQueue(queueWithIds);
    setPlaybackIndex(index);
    setPlaybackSourceName(sourceName);
    setQueueCurrentTrack(null);
    resetPlaybackTime();
    setIsPlaying(true);
    if (audioRef.current && track) {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: track.title || 'Unknown Title',
          artist: track.artist || 'Unknown Artist',
          album: track.album || 'Euphony',
          artwork: [{ src: track.poster_url || 'https://via.placeholder.com/512.png', sizes: '512x512', type: 'image/png' }]
        });
      }
      audioRef.current.src = getCdnUrl(track.url);
      audioRef.current.play().catch(err => console.log(err));
    }
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
