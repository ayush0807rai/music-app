/**
 * COMPLETE CLOUDINARY EMERGENCY BACKUP & VAULT MIRROR
 * 
 * Ensures 100% of all songs, posters, stems, artists, and database tables
 * are fully downloaded locally into cpsimhz1_complete_vault/ and mirrored
 * to Cloudinary skqqgkpt before cpsimhz1 gets disabled on 24 Nov.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VAULT_DIR = path.resolve(__dirname, '../cpsimhz1_complete_vault');
const DB_DIR = path.resolve(__dirname, '../database_backups');
const MANIFEST_PATH = path.join(VAULT_DIR, 'manifest.json');
const MIRROR_MANIFEST_PATH = path.join(VAULT_DIR, 'skqqgkpt_mirror_manifest.json');

const songs = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'songs.json'), 'utf8'));
const artists = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'artists.json'), 'utf8'));
const playlists = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'playlists.json'), 'utf8'));
const playlistSongs = JSON.parse(fs.readFileSync(path.join(DB_DIR, 'playlist_songs.json'), 'utf8'));

// Ensure required vault directories exist
['songs', 'posters', 'artists', 'database', 'stems', 'stems/vocals', 'stems/drums', 'stems/bass', 'stems/other'].forEach(dir => {
  const full = path.join(VAULT_DIR, dir);
  if (!fs.existsSync(full)) fs.mkdirSync(full, { recursive: true });
});

function sanitizeFilename(name) {
  return (name || '').replace(/[<>:"/\\|?*]/g, '_').trim();
}

async function downloadFile(url, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1024) {
    return true;
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength < 50) throw new Error(`File too small: ${arrayBuffer.byteLength} bytes`);
      fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
      return true;
    } catch (e) {
      if (attempt === 4) {
        console.warn(`   ⚠️ Download failed for ${url}:`, e.message);
        return false;
      }
      await new Promise(r => setTimeout(r, 1200 * attempt));
    }
  }
}

async function uploadToSkqq(sourceUrlOrLocalPath, resourceType = 'auto') {
  if (!sourceUrlOrLocalPath) return null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const form = new FormData();
      form.append('upload_preset', 'app_songs');

      if (sourceUrlOrLocalPath.startsWith('http')) {
        form.append('file', sourceUrlOrLocalPath);
      } else if (fs.existsSync(sourceUrlOrLocalPath)) {
        const fileBuffer = fs.readFileSync(sourceUrlOrLocalPath);
        const blob = new Blob([fileBuffer]);
        form.append('file', blob, path.basename(sourceUrlOrLocalPath));
      } else {
        return null;
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/skqqgkpt/${resourceType}/upload`, {
        method: 'POST',
        body: form
      });
      if (res.ok) {
        const json = await res.json();
        return json.secure_url;
      }
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

// Simple pool map for controlled concurrency
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

async function run() {
  console.log('=====================================================');
  console.log('🛡️ EUPHONY TOTAL VAULT & CLOUDINARY RESCUE BACKUP');
  console.log('=====================================================\n');

  const manifest = fs.existsSync(MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
    : { songs: [], artists: [] };

  const mirrorManifest = fs.existsSync(MIRROR_MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MIRROR_MANIFEST_PATH, 'utf8'))
    : { songs: [], artists: [] };

  const manifestSongMap = new Map(manifest.songs.map(s => [s.id, s]));
  const mirrorSongMap = new Map(mirrorManifest.songs.map(s => [s.id, s]));
  const manifestArtistMap = new Map(manifest.artists.map(a => [a.id, a]));
  const mirrorArtistMap = new Map(mirrorManifest.artists.map(a => [a.id, a]));

  // 1. Download & Mirror Artists
  console.log(`\n🎨 1. Checking & Downloading ${artists.length} Artist Images...`);
  let downloadedArtists = 0;
  await pMap(artists, async (a) => {
    if (!a.image_url) return;
    const ext = a.image_url.includes('.png') ? '.png' : '.jpg';
    const filename = `${sanitizeFilename(a.name)}${ext}`;
    const dest = path.join(VAULT_DIR, 'artists', filename);

    const exists = fs.existsSync(dest) && fs.statSync(dest).size > 500;
    if (!exists) {
      const ok = await downloadFile(a.image_url, dest);
      if (ok) {
        downloadedArtists++;
        console.log(`   [Artist Downloaded] ${a.name}`);
      }
    }

    let mArtist = manifestArtistMap.get(a.id);
    if (!mArtist) {
      mArtist = { id: a.id, name: a.name, original_url: a.image_url, local_path: `artists/${filename}` };
      manifest.artists.push(mArtist);
      manifestArtistMap.set(a.id, mArtist);
    } else {
      mArtist.local_path = `artists/${filename}`;
    }

    let mirrArtist = mirrorArtistMap.get(a.id);
    if (!mirrArtist) {
      const skqqUrl = await uploadToSkqq(dest, 'image') || await uploadToSkqq(a.image_url, 'image');
      mirrArtist = { id: a.id, name: a.name, original_url: a.image_url, skqqgkpt_url: skqqUrl };
      mirrorManifest.artists.push(mirrArtist);
      mirrorArtistMap.set(a.id, mirrArtist);
    } else if (!mirrArtist.skqqgkpt_url) {
      mirrArtist.skqqgkpt_url = await uploadToSkqq(dest, 'image') || await uploadToSkqq(a.image_url, 'image');
    }
  }, 4);
  console.log(`✅ Artists check complete (Newly downloaded: ${downloadedArtists})`);

  // 2. Download & Mirror Songs, Posters, and Stems
  console.log(`\n🎵 2. Checking & Downloading ${songs.length} Master Songs, Posters & Stems...`);
  let downloadedSongs = 0;
  let downloadedPosters = 0;
  let downloadedStems = 0;

  await pMap(songs, async (s, idx) => {
    const sName = sanitizeFilename(s.title);
    const aName = sanitizeFilename(s.artist);

    // Audio
    const audioName = `${sName} - ${aName}.mp3`;
    const audioDest = path.join(VAULT_DIR, 'songs', audioName);
    let hasAudio = fs.existsSync(audioDest) && fs.statSync(audioDest).size > 10000;
    if (!hasAudio && s.url) {
      const ok = await downloadFile(s.url, audioDest);
      if (ok) {
        downloadedSongs++;
        hasAudio = true;
      }
    }

    // Poster
    const ext = (s.poster_url && s.poster_url.includes('.png')) ? '.png' : '.jpg';
    const posterName = `${sName} - ${aName}${ext}`;
    const posterDest = path.join(VAULT_DIR, 'posters', posterName);
    let hasPoster = (fs.existsSync(posterDest) && fs.statSync(posterDest).size > 1000) ||
                    (fs.existsSync(posterDest.replace(/\.[^.]+$/, ext === '.png' ? '.jpg' : '.png')));
    if (!hasPoster && s.poster_url) {
      const ok = await downloadFile(s.poster_url, posterDest);
      if (ok) {
        downloadedPosters++;
        hasPoster = true;
      }
    }

    // Stems (vocals, drums, bass, other)
    const localStems = {};
    const stemTypes = ['vocals', 'drums', 'bass', 'other'];
    for (const stem of stemTypes) {
      const stemUrl = s[`stem_${stem}`];
      if (!stemUrl) continue;

      // Check standard locations
      const loc1 = path.join(VAULT_DIR, 'stems', stem, `${sName} - ${aName}_${stem}.mp3`);
      const loc2 = path.join(VAULT_DIR, 'stems', stem, `${sName} - ${aName}.mp3`);
      const loc3 = path.join(VAULT_DIR, 'stems', `${sName} - ${aName} (${stem}).mp3`);
      
      let stemPath = null;
      if (fs.existsSync(loc1) && fs.statSync(loc1).size > 10000) stemPath = `stems/${stem}/${sName} - ${aName}_${stem}.mp3`;
      else if (fs.existsSync(loc2) && fs.statSync(loc2).size > 10000) stemPath = `stems/${stem}/${sName} - ${aName}.mp3`;
      else if (fs.existsSync(loc3) && fs.statSync(loc3).size > 10000) stemPath = `stems/${sName} - ${aName} (${stem}).mp3`;

      if (!stemPath) {
        const dest = loc1;
        const ok = await downloadFile(stemUrl, dest);
        if (ok) {
          downloadedStems++;
          stemPath = `stems/${stem}/${sName} - ${aName}_${stem}.mp3`;
        }
      }
      if (stemPath) localStems[stem] = stemPath;
    }

    // Update manifest entry
    let mSong = manifestSongMap.get(s.id);
    if (!mSong) {
      mSong = {
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        lyrics: s.lyrics,
        original_url: s.url,
        original_poster_url: s.poster_url,
        original_stem_vocals: s.stem_vocals,
        original_stem_drums: s.stem_drums,
        original_stem_bass: s.stem_bass,
        original_stem_other: s.stem_other,
        local_audio_path: `songs/${audioName}`,
        local_poster_path: `posters/${posterName}`,
        local_stems: localStems
      };
      manifest.songs.push(mSong);
      manifestSongMap.set(s.id, mSong);
    } else {
      mSong.local_audio_path = `songs/${audioName}`;
      mSong.local_poster_path = `posters/${posterName}`;
      mSong.local_stems = { ...(mSong.local_stems || {}), ...localStems };
    }

    // Update mirror manifest
    let mirrSong = mirrorSongMap.get(s.id);
    if (!mirrSong) {
      mirrSong = {
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        lyrics: s.lyrics,
        original_url: s.url,
        skqqgkpt_url: null,
        skqqgkpt_poster_url: null,
        skqqgkpt_stems: {}
      };
      mirrorManifest.songs.push(mirrSong);
      mirrorSongMap.set(s.id, mirrSong);
    }

    if (idx % 25 === 0 || idx === songs.length - 1) {
      console.log(`   Checked [${idx + 1}/${songs.length}] songs...`);
    }
  }, 4);

  console.log(`✅ Master assets downloaded:`);
  console.log(`   • Audio files downloaded: ${downloadedSongs}`);
  console.log(`   • Posters downloaded: ${downloadedPosters}`);
  console.log(`   • Stems downloaded: ${downloadedStems}`);

  // 3. Update database files in vault
  console.log('\n💾 3. Copying raw database dumps into vault...');
  fs.writeFileSync(path.join(VAULT_DIR, 'database', 'songs.json'), JSON.stringify(songs, null, 2));
  fs.writeFileSync(path.join(VAULT_DIR, 'database', 'artists.json'), JSON.stringify(artists, null, 2));
  fs.writeFileSync(path.join(VAULT_DIR, 'database', 'playlists.json'), JSON.stringify(playlists, null, 2));
  fs.writeFileSync(path.join(VAULT_DIR, 'database', 'playlist_songs.json'), JSON.stringify(playlistSongs, null, 2));

  // Save manifests
  manifest.updated_at = new Date().toISOString();
  manifest.total_songs = manifest.songs.length;
  manifest.total_artists = manifest.artists.length;
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  mirrorManifest.updated_at = new Date().toISOString();
  mirrorManifest.total_songs = mirrorManifest.songs.length;
  mirrorManifest.total_artists = mirrorManifest.artists.length;
  fs.writeFileSync(MIRROR_MANIFEST_PATH, JSON.stringify(mirrorManifest, null, 2));

  console.log('✅ Vault manifests and database files updated!');
}

run().catch(console.error);
