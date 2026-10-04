const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const target = `        return (
          (track.title || "").toLowerCase().includes(q) ||
          (track.artist || "").toLowerCase().includes(q) ||
          (track.album || 'Unknown'})
      .sort((a, b) => {`;

const replacement = `        return (
          (track.title || "").toLowerCase().includes(q) ||
          (track.artist || "").toLowerCase().includes(q) ||
          (track.album || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {`;

code = code.replace(target, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Fixed!");
