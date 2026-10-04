const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /if \(!srcMatches\(el, fallback\)\) \{\r?\n\s+el\.src = fallback;\r?\n\s+playAudioEl\(el\);\r?\n\s+\}/m;
const replacement = `if (!srcMatches(el, fallback)) {
          switchingTrackRef.current = true;
          el.src = fallback;
          playAudioEl(el);
          setTimeout(() => { switchingTrackRef.current = false; }, 100);
        }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
