const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove activeAudioSrc state
code = code.replace(/const \[activeAudioSrc, setActiveAudioSrc\] = useState\(null\);\r?\n/, '');

// 2. Remove loadSrc useEffect
const loadSrcRegex = /useEffect\(\(\) => \{\r?\n\s+if \(!currentTrack\?\.url\) \{\r?\n\s+setActiveAudioSrc\(null\);[\s\S]*?\}, \[currentTrack\?\.url\]\);\r?\n/m;
code = code.replace(loadSrcRegex, '');

// 3. Update syncPlayState
const syncPlayRegex = /useEffect\(\(\) => \{\r?\n\s+const syncPlayState = async \(\) => \{\r?\n\s+if \(isPlaying && activeAudioSrc\) \{([\s\S]*?)\}, \[isPlaying, activeAudioSrc, stemsBroken, currentTrack\]\);\r?\n/m;
const syncPlayReplacement = `useEffect(() => {
    const syncPlayState = async () => {
      if (isPlaying && currentTrack) {
        if (audioRef.current?.paused && audioRef.current.src && audioRef.current.src !== window.location.href) {
          audioRef.current.play().catch(e => e);
        }
        if (currentTrack?.stem_vocals && !stemsBroken) {
          vocalsRef.current?.play().catch(e => e);
          drumsRef.current?.play().catch(e => e);
          bassRef.current?.play().catch(e => e);
          otherRef.current?.play().catch(e => e);
        }
      } else {
        audioRef.current?.pause();
        vocalsRef.current?.pause();
        drumsRef.current?.pause();
        bassRef.current?.pause();
        otherRef.current?.pause();
      }
    };
    syncPlayState();
  }, [isPlaying, stemsBroken, currentTrack]);\n`;
code = code.replace(syncPlayRegex, syncPlayReplacement);

// 4. Update isFirstRender effect
const firstRenderRegex = /useEffect\(\(\) => \{\r?\n\s+if \(isFirstRender\.current && audioRef\.current && activeAudioSrc\) \{([\s\S]*?)\}, \[activeAudioSrc\]\);\r?\n/m;
const firstRenderReplacement = `useEffect(() => {
    if (isFirstRender.current && audioRef.current && currentTrack) {
      if (!audioRef.current.src || audioRef.current.src === window.location.href) {
        audioRef.current.src = getCdnUrl(currentTrack.url);
      }
      const savedTime = localStorage.getItem("euphony_current_time");
      if (savedTime && !isNaN(parseFloat(savedTime))) {
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.currentTime = parseFloat(savedTime);
            setCurrentTime(parseFloat(savedTime));
            updateProgressVisuals();
          }
        }, 100);
      }
      isFirstRender.current = false;
    }
  }, [currentTrack]);\n`;
code = code.replace(firstRenderRegex, firstRenderReplacement);

// 5. Update handlePlayPause to handle empty src
const handlePlayPauseRegex = /if \(isPlaying\) \{\r?\n\s+setIsPlaying\(false\);\r?\n\s+\} else \{\r?\n\s+setIsPlaying\(true\);\r?\n\s+\}/m;
const handlePlayPauseReplacement = `if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (audioRef.current && (!audioRef.current.src || audioRef.current.src === window.location.href)) {
        audioRef.current.src = getCdnUrl(currentTrack.url);
      }
      setIsPlaying(true);
    }`;
code = code.replace(handlePlayPauseRegex, handlePlayPauseReplacement);

fs.writeFileSync('src/App.jsx', code);
console.log("Done");
