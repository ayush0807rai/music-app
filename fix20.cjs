const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /useEffect\(\(\) => \{\r?\n\s+const runPrefetch = async \(\) => \{\r?\n\s+\/\/ Arm the immediate next track first[\s\S]*?runPrefetch\(\);\r?\n\s+\}, \[playbackQueue, userQueue, upcomingSourceList, currentTrack\?\.url\]\);/m;

const replacement = `const prefetchedSignatureRef = useRef("");

  useEffect(() => {
    const runPrefetch = async () => {
      if (!audioRef.current || audioRef.current.currentTime < 2) return;
      
      const signature = currentTrack?.url;
      if (prefetchedSignatureRef.current === signature) return;
      prefetchedSignatureRef.current = signature;

      // Arm the immediate next track first
      await armNextTrack();
      
      // Then SEQUENTIALLY prefetch the next few tracks in the queue so we don't saturate background network
      const nextTracks = [
        ...userQueue.slice(0, 3),
        ...(upcomingSourceList.slice(0, 2).map(item => playbackQueue[item.originalIndex]).filter(Boolean))
      ];
      
      for (const track of nextTracks) {
        if (track?.url) {
          await cacheTrackUrl(getCdnUrl(track.url));
        }
      }
    };
    
    const audioEl = audioRef.current;
    if (audioEl) {
      audioEl.addEventListener('timeupdate', runPrefetch);
    }
    return () => {
      if (audioEl) {
        audioEl.removeEventListener('timeupdate', runPrefetch);
      }
    };
  }, [playbackQueue, userQueue, upcomingSourceList, currentTrack?.url]);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
