/**
 * SYNC VAULT & MIRROR
 * 
 * Automatically synchronizes any newly added songs, artists, posters, and stems
 * from Supabase into cpsimhz1_complete_vault/ and rebuilds cpsimhz1_complete_vault.zip.
 * Also mirrors new assets to Cloudinary skqqgkpt.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');

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

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gbkaflawosewcrmjkmrt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VAULT_DIR = path.resolve(__dirname, '../cpsimhz1_complete_vault');
const MANIFEST_PATH = path.join(VAULT_DIR, 'manifest.json');
const MIRROR_MANIFEST_PATH = path.join(VAULT_DIR, 'skqqgkpt_mirror_manifest.json');

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

async function downloadFile(url, destPath) {
  if (fs.existsSync(destPath)) return true;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
      return true;
    } catch (e) {
      if (attempt === 3) {
        console.warn(`   ⚠️ Download failed for ${url}:`, e.message);
        return false;
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function uploadToSkqq(sourceUrl, resourceType = 'auto') {
  if (!sourceUrl || !sourceUrl.startsWith('http')) return null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const form = new FormData();
      form.append('upload_preset', 'app_songs');
      form.append('file', sourceUrl);

      const res = await fetch(`https://api.cloudinary.com/v1_1/skqqgkpt/${resourceType}/upload`, {
        method: 'POST',
        body: form
      });
      if (res.ok) {
        const json = await res.json();
        return json.secure_url;
      }
    } catch (e) {}
  }
  return null;
}

async function sync() {
  console.log('=====================================================');
  console.log('🔄 SYNCING VAULT ARCHIVE WITH LATEST SUPABASE DATA');
  console.log('=====================================================\n');

  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`❌ Manifest not found at: ${MANIFEST_PATH}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const mirrorManifest = fs.existsSync(MIRROR_MANIFEST_PATH)
    ? JSON.parse(fs.readFileSync(MIRROR_MANIFEST_PATH, 'utf8'))
    : { songs: [], artists: [] };

  const existingSongIds = new Set(manifest.songs.map(s => s.id));
  const existingArtistIds = new Set(manifest.artists.map(a => a.id));

  // 1. Fetch latest from Supabase
  console.log('📥 Fetching all songs and artists from Supabase...');
  const { data: songs, error: sErr } = await supabase.from('songs').select('*').order('created_at', { ascending: true });
  if (sErr) throw sErr;

  const { data: artists, error: aErr } = await supabase.from('artists').select('*').order('created_at', { ascending: true });
  if (aErr) throw aErr;

  const { data: playlists } = await supabase.from('playlists').select('*');
  const { data: playlist_songs } = await supabase.from('playlist_songs').select('*');

  let newSongsCount = 0;
  let newArtistsCount = 0;

  // 2. Check for new artists
  for (const a of artists) {
    if (!existingArtistIds.has(a.id)) {
      newArtistsCount++;
      let localPath = null;
      let skqqUrl = null;
      if (a.image_url) {
        const ext = a.image_url.includes('.png') ? '.png' : '.jpg';
        const filename = `${sanitizeFilename(a.name)}${ext}`;
        const dest = path.join(VAULT_DIR, 'artists', filename);
        const ok = await downloadFile(a.image_url, dest);
        if (ok) localPath = `artists/${filename}`;
        skqqUrl = await uploadToSkqq(a.image_url, 'image');
      }
      manifest.artists.push({
        id: a.id,
        name: a.name,
        original_url: a.image_url,
        local_path: localPath
      });
      mirrorManifest.artists.push({
        id: a.id,
        name: a.name,
        original_url: a.image_url,
        skqqgkpt_url: skqqUrl
      });
      console.log(`   ✨ Added & mirrored new artist: ${a.name}`);
    }
  }

  // 3. Check for new songs
  for (const s of songs) {
    if (!existingSongIds.has(s.id)) {
      newSongsCount++;
      console.log(`   ✨ Found new song: "${s.title}" - ${s.artist}`);

      // Download audio
      let localAudio = null;
      if (s.url) {
        const filename = `${sanitizeFilename(s.title)} - ${sanitizeFilename(s.artist)}.mp3`;
        const dest = path.join(VAULT_DIR, 'songs', filename);
        const ok = await downloadFile(s.url, dest);
        if (ok) localAudio = `songs/${filename}`;
      }

      // Download poster
      let localPoster = null;
      if (s.poster_url) {
        const ext = s.poster_url.includes('.png') ? '.png' : '.jpg';
        const filename = `${sanitizeFilename(s.title)} - ${sanitizeFilename(s.artist)}${ext}`;
        const dest = path.join(VAULT_DIR, 'posters', filename);
        const ok = await downloadFile(s.poster_url, dest);
        if (ok) localPoster = `posters/${filename}`;
      }

      // Download stems
      const localStems = {};
      const stemFields = ['vocals', 'drums', 'bass', 'other'];
      for (const stem of stemFields) {
        const stemUrl = s[`stem_${stem}`];
        if (stemUrl) {
          const filename = `${sanitizeFilename(s.title)} - ${sanitizeFilename(s.artist)} (${stem}).mp3`;
          const dest = path.join(VAULT_DIR, 'stems', filename);
          const ok = await downloadFile(stemUrl, dest);
          if (ok) localStems[stem] = `stems/${filename}`;
        }
      }

      // Mirror to skqqgkpt
      const skqqAudio = await uploadToSkqq(s.url, 'video');
      const skqqPoster = await uploadToSkqq(s.poster_url, 'image');
      const skqqStems = {};
      for (const stem of stemFields) {
        if (s[`stem_${stem}`]) {
          const mStem = await uploadToSkqq(s[`stem_${stem}`], 'video');
          if (mStem) skqqStems[stem] = mStem;
        }
      }

      manifest.songs.push({
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
        local_audio_path: localAudio,
        local_poster_path: localPoster,
        local_stems: localStems
      });

      mirrorManifest.songs.push({
        id: s.id,
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        lyrics: s.lyrics,
        original_url: s.url,
        skqqgkpt_url: skqqAudio,
        skqqgkpt_poster_url: skqqPoster,
        skqqgkpt_stems: skqqStems
      });
    }
  }

  // 4. Update database dumps in vault
  fs.writeFileSync(path.join(VAULT_DIR, 'database', 'songs.json'), JSON.stringify(songs, null, 2));
  fs.writeFileSync(path.join(VAULT_DIR, 'database', 'artists.json'), JSON.stringify(artists, null, 2));
  if (playlists) fs.writeFileSync(path.join(VAULT_DIR, 'database', 'playlists.json'), JSON.stringify(playlists, null, 2));
  if (playlist_songs) fs.writeFileSync(path.join(VAULT_DIR, 'database', 'playlist_songs.json'), JSON.stringify(playlist_songs, null, 2));

  // Save updated manifests
  manifest.updated_at = new Date().toISOString();
  manifest.total_songs = manifest.songs.length;
  manifest.total_artists = manifest.artists.length;
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  mirrorManifest.updated_at = new Date().toISOString();
  mirrorManifest.total_songs = mirrorManifest.songs.length;
  mirrorManifest.total_artists = mirrorManifest.artists.length;
  fs.writeFileSync(MIRROR_MANIFEST_PATH, JSON.stringify(mirrorManifest, null, 2));

  console.log(`\n📊 Sync Summary:`);
  console.log(`   • New songs added to vault & skqqgkpt: ${newSongsCount}`);
  console.log(`   • New artists added to vault & skqqgkpt: ${newArtistsCount}`);
  console.log(`   • Total vault songs: ${manifest.total_songs}`);
  console.log(`   • Total vault artists: ${manifest.total_artists}`);

  // 5. Rebuild zip archive
  console.log(`\n📦 Rebuilding cpsimhz1_complete_vault.zip...`);
  try {
    execSync('py scripts/create_zip.py', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    console.log(`✅ cpsimhz1_complete_vault.zip successfully updated!`);
  } catch (e) {
    try {
      execSync('python scripts/create_zip.py', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
      console.log(`✅ cpsimhz1_complete_vault.zip successfully updated!`);
    } catch (e2) {
      console.error('❌ Zip update failed:', e2.message);
    }
  }
}

sync().catch(console.error);
