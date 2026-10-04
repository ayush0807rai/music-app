const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const regex = /for \(const track of nextTracks\) \{[\s\S]*?if \(!blobCacheRef\.current\.has\(cUrl\)\) \{[\s\S]*?try \{[\s\S]*?const cache = await caches\.open\(CACHE_NAME\);[\s\S]*?\} catch\(e\) \{\}\r?\n\s+\}\r?\n\s+\}/m;

const replacement = `const promises = nextTracks.map(async (track) => {
            if (!track || !track.url) return;
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
          });
          await Promise.all(promises);`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.jsx', code);
console.log("Done");
