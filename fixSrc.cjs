const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Remove src prop from the audio tag
code = code.replace(/<audio\s+ref=\{audioRef\}\s+src=\{activeAudioSrc \|\| undefined\}/, '<audio\n        ref={audioRef}');

// 2. In loadSrc, mutate audioRef.current.src directly instead of relying purely on activeAudioSrc
// Actually, activeAudioSrc is still useful for other things, but we MUST update audioRef.current.src FIRST.
const loadSrcOld = /if \(blobCacheRef\.current\.has\(cdnUrl\)\) \{\s*setActiveAudioSrc\(blobCacheRef\.current\.get\(cdnUrl\)\);\s*return;\s*\}/;
const loadSrcNew = `if (blobCacheRef.current.has(cdnUrl)) {
      const cachedSrc = blobCacheRef.current.get(cdnUrl);
      if (audioRef.current && !audioRef.current.src.endsWith(cachedSrc)) {
        audioRef.current.src = cachedSrc;
      }
      setActiveAudioSrc(cachedSrc);
      return;
    }`;
code = code.replace(loadSrcOld, loadSrcNew);

const objUrlOld = /objectUrl = URL\.createObjectURL\(blob\);\s*blobCacheRef\.current\.set\(cdnUrl, objectUrl\);\s*if \(isMounted\) setActiveAudioSrc\(objectUrl\);/;
const objUrlNew = `objectUrl = URL.createObjectURL(blob);
          blobCacheRef.current.set(cdnUrl, objectUrl);
          if (isMounted) {
            if (audioRef.current && !audioRef.current.src.endsWith(objectUrl)) {
              audioRef.current.src = objectUrl;
            }
            setActiveAudioSrc(objectUrl);
          }`;
code = code.replace(objUrlOld, objUrlNew);

const cdnUrlOld1 = /if \(isMounted && activeAudioSrc !== cdnUrl\) setActiveAudioSrc\(cdnUrl\);/g;
const cdnUrlNew1 = `if (isMounted && activeAudioSrc !== cdnUrl) {
            if (audioRef.current && !audioRef.current.src.endsWith(cdnUrl)) {
              audioRef.current.src = cdnUrl;
            }
            setActiveAudioSrc(cdnUrl);
          }`;
code = code.replace(cdnUrlOld1, cdnUrlNew1);

// 3. Fix the "seamlessly playing" block so it doesn't interrupt either
const seamlessOld = /if \(\(isAlreadyPlayingCdn \|\| isAlreadyPlayingBlob\) && audioRef\.current && !audioRef\.current\.paused\) \{\s*\/\/ It's seamlessly playing! Sync the state to whatever is actually loaded\.\s*setActiveAudioSrc\(audioSrc\);\s*return;\s*\}/;
const seamlessNew = `if ((isAlreadyPlayingCdn || isAlreadyPlayingBlob) && audioRef.current && !audioRef.current.paused) {
      setActiveAudioSrc(audioSrc);
      return;
    }`;
code = code.replace(seamlessOld, seamlessNew);


fs.writeFileSync('src/App.jsx', code);
console.log('DOM source logic completely decoupled from React state!');
