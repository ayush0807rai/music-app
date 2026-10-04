const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /handleTimeUpdateRef\.current = \(\) => \{\r?\n\s+if \(!audioRef\.current\) return;\r?\n\s+const time = audioRef\.current\.currentTime;\r?\n\s+setCurrentTime\(time\);\r?\n\s+updateProgressVisuals\(\); \/\/ Force DOM update for sliders even if requestAnimationFrame died in the background\r?\n\s+const currentInt = Math\.floor\(time\);\r?\n\s+if \(currentInt % 2 === 0 && currentInt !== lastSavedTimeRef\.current\) \{\r?\n\s+localStorage\.setItem\("euphony_current_time", time\);\r?\n\s+lastSavedTimeRef\.current = currentInt;\r?\n\s+\}/m;

const replacement = `handleTimeUpdateRef.current = () => {
        if (!audioRef.current) return;
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        updateProgressVisuals(); // Force DOM update for sliders even if requestAnimationFrame died in the background
        
        const currentInt = Math.floor(time);
        if (currentInt % 2 === 0 && currentInt !== lastSavedTimeRef.current) {
          localStorage.setItem("euphony_current_time", time);
          lastSavedTimeRef.current = currentInt;
        }

        if ('mediaSession' in navigator && audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: audioRef.current.currentTime
            });
          } catch(e) {}
        }`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
