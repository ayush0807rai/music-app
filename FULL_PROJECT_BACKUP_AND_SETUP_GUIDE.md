# 🌟 Euphony Website - Complete Disaster Recovery & Setup Guide

This document contains everything required to recreate, deploy, and run the **exact same Euphony music streaming website** from scratch if any hosting provider, database (Supabase), or storage (Cloudinary) ever shuts down or needs to be migrated.

---

## 📑 Table of Contents
1. [What is Included in This Backup](#1-what-is-included-in-this-backup)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Quick Start: Recreating the Website from Scratch](#3-quick-start-recreating-the-website-from-scratch)
4. [Database Restoration (2 Simple Ways)](#4-database-restoration-2-simple-ways)
5. [Frontend Deployment (Vercel, Netlify, Cloudflare)](#5-frontend-deployment-vercel-netlify-cloudflare)
6. [Cloudinary Media Assets & Preservation](#6-cloudinary-media-assets--preservation)
7. [AI Stem Splitting Worker Setup (Google Colab)](#7-ai-stem-splitting-worker-setup-google-colab)
8. [Creating New Backups Anytime](#8-creating-new-backups-anytime)

---

## 1. What is Included in This Backup

This repository and backup package contains **100% of the project**:

| Component | Location | Description |
| :--- | :--- | :--- |
| **Frontend Source Code** | [`src/`](file:///src) | Full React 19 application, music player, stem separation visualizer, playlist manager, artist suggestion palette, global audio controls |
| **PWA & Offline Cache** | [`vite.config.js`](file:///vite.config.js), `public/` | Progressive Web App configuration, Workbox offline audio cache, web manifest, icons |
| **All Database Records** | [`database_backups/`](file:///database_backups) | Raw JSON dumps and SQL scripts for: <br>• **118 Songs** (audio, posters, stems, lyrics)<br>• **71 Artists** (names, pictures)<br>• **15 Playlists**<br>• **60 Playlist Tracks**<br>• **15 User Auth Accounts** |
| **1-Click SQL Restorer** | [`database_backups/restore_complete_database.sql`](file:///database_backups/restore_complete_database.sql) | Idempotent PostgreSQL script to rebuild all tables, indexes, RLS, and restore all rows |
| **Auth Accounts Restorer** | [`database_backups/restore_users.sql`](file:///database_backups/restore_users.sql) | Recreates all 15 users in Supabase `auth.users` with original UUIDs and logins |
| **Automated CLI Restorer** | [`database_backups/restore_to_supabase.cjs`](file:///database_backups/restore_to_supabase.cjs) | Node.js script to push all backup data directly into any Supabase project via API |
| **AI Stem Separation Worker** | [`colab/colab_stem_worker.py`](file:///colab/colab_stem_worker.py) | Demucs v4 AI separation worker script ready to run in free Google Colab GPU |
| **Configuration Templates** | [`.env.example`](file:///.env.example) | Pre-filled environment template |
| **Offline ZIP Bundle Script**| [`scripts/create_complete_project_zip.cjs`](file:///scripts/create_complete_project_zip.cjs) | Script to package everything into a single ~5MB offline `.zip` |

---

## 2. Tech Stack & Architecture

- **Frontend**: React 19, Vite 8, Tailwind CSS, Lucide React, Framer Motion
- **Audio Engine**: Web Audio API with multi-track synchronized stem gain nodes (Vocals, Drums, Bass, Other instruments)
- **Database & Auth**: Supabase (PostgreSQL with Row Level Security disabled for public music catalog, and user-isolated playlists)
- **Media CDN**: Cloudinary for ultra-fast song audio streaming and artwork delivery
- **Client Cache**: Workbox Service Worker + HTML5 Audio caching with HTTP Range Request support for instant re-play without network bandwidth
- **AI Stem Worker**: Demucs HTDemucs v4 on Google Colab with Gradio tunnel API

---

## 3. Quick Start: Recreating the Website from Scratch

### Step 1: Clone or Extract the Project
If using Git:
\`\`\`bash
git clone https://github.com/ayush0807rai/music-app.git
cd music-app
\`\`\`
*(Or extract \`euphony_website_complete_backup.zip\` if using the offline archive).*

### Step 2: Install Node Dependencies
\`\`\`bash
npm install
\`\`\`

### Step 3: Setup Environment Variables
Copy the template file to `.env`:
\`\`\`bash
cp .env.example .env
\`\`\`
Verify or update the variables in `.env`:
\`\`\`ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_STEM_API_URL=https://your-stem-worker.gradio.live
\`\`\`

---

## 4. Database Restoration (2 Simple Ways)

If you created a new Supabase project (or if your previous database was deleted):

### Option A: Using the Supabase Dashboard (Recommended - 1 Click)
1. Log into your Supabase Dashboard at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** -> **New query**.
3. Copy and paste the entire contents of [`database_backups/restore_users.sql`](file:///database_backups/restore_users.sql) and click **Run**.  
   *(This restores all 15 user accounts, emails, and passwords).*
4. Open a second query, copy and paste [`database_backups/restore_complete_database.sql`](file:///database_backups/restore_complete_database.sql) and click **Run**.  
   *(This creates the tables and restores all 118 songs, 71 artists, and playlists).*

### Option B: Using the Automated Node.js Script
If you prefer running a command from your terminal:
\`\`\`bash
node database_backups/restore_to_supabase.cjs
\`\`\`
*(It connects to the Supabase URL and Key in your `.env` and automatically pushes all artists, songs, playlists, and track mappings).*

---

## 5. Frontend Deployment (Vercel, Netlify, Cloudflare)

To deploy your new website to production:

### Deploy to Vercel (Recommended)
1. Push your repository to GitHub.
2. Go to [vercel.com](https://vercel.com) -> **Add New Project**.
3. Select your repository.
4. Set Build Settings:
   - **Framework Preset**: Vite
   - **Build Command**: \`npm run build\`
   - **Output Directory**: \`dist\`
5. Add Environment Variables in Vercel:
   - \`VITE_SUPABASE_URL\`
   - \`VITE_SUPABASE_ANON_KEY\`
   - \`VITE_STEM_API_URL\`
6. Click **Deploy**. Your website is live in 60 seconds!

### Deploy to Netlify
1. Go to [netlify.com](https://netlify.com) -> **Import from Git**.
2. Build command: \`npm run build\`, Publish directory: \`dist\`.
3. Add environment variables under Site settings -> Environment variables.
4. Deploy!

---

## 6. Cloudinary Media Assets & Preservation

All music audio tracks, posters, and artist profile pictures are hosted on Cloudinary under the cloud account `cpsimhz1`:
- **Audio URLs**: `https://res.cloudinary.com/cpsimhz1/video/upload/...`
- **Images/Posters**: `https://res.cloudinary.com/cpsimhz1/image/upload/...`

Because Cloudinary URLs are permanent direct HTTPS links, all audio and artwork automatically load out-of-the-box in any cloned project without having to re-upload files.

All media URLs are fully preserved in:
- [`database_backups/songs.json`](file:///database_backups/songs.json)
- [`database_backups/artists.json`](file:///database_backups/artists.json)
- [`database_backups/complete_database_master.json`](file:///database_backups/complete_database_master.json)

---

## 7. AI Stem Splitting Worker Setup (Google Colab)

If you want the real-time AI stem separation (Vocals, Drums, Bass, Other) active:
1. Open Google Colab ([colab.research.google.com](https://colab.research.google.com)).
2. Change runtime type to **T4 GPU** (free tier).
3. Upload and run [`colab/colab_stem_worker.py`](file:///colab/colab_stem_worker.py).
4. Colab will generate a public Gradio URL (e.g. `https://xxxx.gradio.live`).
5. Update `VITE_STEM_API_URL` in your `.env` with that Gradio URL.

---

## 8. Creating New Backups Anytime

Whenever you add new songs, playlists, or artists in the future:

1. **Refresh Database Backup**:
   \`\`\`bash
   node backup_entire_database.cjs
   \`\`\`
   *(Downloads latest records from Supabase and updates all JSON & SQL files in `database_backups/`)*.

2. **Generate Offline Standalone ZIP**:
   \`\`\`bash
   node scripts/create_complete_project_zip.cjs
   \`\`\`
   *(Creates a single ~5MB `euphony_website_complete_backup.zip` containing the entire code and database snapshots ready to save to Google Drive or local storage)*.
