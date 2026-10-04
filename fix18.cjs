const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /if \(active\) \{\r?\n\s+const objUrl = blobCacheRef\.current\.get\(cdnUrl\) \|\| cdnUrl;\r?\n\s+if \(!srcMatches\(active, objUrl\)\) \{\r?\n\s+active\.src = objUrl;\r?\n\s+\}\r?\n\s+try \{ active\.currentTime = 0; \} catch \(e\) \{\}\r?\n\s+playAudioEl\(active\);\r?\n\s+audioRef\.current = active;\r?\n\s+\}/m;

const replacement = `if (active) {
      switchingTrackRef.current = true;
      const objUrl = blobCacheRef.current.get(cdnUrl) || cdnUrl;
      if (!srcMatches(active, objUrl)) {
        active.src = objUrl;
      }
      try { active.currentTime = 0; } catch (e) {}
      playAudioEl(active);
      audioRef.current = active;
      setTimeout(() => { switchingTrackRef.current = false; }, 100);
    }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
