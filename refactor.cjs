const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Refs
code = code.replace(
  /const player1Ref = useRef\(null\);\s*const player2Ref = useRef\(null\);\s*const activePlayerIdRef = useRef\(1\);\s*const \[activePlayerId, setActivePlayerId\] = useState\(1\);/,
  "const audioRef = useRef(null);\n  const blobCacheRef = useRef(new Map());"
);

code = code.replace(
  /const preloadAudioRef = useMemo\(\(\) => \(\{\s*get current\(\) \{\s*return activePlayerIdRef\.current === 1 \? player2Ref\.current : player1Ref\.current;\s*\}\s*\}\), \[activePlayerId\]\);/,
  ""
);

// 2. Audio Elements
const dualAudioRegex = /<audio\s+ref=\{player1Ref\}[\s\S]*?className="loop-audio-fix"\s*\/>\s*<audio\s+ref=\{player2Ref\}[\s\S]*?className="loop-audio-fix"\s*\/>/;
const singleAudio = `<audio
        ref={audioRef}
        src={activeAudioSrc || undefined}
        onLoadedMetadata={(e) => {
          setDuration(e.target.duration);
          updateProgressVisuals();
        }}
        onTimeUpdate={() => {
          setCurrentTime(audioRef.current?.currentTime || 0);
          handleTimeUpdateRef.current && handleTimeUpdateRef.current();
        }}
        onEnded={() => {
          const nextIndex = playbackIndex + 1;
          if (nextIndex < playbackQueue.length) {
            const nextTrack = playbackQueue[nextIndex];
            const nextCdnUrl = getCdnUrl(nextTrack.url);
            const objUrl = blobCacheRef.current.get(nextCdnUrl) || nextCdnUrl;
            if (audioRef.current) {
              audioRef.current.src = objUrl;
              audioRef.current.play().catch(e=>e);
            }
          }
          handleTrackEnded();
        }}
        onCanPlay={handleCanPlay}
        onWaiting={() => {
          if (currentTrack?.stem_vocals && !stemsBroken) {
            vocalsRef.current?.pause(); drumsRef.current?.pause(); bassRef.current?.pause(); otherRef.current?.pause();
          }
        }}
        onPlaying={() => {
          if (isPlaying && currentTrack?.stem_vocals && !stemsBroken) {
            vocalsRef.current?.play().catch(e=>e); drumsRef.current?.play().catch(e=>e); bassRef.current?.play().catch(e=>e); otherRef.current?.play().catch(e=>e);
          }
        }}
        preload="auto"
        playsInline
        muted={isMixerActive || isMuted}
        loop={playMode === 'repeat-one'}
        className="loop-audio-fix"
      />`;
code = code.replace(dualAudioRegex, singleAudio);

// 3. MediaSession
const msRegex = /if \('mediaSession' in navigator\) \{[\s\S]*?handleNext\(\)\);\s*\}/;
const msCode = `if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        artwork: currentTrack.poster_url ? [{ src: currentTrack.poster_url }] : []
      });
      navigator.mediaSession.setActionHandler('play', () => handlePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => handlePlayPause());
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
        if (playMode === 'shuffle') {
          // let handleNext do random pick
        } else if (nextIndex < playbackQueue.length) {
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
    }`;
code = code.replace(msRegex, msCode);

// 4. Update preloadAudioRef usages
code = code.replace(/preloadAudioRef/g, 'audioRef');
code = code.replace(/if \(audioRef\.current\?\.paused\) audioRef\.current\.play\(\)\.catch\(e => console\.log\("play err:", e\)\);/g, 'if (audioRef.current?.paused) audioRef.current.play().catch(e => e);');

// 5. Update activeAudioSrc load logic
const loadSrcRegex = /const loadSrc = async \(\) => \{[\s\S]*?loadSrc\(\);[\s\S]*?return \(\) => \{/g;
const loadSrcReplacement = `const cdnUrl = getCdnUrl(currentTrack.url);
    if (blobCacheRef.current.has(cdnUrl)) {
      setActiveAudioSrc(blobCacheRef.current.get(cdnUrl));
      return;
    }

    let isMounted = true;
    let objectUrl = null;

    const loadSrc = async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(cdnUrl);
        if (match) {
          const blob = await match.blob();
          objectUrl = URL.createObjectURL(blob);
          blobCacheRef.current.set(cdnUrl, objectUrl);
          if (isMounted) setActiveAudioSrc(objectUrl);
        } else {
          if (isMounted && activeAudioSrc !== cdnUrl) setActiveAudioSrc(cdnUrl);
        }
      } catch (e) {
        if (isMounted && activeAudioSrc !== cdnUrl) setActiveAudioSrc(cdnUrl);
      }
    };

    loadSrc();

    return () => {`;
code = code.replace(loadSrcRegex, loadSrcReplacement);

// 6. Fix checkPrefetch logic
const prefetchRegex = /const signature = nextTracks\.map\(t => t\.url\)\.join\(\",\"\);[\s\S]*?prefetchedSignatureRef\.current = signature;\s*/g;
const prefetchReplacement = `const signature = nextTracks.map(t => t.url).join(",");
        if (prefetchedSignatureRef.current === signature) return;
        prefetchedSignatureRef.current = signature;
        
        for (const track of nextTracks) {
          if (!track.url) continue;
          const cUrl = getCdnUrl(track.url);
          if (!blobCacheRef.current.has(cUrl)) {
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
            } catch(e) {}
          }
        }\n        `;
code = code.replace(prefetchRegex, prefetchReplacement);

fs.writeFileSync('src/App.jsx', code);
console.log('Refactor successful');
