const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /else if \(s\.selectedArtist !== null\) \{ setSelectedArtist\(null\);\r?\n\s*setSelectedAlbum\(null\); handled = true; \}/;

code = code.replace(regex, `else if (s.selectedArtist !== null) { setSelectedArtist(null); handled = true; }
        else if (s.selectedAlbum !== null) { setSelectedAlbum(null); handled = true; }`);

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
