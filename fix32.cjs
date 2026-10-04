const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const isFirstRenderRegex = /const savedTime = localStorage\.getItem\("euphony_current_time"\);\r?\n\s+if \(savedTime && \!isNaN\(parseFloat\(savedTime\)\)\) \{[\s\S]*?\}, 100\);\r?\n\s+\}/m;

const isFirstRenderReplacement = `const savedTime = localStorage.getItem("euphony_current_time");
        if (savedTime && !isNaN(parseFloat(savedTime))) {
          const restoreTime = () => {
            if (audioRef.current) {
              audioRef.current.currentTime = parseFloat(savedTime);
              setCurrentTime(parseFloat(savedTime));
              updateProgressVisuals();
            }
            audioRef.current?.removeEventListener('loadedmetadata', restoreTime);
          };
          if (audioRef.current.readyState >= 1) {
            restoreTime();
          } else {
            audioRef.current.addEventListener('loadedmetadata', restoreTime);
          }
        }`;

code = code.replace(isFirstRenderRegex, isFirstRenderReplacement);

const playPauseRegex = /if \(\!isPlaying\) \{\r?\n\s+setIsPlaying\(true\);\r?\n\s+if \(audioRef\.current\.src && audioRef\.current\.src \!\=\= window\.location\.href\) \{\r?\n\s+audioRef\.current\.play\(\)\.catch\(err => console\.log\(err\)\);\r?\n\s+\}\r?\n\s+\} else \{/m;

const playPauseReplacement = `if (!isPlaying) {
      setIsPlaying(true);
      if (audioRef.current.src && audioRef.current.src !== window.location.href) {
        if (audioRef.current.readyState === 0) audioRef.current.load();
        audioRef.current.play().catch(err => console.log(err));
      } else {
        audioRef.current.src = getCdnUrl(currentTrack.url);
        audioRef.current.load();
        audioRef.current.play().catch(e=>e);
      }
    } else {`;

code = code.replace(playPauseRegex, playPauseReplacement);

fs.writeFileSync('src/App.jsx', code);
console.log('Done');
