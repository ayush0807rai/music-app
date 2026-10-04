const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /<div ref=\{lyricsContainerRef\} className="custom-scrollbar" style=\{\{ width: "100%", height: "100%", padding:/g;
code = code.replace(regex, '<div ref={lyricsContainerRef} className="custom-scrollbar" style={{ position: "relative", width: "100%", height: "100%", padding:');

fs.writeFileSync('src/App.jsx', code);
console.log('Done position');
