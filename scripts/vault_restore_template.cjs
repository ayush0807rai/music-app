/**
 * EUPHONY ONE-CLICK EMERGENCY CLOUDINARY RE-UPLOADER
 * 
 * If Cloudinary ever blocks your account again, run this script to upload
 * ALL 178 songs, posters, artist images, and stems to ANY new Cloudinary project
 * and update your Supabase database in a few minutes!
 * 
 * Usage:
 *   node tools/restore_to_new_cloudinary.cjs <NEW_CLOUD_NAME> <UPLOAD_PRESET>
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const args = process.argv.slice(2);
const cloudName = args[0];
const uploadPreset = args[1];

if (!cloudName || !uploadPreset) {
  console.log("❌ Usage: node tools/restore_to_new_cloudinary.cjs <NEW_CLOUD_NAME> <UPLOAD_PRESET>");
  console.log("Example: node tools/restore_to_new_cloudinary.cjs mynewcloud app_songs");
  process.exit(1);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://gbkaflawosewcrmjkmrt.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';
const supabase = createClient(supabaseUrl, supabaseKey);

const vaultDir = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(vaultDir, 'manifest.json'), 'utf8'));

const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

async function uploadLocalFile(relPath) {
  if (!relPath) return null;
  const fullPath = path.join(vaultDir, relPath);
  if (!fs.existsSync(fullPath)) return null;

  const fileData = fs.readFileSync(fullPath);
  const blob = new Blob([fileData]);
  const form = new FormData();
  form.append('upload_preset', uploadPreset);
  form.append('file', blob, path.basename(fullPath));

  const res = await fetch(uploadUrl, { method: 'POST', body: form });
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  const data = await res.json();
  return data.secure_url;
}

async function restore() {
  console.log(`🚀 Restoring ${manifest.total_songs} songs and ${manifest.total_artists} artists to '${cloudName}'...`);
  
  // 1. Restore Artists
  for (const a of manifest.artists) {
    if (a.local_file) {
      console.log(`   🎨 Uploading artist: ${a.name}...`);
      const newImg = await uploadLocalFile(a.local_file);
      await supabase.from('artists').update({ image_url: newImg }).eq('name', a.name);
    }
  }

  // 2. Restore Songs & Stems
  for (let i = 0; i < manifest.songs.length; i++) {
    const s = manifest.songs[i];
    console.log(`[${i + 1}/${manifest.songs.length}] 🎵 ${s.title} - ${s.artist}...`);
    const newAudio = await uploadLocalFile(s.local_audio_file);
    const newPoster = await uploadLocalFile(s.local_poster_file);
    const newVocals = await uploadLocalFile(s.local_stems.vocals);
    const newDrums = await uploadLocalFile(s.local_stems.drums);
    const newBass = await uploadLocalFile(s.local_stems.bass);
    const newOther = await uploadLocalFile(s.local_stems.other);

    await supabase.from('songs').update({
      url: newAudio || s.original_url,
      poster_url: newPoster || s.original_poster_url,
      stem_vocals: newVocals || s.original_stem_vocals,
      stem_drums: newDrums || s.original_stem_drums,
      stem_bass: newBass || s.original_stem_bass,
      stem_other: newOther || s.original_stem_other,
    }).eq('id', s.id);
  }
  console.log('🎉 Full vault restoration to new Cloudinary completed!');
}

restore().catch(console.error);
