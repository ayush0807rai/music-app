const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /navigator\.mediaSession\.metadata = new MediaMetadata\(\{[\s\S]*?\}\);/m;

const replacement = `navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Unknown Title',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Euphony',
        artwork: [{ src: currentTrack.poster_url || 'https://via.placeholder.com/512.png', sizes: '512x512', type: 'image/png' }]
      });`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
