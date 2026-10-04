const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const checkPrefetch = async \(\) => \{\r?\n\s+if \(\!audioRef\.current \|\| \!currentTrack\?\.url\) return;\r?\n\s+\/\/ Wait for 20 seconds, or half the track if it's very short\r?\n\s+const targetTime = 1;\r?\n\s+if \(audioRef\.current\.currentTime >= targetTime\) \{/m;

const replacement = `const checkPrefetch = async () => {
        if (!audioRef.current || !currentTrack?.url) return;
        
        const targetTime = 1;
        
        if (audioRef.current.currentTime >= targetTime) {
          if (prefetchedSignatureRef.current === currentTrack.url) return;
          prefetchedSignatureRef.current = currentTrack.url;`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
