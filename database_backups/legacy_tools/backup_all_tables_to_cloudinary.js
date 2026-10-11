import fs from 'fs';

const SUPABASE_URL = 'https://rlojwqncfcbcszgdyjyz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsb2p3cW5jZmNiY3N6Z2R5anl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzczODksImV4cCI6MjEwNTQ1MzM4OX0.tF04P2BoUycmDmCdnE9Z4vXk7Uunhcxm8MRnaBmKMjY';

const CLOUDINARY_CLOUD_NAME = 'cpsimhz1';
const CLOUDINARY_PRESET = 'app_songs';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

const tables = [
  'songs',
  'artists',
  'playlists',
  'playlist_songs',
  'playlist_tracks',
  'user_playlists',
  'playlist'
];

async function createFullCloudinaryBackup() {
  console.log('Fetching full database tables...');
  const fullDatabase = {};

  for (const table of tables) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const data = await res.json();
      fullDatabase[table] = Array.isArray(data) ? data : [];
      console.log(`Fetched ${table}: ${fullDatabase[table].length} records`);
    } catch (e) {
      console.error(`Error fetching ${table}:`, e.message);
      fullDatabase[table] = [];
    }
  }

  // 1. Write comprehensive JSON backup containing all tables
  const jsonContent = JSON.stringify(fullDatabase, null, 2);
  fs.writeFileSync('full_database_backup.json', jsonContent);

  // 2. Write individual CSVs for each table that has data
  for (const table of tables) {
    const rows = fullDatabase[table];
    if (rows.length === 0) continue;

    // Collect all unique column keys
    const keys = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
    const csvLines = [keys.join(',')];

    for (const r of rows) {
      const line = keys.map(k => {
        let val = r[k] === null || r[k] === undefined ? '' : r[k];
        if (typeof val === 'object') val = JSON.stringify(val);
        val = String(val);
        // Escape quotes
        val = `"${val.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
        return val;
      });
      csvLines.push(line.join(','));
    }

    const csvFile = `${table}_table_backup.csv`;
    fs.writeFileSync(csvFile, csvLines.join('\n'));
    console.log(`Created ${csvFile} with ${rows.length} rows.`);

    // Upload table CSV to Cloudinary
    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
    const form = new FormData();
    form.append('upload_preset', CLOUDINARY_PRESET);
    form.append('file', blob, csvFile);
    const uploadRes = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: form });
    const uploadData = await uploadRes.json();
    console.log(`Uploaded ${csvFile} to Cloudinary: ${uploadData.secure_url}`);
  }

  // Upload full_database_backup.json to Cloudinary
  const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
  const jsonForm = new FormData();
  jsonForm.append('upload_preset', CLOUDINARY_PRESET);
  jsonForm.append('file', jsonBlob, 'full_database_backup.json');
  const fullJsonRes = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: jsonForm });
  const fullJsonData = await fullJsonRes.json();
  console.log(`Uploaded full_database_backup.json to Cloudinary: ${fullJsonData.secure_url}`);

  console.log('\n✅ Full database backup to Cloudinary complete!');
}

createFullCloudinaryBackup().catch(console.error);
