const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /<div onClick=\{\(\) => \{ setSearchQuery\(currentTrack\.album \|\| currentTrack\.artist\); setViewedPlaylistId\(null\); setIsMobilePlayerOpen\(false\); setShowTrackOptionsModal\(false\); \}\} className="glass-row"/g;
code = code.replace(regex, `<div onClick={() => { setSelectedAlbum(currentTrack.album || currentTrack.artist); setSearchQuery(''); setViewedPlaylistId(null); setIsMobilePlayerOpen(false); setShowTrackOptionsModal(false); }} className="glass-row"`);

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
