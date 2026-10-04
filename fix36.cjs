const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regexH4 = /<h4 style=\{\{ margin: "4px 0 12px 0", fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px", color: "rgba\(255,255,255,0\.8\)" \}\}>AI Stem Mixer<\/h4>\r?\n\s+/;
code = code.replace(regexH4, '');

const regexHeight = /const sliderHeight = isMobile \? 180 : 220;/;
code = code.replace(regexHeight, 'const sliderHeight = isMobile ? 145 : 185;');

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
