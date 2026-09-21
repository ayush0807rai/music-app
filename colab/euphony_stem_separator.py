# Paste this into Google Colab, run the cell, then copy the *.gradio.live URL
# into VITE_STEM_API_URL in the app .env file.

# !pip install -q demucs gradio torchaudio

import os
import tempfile

import gradio as gr
import torch
import torchaudio
from demucs.apply import apply_model
from demucs.pretrained import get_model

device = "cuda" if torch.cuda.is_available() else "cpu"
model = get_model("htdemucs")
model.to(device)
model.eval()


def separate_audio(audio_path):
    if not audio_path:
        raise gr.Error("Upload an audio file first.")

    wav, sr = torchaudio.load(audio_path)
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)

    with torch.no_grad():
        sources = apply_model(model, wav[None].to(device), device=device)[0]

    # HT-Demucs order: drums, bass, other, vocals
    names = ["drums", "bass", "other", "vocals"]
    saved = {}
    for i, name in enumerate(names):
        path = os.path.join(tempfile.gettempdir(), f"euphony_{name}.wav")
        torchaudio.save(path, sources[i].cpu(), sr)
        saved[name] = path

    return saved["vocals"], saved["drums"], saved["bass"], saved["other"]


demo = gr.Interface(
    fn=separate_audio,
    inputs=gr.Audio(type="filepath", label="audio_path"),
    outputs=[
        gr.Audio(type="filepath", label="Vocals"),
        gr.Audio(type="filepath", label="Drums"),
        gr.Audio(type="filepath", label="Bass"),
        gr.Audio(type="filepath", label="Other"),
    ],
    title="Euphony Stem Separator",
    api_name="separate_audio",
)

demo.queue().launch(share=True)
