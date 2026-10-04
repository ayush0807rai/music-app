const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /<div style=\{\{ padding: isMobile \? "80px 0" : "120px 0" \}\}>/g;
code = code.replace(regex, '<div style={{ padding: "45vh 0" }}>');

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
