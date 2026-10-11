const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gbkaflawosewcrmjkmrt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/cpsimhz1/auto/upload';
const CLOUDINARY_PRESET = 'app_songs';

async function uploadToCloudinary(imageUrl, artistName) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching artist image from Deezer`);
  const blob = await res.blob();

  const form = new FormData();
  form.append('upload_preset', CLOUDINARY_PRESET);
  const cleanName = artistName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  form.append('file', blob, `artist_${cleanName}.jpg`);

  const cloudRes = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: form
  });

  if (!cloudRes.ok) {
    const err = await cloudRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Cloudinary upload failed: ${cloudRes.status}`);
  }

  const data = await cloudRes.json();
  return data.secure_url;
}

async function run() {
  console.log('Fetching all artists from Supabase...');
  const { data: artists, error } = await supabase.from('artists').select('*').order('name');
  if (error) {
    console.error('Supabase error:', error);
    return;
  }

  console.log(`Found ${artists.length} artists. Starting Cloudinary upload and update...`);

  let successCount = 0;
  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];
    try {
      // 1. Fetch image URL from Deezer
      const deezerRes = await fetch(`https://api.deezer.com/search/artist?q=${encodeURIComponent(artist.name)}`);
      const deezerData = await deezerRes.json();
      const picUrl = deezerData?.data?.[0]?.picture_big || deezerData?.data?.[0]?.picture_medium;

      if (!picUrl) {
        console.warn(`[${i+1}/${artists.length}] ⚠️ No image found on Deezer for ${artist.name}`);
        continue;
      }

      // 2. Upload to Cloudinary
      const cloudinaryUrl = await uploadToCloudinary(picUrl, artist.name);

      // 3. Update Supabase
      const { error: updateErr } = await supabase
        .from('artists')
        .update({ image_url: cloudinaryUrl })
        .eq('id', artist.id);

      if (updateErr) {
        console.error(`[${i+1}/${artists.length}] ❌ Supabase update failed for ${artist.name}:`, updateErr.message);
      } else {
        successCount++;
        console.log(`[${i+1}/${artists.length}] ✅ ${artist.name} -> ${cloudinaryUrl}`);
      }
    } catch (err) {
      console.error(`[${i+1}/${artists.length}] ❌ Error processing ${artist.name}:`, err.message);
    }
  }

  console.log(`\n🎉 COMPLETED: Successfully updated ${successCount}/${artists.length} artists to Cloudinary!`);
}

run().catch(console.error);
