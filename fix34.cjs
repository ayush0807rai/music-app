const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const oldSpan = /style=\{\{ color: \(isActiveWord \|\| isPastWord\) \? activeColor : inactiveColor, textShadow: isActiveWord \? activeShadow : inactiveShadow, transition: "all 0\.2s ease", marginRight: "4px", cursor: "pointer" \}\}/g;

const newSpan = `style={{ color: (isActiveWord || isPastWord) ? activeColor : inactiveColor, textShadow: isActiveWord ? activeShadow : inactiveShadow, transition: "all 0.2s ease", marginRight: "4px", cursor: "pointer", willChange: "color, text-shadow", WebkitFontSmoothing: "antialiased" }}`;

code = code.replace(oldSpan, newSpan);

fs.writeFileSync('src/App.jsx', code);
console.log('Done span');
