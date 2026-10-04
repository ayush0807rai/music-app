const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /if \(selectedArtist\) \{\r?\n\s+return \(track\.artist \|\| ""\)\.toLowerCase\(\)\.includes\(selectedArtist\.toLowerCase\(\)\);\r?\n\s+\}/g;
code = code.replace(regex, `if (selectedArtist) {
        return (track.artist || "").toLowerCase().includes(selectedArtist.toLowerCase());
      }
      if (selectedAlbum) {
        return (track.album || "").toLowerCase() === selectedAlbum.toLowerCase();
      }`);

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
