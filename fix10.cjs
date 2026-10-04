const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regexPrev = /navigator\.mediaSession\.setActionHandler\('previoustrack', \(\) => \{[\s\S]*?handlePrev\(\);\r?\n\s+\}\);/m;
code = code.replace(regexPrev, "navigator.mediaSession.setActionHandler('previoustrack', () => { handlePrev(); });");

const regexNext = /navigator\.mediaSession\.setActionHandler\('nexttrack', \(\) => \{[\s\S]*?handleNext\(\);\r?\n\s+\}\);/m;
code = code.replace(regexNext, "navigator.mediaSession.setActionHandler('nexttrack', () => { handleNext(); });");

fs.writeFileSync('src/App.jsx', code);
console.log("Done");
