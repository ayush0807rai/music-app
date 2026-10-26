/**
 * 1-CLICK INSTANT SWITCH BACK TO CPSIMHZ1
 * 
 * Restores all Supabase database URLs to cpsimhz1
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

const VAULT_MANIFEST = path.resolve(__dirname, '../cpsimhz1_complete_vault/manifest.json');

async function run() {
  console.log('=====================================================');
  console.log('🔄 SWITCHING DATABASE BACK TO CPSIMHZ1');
  console.log('=====================================================\n');

  if (!fs.existsSync(VAULT_MANIFEST)) {
    console.error(`❌ Vault manifest not found at: ${VAULT_MANIFEST}`);
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(VAULT_MANIFEST, 'utf8'));

  // Update artists
  console.log(`Updating ${manifest.artists.length} artists in Supabase...`);
  for (const a of manifest.artists) {
    if (a.original_url) {
      await supabase.from('artists').update({ image_url: a.original_url }).eq('id', a.id);
    }
  }

  // Update songs
  console.log(`Updating ${manifest.songs.length} songs in Supabase...`);
  for (const s of manifest.songs) {
    const updatePayload = {};
    if (s.original_url) updatePayload.url = s.original_url;
    if (s.original_poster_url) updatePayload.poster_url = s.original_poster_url;
    if (s.original_stems) {
      if (s.original_stems.vocals) updatePayload.stem_vocals = s.original_stems.vocals;
      if (s.original_stems.drums) updatePayload.stem_drums = s.original_stems.drums;
      if (s.original_stems.bass) updatePayload.stem_bass = s.original_stems.bass;
      if (s.original_stems.other) updatePayload.stem_other = s.original_stems.other;
    }
    if (Object.keys(updatePayload).length > 0) {
      await supabase.from('songs').update(updatePayload).eq('id', s.id);
    }
  }

  console.log('\n✅ Supabase database switched to cpsimhz1 successfully!');
}

run().catch(console.error);
