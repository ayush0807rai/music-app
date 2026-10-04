const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /const armNextTrack = \(\) => \{[\s\S]*?try \{ idle\.load\(\); \} catch \(e\) \{\}\r?\n\s+\}\r?\n\s+\};/m;

const replacement = `const activeFetchesRef = useRef(new Set());

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

    if (activeFetchesRef.current.has(cdnUrl)) return;
    activeFetchesRef.current.add(cdnUrl);

    try {
      const cache = await caches.open(CACHE_NAME);
      let match = await cache.match(cdnUrl);
      if (!match) {
        await cache.add(cdnUrl);
        match = await cache.match(cdnUrl);
      }
      if (match) {
        const blob = await match.blob();
        const blobUrl = URL.createObjectURL(blob);
        blobCacheRef.current.set(cdnUrl, blobUrl);
        if (primedTrackIdRef.current === nextKey) {
          if (!srcMatches(idle, blobUrl)) {
            idle.src = blobUrl;
            try { idle.load(); } catch(e) {}
          }
        }
      }
    } catch(e) {
      console.log(e);
      if (primedTrackIdRef.current === nextKey && !srcMatches(idle, cdnUrl)) {
        idle.src = cdnUrl;
      }
    } finally {
      activeFetchesRef.current.delete(cdnUrl);
    }
  };`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
