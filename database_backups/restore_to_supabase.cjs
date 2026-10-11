/**
 * EUPHONY ONE-CLICK DATABASE RESTORER
 * 
 * Usage:
 *   node database_backups/restore_to_supabase.cjs
 * 
 * Or provide custom Supabase credentials:
 *   node database_backups/restore_to_supabase.cjs https://your-project.supabase.co your-service-or-anon-key
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env if present
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const args = process.argv.slice(2);
const targetUrl = args[0] || process.env.VITE_SUPABASE_URL;
const targetKey = args[1] || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!targetUrl || !targetKey) {
  console.error('❌ Error: Supabase URL and Key must be provided in .env or via command-line arguments.');
  console.error('Usage: node database_backups/restore_to_supabase.cjs <SUPABASE_URL> <SUPABASE_KEY>');
  process.exit(1);
}

const supabase = createClient(targetUrl, targetKey);
const BACKUP_DIR = __dirname;

async function runRestore() {
  console.log('=====================================================');
  console.log('🔄 EUPHONY AUTOMATED SUPABASE RESTORATION');
  console.log(`🎯 Target Project: ${targetUrl}`);
  console.log('=====================================================\n');

  // Load JSON data
  const artists = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'artists.json'), 'utf8'));
  const songs = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'songs.json'), 'utf8'));
  const playlists = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'playlists.json'), 'utf8'));
  const playlistSongs = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, 'playlist_songs.json'), 'utf8'));

  // 1. Restore Artists
  console.log(`1️⃣  Restoring Artists (${artists.length} total)...`);
  const artistBatches = chunkArray(artists, 50);
  let artistsInserted = 0;
  for (const batch of artistBatches) {
    const { data, error } = await supabase.from('artists').upsert(batch, { onConflict: 'name' });
    if (error) {
      console.warn(`   ⚠️ Artists batch warning:`, error.message);
    } else {
      artistsInserted += batch.length;
    }
  }
  console.log(`   ✅ Artists restored: ${artistsInserted}/${artists.length}\n`);

  // 2. Restore Songs
  console.log(`2️⃣  Restoring Songs (${songs.length} total)...`);
  const songBatches = chunkArray(songs, 50);
  let songsInserted = 0;
  for (const batch of songBatches) {
    const { data, error } = await supabase.from('songs').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.warn(`   ⚠️ Songs batch warning:`, error.message);
    } else {
      songsInserted += batch.length;
    }
  }
  console.log(`   ✅ Songs restored: ${songsInserted}/${songs.length}\n`);

  // 3. Restore Playlists
  console.log(`3️⃣  Restoring Playlists (${playlists.length} total)...`);
  let playlistsInserted = 0;
  for (const p of playlists) {
    const { error } = await supabase.from('playlists').upsert(p, { onConflict: 'id' });
    if (error) {
      console.warn(`   ⚠️ Playlist '${p.name}' warning:`, error.message);
    } else {
      playlistsInserted++;
    }
  }
  console.log(`   ✅ Playlists restored: ${playlistsInserted}/${playlists.length}\n`);

  // 4. Restore Playlist Songs
  console.log(`4️⃣  Restoring Playlist Track Links (${playlistSongs.length} total)...`);
  const psBatches = chunkArray(playlistSongs, 50);
  let psInserted = 0;
  for (const batch of psBatches) {
    const { error } = await supabase.from('playlist_songs').upsert(batch, { onConflict: 'playlist_id,song_id' });
    if (error) {
      console.warn(`   ⚠️ Playlist songs batch warning:`, error.message);
    } else {
      psInserted += batch.length;
    }
  }
  console.log(`   ✅ Playlist songs restored: ${psInserted}/${playlistSongs.length}\n`);

  console.log('=====================================================');
  console.log('🎉 RESTORATION COMPLETED SUCCESSFULLY!');
  console.log('=====================================================');
}

function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

runRestore().catch(err => {
  console.error('❌ Restore failed:', err);
  process.exit(1);
});
