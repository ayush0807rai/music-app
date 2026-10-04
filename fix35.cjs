const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Update scroll easing
code = code.replace(/const duration = 350; \/\/ Smooth 350ms duration for Apple devices/g, 'const duration = 600; // Ultra smooth 600ms duration');
code = code.replace(/const easeInOutCubic = \(t, b, c, d\) => \{[\s\S]*?\};/m, `const easeInOutQuart = (t, b, c, d) => {
        t /= d/2;
        if (t < 1) return c/2*t*t*t*t + b;
        t -= 2;
        return -c/2 * (t*t*t*t - 2) + b;
      };`);
code = code.replace(/const next = easeInOutCubic\(timeElapsed, startY, distance, duration\);/g, 'const next = easeInOutQuart(timeElapsed, startY, distance, duration);');

// 2. Update CSS transitions for lyrics lines
code = code.replace(/transition: "all 0\.4s cubic-bezier\(0\.4, 0, 0\.2, 1\)"/g, 'transition: "all 0.6s cubic-bezier(0.25, 1, 0.5, 1)"');

// 3. Update CSS transitions for lyrics words (if there are word-level spans)
code = code.replace(/transition: "all 0\.2s ease", marginRight: "4px", cursor: "pointer", willChange: "color, text-shadow", WebkitFontSmoothing: "antialiased"/g, 'transition: "all 0.3s ease", marginRight: "4px", cursor: "pointer", willChange: "color, text-shadow", WebkitFontSmoothing: "antialiased"');

fs.writeFileSync('src/App.jsx', code);
console.log('Done smoother lyrics');
