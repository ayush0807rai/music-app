const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(/\(track\.album \|\| \'Unknown\'\}\)/g, '(track.album || "").toLowerCase().includes(q)\n        );\n      }');

fs.writeFileSync('src/App.jsx', code);
console.log("Done");
