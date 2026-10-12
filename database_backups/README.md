# Euphony Complete Database Backup & Disaster Recovery Guide

Generated: 2026-10-12T14:30:04.675Z

This folder contains a complete, portable, and permanent backup of your entire application database.
If Supabase, Cloudinary, or any service ever faces downtime, migration, or account termination, you can restore everything seamlessly.

---

## 📦 What Is Stored Here

| File | Description | Records |
| :--- | :--- | :--- |
| `complete_database_master.json` | Single master JSON containing songs, artists, playlists, and playlist mappings | All tables |
| `songs.json` | All music tracks, metadata, audio URLs, posters, duration, stems | 132 rows |
| `artists.json` | All artists and profile images | 88 rows |
| `playlists.json` | All playlists created by users | 18 rows |
| `playlist_songs.json` | All song-to-playlist relationships | 63 rows |
| `users_backup.json` | All 15 authenticated users (emails, password hashes, Google auth identities) | 15 accounts |
| `restore_complete_database.sql` | Standalone PostgreSQL SQL script to recreate tables and restore all data | Ready-to-run |
| `restore_users.sql` | SQL script to restore all user auth accounts into Supabase `auth.users` | Ready-to-run |

---

## 🚀 How to Restore to Supabase (New or Existing Project)

### Step 1: Restore Auth Users (Optional if keeping accounts)
1. Open your Supabase Dashboard -> **SQL Editor** -> **New query**.
2. Paste the contents of `restore_users.sql`.
3. Click **Run**. All users will be recreated with their exact UUIDs and login methods.

### Step 2: Restore Songs, Artists & Playlists
1. In Supabase Dashboard -> **SQL Editor** -> **New query**.
2. Paste the contents of `restore_complete_database.sql`.
3. Click **Run**.
   - It creates tables if they don't exist.
   - It inserts all 88 artists.
   - It inserts all 132 songs.
   - It inserts all 18 playlists.
   - It inserts all 63 playlist relationships.
   - It handles conflicts automatically (`ON CONFLICT DO NOTHING` / `DO UPDATE`).

---

## 🌐 How to Restore to Any Other Database (Postgres, SQLite, MongoDB, Firebase)
- **Postgres (Neon, Render, Railway, Self-hosted)**: Run `restore_complete_database.sql` directly.
- **Node.js / Custom migration**: Use `complete_database_master.json` or individual `.json` files to import directly into any database engine.

---

## 🔄 Taking a New Backup Snapshot Anytime
Run:
```bash
node backup_entire_database.cjs
```
All files in this folder will be refreshed with latest database records.
