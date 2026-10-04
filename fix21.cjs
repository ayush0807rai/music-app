const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /useEffect\(\(\) => \{\r?\n\s+if \('mediaSession' in navigator && currentTrack\) \{[\s\S]*?\}, \[currentTrack, playMode, userQueue\]\);/m;

const replacement = `useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Euphony',
        artwork: [{ src: currentTrack.poster_url || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in audioRef.current) {
          audioRef.current.fastSeek(details.seekTime);
        } else if (audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + (details.seekOffset || 10), audioRef.current.duration);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - (details.seekOffset || 10), 0);
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        const prevIndex = playbackIndex - 1;
        if (prevIndex >= 0) {
          const prevTrack = playbackQueue[prevIndex];
          const prevCdnUrl = getCdnUrl(prevTrack.url);
          const objUrl = blobCacheRef.current.get(prevCdnUrl) || prevCdnUrl;
          if (audioRef.current) {
            audioRef.current.src = objUrl;
            audioRef.current.play().catch(e=>e);
          }
        }
        handlePrev();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        let nextIndex = playbackIndex + 1;
        if (playMode !== 'shuffle' && nextIndex < playbackQueue.length) {
          const nextTrack = playbackQueue[nextIndex];
          const nextCdnUrl = getCdnUrl(nextTrack.url);
          const objUrl = blobCacheRef.current.get(nextCdnUrl) || nextCdnUrl;
          if (audioRef.current) {
            audioRef.current.src = objUrl;
            audioRef.current.play().catch(e=>e);
          }
        }
        handleNext();
      });
    }
  }, [currentTrack, playMode, userQueue]);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
