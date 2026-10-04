const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regexActive = /const activeShadow = isDarkMode\s*\r?\n\s*\? `0 0 16px \$\{COLORS\.primary\}80`\s*\r?\n\s*\: `0 0 12px #FFFFFF, 0 0 22px #FFFFFF, 0 0 35px rgba\(0,0,0,0\.7\), 0 4px 15px rgba\(0,0,0,0\.6\)`\;/g;

const replaceActive = `const activeShadow = isDarkMode 
        ? \`0 0 16px \${COLORS.primary}80\` 
        : \`0 4px 12px rgba(0,0,0,0.8), 0 0 2px rgba(255,255,255,0.4)\`;`;

code = code.replace(regexActive, replaceActive);

const regexInactive = /const inactiveShadow = isDarkMode \? "none" \: "0 0 8px rgba\(255,255,255,0\.7\)";/g;

const replaceInactive = `const inactiveShadow = isDarkMode ? "none" : "0 2px 4px rgba(0,0,0,0.5)";`;

code = code.replace(regexInactive, replaceInactive);

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
