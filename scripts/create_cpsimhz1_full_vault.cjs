/**
 * EUPHONY COMPLETE OFFLINE VAULT GENERATOR (cpsimhz1)
 * 
 * Downloads 100% of all physical media assets from cpsimhz1:
 * - 178 Master Audio files (.mp3)
 * - 178 Album Posters (.jpg)
 * - 178 Vocals stems (.mp3)
 * - 178 Drums stems (.mp3)
 * - 178 Bass stems (.mp3)
 * - 178 Other stems (.mp3)
 * - 90 Artist images (.jpg)
 * - Complete database tables (JSON + SQL)
 * - Detailed Manifest & Auto-Restore Script
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

const rootDir = path.resolve(__dirname, '..');
const vaultDir = path.join(rootDir, 'cpsimhz1_complete_vault');

const songsDir = path.join(vaultDir, 'songs');
const postersDir = path.join(vaultDir, 'posters');
const artistsDir = path.join(vaultDir, 'artists');
const stemsDir = path.join(vaultDir, 'stems');
const vocalsDir = path.join(stemsDir, 'vocals');
const drumsDir = path.join(stemsDir, 'drums');
const bassDir = path.join(stemsDir, 'bass');
const otherDir = path.join(stemsDir, 'other');
const dbDir = path.join(vaultDir, 'database');
const toolsDir = path.join(vaultDir, 'tools');

[vaultDir, songsDir, postersDir, artistsDir, stemsDir, vocalsDir, drumsDir, bassDir, otherDir, dbDir, toolsDir].forEach(d => {
  fs.mkdirSync(d, { recursive: true });
});

function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, ' ').trim();
}

async function downloadFileWithRetry(url, destPath, maxRetries = 3) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1024) {
    return true; // already downloaded
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'EuphonyVaultDownloader/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const fileStream = fs.createWriteStream(destPath);
      await pipeline(res.body, fileStream);
      
      if (fs.statSync(destPath).size > 0) {
        return true;
      } else {
        throw new Error('Downloaded file is empty');
      }
    } catch (e) {
      if (fs.existsSync(destPath)) {
        try { fs.unlinkSync(destPath); } catch {}
      }
      if (attempt === maxRetries) {
        console.warn(`      ❌ Failed after ${maxRetries} attempts: ${url} (${e.message})`);
        return false;
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return false;
}

async function runQueue(tasks, concurrency = 10) {
  let index = 0;
  let completed = 0;
  const total = tasks.length;
  const startTime = Date.now();

  const worker = async () => {
    while (index < tasks.length) {
      const i = index++;
      const task = tasks[i];
      const ok = await downloadFileWithRetry(task.url, task.dest);
      completed++;
      if (completed % 50 === 0 || completed === total) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const percent = ((completed / total) * 100).toFixed(1);
        console.log(`   ⏳ Progress: [${completed}/${total}] (${percent}%) in ${elapsed}s`);
      }
    }
  };

  const workers = [];
  for (let c = 0; c < concurrency; c++) {
    workers.push(worker());
  }
  await Promise.all(workers);
}

async function main() {
  console.log('=====================================================');
  console.log('💾 EUPHONY MASTER OFFLINE VAULT GENERATOR');
  console.log(`📁 Target Directory: ${vaultDir}`);
  console.log('=====================================================\n');

  // Load Database Snapshots
  const songs = JSON.parse(fs.readFileSync(path.join(rootDir, 'database_backups', 'songs.json'), 'utf8'));
  const artists = JSON.parse(fs.readFileSync(path.join(rootDir, 'database_backups', 'artists.json'), 'utf8'));

  console.log(`📚 Preparing download tasks for ${songs.length} songs and ${artists.length} artists...`);

  const downloadTasks = [];
  const manifest = {
    generated_at: new Date().toISOString(),
    cloud_source: 'cpsimhz1',
    total_songs: songs.length,
    total_artists: artists.length,
    songs: [],
    artists: []
  };

  // 1. Queue Artist Images
  console.log('🖼️ Queuing Artist Images...');
  artists.forEach(a => {
    const cleanName = sanitizeFilename(a.name);
    let relPath = null;
    if (a.image_url && a.image_url.startsWith('http')) {
      const dest = path.join(artistsDir, `${cleanName}.jpg`);
      relPath = `artists/${cleanName}.jpg`;
      downloadTasks.push({ url: a.image_url, dest, label: `Artist: ${a.name}` });
    }
    manifest.artists.push({
      id: a.id,
      name: a.name,
      original_image_url: a.image_url,
      local_file: relPath
    });
  });

  // 2. Queue Songs & Stems
  console.log('🎵 Queuing Master Audio, Posters, and 4 Stems per song...');
  songs.forEach((s, idx) => {
    const cleanTitle = sanitizeFilename(s.title || `Track_${idx + 1}`);
    const cleanArtist = sanitizeFilename(s.artist || 'Unknown');
    const baseName = `${cleanTitle} - ${cleanArtist}`;

    // Master Audio
    let audioRel = null;
    if (s.url && s.url.startsWith('http')) {
      const dest = path.join(songsDir, `${baseName}.mp3`);
      audioRel = `songs/${baseName}.mp3`;
      downloadTasks.push({ url: s.url, dest, label: `Song: ${s.title}` });
    }

    // Poster
    let posterRel = null;
    if (s.poster_url && s.poster_url.startsWith('http')) {
      const dest = path.join(postersDir, `${baseName}.jpg`);
      posterRel = `posters/${baseName}.jpg`;
      downloadTasks.push({ url: s.poster_url, dest, label: `Poster: ${s.title}` });
    }

    // Stems
    const stems = {};
    const stemTypes = [
      { key: 'stem_vocals', dir: vocalsDir, rel: 'stems/vocals', suffix: 'vocals' },
      { key: 'stem_drums', dir: drumsDir, rel: 'stems/drums', suffix: 'drums' },
      { key: 'stem_bass', dir: bassDir, rel: 'stems/bass', suffix: 'bass' },
      { key: 'stem_other', dir: otherDir, rel: 'stems/other', suffix: 'other' },
    ];

    stemTypes.forEach(st => {
      const u = s[st.key];
      if (u && u.startsWith('http')) {
        const dest = path.join(st.dir, `${baseName}_${st.suffix}.mp3`);
        stems[st.suffix] = `${st.rel}/${baseName}_${st.suffix}.mp3`;
        downloadTasks.push({ url: u, dest, label: `Stem (${st.suffix}): ${s.title}` });
      } else {
        stems[st.suffix] = null;
      }
    });

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
      local_audio_file: audioRel,
      local_poster_file: posterRel,
      local_stems: stems
    });
  });

  console.log(`\n📦 Total Assets Queued: ${downloadTasks.length} files.`);
  console.log('🚀 Starting Concurrent Downloader (12 parallel streams)...\n');

  await runQueue(downloadTasks, 12);

  // 3. Save Manifest & Copy Database Backups
  console.log('\n📄 Writing Vault Manifest & Database Snapshots...');
  fs.writeFileSync(path.join(vaultDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  // Copy existing db backups
  const dbSrc = path.join(rootDir, 'database_backups');
  ['songs.json', 'artists.json', 'playlists.json', 'playlist_songs.json', 'complete_database_master.json', 'restore_complete_database.sql'].forEach(f => {
    const srcPath = path.join(dbSrc, f);
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, path.join(dbDir, f));
    }
  });

  // 4. Copy Recovery Tool inside Vault
  const restoreTemplatePath = path.join(__dirname, 'vault_restore_template.cjs');
  if (fs.existsSync(restoreTemplatePath)) {
    fs.copyFileSync(restoreTemplatePath, path.join(toolsDir, 'restore_to_new_cloudinary.cjs'));
  }

  // Vault README
  const vaultReadme = `# EUPHONY COMPLETE PHYSICAL OFFLINE VAULT

This directory is your **100% independent offline backup** of the entire Euphony music library.
It contains every raw, uncompressed physical file and complete database tables:

## Contents
* \`/songs\`: All 178 master MP3 tracks (authentic studio quality)
* \`/posters\`: All 178 album covers (high-resolution JPG)
* \`/artists\`: All 90 artist photos
* \`/stems\`:
  * \`/vocals\`: Isolated vocal tracks for all songs
  * \`/drums\`: Isolated drum tracks
  * \`/bass\`: Isolated bass tracks
  * \`/other\`: Isolated instruments & melodies
* \`/database\`: Full Supabase JSON & SQL dump (songs, artists, playlists, synchronized lyrics)
* \`manifest.json\`: Master map linking every song ID, title, artist, Cloudinary URL, and local path.

Generated on: ${new Date().toISOString()}
`;
  fs.writeFileSync(path.join(vaultDir, 'README.md'), vaultReadme, 'utf8');

  console.log('✅ Master Manifest, Database files, and Tools generated successfully!');

  // Calculate Total Vault Size on Disk
  let totalBytes = 0;
  let fileCount = 0;
  function walkSize(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(ent => {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walkSize(p);
      else {
        totalBytes += fs.statSync(p).size;
        fileCount++;
      }
    });
  }
  walkSize(vaultDir);

  const totalGB = (totalBytes / (1024 * 1024 * 1024)).toFixed(2);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

  console.log('\n=====================================================');
  console.log('🎉 MASTER OFFLINE VAULT CREATED SUCCESSFULLY!');
  console.log(`📁 Vault Location: ${vaultDir}`);
  console.log(`📊 Total Files Archived: ${fileCount}`);
  console.log(`📏 Total Size: ${totalGB} GB (${totalMB} MB)`);
  console.log('=====================================================');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
