const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const syncPlayState = async \(\) => \{\r?\n\s+if \(isPlaying && currentTrack\) \{/m;

const replacement = `const syncPlayState = async () => {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
        if (isPlaying && currentTrack) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
