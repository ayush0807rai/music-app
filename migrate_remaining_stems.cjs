const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://rlojwqncfcbcszgdyjyz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsb2p3cW5jZmNiY3N6Z2R5anl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzczODksImV4cCI6MjEwNTQ1MzM4OX0.tF04P2BoUycmDmCdnE9Z4vXk7Uunhcxm8MRnaBmKMjY';

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/cpsimhz1/auto/upload';
const CLOUDINARY_PRESET = 'app_songs';

const STEM_FILES = [
  { trackId: '0ebbdcd5-7c1a-4d5c-96a2-71e6e5338cb0', stem: 'vocals', filename: '0ebbdcd5-7c1a-4d5c-96a2-71e6e5338cb0_vocals.mp3' },
  { trackId: '0ebbdcd5-7c1a-4d5c-96a2-71e6e5338cb0', stem: 'drums', filename: '0ebbdcd5-7c1a-4d5c-96a2-71e6e5338cb0_drums.mp3' },
  { trackId: '0ebbdcd5-7c1a-4d5c-96a2-71e6e5338cb0', stem: 'bass', filename: '0ebbdcd5-7c1a-4d5c-96a2-71e6e5338cb0_bass.mp3' },
  { trackId: '0ebbdcd5-7c1a-4d5c-96a2-71e6e5338cb0', stem: 'other', filename: '0ebbdcd5-7c1a-4d5c-96a2-71e6e5338cb0_other.mp3' },
  { trackId: 'e6657092-d62b-4754-a347-548d0f3bde39', stem: 'vocals', filename: 'e6657092-d62b-4754-a347-548d0f3bde39_vocals.mp3' },
  { trackId: 'e6657092-d62b-4754-a347-548d0f3bde39', stem: 'drums', filename: 'e6657092-d62b-4754-a347-548d0f3bde39_drums.mp3' },
  { trackId: 'e6657092-d62b-4754-a347-548d0f3bde39', stem: 'bass', filename: 'e6657092-d62b-4754-a347-548d0f3bde39_bass.mp3' },
  { trackId: 'e6657092-d62b-4754-a347-548d0f3bde39', stem: 'other', filename: 'e6657092-d62b-4754-a347-548d0f3bde39_other.mp3' }
];

async function uploadToCloudinary(buffer, filename) {
  const blob = new Blob([buffer], { type: 'audio/mpeg' });
  const formData = new FormData();
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('file', blob, filename);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary upload failed for ${filename}: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  return data.secure_url;
}

async function migrateStems() {
  console.log('🚀 Starting migration of 8 stem files to Cloudinary...');

  const trackUpdates = {
    '0ebbdcd5-7c1a-4d5c-96a2-71e6e5338cb0': {},
    'e6657092-d62b-4754-a347-548d0f3bde39': {}
  };

  for (const item of STEM_FILES) {
    const supabaseUrl = `${SUPABASE_URL}/storage/v1/object/public/stems/${item.filename}`;
    console.log(`\n📥 Downloading ${item.filename} from Supabase...`);
    
    const dlRes = await fetch(supabaseUrl);
    if (!dlRes.ok) {
      throw new Error(`Failed to download ${item.filename}: ${dlRes.status} ${dlRes.statusText}`);
    }
    const arrayBuffer = await dlRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`   Downloaded ${buffer.length} bytes.`);

    console.log(`📤 Uploading to Cloudinary...`);
    const cloudinaryUrl = await uploadToCloudinary(buffer, item.filename);
    console.log(`   ✅ Cloudinary URL: ${cloudinaryUrl}`);

    trackUpdates[item.trackId][`stem_${item.stem}`] = cloudinaryUrl;
  }

  console.log('\n📝 Updating Supabase songs table...');
  for (const [trackId, updates] of Object.entries(trackUpdates)) {
    console.log(`Updating track ${trackId}:`, updates);
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/songs?id=eq.${trackId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updates)
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      console.error(`Failed to update track ${trackId}:`, err);
    } else {
      const updated = await updateRes.json();
      console.log(`✅ Successfully updated track ${trackId} (${updated[0]?.title})!`);
    }
  }

  console.log('\n🗑️ Attempting to delete the 8 files from Supabase Storage stems bucket...');
  const filenamesToDelete = STEM_FILES.map(f => f.filename);
  const delRes = await fetch(`${SUPABASE_URL}/storage/v1/object/stems`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ prefixes: filenamesToDelete })
  });

  console.log('Delete response status:', delRes.status);
  const delJson = await delRes.json();
  console.log('Delete response body:', delJson);

  // Check stems bucket again
  const listRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/stems`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ limit: 100, prefix: '' })
  });
  const remainingFiles = await listRes.json();
  console.log('\n📊 Remaining files in stems bucket:', remainingFiles);
}

migrateStems().catch(console.error);
