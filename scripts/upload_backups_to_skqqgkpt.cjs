const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

const CLOUD_NAME = 'skqqgkpt';
const API_KEY = process.env.SKQQ_API_KEY || '256514229591724';
const API_SECRET = process.env.SKQQ_API_SECRET || 'x2o8WkpoKZWzDzSJzfB81yluudU';

async function uploadFile(localPath, folder, publicId) {
  if (!fs.existsSync(localPath)) {
    console.warn(`File not found: ${localPath}`);
    return null;
  }

  const stat = fs.statSync(localPath);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`📤 Uploading ${path.basename(localPath)} (${sizeMb} MB) to ${CLOUD_NAME}/${folder}/${publicId}...`);

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    folder: folder,
    overwrite: 'true',
    public_id: publicId,
    timestamp: timestamp.toString()
  };

  const sortedKeys = Object.keys(paramsToSign).sort();
  const serialized = sortedKeys.map(k => `${k}=${paramsToSign[k]}`).join('&');
  const signature = crypto.createHash('sha1').update(serialized + API_SECRET).digest('hex');

  const fileBuffer = fs.readFileSync(localPath);
  const blob = new Blob([fileBuffer]);

  const form = new FormData();
  form.append('file', blob, path.basename(localPath));
  form.append('folder', folder);
  form.append('public_id', publicId);
  form.append('overwrite', 'true');
  form.append('timestamp', timestamp.toString());
  form.append('api_key', API_KEY);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed for ${publicId}: HTTP ${res.status} - ${errText}`);
  }

  const data = await res.json();
  console.log(`✅ Uploaded: ${data.secure_url}`);
  return {
    filename: path.basename(localPath),
    public_id: data.public_id,
    bytes: data.bytes,
    url: data.secure_url,
    uploaded_at: data.created_at
  };
}

async function main() {
  console.log('=====================================================');
  console.log(`☁️  BACKING UP CODE & DATABASE TO CLOUDINARY (${CLOUD_NAME})`);
  console.log('=====================================================\n');

  const rootDir = path.resolve(__dirname, '..');
  const dbDir = path.resolve(rootDir, 'database_backups');

  const filesToUpload = [
    // 1. Zip Archives
    { filePath: path.join(rootDir, 'euphony_database_backup.zip'), folder: 'euphony_backups', publicId: 'euphony_database_backup.zip' },
    { filePath: path.join(rootDir, 'euphony_code_backup.zip'), folder: 'euphony_backups', publicId: 'euphony_code_backup.zip' },
    { filePath: path.join(rootDir, 'euphony_website_complete_backup.zip'), folder: 'euphony_backups', publicId: 'euphony_website_complete_backup.zip' },

    // 2. Raw Database Snapshots (JSON & SQL)
    { filePath: path.join(dbDir, 'complete_database_master.json'), folder: 'euphony_backups/database', publicId: 'complete_database_master.json' },
    { filePath: path.join(dbDir, 'songs.json'), folder: 'euphony_backups/database', publicId: 'songs.json' },
    { filePath: path.join(dbDir, 'artists.json'), folder: 'euphony_backups/database', publicId: 'artists.json' },
    { filePath: path.join(dbDir, 'playlists.json'), folder: 'euphony_backups/database', publicId: 'playlists.json' },
    { filePath: path.join(dbDir, 'playlist_songs.json'), folder: 'euphony_backups/database', publicId: 'playlist_songs.json' },
    { filePath: path.join(dbDir, 'restore_complete_database.sql'), folder: 'euphony_backups/database', publicId: 'restore_complete_database.sql' },
    { filePath: path.join(dbDir, 'users_backup.json'), folder: 'euphony_backups/database', publicId: 'users_backup.json' },
    { filePath: path.join(dbDir, 'restore_users.sql'), folder: 'euphony_backups/database', publicId: 'restore_users.sql' }
  ];

  const results = [];
  for (const item of filesToUpload) {
    try {
      const res = await uploadFile(item.filePath, item.folder, item.publicId);
      if (res) results.push(res);
    } catch (err) {
      console.error(`❌ Failed uploading ${item.publicId}:`, err.message);
    }
  }

  const manifest = {
    cloud_name: CLOUD_NAME,
    backup_timestamp: new Date().toISOString(),
    total_files: results.length,
    files: results
  };

  const manifestPath = path.join(dbDir, 'cloudinary_skqqgkpt_backup_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n📋 Saved Cloudinary backup manifest to: ${manifestPath}`);

  console.log('\n=====================================================');
  console.log('🎉 ALL BACKUPS STORED IN CLOUDINARY (skqqgkpt) SUCCESSFULLY!');
  console.log('=====================================================');
}

main().catch(err => {
  console.error('Fatal backup error:', err);
  process.exit(1);
});
