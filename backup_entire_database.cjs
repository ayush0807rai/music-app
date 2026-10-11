// backup_entire_database.cjs
// Complete Database Export & Restore Generator for Euphony Music App

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gbkaflawosewcrmjkmrt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const BACKUP_DIR = path.join(__dirname, 'database_backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'number') return val.toString();
  return "'" + val.toString().replace(/'/g, "''") + "'";
}

async function backupDatabase() {
  console.log('=====================================================');
  console.log('💾 EUPHONY COMPLETE DATABASE BACKUP GENERATOR');
  console.log('=====================================================\n');

  // 1. Fetch all tables
  console.log('📥 Fetching tables from Supabase...');
  const [songsRes, artistsRes, playlistsRes, playlistSongsRes] = await Promise.all([
    supabase.from('songs').select('*').order('created_at', { ascending: true }),
    supabase.from('artists').select('*').order('created_at', { ascending: true }),
    supabase.from('playlists').select('*').order('created_at', { ascending: true }),
    supabase.from('playlist_songs').select('*').order('added_at', { ascending: true })
  ]);

  if (songsRes.error) throw new Error('Error fetching songs: ' + songsRes.error.message);
  if (artistsRes.error) throw new Error('Error fetching artists: ' + artistsRes.error.message);
  if (playlistsRes.error) throw new Error('Error fetching playlists: ' + playlistsRes.error.message);
  if (playlistSongsRes.error) throw new Error('Error fetching playlist_songs: ' + playlistSongsRes.error.message);

  const songs = songsRes.data || [];
  const artists = artistsRes.data || [];
  const playlists = playlistsRes.data || [];
  const playlistSongs = playlistSongsRes.data || [];

  console.log(`✅ Fetched:`);
  console.log(`   • Songs: ${songs.length} rows`);
  console.log(`   • Artists: ${artists.length} rows`);
  console.log(`   • Playlists: ${playlists.length} rows`);
  console.log(`   • Playlist Songs: ${playlistSongs.length} rows\n`);

  // 2. Save individual JSON files
  fs.writeFileSync(path.join(BACKUP_DIR, 'songs.json'), JSON.stringify(songs, null, 2), 'utf8');
  fs.writeFileSync(path.join(BACKUP_DIR, 'artists.json'), JSON.stringify(artists, null, 2), 'utf8');
  fs.writeFileSync(path.join(BACKUP_DIR, 'playlists.json'), JSON.stringify(playlists, null, 2), 'utf8');
  fs.writeFileSync(path.join(BACKUP_DIR, 'playlist_songs.json'), JSON.stringify(playlistSongs, null, 2), 'utf8');

  // 3. Save master consolidated snapshot
  const masterSnapshot = {
    exported_at: new Date().toISOString(),
    source_project: SUPABASE_URL,
    total_counts: {
      songs: songs.length,
      artists: artists.length,
      playlists: playlists.length,
      playlist_songs: playlistSongs.length
    },
    tables: {
      songs,
      artists,
      playlists,
      playlist_songs: playlistSongs
    }
  };
  fs.writeFileSync(path.join(BACKUP_DIR, 'complete_database_master.json'), JSON.stringify(masterSnapshot, null, 2), 'utf8');
  console.log(`📁 Saved master JSON snapshot to: database_backups/complete_database_master.json`);

  // 4. Generate ready-to-execute SQL file
  let sql = `-- ====================================================\n`;
  sql += `-- EUPHONY COMPLETE DATABASE RESTORE SCRIPT\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Total: ${songs.length} songs, ${artists.length} artists, ${playlists.length} playlists, ${playlistSongs.length} playlist_songs\n`;
  sql += `-- ====================================================\n\n`;

  // Schema creation
  sql += `-- 1. Schema Definitions\n`;
  sql += `CREATE TABLE IF NOT EXISTS public.songs (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  title TEXT NOT NULL,\n`;
  sql += `  artist TEXT NOT NULL,\n`;
  sql += `  album TEXT,\n`;
  sql += `  lyrics TEXT,\n`;
  sql += `  url TEXT NOT NULL,\n`;
  sql += `  poster_url TEXT,\n`;
  sql += `  duration NUMERIC,\n`;
  sql += `  stem_vocals TEXT,\n`;
  sql += `  stem_drums TEXT,\n`;
  sql += `  stem_bass TEXT,\n`;
  sql += `  stem_other TEXT,\n`;
  sql += `  needs_stems BOOLEAN DEFAULT FALSE,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS public.artists (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  name TEXT NOT NULL UNIQUE,\n`;
  sql += `  image_url TEXT,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS public.playlists (\n`;
  sql += `  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
  sql += `  name TEXT NOT NULL,\n`;
  sql += `  user_id UUID,\n`;
  sql += `  created_at TIMESTAMPTZ DEFAULT NOW()\n`;
  sql += `);\n\n`;

  sql += `CREATE TABLE IF NOT EXISTS public.playlist_songs (\n`;
  sql += `  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,\n`;
  sql += `  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,\n`;
  sql += `  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,\n`;
  sql += `  added_at TIMESTAMPTZ DEFAULT NOW(),\n`;
  sql += `  UNIQUE(playlist_id, song_id)\n`;
  sql += `);\n\n`;

  sql += `ALTER TABLE public.songs DISABLE ROW LEVEL SECURITY;\n`;
  sql += `ALTER TABLE public.artists DISABLE ROW LEVEL SECURITY;\n`;
  sql += `ALTER TABLE public.playlists DISABLE ROW LEVEL SECURITY;\n`;
  sql += `ALTER TABLE public.playlist_songs DISABLE ROW LEVEL SECURITY;\n\n`;

  // Artists data
  sql += `-- 2. Restore Artists (${artists.length} rows)\n`;
  for (const a of artists) {
    sql += `INSERT INTO public.artists (id, name, image_url, created_at) VALUES (${escapeSql(a.id)}, ${escapeSql(a.name)}, ${escapeSql(a.image_url)}, ${escapeSql(a.created_at)}) ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url;\n`;
  }
  sql += `\n`;

  // Songs data
  sql += `-- 3. Restore Songs (${songs.length} rows)\n`;
  for (const s of songs) {
    sql += `INSERT INTO public.songs (id, title, artist, album, lyrics, url, poster_url, duration, stem_vocals, stem_drums, stem_bass, stem_other, needs_stems, created_at) VALUES (\n`;
    sql += `  ${escapeSql(s.id)},\n`;
    sql += `  ${escapeSql(s.title)},\n`;
    sql += `  ${escapeSql(s.artist)},\n`;
    sql += `  ${escapeSql(s.album)},\n`;
    sql += `  ${escapeSql(s.lyrics)},\n`;
    sql += `  ${escapeSql(s.url)},\n`;
    sql += `  ${escapeSql(s.poster_url)},\n`;
    sql += `  ${escapeSql(s.duration)},\n`;
    sql += `  ${escapeSql(s.stem_vocals)},\n`;
    sql += `  ${escapeSql(s.stem_drums)},\n`;
    sql += `  ${escapeSql(s.stem_bass)},\n`;
    sql += `  ${escapeSql(s.stem_other)},\n`;
    sql += `  ${escapeSql(s.needs_stems)},\n`;
    sql += `  ${escapeSql(s.created_at)}\n`;
    sql += `) ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += `\n`;

  // Playlists data
  sql += `-- 4. Restore Playlists (${playlists.length} rows)\n`;
  for (const p of playlists) {
    sql += `INSERT INTO public.playlists (id, name, user_id, created_at) VALUES (${escapeSql(p.id)}, ${escapeSql(p.name)}, ${escapeSql(p.user_id)}, ${escapeSql(p.created_at)}) ON CONFLICT (id) DO NOTHING;\n`;
  }
  sql += `\n`;

  // Playlist Songs data
  sql += `-- 5. Restore Playlist Songs (${playlistSongs.length} rows)\n`;
  for (const ps of playlistSongs) {
    sql += `INSERT INTO public.playlist_songs (id, playlist_id, song_id, added_at) VALUES (${escapeSql(ps.id)}, ${escapeSql(ps.playlist_id)}, ${escapeSql(ps.song_id)}, ${escapeSql(ps.added_at)}) ON CONFLICT (playlist_id, song_id) DO NOTHING;\n`;
  }
  sql += `\n`;

  fs.writeFileSync(path.join(BACKUP_DIR, 'restore_complete_database.sql'), sql, 'utf8');
  console.log(`📄 Saved SQL restore script to: database_backups/restore_complete_database.sql`);

  // Copy users backup files if present
  if (fs.existsSync('users_backup.json')) {
    fs.copyFileSync('users_backup.json', path.join(BACKUP_DIR, 'users_backup.json'));
    console.log(`👥 Copied users backup snapshot to: database_backups/users_backup.json`);
  }
  if (fs.existsSync('restore_users.sql')) {
    fs.copyFileSync('restore_users.sql', path.join(BACKUP_DIR, 'restore_users.sql'));
    console.log(`📄 Copied users SQL restore script to: database_backups/restore_users.sql`);
  }

  // Create README documentation for restoring the database
  const readmeContent = `# Euphony Complete Database Backup & Disaster Recovery Guide

Generated: ${new Date().toISOString()}

This folder contains a complete, portable, and permanent backup of your entire application database.
If Supabase, Cloudinary, or any service ever faces downtime, migration, or account termination, you can restore everything seamlessly.

---

## 📦 What Is Stored Here

| File | Description | Records |
| :--- | :--- | :--- |
| \`complete_database_master.json\` | Single master JSON containing songs, artists, playlists, and playlist mappings | All tables |
| \`songs.json\` | All music tracks, metadata, audio URLs, posters, duration, stems | ${songs.length} rows |
| \`artists.json\` | All artists and profile images | ${artists.length} rows |
| \`playlists.json\` | All playlists created by users | ${playlists.length} rows |
| \`playlist_songs.json\` | All song-to-playlist relationships | ${playlistSongs.length} rows |
| \`users_backup.json\` | All 15 authenticated users (emails, password hashes, Google auth identities) | 15 accounts |
| \`restore_complete_database.sql\` | Standalone PostgreSQL SQL script to recreate tables and restore all data | Ready-to-run |
| \`restore_users.sql\` | SQL script to restore all user auth accounts into Supabase \`auth.users\` | Ready-to-run |

---

## 🚀 How to Restore to Supabase (New or Existing Project)

### Step 1: Restore Auth Users (Optional if keeping accounts)
1. Open your Supabase Dashboard -> **SQL Editor** -> **New query**.
2. Paste the contents of \`restore_users.sql\`.
3. Click **Run**. All users will be recreated with their exact UUIDs and login methods.

### Step 2: Restore Songs, Artists & Playlists
1. In Supabase Dashboard -> **SQL Editor** -> **New query**.
2. Paste the contents of \`restore_complete_database.sql\`.
3. Click **Run**.
   - It creates tables if they don't exist.
   - It inserts all ${artists.length} artists.
   - It inserts all ${songs.length} songs.
   - It inserts all ${playlists.length} playlists.
   - It inserts all ${playlistSongs.length} playlist relationships.
   - It handles conflicts automatically (\`ON CONFLICT DO NOTHING\` / \`DO UPDATE\`).

---

## 🌐 How to Restore to Any Other Database (Postgres, SQLite, MongoDB, Firebase)
- **Postgres (Neon, Render, Railway, Self-hosted)**: Run \`restore_complete_database.sql\` directly.
- **Node.js / Custom migration**: Use \`complete_database_master.json\` or individual \`.json\` files to import directly into any database engine.

---

## 🔄 Taking a New Backup Snapshot Anytime
Run:
\`\`\`bash
node backup_entire_database.cjs
\`\`\`
All files in this folder will be refreshed with latest database records.
`;

  fs.writeFileSync(path.join(BACKUP_DIR, 'README.md'), readmeContent, 'utf8');
  console.log(`📖 Saved backup manual to: database_backups/README.md`);

  console.log('\n=====================================================');
  console.log('🎉 COMPLETE DATABASE BACKUP FINISHED SUCCESSFULLY!');
  console.log('All files are safely saved in: database_backups/');
  console.log('=====================================================');
}

backupDatabase().catch(err => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
