import os
import zipfile
import time
import sys

# Ensure UTF-8 output on Windows
sys.stdout.reconfigure(encoding='utf-8')

vault_dir = 'cpsimhz1_complete_vault'
zip_path = 'cpsimhz1_complete_vault.zip'

print('Creating ZIP archive with Python Zip64...')
start = time.time()

count = 0
with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_STORED, allowZip64=True) as zipf:
    for root, dirs, files in os.walk(vault_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, start=os.path.dirname(vault_dir))
            zipf.write(full_path, arcname=rel_path)
            count += 1
            if count % 200 == 0:
                print(f'Archived {count} files...')

elapsed = round(time.time() - start, 1)
size_gb = round(os.path.getsize(zip_path) / (1024**3), 2)
print(f'Finished archiving {count} files in {elapsed}s!')
print(f'Archive created: {zip_path} ({size_gb} GB)')
