const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const target = 'style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", height: "100%", flex: 1 }}';
const replacement = 'style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: "12px", height: "100%", flex: 1 }}';

code = code.replace(target, replacement);

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
