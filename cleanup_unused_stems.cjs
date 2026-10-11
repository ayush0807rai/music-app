// cleanup_unused_stems.cjs
// Utility to audit, delete unused/redundant stem files from Cloudinary, and update Supabase

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gbkaflawosewcrmjkmrt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'cpsimhz1';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

async function fetchUsage() {
  const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
  try {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/usage`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function runCleanup() {
  console.log('=====================================================');
  console.log('🔍 EUPHONY AUDIO & STEM AUDIT & CLEANUP TOOL');
  console.log('=====================================================\n');

  const beforeUsage = await fetchUsage();
  if (beforeUsage) {
    console.log(`📊 Current Cloudinary Status:`);
    console.log(`   • Credits: ${beforeUsage.credits?.usage} / ${beforeUsage.credits?.limit} (${beforeUsage.credits?.used_percent?.toFixed(1)}%)`);
    console.log(`   • Storage: ${(beforeUsage.storage?.usage / (1024 * 1024 * 1024)).toFixed(2)} GB (${beforeUsage.storage?.credits_usage?.toFixed(2)} credits)`);
    console.log(`   • Bandwidth: ${(beforeUsage.bandwidth?.usage / (1024 * 1024 * 1024)).toFixed(2)} GB (${beforeUsage.bandwidth?.credits_usage?.toFixed(2)} credits)\n`);
  }

  // 1. Fetch songs
  const { data: songs, error: sErr } = await supabase.from('songs').select('id, title, artist, url, stem_vocals, stem_drums, stem_bass, stem_other');
  if (sErr) throw sErr;

  // 2. Fetch playlists
  const { data: playlists, error: pErr } = await supabase.from('playlist_songs').select('song_id');
  if (pErr) throw pErr;

  const playlistSongIds = new Set((playlists || []).map(p => p.song_id));

  const songsWithStems = [];
  const stemsNotInPlaylist = [];
  const allStemPublicIds = [];
  const songsToClear = new Set();

  for (const song of songs) {
    const hasStems = song.stem_vocals || song.stem_drums || song.stem_bass || song.stem_other;
    if (hasStems) {
      songsWithStems.push(song);
      const isUsedInPlaylist = playlistSongIds.has(song.id);

      ['stem_vocals', 'stem_drums', 'stem_bass', 'stem_other'].forEach(f => {
        const u = song[f];
        if (u && u.includes('res.cloudinary.com')) {
          const match = u.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
          const pubId = match ? match[1] : null;
          if (pubId) {
            allStemPublicIds.push({ songId: song.id, songTitle: song.title, field: f, publicId: pubId, url: u });
            if (!isUsedInPlaylist) {
              stemsNotInPlaylist.push({ songId: song.id, songTitle: song.title, field: f, publicId: pubId, url: u });
              songsToClear.add(song.id);
            }
          }
        }
      });
    }
  }

  console.log(`📋 Total Songs: ${songs.length}`);
  console.log(`🎧 Songs in Playlists / Liked: ${playlistSongIds.size}`);
  console.log(`🎵 Songs with AI Stems: ${songsWithStems.length}`);
  console.log(`📦 Total Stored Stem Audio Files: ${allStemPublicIds.length} files (~${((allStemPublicIds.length * 7.5) / 1024).toFixed(2)} GB)`);
  console.log(`🗑️ Unlisted Stems (songs NOT in playlists): ${stemsNotInPlaylist.length} files (~${((stemsNotInPlaylist.length * 7.5) / 1024).toFixed(2)} GB across ${songsToClear.size} songs)\n`);

  const action = process.argv.includes('--delete-all') ? 'all' : (process.argv.includes('--delete-unlisted') ? 'unlisted' : null);

  if (!action) {
    console.log('ℹ️ Dry run completed. To perform actual deletion:');
    console.log('   node cleanup_unused_stems.cjs --delete-unlisted   (Deletes 256 unlisted stems, keeps playlist stems)');
    console.log('   node cleanup_unused_stems.cjs --delete-all        (Deletes all 464 stems from Cloudinary)\n');
    return;
  }

  const targets = action === 'all' ? allStemPublicIds : stemsNotInPlaylist;
  const targetSongIds = action === 'all' ? new Set(songsWithStems.map(s => s.id)) : songsToClear;
  console.log(`🚀 Starting deletion of ${targets.length} stem files from Cloudinary...`);

  const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
  const batchSize = 80;
  let deletedCount = 0;

  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    const pubIds = batch.map(b => b.publicId);

    const query = pubIds.map(id => `public_ids[]=${encodeURIComponent(id)}`).join('&');
    const deleteUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/video/upload?${query}`;

    try {
      const res = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: `Basic ${auth}` }
      });
      const data = await res.json();
      const numDeleted = Object.values(data.deleted || {}).filter(v => v === 'deleted').length;
      deletedCount += numDeleted;
      console.log(`   Batch [${i + 1}-${Math.min(i + batchSize, targets.length)}/${targets.length}]: Deleted ${numDeleted} Cloudinary files.`);
    } catch (e) {
      console.warn(`   Batch error:`, e.message);
    }
  }

  console.log(`\n✅ Cloudinary deletion finished: ${deletedCount} files removed from Cloudinary.`);

  // 3. Update Supabase to nullify deleted stems
  console.log(`🔄 Updating ${targetSongIds.size} songs in Supabase database...`);
  let dbUpdated = 0;
  for (const songId of targetSongIds) {
    const { error: upErr } = await supabase.from('songs').update({
      stem_vocals: null,
      stem_drums: null,
      stem_bass: null,
      stem_other: null
    }).eq('id', songId);
    if (!upErr) dbUpdated++;
  }
  console.log(`✅ Supabase updated: ${dbUpdated} songs reset to clean state (can be re-generated on-demand in Colab).`);

  const afterUsage = await fetchUsage();
  if (afterUsage) {
    console.log(`\n🎉 Updated Cloudinary Status:`);
    console.log(`   • Credits: ${afterUsage.credits?.usage} / ${afterUsage.credits?.limit} (${afterUsage.credits?.used_percent?.toFixed(1)}%)`);
    console.log(`   • Storage: ${(afterUsage.storage?.usage / (1024 * 1024 * 1024)).toFixed(2)} GB (${afterUsage.storage?.credits_usage?.toFixed(2)} credits)`);
    console.log(`   • Bandwidth: ${(afterUsage.bandwidth?.usage / (1024 * 1024 * 1024)).toFixed(2)} GB (${afterUsage.bandwidth?.credits_usage?.toFixed(2)} credits)`);
  }
}

runCleanup().catch(console.error);
