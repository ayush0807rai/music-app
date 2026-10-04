const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const prefetchedSignatureRef = useRef\(""\);\r?\n\s+const activeFetchesRef = useRef\(new Set\(\)\);\r?\n\s+useEffect\(\(\) => \{\r?\n\s+prefetchedSignatureRef\.current = "";\r?\n\s+\}, \[currentTrack\?\.url\]\);/m;

code = code.replace(regex, '');
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
