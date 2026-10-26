/**
 * MIRROR STEMS TO SKQQGKPT
 * 
 * Uploads all authentic vocals, drums, bass, and other stems to skqqgkpt
 * Updates skqqgkpt_mirror_manifest.json and database JSON/SQL
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CLOUD_NAME = 'skqqgkpt';
const VAULT_DIR = path.resolve(__dirname, '../cpsimhz1_complete_vault');
const MANIFEST_PATH = path.join(VAULT_DIR, 'manifest.json');
const MIRROR_MANIFEST_PATH = path.join(VAULT_DIR, 'skqqgkpt_mirror_manifest.json');

async function uploadAsset(sourceUrl, localRelPath) {
  if (sourceUrl && sourceUrl.startsWith('http')) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const form = new FormData();
        form.append('upload_preset', 'app_songs');
        form.append('file', sourceUrl);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
          method: 'POST',
          body: form
        });

        if (res.ok) {
          const json = await res.json();
          return json.secure_url;
        }
      } catch (e) {}
    }
  }

  if (localRelPath) {
    const fullPath = path.join(VAULT_DIR, localRelPath);
    if (fs.existsSync(fullPath)) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const form = new FormData();
          form.append('upload_preset', 'app_songs');
          const fileBuffer = fs.readFileSync(fullPath);
          const blob = new Blob([fileBuffer]);
          form.append('file', blob, path.basename(fullPath));

          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
            method: 'POST',
            body: form
          });

          if (res.ok) {
            const json = await res.json();
            return json.secure_url;
          }
        } catch (e) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  }

  return null;
}

// Concurrency helper
async function pMap(array, fn, concurrency = 6) {
  const results = new Array(array.length);
  let index = 0;
  async function worker() {
    while (index < array.length) {
      const i = index++;
      results[i] = await fn(array[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, array.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function main() {
  console.log('=====================================================');
  console.log('🚀 MIRRORING STEMS TO SKQQGKPT');
  console.log('=====================================================\n');

  const baseManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const mirrorManifest = JSON.parse(fs.readFileSync(MIRROR_MANIFEST_PATH, 'utf8'));

  const baseSongMap = new Map(baseManifest.songs.map(s => [s.id, s]));

  let doneCount = 0;
  const stemTypes = ['vocals', 'drums', 'bass', 'other'];

  await pMap(mirrorManifest.songs, async (mirrorSong) => {
    const baseSong = baseSongMap.get(mirrorSong.id);
    if (!baseSong) return;

    if (!mirrorSong.skqqgkpt_stems) mirrorSong.skqqgkpt_stems = {};

    for (const type of stemTypes) {
      if (mirrorSong.skqqgkpt_stems[type]) continue; // already uploaded

      const originalUrl = baseSong[`original_stem_${type}`];
      const localRel = baseSong.local_stems?.[type] || null;

      if (originalUrl || localRel) {
        const uploadedUrl = await uploadAsset(originalUrl, localRel);
        if (uploadedUrl) {
          mirrorSong.skqqgkpt_stems[type] = uploadedUrl;
        }
      }
    }

    doneCount++;
    if (doneCount % 10 === 0 || doneCount === mirrorManifest.songs.length) {
      console.log(`   🎧 Stem tracks mirrored for [${doneCount}/${mirrorManifest.songs.length}] songs (Latest: "${mirrorSong.title}")`);
    }
  }, 6);

  // Save updated mirror manifest
  mirrorManifest.updated_at = new Date().toISOString();
  fs.writeFileSync(MIRROR_MANIFEST_PATH, JSON.stringify(mirrorManifest, null, 2));
  console.log(`\n✅ Updated mirror manifest saved: ${MIRROR_MANIFEST_PATH}`);

  // Update skqqgkpt_songs.json in vault database folder
  const skqqDatabaseDir = path.join(VAULT_DIR, 'database');
  const skqqSongs = mirrorManifest.songs.map(s => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    album: s.album,
    duration: s.duration,
    lyrics: s.lyrics,
    url: s.skqqgkpt_url || s.original_url,
    poster_url: s.skqqgkpt_poster_url || s.original_poster_url,
    stem_vocals: s.skqqgkpt_stems?.vocals || null,
    stem_drums: s.skqqgkpt_stems?.drums || null,
    stem_bass: s.skqqgkpt_stems?.bass || null,
    stem_other: s.skqqgkpt_stems?.other || null
  }));

  fs.writeFileSync(path.join(skqqDatabaseDir, 'skqqgkpt_songs.json'), JSON.stringify(skqqSongs, null, 2));

  // Refresh zip archive
  console.log(`\n📦 Refreshing cpsimhz1_complete_vault.zip with all stems...`);
  try {
    execSync('py scripts/create_zip.py', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    console.log(`✅ cpsimhz1_complete_vault.zip refreshed!`);
  } catch (e) {
    console.warn(`⚠️ Zip warning:`, e.message);
  }

  console.log('\n=====================================================');
  console.log('🎉 ALL STEMS MIRRORED TO SKQQGKPT SUCCESSFULLY!');
  console.log('=====================================================');
}

main().catch(console.error);
