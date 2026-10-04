const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const activeFetchesRef = useRef\(new Set\(\)\);[\s\S]*?\}, \[playbackQueue, userQueue, upcomingSourceList, currentTrack\?\.url\]\);/m;

const replacement = `const activeFetchesRef = useRef(new Set());

    const cacheTrackUrl = async (cUrl) => {
      if (!cUrl || blobCacheRef.current.has(cUrl) || activeFetchesRef.current.has(cUrl)) return;
      activeFetchesRef.current.add(cUrl);
      try {
        const cache = await caches.open(CACHE_NAME);
        let match = await cache.match(cUrl);
        if (!match) {
          const res = await fetch(cUrl, { mode: 'cors', credentials: 'omit' });
          if (res.ok) {
            await cache.put(cUrl, res.clone());
            match = res;
          }
        }
        if (match && !blobCacheRef.current.has(cUrl)) {
          const blob = await match.blob();
          blobCacheRef.current.set(cUrl, URL.createObjectURL(blob));
        }
      } catch (e) {
        console.log('Prefetch error:', e);
      } finally {
        activeFetchesRef.current.delete(cUrl);
      }
    };

    const armNextTrack = async () => {
      const idle = getIdleAudio();
      const next = peekNextTrack();
      if (!idle) return;
      if (!next?.url) {
        primedTrackIdRef.current = null;
        return;
      }
      const cdnUrl = getCdnUrl(next.url);
      const nextKey = next.id ?? next.queue_id ?? cdnUrl;
      primedTrackIdRef.current = nextKey;

      if (blobCacheRef.current.has(cdnUrl)) {
        const blobUrl = blobCacheRef.current.get(cdnUrl);
        if (!srcMatches(idle, blobUrl)) {
          idle.src = blobUrl;
          try { idle.load(); } catch (e) {}
        }
        return;
      }

      await cacheTrackUrl(cdnUrl);
      
      if (blobCacheRef.current.has(cdnUrl) && primedTrackIdRef.current === nextKey) {
        const blobUrl = blobCacheRef.current.get(cdnUrl);
        if (!srcMatches(idle, blobUrl)) {
          idle.src = blobUrl;
          try { idle.load(); } catch(e) {}
        }
      } else if (primedTrackIdRef.current === nextKey && !srcMatches(idle, cdnUrl)) {
        idle.src = cdnUrl;
      }
    };

    useEffect(() => {
      const runPrefetch = async () => {
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
      
      runPrefetch();
    }, [playbackQueue, userQueue, upcomingSourceList, currentTrack?.url]);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
