const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const playTrackNow = \(track\) => \{[\s\S]*?queueMicrotask\(\(\) => armNextTrack\(\)\);\r?\n\s+\};/m;

const replacement = `const playTrackNow = (track) => {
    if (!track?.url) return;
    wantPlayingRef.current = true;
    setIsPlaying(true);
    const cdnUrl = getCdnUrl(track.url);
    const active = getActiveAudio();

    setCurrentTime(0);
    localStorage.setItem("euphony_current_time", "0");

    // FORCE SINGLE-AUDIO SWAP WITH BLOB CACHE FOR MOBILE BACKGROUND SUPPORT:
    // Mobile browsers strictly revoke background audio focus if you swap to a different <audio> tag.
    // We MUST reuse the active audio tag for the next song to inherit the background audio token!
    if (active) {
      const objUrl = blobCacheRef.current.get(cdnUrl) || cdnUrl;
      if (!srcMatches(active, objUrl)) {
        active.src = objUrl;
      }
      try { active.currentTime = 0; } catch (e) {}
      playAudioEl(active);
      audioRef.current = active;
    }

    queueMicrotask(() => armNextTrack());
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
