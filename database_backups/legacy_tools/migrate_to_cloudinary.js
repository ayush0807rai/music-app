import fs from 'fs';

const SUPABASE_URL = 'https://rlojwqncfcbcszgdyjyz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsb2p3cW5jZmNiY3N6Z2R5anl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzczODksImV4cCI6MjEwNTQ1MzM4OX0.tF04P2BoUycmDmCdnE9Z4vXk7Uunhcxm8MRnaBmKMjY';

const CLOUDINARY_CLOUD_NAME = 'cpsimhz1';
const CLOUDINARY_PRESET = 'app_songs';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

// Helper: upload a remote file URL directly to Cloudinary
async function uploadToCloudinary(remoteUrl, fileName, retries = 3) {
  if (!remoteUrl || remoteUrl.includes('res.cloudinary.com')) {
    return remoteUrl; // Already on Cloudinary or empty
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Direct stream / fetch from source
      const res = await fetch(remoteUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status} fetching remote file: ${remoteUrl}`);
      const blob = await res.blob();

      const form = new FormData();
      form.append('upload_preset', CLOUDINARY_PRESET);
      form.append('file', blob, fileName || 'media');

      const cloudRes = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: form
      });

      if (!cloudRes.ok) {
        const errJson = await cloudRes.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `Cloudinary upload failed: ${cloudRes.status}`);
      }

      const cloudData = await cloudRes.json();
      return cloudData.secure_url;
    } catch (err) {
      console.warn(`    ⚠️ Attempt ${attempt}/${retries} failed for ${fileName}: ${err.message}`);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
}

async function runMigration() {
  console.log('=====================================================');
  console.log('🚀 STARTING FULL CLOUDINARY MIGRATION (108 SONGS)');
  console.log('=====================================================');

  // 1. Fetch all songs
  const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*&order=created_at.asc`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });

  if (!res.ok) throw new Error(`Failed to fetch songs from Supabase: ${res.status}`);
  const songs = await res.json();
  console.log(`📋 Found ${songs.length} total songs in Supabase database.\n`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const prefix = `[${i + 1}/${songs.length}]`;

    const needsAudio = song.url && !song.url.includes('res.cloudinary.com');
    const needsPoster = song.poster_url && !song.poster_url.includes('res.cloudinary.com');
    const needsVocals = song.stem_vocals && !song.stem_vocals.includes('res.cloudinary.com');
    const needsDrums = song.stem_drums && !song.stem_drums.includes('res.cloudinary.com');
    const needsBass = song.stem_bass && !song.stem_bass.includes('res.cloudinary.com');
    const needsOther = song.stem_other && !song.stem_other.includes('res.cloudinary.com');

    if (!needsAudio && !needsPoster && !needsVocals && !needsDrums && !needsBass && !needsOther) {
      console.log(`${prefix} ⏭️ Already on Cloudinary: "${song.title}"`);
      skippedCount++;
      continue;
    }

    console.log(`${prefix} ⏳ Migrating "${song.title}" by ${song.artist}...`);
    const updates = {};

    try {
      if (needsAudio) {
        process.stdout.write(`   🎵 Uploading audio... `);
        updates.url = await uploadToCloudinary(song.url, `${song.id}_audio.mp3`);
        console.log(`✅`);
      }

      if (needsPoster) {
        process.stdout.write(`   🖼️ Uploading poster... `);
        updates.poster_url = await uploadToCloudinary(song.poster_url, `${song.id}_poster.png`);
        console.log(`✅`);
      }

      if (needsVocals) {
        process.stdout.write(`   🎤 Uploading vocals stem... `);
        updates.stem_vocals = await uploadToCloudinary(song.stem_vocals, `${song.id}_vocals.mp3`);
        console.log(`✅`);
      }

      if (needsDrums) {
        process.stdout.write(`   🥁 Uploading drums stem... `);
        updates.stem_drums = await uploadToCloudinary(song.stem_drums, `${song.id}_drums.mp3`);
        console.log(`✅`);
      }

      if (needsBass) {
        process.stdout.write(`   🎸 Uploading bass stem... `);
        updates.stem_bass = await uploadToCloudinary(song.stem_bass, `${song.id}_bass.mp3`);
        console.log(`✅`);
      }

      if (needsOther) {
        process.stdout.write(`   🎹 Uploading other stem... `);
        updates.stem_other = await uploadToCloudinary(song.stem_other, `${song.id}_other.mp3`);
        console.log(`✅`);
      }

      // Update Supabase row with new Cloudinary URLs
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/songs?id=eq.${song.id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!patchRes.ok) {
        throw new Error(`Failed to update database for song ${song.id}: HTTP ${patchRes.status}`);
      }

      console.log(`   ✨ Saved to database!`);
      migratedCount++;
    } catch (err) {
      console.error(`   ❌ Error migrating "${song.title}":`, err.message);
    }
  }

  // 3. Export full tabular backup files (JSON and CSV)
  console.log('\n=====================================================');
  console.log('📦 CREATING COMPLETE DATABASE BACKUP FOR CLOUDINARY');
  console.log('=====================================================');

  const finalRes = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*&order=created_at.asc`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`
    }
  });
  const allFinalSongs = await finalRes.json();

  // Save local JSON backup
  const jsonContent = JSON.stringify(allFinalSongs, null, 2);
  fs.writeFileSync('songs_database_backup.json', jsonContent);

  // Save local CSV backup
  const headers = ['id', 'title', 'artist', 'album', 'url', 'poster_url', 'created_at', 'lyrics'];
  const csvRows = [headers.join(',')];
  for (const s of allFinalSongs) {
    const row = headers.map(h => {
      let val = s[h] || '';
      if (typeof val === 'string') {
        val = `"${val.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
      }
      return val;
    });
    csvRows.push(row.join(','));
  }
  const csvContent = csvRows.join('\n');
  fs.writeFileSync('songs_database_backup.csv', csvContent);

  console.log('📄 Saved songs_database_backup.json and songs_database_backup.csv locally.');

  // Upload backups directly to Cloudinary
  console.log('☁️ Uploading database backups directly to Cloudinary...');
  const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
  const jsonForm = new FormData();
  jsonForm.append('upload_preset', CLOUDINARY_PRESET);
  jsonForm.append('file', jsonBlob, 'songs_database_backup.json');
  const jsonUploadRes = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: jsonForm });
  const jsonUploadData = await jsonUploadRes.json();

  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
  const csvForm = new FormData();
  csvForm.append('upload_preset', CLOUDINARY_PRESET);
  csvForm.append('file', csvBlob, 'songs_database_backup.csv');
  const csvUploadRes = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: csvForm });
  const csvUploadData = await csvUploadRes.json();

  console.log('\n=====================================================');
  console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log(`Songs migrated: ${migratedCount}`);
  console.log(`Songs already migrated: ${skippedCount}`);
  console.log(`JSON Backup URL: ${jsonUploadData.secure_url}`);
  console.log(`CSV Backup URL:  ${csvUploadData.secure_url}`);
  console.log('=====================================================');
}

runMigration().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
