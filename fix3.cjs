const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const target = "          (track.album || 'Unknown'})";
const replacement = "          (track.album || \"\").toLowerCase().includes(q)\n        );\n      })";

code = code.replace(target, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
