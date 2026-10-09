# ==============================================================================
# EUPHONY AI STEM WORKER (GOOGLE COLAB -> CLOUDINARY)
# ==============================================================================
# Run this cell in Google Colab (with GPU runtime enabled: Runtime > Change runtime type > T4 GPU).
# This worker polls your Supabase database for songs marked `needs_stems: true`,
# isolates 4 stems (Vocals, Drums, Bass, Other) using Demucs AI, uploads them
# directly to CLOUDINARY (0 MB used on Supabase Storage!), and updates the DB.
# ==============================================================================

# Step 1: Install dependencies (run once in Colab)
# !pip install -q demucs torch torchaudio requests supabase

import os
import sys
import time
import tempfile
import requests
import torch
import torchaudio
from demucs.apply import apply_model
from demucs.pretrained import get_model
from supabase import create_client, Client

# --- Configuration ---
SUPABASE_URL = "https://rlojwqncfcbcszgdyjyz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsb2p3cW5jZmNiY3N6Z2R5anl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzczODksImV4cCI6MjEwNTQ1MzM4OX0.tF04P2BoUycmDmCdnE9Z4vXk7Uunhcxm8MRnaBmKMjY"

CLOUDINARY_CLOUD_NAME = "cpsimhz1"
CLOUDINARY_PRESET = "app_songs"
CLOUDINARY_UPLOAD_URL = f"https://api.cloudinary.com/v1_1/{CLOUDINARY_CLOUD_NAME}/auto/upload"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Load Demucs Model on GPU
print("⏳ Loading Demucs AI Model...")
device = "cuda" if torch.cuda.is_available() else "cpu"
model = get_model("htdemucs")
model.to(device)
model.eval()
print(f"✅ Demucs model ready on {device.upper()}!")

def upload_stem_to_cloudinary(file_path: str, filename: str) -> str:
    """Uploads an audio file directly to Cloudinary using unsigned preset."""
    with open(file_path, "rb") as f:
        res = requests.post(
            CLOUDINARY_UPLOAD_URL,
            data={"upload_preset": CLOUDINARY_PRESET},
            files={"file": (filename, f, "audio/mpeg")}
        )
    if res.status_code != 200:
        raise Exception(f"Cloudinary upload failed: {res.text}")
    return res.json()["secure_url"]

def process_song(song):
    song_id = song["id"]
    title = song.get("title", "Unknown")
    audio_url = song.get("url")

    print(f"\n🎵 [Processing] '{title}' (ID: {song_id})")
    
    # 1. Download original audio track
    temp_dir = tempfile.mkdtemp()
    input_path = os.path.join(temp_dir, f"{song_id}_input.mp3")
    print("   ⬇️ Downloading audio from Cloudinary/CDN...")
    dl = requests.get(audio_url, stream=True)
    if dl.status_code != 200:
        print(f"   ❌ Failed to download song audio: {dl.status_code}")
        supabase.table("songs").update({"needs_stems": False}).eq("id", song_id).execute()
        return

    with open(input_path, "wb") as f:
        for chunk in dl.iter_content(chunk_size=1024 * 1024):
            f.write(chunk)

    # 2. Run Demucs AI separation
    print("   🧠 Isolating stems with Demucs (Vocals, Drums, Bass, Other)...")
    try:
        wav, sr = torchaudio.load(input_path)
        if wav.shape[0] == 1:
            wav = wav.repeat(2, 1)

        with torch.no_grad():
            sources = apply_model(model, wav[None].to(device), device=device)[0]

        # HT-Demucs stem order: drums (0), bass (1), other (2), vocals (3)
        stem_indices = {
            "drums": 0,
            "bass": 1,
            "other": 2,
            "vocals": 3
        }

        # 3. Export stems and upload directly to Cloudinary
        uploaded_urls = {}
        for stem_name, idx in stem_indices.items():
            stem_filename = f"{song_id}_{stem_name}_{int(time.time())}.mp3"
            stem_path = os.path.join(temp_dir, stem_filename)
            
            # Save audio
            torchaudio.save(stem_path, sources[idx].cpu(), sr)
            
            # Upload to Cloudinary
            print(f"   ☁️ Uploading {stem_name} stem to Cloudinary...")
            url = upload_stem_to_cloudinary(stem_path, stem_filename)
            uploaded_urls[f"stem_{stem_name}"] = url
            print(f"      ✅ {stem_name}: {url}")

        # 4. Update Supabase database record
        print("   💾 Updating Supabase song record with Cloudinary stem URLs...")
        supabase.table("songs").update({
            "stem_vocals": uploaded_urls["stem_vocals"],
            "stem_drums": uploaded_urls["stem_drums"],
            "stem_bass": uploaded_urls["stem_bass"],
            "stem_other": uploaded_urls["stem_other"],
            "needs_stems": False
        }).eq("id", song_id).execute()

        print(f"   🎉 Successfully processed and published stems for '{title}'!")

    except Exception as e:
        print(f"   ❌ Error processing stems: {e}")
        supabase.table("songs").update({"needs_stems": False}).eq("id", song_id).execute()

    finally:
        # Clean up local temp files
        try:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        except Exception:
            pass

def run_worker():
    print("\n🎧 Euphony Colab Worker is running and polling for songs...")
    print("👉 When a user clicks 'Generate Stems' in the app, this worker will automatically process it.")
    print("👉 Press Stop in Colab to halt.")
    
    while True:
        try:
            # Query for any song with needs_stems == true
            res = supabase.table("songs").select("id, title, url, needs_stems").eq("needs_stems", True).limit(1).execute()
            songs = res.data if res else []
            
            if songs and len(songs) > 0:
                process_song(songs[0])
            else:
                time.sleep(4)
        except KeyboardInterrupt:
            print("\n🛑 Worker stopped by user.")
            break
        except Exception as e:
            print(f"⚠️ Polling loop error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    run_worker()
