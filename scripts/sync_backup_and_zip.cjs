/**
 * EUPHONY AUTOMATIC BACKUP & ZIP SYNCHRONIZER
 * 
 * Runs full database backup and refreshes whole project zip archive,
 * then stages both into git so every commit captures the latest state.
 */

const { execSync } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('\n=====================================================');
console.log('🔄 SYNCHRONIZING DATABASE BACKUP & PROJECT ZIP');
console.log('=====================================================');

try {
  // 1. Refresh Database Backup
  console.log('\n1️⃣  Running database backup from Supabase...');
  execSync('node backup_entire_database.cjs', { stdio: 'inherit', cwd: rootDir });

  // 2. Rebuild Complete Project Zip
  console.log('\n2️⃣  Rebuilding euphony_website_complete_backup.zip...');
  execSync('node scripts/create_complete_project_zip.cjs', { stdio: 'inherit', cwd: rootDir });

  // 3. Stage backup and zip into git
  console.log('\n3️⃣  Staging database_backups and zip to git...');
  execSync('git add database_backups euphony_website_complete_backup.zip', { stdio: 'inherit', cwd: rootDir });

  console.log('\n✅ Backup & Zip synchronization complete and staged!\n');
} catch (err) {
  console.error('❌ Sync failed:', err.message);
  process.exit(1);
}
