const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const prefetchedSignatureRef = useRef\(""\);[\s\S]*?await Promise\.all\(promises\);\r?\n\s+\}\r?\n\s+\};\r?\n/m;

const replacement = `const prefetchedSignatureRef = useRef("");
    const activeFetchesRef = useRef(new Set());
    
    useEffect(() => {
      prefetchedSignatureRef.current = "";
    }, [currentTrack?.url]);
  
    useEffect(() => {
      const checkPrefetch = async () => {
        if (!audioRef.current || !currentTrack?.url) return;
        
        if (audioRef.current.currentTime >= 1) {
          let nextTracks = [];
          if (userQueue.length > 0) {
            nextTracks = userQueue.slice(0, 1);
          } else if (upcomingSourceList.length > 0) {
            nextTracks = upcomingSourceList.slice(0, 1).map(item => playbackQueue[item.originalIndex]).filter(Boolean);
          }
          
          if (nextTracks.length === 0) return;
          const track = nextTracks[0];
          if (!track || !track.url) return;
          
          const signature = track.url;
          if (prefetchedSignatureRef.current === signature) return;
          prefetchedSignatureRef.current = signature;
          
          const cUrl = getCdnUrl(track.url);
          if (blobCacheRef.current.has(cUrl) || activeFetchesRef.current.has(cUrl)) return;
          
          activeFetchesRef.current.add(cUrl);
          try {
            const cache = await caches.open(CACHE_NAME);
            let match = await cache.match(cUrl);
            if (!match) {
              await cache.add(cUrl);
              match = await cache.match(cUrl);
            }
            if (match) {
              const blob = await match.blob();
              blobCacheRef.current.set(cUrl, URL.createObjectURL(blob));
            }
          } catch(e) {
            console.log('Prefetch error:', e);
          } finally {
            activeFetchesRef.current.delete(cUrl);
          }
        }
      };
`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
