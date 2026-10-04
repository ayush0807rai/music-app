const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /useEffect\(\(\) => \{\r?\n\s+const nextTracks = \[\r?\n\s+\.\.\.userQueue\.slice\(0, 3\),\r?\n\s+\.\.\.\(upcomingSourceList\.slice\(0, 1\)\.map\(item => playbackQueue\[item\.originalIndex\]\)\.filter\(Boolean\)\)\r?\n\s+\];\r?\n\s+const signature = nextTracks\.map\(t => t\?\.url\)\.join\(","\);\r?\n\s+if \(signature && prefetchedSignatureRef\.current === signature\) return;\r?\n\s+if \(signature\) prefetchedSignatureRef\.current = signature;\r?\n\s+nextTracks\.forEach\(track => \{\r?\n\s+if \(track\?\.url\) cacheTrackUrl\(getCdnUrl\(track\.url\)\);\r?\n\s+\}\);\r?\n\s+armNextTrack\(\);\r?\n\s+\}, \[playbackQueue, userQueue, upcomingSourceList, currentTrack\?\.url\]\);/m;

const replacement = `useEffect(() => {
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
