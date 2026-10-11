const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient('https://gbkaflawosewcrmjkmrt.supabase.co', 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN');

const importData = JSON.parse(fs.readFileSync('recent_import_data.json', 'utf8'));

async function run() {
  console.log(`Starting restore of ${importData.artists.length} artists and ${importData.recent_songs.length} recent songs...`);

  // 1. Restore Artists
  if (importData.artists && importData.artists.length > 0) {
    console.log(`Upserting ${importData.artists.length} artists...`);
    const { error: artistErr } = await supabase.from('artists').upsert(importData.artists, { onConflict: 'name' });
    if (artistErr) {
      console.error('Artist upsert error:', artistErr);
    } else {
      console.log('✅ Artists upserted successfully!');
    }
  }

  // 2. Restore Songs (with lyrics and stems)
  if (importData.recent_songs && importData.recent_songs.length > 0) {
    console.log(`Upserting ${importData.recent_songs.length} songs...`);
    const { error: songErr } = await supabase.from('songs').upsert(importData.recent_songs, { onConflict: 'id' });
    if (songErr) {
      console.error('Song upsert error:', songErr);
    } else {
      console.log('✅ Songs upserted successfully!');
    }
  }

  // 3. Re-link the skipped playlist tracks
  const skippedTracks = [
    {
      playlist_id: '79006896-12a9-4356-8226-555a5c2f6041',
      song_id: 'a53e97ce-02e6-454c-b13a-0a26e2956e92',
      added_at: '2026-10-09T20:07:09.272067+00:00'
    },
    {
      playlist_id: '13d4f26f-0307-4c7f-b8f3-4c735505a30d',
      song_id: 'e6657092-d62b-4754-a347-548d0f3bde39',
      added_at: '2026-10-09T22:09:30.790365+00:00'
    },
    {
      playlist_id: '13d4f26f-0307-4c7f-b8f3-4c735505a30d',
      song_id: 'f54b3464-b992-466d-9b96-8ca95c1ad5ce',
      added_at: '2026-10-09T22:09:35.881275+00:00'
    }
  ];

  console.log('Re-linking 3 playlist songs for recently added tracks...');
  const { error: psErr } = await supabase.from('playlist_songs').upsert(skippedTracks, { onConflict: 'playlist_id,song_id' });
  if (psErr) {
    console.error('Playlist songs link error:', psErr);
  } else {
    console.log('✅ Playlist songs re-linked successfully!');
  }

  // 4. Final verification counts
  const [songsRes, artistsRes, playlistsRes, psRes] = await Promise.all([
    supabase.from('songs').select('*', { count: 'exact', head: true }),
    supabase.from('artists').select('*', { count: 'exact', head: true }),
    supabase.from('playlists').select('*', { count: 'exact', head: true }),
    supabase.from('playlist_songs').select('*', { count: 'exact', head: true })
  ]);

  console.log('\n--- FINAL DATABASE COUNTS ---');
  console.log('Total Songs:', songsRes.count);
  console.log('Total Artists:', artistsRes.count);
  console.log('Total Playlists:', playlistsRes.count);
  console.log('Total Playlist Songs:', psRes.count);
}

run().catch(console.error);
