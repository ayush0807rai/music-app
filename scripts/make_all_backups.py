import os
import zipfile
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

EXCLUDE_DIRS = {
    'node_modules', '.git', 'dist', '.gradle', 'build',
    'cpsimhz1_complete_vault', '__pycache__', '.system_generated'
}

def should_exclude(rel_path):
    parts = rel_path.replace('\\', '/').split('/')
    for p in parts:
        if p in EXCLUDE_DIRS:
            return True
        if p.endswith('.apk') or p.endswith('.aab') or p.endswith('.log'):
            return True
    return False

def create_zip(zip_filename, include_filter, base_dir=ROOT_DIR):
    zip_path = os.path.join(ROOT_DIR, zip_filename)
    if os.path.exists(zip_path):
        try:
            os.remove(zip_path)
        except Exception:
            pass

    start_time = time.time()
    file_count = 0

    with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as zf:
        for root, dirs, files in os.walk(base_dir):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

            for f in files:
                if f.endswith('.zip'):
                    continue
                full_path = os.path.join(root, f)
                rel_path = os.path.relpath(full_path, ROOT_DIR)
                if should_exclude(rel_path):
                    continue
                if not include_filter(rel_path):
                    continue

                # Add to zip with relative path
                arcname = rel_path.replace('\\', '/')
                zf.write(full_path, arcname)
                file_count += 1

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    elapsed = round(time.time() - start_time, 2)
    print(f"✅ {zip_filename}: {file_count} files, {size_mb:.2f} MB in {elapsed}s")
    return zip_path, size_mb, file_count

print("🚀 Starting Fast Python Multi-Archive Backup...")

# 1. Database Backup ZIP
db_path, db_mb, db_count = create_zip(
    'euphony_database_backup.zip',
    lambda rel: rel.startswith('database_backups')
)

# 2. Code Backup ZIP (excludes database_backups)
code_path, code_mb, code_count = create_zip(
    'euphony_code_backup.zip',
    lambda rel: not rel.startswith('database_backups')
)

# 3. Master Website Complete Backup ZIP (includes both code and database_backups)
master_path, master_mb, master_count = create_zip(
    'euphony_website_complete_backup.zip',
    lambda rel: True
)

print("\n🎉 ALL 3 ARCHIVES GENERATED SUCCESSFULLY!")
print(f"📦 1. Database: euphony_database_backup.zip ({db_mb:.2f} MB)")
print(f"💻 2. Codebase: euphony_code_backup.zip ({code_mb:.2f} MB)")
print(f"🗂️ 3. Master Complete: euphony_website_complete_backup.zip ({master_mb:.2f} MB)")
