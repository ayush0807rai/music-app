const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(/if \(audioRef\.current && nextSong\) \{ swapAndPlay\(\); \}/g, 
  `if (audioRef.current && nextSong) {
    const cdnUrl = getCdnUrl(nextSong.url);
    const objUrl = blobCacheRef.current.get(cdnUrl) || cdnUrl;
    audioRef.current.src = objUrl;
    audioRef.current.play().catch(e=>e);
  }`
);

code = code.replace(/if \(audioRef\.current && playbackQueue\[nextIdx\]\) \{ swapAndPlay\(\); \}/g, 
  `if (audioRef.current && playbackQueue[nextIdx]) {
    const cdnUrl = getCdnUrl(playbackQueue[nextIdx].url);
    const objUrl = blobCacheRef.current.get(cdnUrl) || cdnUrl;
    audioRef.current.src = objUrl;
    audioRef.current.play().catch(e=>e);
  }`
);

code = code.replace(/if \(audioRef\.current && playbackQueue\[prevIdx\]\) \{ swapAndPlay\(\); \}/g, 
  `if (audioRef.current && playbackQueue[prevIdx]) {
    const cdnUrl = getCdnUrl(playbackQueue[prevIdx].url);
    const objUrl = blobCacheRef.current.get(cdnUrl) || cdnUrl;
    audioRef.current.src = objUrl;
    audioRef.current.play().catch(e=>e);
  }`
);

code = code.replace(/const preloadAudioRef = useRef\(null\);/g, ''); // in case it exists
code = code.replace(/const audioRef = useRef\(null\);/, 'const audioRef = useRef(null);\n  const preloadAudioRef = useRef(null);');

code = code.replace(/const swapAndPlay = \(\) => \{[\s\S]*?setActivePlayerId\(nextId\);\s*\};/g, ''); // Delete leftover swapAndPlay if any

fs.writeFileSync('src/App.jsx', code);
console.log("Done");
