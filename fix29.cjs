const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(/navigator\.mediaSession\.setActionHandler\('previoustrack', \(\) => \{[\s\S]*?handlePrev\(\);\r?\n\s+\}\);/m, "navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());");
code = code.replace(/navigator\.mediaSession\.setActionHandler\('nexttrack', \(\) => \{[\s\S]*?handleNext\(\);\r?\n\s+\}\);/m, "navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());");

fs.writeFileSync('src/App.jsx', code);
console.log("Done");
