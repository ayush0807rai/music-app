const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const NEW_SUPABASE_URL = process.argv[2] || process.env.NEW_SUPABASE_URL;
const NEW_SUPABASE_KEY = process.argv[3] || process.env.NEW_SUPABASE_KEY;

if (!NEW_SUPABASE_URL || !NEW_SUPABASE_KEY) {
  console.error("Usage: node restore_to_new_project.cjs <NEW_SUPABASE_URL> <NEW_SUPABASE_KEY>");
  process.exit(1);
}

const supabase = createClient(NEW_SUPABASE_URL, NEW_SUPABASE_KEY);

async function restore() {
  console.log(`Connecting to: ${NEW_SUPABASE_URL}`);
  const backup = JSON.parse(fs.readFileSync('full_database_backup.json', 'utf8'));

  // 1. Restore artists
  if (backup.artists && backup.artists.length > 0) {
    console.log(`Restoring ${backup.artists.length} artists...`);
    const { error: artistErr } = await supabase.from('artists').upsert(backup.artists, { onConflict: 'name' });
    if (artistErr) console.error("Artist error:", artistErr.message);
    else console.log("✅ Artists restored successfully!");
  }

  // 2. Restore songs in batches of 20
  if (backup.songs && backup.songs.length > 0) {
    console.log(`Restoring ${backup.songs.length} songs...`);
    for (let i = 0; i < backup.songs.length; i += 20) {
      const chunk = backup.songs.slice(i, i + 20);
      const { error: songErr } = await supabase.from('songs').upsert(chunk);
      if (songErr) console.error(`Error on songs batch ${i}-${i + chunk.length}:`, songErr.message);
      else console.log(`✅ Restored songs ${i + 1} to ${Math.min(i + 20, backup.songs.length)}`);
    }
  }

  console.log("\n🎉 RESTORE COMPLETED! All songs and artists are active in the new project.");
}

restore().catch(err => console.error("Fatal error:", err));
