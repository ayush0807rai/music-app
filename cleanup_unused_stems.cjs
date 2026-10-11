// cleanup_unused_stems.cjs
// Utility to audit, export, and clean up unused / redundant stem files from Cloudinary and Supabase

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gbkaflawosewcrmjkmrt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'cpsimhz1';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '';

async function auditStems() {
  console.log('=====================================================');
  console.log('🔍 EUPHONY AUDIO & STEM AUDIT & CLEANUP TOOL');
  console.log('=====================================================\n');

  // 1. Fetch songs
  const { data: songs, error: sErr } = await supabase.from('songs').select('id, title, artist, url, stem_vocals, stem_drums, stem_bass, stem_other');
  if (sErr) throw sErr;

  // 2. Fetch playlists
  const { data: playlists, error: pErr } = await supabase.from('playlist_songs').select('song_id');
  if (pErr) throw pErr;

  const playlistSongIds = new Set((playlists || []).map(p => p.song_id));

  const songsWithStems = [];
  const songsWithoutStems = [];
  const stemsNotInPlaylist = [];
  const allStemPublicIds = [];

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
            }
          }
        }
      });
    } else {
      songsWithoutStems.push(song);
    }
  }

  console.log(`📊 Total Songs in Database: ${songs.length}`);
  console.log(`🎵 Songs with AI Stems: ${songsWithStems.length}`);
  console.log(`🎧 Songs in Playlists / Liked: ${playlistSongIds.size}`);
  console.log(`📦 Total Stored Stem Audio Files: ${allStemPublicIds.length} files (~${((allStemPublicIds.length * 7.5) / 1024).toFixed(2)} GB storage)`);
  console.log(`🗑️ Stems on songs NOT in any playlist: ${stemsNotInPlaylist.length} files (~${((stemsNotInPlaylist.length * 7.5) / 1024).toFixed(2)} GB storage)\n`);

  // Check if API credentials provided for automatic deletion
  if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.log('ℹ️ Automatic Cloudinary deletion requires API Credentials.');
    console.log('To run automated deletion from Cloudinary, run:');
    console.log('  $env:CLOUDINARY_API_KEY="your_api_key"');
    console.log('  $env:CLOUDINARY_API_SECRET="your_api_secret"');
    console.log('  node cleanup_unused_stems.cjs --delete-unlisted\n');
    console.log('💡 Or in Cloudinary Console:');
    console.log('   Go to console.cloudinary.com -> Assets -> Video');
    console.log('   Filter/Search audio stems to delete and reclaim storage credits.\n');
    return;
  }

  const crypto = require('crypto');
  const action = process.argv.includes('--delete-all') ? 'all' : (process.argv.includes('--delete-unlisted') ? 'unlisted' : null);

  if (!action) {
    console.log('⚠️ No action flag provided.');
    console.log('Pass --delete-unlisted to delete stems for songs not in playlists, or --delete-all to delete all 464 stems.');
    return;
  }

  const targets = action === 'all' ? allStemPublicIds : stemsNotInPlaylist;
  console.log(`🚀 Starting deletion of ${targets.length} stem files from Cloudinary...`);

  // Cloudinary delete helper using signed API
  for (let i = 0; i < targets.length; i++) {
    const item = targets[i];
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `public_id=${item.publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = crypto.createHash('sha1').update(toSign).digest('hex');

    const form = new URLSearchParams();
    form.append('public_id', item.publicId);
    form.append('timestamp', timestamp.toString());
    form.append('api_key', CLOUDINARY_API_KEY);
    form.append('signature', signature);
    form.append('resource_type', 'video');

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/video/destroy`, {
        method: 'POST',
        body: form
      });
      const data = await res.json();
      console.log(`[${i + 1}/${targets.length}] Deleted stem "${item.field}" for "${item.songTitle}":`, data.result || data);
    } catch (e) {
      console.warn(`[${i + 1}/${targets.length}] Failed to delete ${item.publicId}:`, e.message);
    }
  }

  console.log('\n✅ Cloudinary stem cleanup complete!');
}

auditStems().catch(console.error);
