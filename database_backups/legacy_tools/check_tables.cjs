const SUPABASE_URL = 'https://rlojwqncfcbcszgdyjyz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsb2p3cW5jZmNiY3N6Z2R5anl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzczODksImV4cCI6MjEwNTQ1MzM4OX0.tF04P2BoUycmDmCdnE9Z4vXk7Uunhcxm8MRnaBmKMjY';

const tables = ['artists', 'playlist', 'playlist_songs', 'playlist_tracks', 'playlists', 'songs', 'user_playlists'];

async function checkTables() {
  for (const t of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${t}?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      console.log(t, '->', Array.isArray(data) ? `${data.length} rows` : JSON.stringify(data));
    } catch (e) {
      console.log(t, '-> error:', e.message);
    }
  }
}

checkTables();
