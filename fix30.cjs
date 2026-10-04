const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const handlePlayPause = \(e\) => \{[\s\S]*?setIsPlaying\(prev => \!prev\);\r?\n\s+\};/m;
const replacement = `const handlePlayPause = (e) => {
    if (e) e.stopPropagation();
    if (!audioRef.current) return;
    if (playbackQueue.length === 0 && playlist.length > 0) {
       handlePlaySong(0, playlist, "Global Library");
       return;
    }
    if (!currentTrack) return;
    
    if (!isPlaying) {
      setIsPlaying(true);
      if (audioRef.current.src && audioRef.current.src !== window.location.href) {
        audioRef.current.play().catch(err => console.log(err));
      }
    } else {
      setIsPlaying(false);
      audioRef.current.pause();
    }
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
