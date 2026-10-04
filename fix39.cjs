const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /<div style=\{\{ padding: "45vh 0" \}\}>/g;
code = code.replace(regex, '<div style={{ padding: isMobile ? "200px 0" : "300px 0" }}>');

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
