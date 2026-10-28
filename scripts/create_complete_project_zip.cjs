/**
 * EUPHONY COMPLETE PROJECT ZIP ARCHIVE GENERATOR
 * Generates a clean, standalone ZIP package of the entire website and database.
 * Excludes node_modules, dist, .git, and existing zips to keep the archive ultra-compact (~5MB).
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const OUTPUT_ZIP = path.join(rootDir, 'euphony_website_complete_backup.zip');

console.log('📦 Gathering all website files and database backups...');

if (fs.existsSync(OUTPUT_ZIP)) {
  fs.unlinkSync(OUTPUT_ZIP);
}

// Find all top-level items excluding node_modules, dist, .git, and .zip
const excludeItems = new Set(['node_modules', 'dist', '.git', 'cpsimhz1_complete_vault', 'euphony_website_complete_backup.zip']);
const itemsToInclude = fs.readdirSync(rootDir).filter(item => !excludeItems.has(item) && !item.endsWith('.zip'));

console.log(`📁 Archiving ${itemsToInclude.length} files & folders...`);
try {
  // Clean up any untracked android build artifacts or copied web assets before archiving to prevent archive bloat
  const cleanPaths = [
    path.join(rootDir, 'android', 'app', 'build'),
    path.join(rootDir, 'android', 'build'),
    path.join(rootDir, 'android', '.gradle'),
    path.join(rootDir, 'android', 'app', 'src', 'main', 'assets', 'public')
  ];
  cleanPaths.forEach(p => {
    if (fs.existsSync(p)) {
      try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) {}
    }
  });

  const formattedItems = itemsToInclude.map(item => `'${item}'`).join(', ');
  const psCmd = `powershell -NoProfile -Command "$ProgressPreference = 'SilentlyContinue'; Compress-Archive -Path ${formattedItems} -DestinationPath 'euphony_website_complete_backup.zip' -Force"`;
  execSync(psCmd, { stdio: 'inherit', cwd: rootDir });

  if (fs.existsSync(OUTPUT_ZIP)) {
    const stats = fs.statSync(OUTPUT_ZIP);
    console.log(`\n🎉 Project archive created successfully!`);
    console.log(`📁 File: euphony_website_complete_backup.zip`);
    console.log(`📏 Total Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`✨ Contains all source code, database tables, auth records, configs, and guides.`);
  }
} catch (err) {
  console.error('❌ Error creating archive:', err.message);
  process.exit(1);
}
