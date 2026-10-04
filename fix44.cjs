const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. handleSwitchPlaylist
code = code.replace(/setSelectedArtist\(null\);/g, 'setSelectedArtist(null);\n    setSelectedAlbum(null);');

// 2. popstate event listener
code = code.replace(/else if \(s\.selectedArtist \!== null\) \{ setSelectedArtist\(null\); handled = true; \}/g, 'else if (s.selectedArtist !== null) { setSelectedArtist(null); handled = true; }\n      else if (s.selectedAlbum !== null) { setSelectedAlbum(null); handled = true; }');

// 3. hasSelectedArtist in currentState
code = code.replace(/hasSelectedArtist: selectedArtist \!== null/g, 'hasSelectedArtist: selectedArtist !== null,\n      hasSelectedAlbum: selectedAlbum !== null');

// 4. stateRefs
code = code.replace(/selectedArtist \};/g, 'selectedArtist, selectedAlbum };');
code = code.replace(/selectedArtist\]\);/g, 'selectedArtist, selectedAlbum]);');

// 5. prevModalState.current
code = code.replace(/hasSelectedArtist: false/g, 'hasSelectedArtist: false, hasSelectedAlbum: false');

// 6. Fix any duplicate replacements from step 1
// It might have replaced it multiple times if there are multiple setSelectedArtist(null);
// Let's do it safely.
fs.writeFileSync('src/App.jsx', code);
console.log('Done');
