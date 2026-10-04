const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(/borderBottom: \`1px solid \$\{COLORS\.border\}\`,\s*zIndex: 10/g, 'zIndex: 10');

fs.writeFileSync('src/App.jsx', code);
console.log("Done");
