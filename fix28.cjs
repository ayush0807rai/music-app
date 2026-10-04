const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// Add helper function right before handlePlaySong
const helperFunc = `const playTrackWithMetadata = (track, audioEl, cacheMap) => {
    if (!audioEl || !track) return;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        album: track.album || '-',
        artwork: [{ src: track.poster_url || 'https://via.placeholder.com/512.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.playbackState = 'playing';
    }
    const cdnUrl = getCdnUrl(track.url);
    const objUrl = cacheMap?.get(cdnUrl) || cdnUrl;
    audioEl.src = objUrl;
    audioEl.play().catch(e=>console.log(e));
  };
  
  const handlePlaySong`;

code = code.replace(/const handlePlaySong/m, helperFunc);

// Replace handlePlaySong body
code = code.replace(/if \(audioRef\.current && track\) \{\r?\n\s+if \('mediaSession' in navigator\) \{[\s\S]*?audioRef\.current\.play\(\)\.catch\(err => console\.log\(err\)\);\r?\n\s+\}/m, 'playTrackWithMetadata(track, audioRef.current, blobCacheRef.current);');

// Replace handleNext body 1 (userQueue)
code = code.replace(/if \(audioRef\.current && nextSong\) \{\r?\n\s+const cdnUrl = getCdnUrl\(nextSong\.url\);\r?\n\s+const objUrl = blobCacheRef\.current\.get\(cdnUrl\) \|\| cdnUrl;\r?\n\s+audioRef\.current\.src = objUrl;\r?\n\s+audioRef\.current\.play\(\)\.catch\(e=>e\);\r?\n\s+\}/g, 'playTrackWithMetadata(nextSong, audioRef.current, blobCacheRef.current);');

// Replace handleNext body 2 (upcomingSourceList)
code = code.replace(/if \(audioRef\.current && playbackQueue\[nextIdx\]\) \{\r?\n\s+const cdnUrl = getCdnUrl\(playbackQueue\[nextIdx\]\.url\);\r?\n\s+const objUrl = blobCacheRef\.current\.get\(cdnUrl\) \|\| cdnUrl;\r?\n\s+audioRef\.current\.src = objUrl;\r?\n\s+audioRef\.current\.play\(\)\.catch\(e=>e\);\r?\n\s+\}/g, 'playTrackWithMetadata(playbackQueue[nextIdx], audioRef.current, blobCacheRef.current);');

// Replace handlePrev body (prevSong)
code = code.replace(/if \(audioRef\.current && prevSong\) \{\r?\n\s+audioRef\.current\.src = getCdnUrl\(prevSong\.url\);\r?\n\s+audioRef\.current\.play\(\)\.catch\(err => console\.log\(err\)\);\r?\n\s+\}/g, 'playTrackWithMetadata(prevSong, audioRef.current, blobCacheRef.current);');

fs.writeFileSync('src/App.jsx', code);
console.log("Done");
