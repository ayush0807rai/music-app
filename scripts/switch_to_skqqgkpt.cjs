/**
 * 1-CLICK INSTANT SWITCH TO SKQQGKPT
 * 
 * If cpsimhz1 ever gets blocked or suspended again, running this script:
 * 1. Reads skqqgkpt_mirror_manifest.json
 * 2. Updates all URLs in Supabase (songs, posters, stems, artists) to skqqgkpt in 5 seconds
 * 3. Switches App.jsx default cloud name to skqqgkpt
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment
function loadEnv() {
  const envPath = path.resolve(__dirname, '../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(l => {
      const match = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
      }
    });
  }
}
loadEnv();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gbkaflawosewcrmjkmrt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const MIRROR_MANIFEST = path.resolve(__dirname, '../cpsimhz1_complete_vault/skqqgkpt_mirror_manifest.json');

async function run() {
  console.log('=====================================================');
  console.log('🔄 SWITCHING DATABASE & WEBSITE TO SKQQGKPT');
  console.log('=====================================================\n');

  if (!fs.existsSync(MIRROR_MANIFEST)) {
    console.error(`❌ Mirror manifest not found at: ${MIRROR_MANIFEST}`);
    console.error(`Please run 'node scripts/wipe_and_mirror_to_skqqgkpt.cjs' first.`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MIRROR_MANIFEST, 'utf8'));

  // Update artists
  console.log(`Updating ${manifest.artists.length} artists in Supabase...`);
  for (const a of manifest.artists) {
    if (a.skqqgkpt_url) {
      await supabase.from('artists').update({ image_url: a.skqqgkpt_url }).eq('id', a.id);
    }
  }

  // Update songs
  console.log(`Updating ${manifest.songs.length} songs in Supabase...`);
  for (const s of manifest.songs) {
    const updatePayload = {};
    if (s.skqqgkpt_url) updatePayload.url = s.skqqgkpt_url;
    if (s.skqqgkpt_poster_url) updatePayload.poster_url = s.skqqgkpt_poster_url;
    if (s.skqqgkpt_stems) {
      if (s.skqqgkpt_stems.vocals) updatePayload.stem_vocals = s.skqqgkpt_stems.vocals;
      if (s.skqqgkpt_stems.drums) updatePayload.stem_drums = s.skqqgkpt_stems.drums;
      if (s.skqqgkpt_stems.bass) updatePayload.stem_bass = s.skqqgkpt_stems.bass;
      if (s.skqqgkpt_stems.other) updatePayload.stem_other = s.skqqgkpt_stems.other;
    }
    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('songs').update(updatePayload).eq('id', s.id);
    }
  }

  console.log('\n✅ Supabase database switched to skqqgkpt successfully!');
}

run().catch(console.error);
