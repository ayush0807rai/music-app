const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /return \(\n\s+\(track\.title \|\| ""\)\.toLowerCase\(\)\.includes\(q\) \|\|\n\s+\(track\.artist \|\| ""\)\.toLowerCase\(\)\.includes\(q\) \|\|\n\s+\(track\.album \|\| 'Unknown'\}\)\n\s+\.sort\(\(a, b\) => \{/m;
const replacement = 'return (\n          (track.title || "").toLowerCase().includes(q) ||\n          (track.artist || "").toLowerCase().includes(q) ||\n          (track.album || "").toLowerCase().includes(q)\n        );\n      })\n      .sort((a, b) => {';
code = code.replace(regex, replacement);

const regex2 = /return \(\n\s+\(track\.title \|\| ""\)\.toLowerCase\(\)\.includes\(q\) \|\|\n\s+\(track\.artist \|\| ""\)\.toLowerCase\(\)\.includes\(q\) \|\|\n\s+\(track\.album \|\| ""\)\.toLowerCase\(\)\.includes\(q\)\n\s+\);\n\s+\}\n\s+\.sort\(\(a, b\) => \{/m;
code = code.replace(regex2, replacement);

fs.writeFileSync('src/App.jsx', code);
