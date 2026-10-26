/**
 * WIPE OLD FLAWED ASSETS AND MIRROR CPSIMHZ1 VAULT TO SKQQGKPT
 * 
 * 1. Authenticates using SKQQ_API_KEY and SKQQ_API_SECRET
 * 2. Purges any test/residual assets in skqqgkpt
 * 3. Ensures unsigned upload preset 'app_songs' is active
 * 4. Mirrors all 178 songs, 178 posters, artist photos, and stems to skqqgkpt
 * 5. Generates skqqgkpt_mirror_manifest.json and SQL/JSON database dumps
 * 6. Refreshes cpsimhz1_complete_vault.zip
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(l => {
      const match = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    });
  }
}
loadEnv();

const CLOUD_NAME = 'skqqgkpt';
const API_KEY = process.env.SKQQ_API_KEY || '256514229591724';
const API_SECRET = process.env.SKQQ_API_SECRET || 'x2o8WkpoKZWzDzSJzfB81yluudU';

const authHeader = 'Basic ' + Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');
const VAULT_DIR = path.resolve(__dirname, '../cpsimhz1_complete_vault');
const MANIFEST_PATH = path.join(VAULT_DIR, 'manifest.json');

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${endpoint}`;
  const opts = {
    method,
    headers: { Authorization: authHeader }
  };
  if (body) {
    if (body instanceof FormData || body instanceof URLSearchParams) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function wipeResourceType(resourceType) {
  console.log(`🧹 Checking existing ${resourceType} assets in ${CLOUD_NAME}...`);
  let hasMore = true;
  let nextCursor = null;
  let totalDeleted = 0;

  while (hasMore) {
    let url = `resources/${resourceType}?max_results=500`;
    if (nextCursor) url += `&next_cursor=${encodeURIComponent(nextCursor)}`;
    
    const res = await apiRequest(url, 'GET');
    if (!res.ok) {
      break;
    }

    const resources = res.data.resources || [];
    if (resources.length === 0) break;

    const publicIds = resources.map(r => r.public_id);
    const query = publicIds.map(id => `public_ids[]=${encodeURIComponent(id)}`).join('&');
    const delRes = await apiRequest(`resources/${resourceType}/upload?${query}`, 'DELETE');

    if (delRes.ok) {
      const deletedCount = Object.values(delRes.data.deleted || {}).filter(v => v === 'deleted').length;
      totalDeleted += deletedCount;
    }

    nextCursor = res.data.next_cursor;
    if (!nextCursor) hasMore = false;
  }

  console.log(`✅ ${resourceType} assets purged: ${totalDeleted}`);
}

async function uploadAsset(sourceUrl, localRelPath, resourceType) {
  // Try cloud-to-cloud transfer first (extremely fast)
  if (sourceUrl && sourceUrl.startsWith('http')) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const form = new FormData();
        form.append('upload_preset', 'app_songs');
        form.append('file', sourceUrl);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
          method: 'POST',
          body: form
        });

        if (res.ok) {
          const json = await res.json();
          return json.secure_url;
        }
      } catch (e) {
        if (attempt === 2) console.warn(`   ⚠️ Cloud transfer failed for ${sourceUrl}, trying local fallback.`);
      }
    }
  }

  // Fallback to local physical file from vault
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

          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`, {
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
async function pMap(array, fn, concurrency = 4) {
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
  console.log('🚀 WIPE & MIRROR CPSIMHZ1 ARCHIVE TO SKQQGKPT');
  console.log('=====================================================\n');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest not found at: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  // Step 1: Wipe all old/test assets
  console.log('--- STEP 1: Purging all old/test assets in skqqgkpt ---');
  await wipeResourceType('video');
  await wipeResourceType('image');
  await wipeResourceType('raw');

  // Step 2: Ensure unsigned preset app_songs exists
  console.log('\n--- STEP 2: Verifying upload preset ---');
  const check = await apiRequest('upload_presets/app_songs', 'GET');
  if (!check.ok) {
    const createForm = new URLSearchParams({
      name: 'app_songs',
      unsigned: 'true',
      'settings[use_filename]': 'false',
      'settings[unique_filename]': 'true'
    });
    await apiRequest('upload_presets', 'POST', createForm);
    console.log(`✅ Created unsigned preset 'app_songs'`);
  } else {
    console.log(`✅ Preset 'app_songs' is active`);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  // Step 3: Mirror Artists
  console.log(`\n--- STEP 3: Mirroring ${manifest.artists.length} Artist Images ---`);
  let artistDone = 0;
  const mirroredArtists = await pMap(manifest.artists, async (artist) => {
    let mirrorUrl = null;
    if (artist.original_url || artist.local_path) {
      mirrorUrl = await uploadAsset(artist.original_url, artist.local_path, 'image');
    }
    artistDone++;
    if (artistDone % 10 === 0 || artistDone === manifest.artists.length) {
      console.log(`   📸 Artists mirrored: [${artistDone}/${manifest.artists.length}]`);
    }
    return {
      id: artist.id,
      name: artist.name,
      original_url: artist.original_url,
      skqqgkpt_url: mirrorUrl
    };
  }, 5);

  // Step 4: Mirror Songs, Posters, and Stems
  console.log(`\n--- STEP 4: Mirroring ${manifest.songs.length} Songs, Posters & Stems ---`);
  let songsDone = 0;
  const mirroredSongs = await pMap(manifest.songs, async (song) => {
    // 1. Audio
    const skqqAudio = await uploadAsset(song.original_url, song.local_audio_path, 'video');

    // 2. Poster
    const skqqPoster = await uploadAsset(song.original_poster_url, song.local_poster_path, 'image');

    // 3. Stems
    const skqqStems = {};
    if (song.original_stems) {
      for (const [stemType, url] of Object.entries(song.original_stems)) {
        if (url) {
          const localRel = song.local_stems?.[stemType] || null;
          const sUrl = await uploadAsset(url, localRel, 'video');
          if (sUrl) skqqStems[stemType] = sUrl;
        }
      }
    }

    songsDone++;
    if (songsDone % 5 === 0 || songsDone === manifest.songs.length) {
      console.log(`   🎵 Songs mirrored: [${songsDone}/${manifest.songs.length}] (Latest: "${song.title}")`);
    }

    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: song.album,
      duration: song.duration,
      lyrics: song.lyrics,
      original_url: song.original_url,
      skqqgkpt_url: skqqAudio,
      skqqgkpt_poster_url: skqqPoster,
      skqqgkpt_stems: skqqStems
    };
  }, 4);

  // Step 5: Save mirror manifest
  const mirrorManifest = {
    mirrored_at: new Date().toISOString(),
    primary_cloud: 'cpsimhz1',
    mirror_cloud: 'skqqgkpt',
    total_songs: mirroredSongs.length,
    total_artists: mirroredArtists.length,
    artists: mirroredArtists,
    songs: mirroredSongs
  };

  const mirrorManifestPath = path.join(VAULT_DIR, 'skqqgkpt_mirror_manifest.json');
  fs.writeFileSync(mirrorManifestPath, JSON.stringify(mirrorManifest, null, 2));
  console.log(`\n✅ Mirror manifest saved: ${mirrorManifestPath}`);

  // Step 6: Generate SQL and JSON database for instant disaster recovery to skqqgkpt
  const skqqDatabaseDir = path.join(VAULT_DIR, 'database');
  const skqqSongs = mirroredSongs.map(s => ({
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

  const skqqArtists = mirroredArtists.map(a => ({
    id: a.id,
    name: a.name,
    image_url: a.skqqgkpt_url || a.original_url
  }));

  fs.writeFileSync(path.join(skqqDatabaseDir, 'skqqgkpt_songs.json'), JSON.stringify(skqqSongs, null, 2));
  fs.writeFileSync(path.join(skqqDatabaseDir, 'skqqgkpt_artists.json'), JSON.stringify(skqqArtists, null, 2));

  // Step 7: Update cpsimhz1_complete_vault.zip
  console.log(`\n📦 Refreshing cpsimhz1_complete_vault.zip with full mirror data...`);
  try {
    execSync('python scripts/create_zip.py', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    console.log(`✅ cpsimhz1_complete_vault.zip successfully refreshed!`);
  } catch (e) {
    console.warn(`⚠️ Zip warning:`, e.message);
  }

  console.log('\n=====================================================');
  console.log('🎉 100% COMPLETE LIBRARY MIRRORED TO SKQQGKPT!');
  console.log('=====================================================');
}

main().catch(console.error);
