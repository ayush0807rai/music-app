const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /if \(idleReady\) \{[\s\S]*?switchingTrackRef\.current = false;\r?\n\s+\} else if \(active\) \{/m;

const replacement = `// FORCE SINGLE-AUDIO SWAP FOR MOBILE BACKGROUND SUPPORT:
      // Mobile browsers strictly revoke background audio focus if you try to call .play() on a different <audio> tag.
      // We MUST reuse the active audio tag for the next song to inherit the background audio token!
      if (active) {`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
