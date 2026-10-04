const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add lyricsContainerRef
code = code.replace(/const lyricRefs = useRef\(\[\]\);/g, 'const lyricRefs = useRef([]);\n  const lyricsContainerRef = useRef(null);');

// 2. Replace the scrollIntoView useEffect
const oldEffect = /useEffect\(\(\) => \{\r?\n\s+if \(activeLyricIndex \!\=\= -1 && lyricRefs\.current\[activeLyricIndex\]\) \{\r?\n\s+lyricRefs\.current\[activeLyricIndex\]\.scrollIntoView\(\{ behavior: "smooth", block: "center" \}\);\r?\n\s+\}\r?\n\s+\}, \[activeLyricIndex\]\);/g;

const newEffect = `useEffect(() => {
    if (activeLyricIndex !== -1 && lyricRefs.current[activeLyricIndex] && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const target = lyricRefs.current[activeLyricIndex];
      const targetY = target.offsetTop - (container.offsetHeight / 2) + (target.offsetHeight / 2);
      
      const startY = container.scrollTop;
      const distance = targetY - startY;
      if (Math.abs(distance) < 2) return;
      
      const startTime = performance.now();
      const duration = 350; // Smooth 350ms duration for Apple devices

      const easeInOutCubic = (t, b, c, d) => {
        t /= d/2;
        if (t < 1) return c/2*t*t*t + b;
        t -= 2;
        return c/2*(t*t*t + 2) + b;
      };

      const animateScroll = (currentTime) => {
        const timeElapsed = currentTime - startTime;
        const next = easeInOutCubic(timeElapsed, startY, distance, duration);
        container.scrollTop = next;
        if (timeElapsed < duration) {
          requestAnimationFrame(animateScroll);
        } else {
          container.scrollTop = targetY;
        }
      };
      
      requestAnimationFrame(animateScroll);
    }
  }, [activeLyricIndex]);`;

code = code.replace(oldEffect, newEffect);

// 3. Attach lyricsContainerRef to the container in renderLyricsBlock
// Also add smooth scrolling properties and antialiasing for Apple devices
const oldContainer = /<div className="custom-scrollbar" style=\{\{ width: "100%", height: "100%", padding: "24px 16px", overflowY: "auto", overflowX: "hidden", background: "transparent", textAlign: "center", borderRadius: "12px" \}\}>/g;
const newContainer = `<div ref={lyricsContainerRef} className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: "24px 16px", overflowY: "auto", overflowX: "hidden", background: "transparent", textAlign: "center", borderRadius: "12px", WebkitOverflowScrolling: "touch", scrollBehavior: "auto" }}>`;

code = code.replace(oldContainer, newContainer);

// 4. Add will-change and antialiasing to the lyric lines to fix Safari transform jitter
const oldLineStyle = /style=\{\{ fontSize: isMobile \? "20px" : "18px", fontWeight: "700", color: isActiveLine \? activeColor : inactiveColor, textShadow: isActiveLine && \!lyric\.words \? activeShadow : inactiveShadow, padding: "10px 0", transition: "all 0\.4s cubic-bezier\(0\.4, 0, 0\.2, 1\)", transform: isActiveLine \? "scale\(1\.15\)" : "scale\(1\)", transformOrigin: "center", lineHeight: "1\.4", cursor: "pointer" \}\}/g;
const newLineStyle = `style={{ fontSize: isMobile ? "20px" : "18px", fontWeight: "700", color: isActiveLine ? activeColor : inactiveColor, textShadow: isActiveLine && !lyric.words ? activeShadow : inactiveShadow, padding: "10px 0", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", transform: isActiveLine ? "scale(1.15)" : "scale(1)", transformOrigin: "center", lineHeight: "1.4", cursor: "pointer", willChange: "transform, color, text-shadow", WebkitFontSmoothing: "antialiased", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}`;

code = code.replace(oldLineStyle, newLineStyle);

fs.writeFileSync('src/App.jsx', code);
console.log("Done");
