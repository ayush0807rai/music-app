import { Client, handle_file } from "@gradio/client";
import { supabase } from "./supabase";

const STEM_APIS = [
  import.meta.env.VITE_STEM_API_URL,
  "https://93fa08770f1727258d.gradio.live",
].filter((value, index, arr) => value && arr.indexOf(value) === index);

function resolveFileUrl(item, baseUrl) {
  if (!item) return null;
  if (Array.isArray(item)) return resolveFileUrl(item[0], baseUrl);
  if (typeof item === "string") {
    if (item.startsWith("http")) return item;
    const origin = String(baseUrl || "").replace(/\/$/, "");
    return item.startsWith("/") ? `${origin}${item}` : `${origin}/${item}`;
  }
  const raw = item.url || item.path;
  return resolveFileUrl(raw, baseUrl);
}

async function connectStemApi(onStatus) {
  let lastError;
  for (const src of STEM_APIS) {
    try {
      onStatus?.("Connecting to Colab GPU / AI backend...");
      const app = await Client.connect(src);
      return { app, src };
    } catch (err) {
      lastError = err;
    }
  }
  const error = new Error("COLAB_DOWN");
  error.cause = lastError;
  throw error;
}

async function predictStems(app, audioBlob) {
  const file = handle_file(audioBlob);
  try {
    return await app.predict("/separate_audio", { audio_path: file });
  } catch {
    return await app.predict("/predict", [file]);
  }
}

async function uploadStemBlob(trackId, type, remoteUrl) {
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error(`Failed to download the ${type} stem from the AI backend.`);
  const blob = await res.blob();
  if (!blob || blob.size < 1024) throw new Error(`The ${type} stem was empty. Re-run the Colab cell and try again.`);

  const ext = (blob.type || "").includes("wav") || remoteUrl.includes(".wav") ? "wav" : "mp3";
  const fileName = `stems/${trackId}_${type}_${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("songs").upload(fileName, blob, {
    cacheControl: "3600",
    contentType: blob.type || (ext === "wav" ? "audio/wav" : "audio/mpeg"),
    upsert: true,
  });
  if (error) throw new Error(`Supabase upload failed for ${type}: ${error.message}`);
  return supabase.storage.from("songs").getPublicUrl(fileName).data.publicUrl;
}

export async function generateAndStoreStems(currentTrack, onStatus) {
  if (!currentTrack?.id || !currentTrack?.url) throw new Error("No track selected.");

  const { app, src } = await connectStemApi(onStatus);

  onStatus?.("Preparing the track for stem split...");
  const audioRes = await fetch(currentTrack.url);
  if (!audioRes.ok) throw new Error("Could not download this song from Supabase.");
  const audioBlob = await audioRes.blob();

  onStatus?.("Colab is splitting vocals, drums, bass, and other...");
  const result = await predictStems(app, audioBlob);
  const files = Array.isArray(result?.data) ? result.data : [];
  const vocals = resolveFileUrl(files[0], src);
  const drums = resolveFileUrl(files[1], src);
  const bass = resolveFileUrl(files[2], src);
  const other = resolveFileUrl(files[3], src);

  if (!vocals || !drums || !bass || !other) {
    throw new Error("AI backend did not return all 4 stems. Keep the Colab notebook cell running and try again.");
  }

  onStatus?.("Saving stems to Supabase...");
  const urls = {
    stem_vocals: await uploadStemBlob(currentTrack.id, "vocals", vocals),
    stem_drums: await uploadStemBlob(currentTrack.id, "drums", drums),
    stem_bass: await uploadStemBlob(currentTrack.id, "bass", bass),
    stem_other: await uploadStemBlob(currentTrack.id, "other", other),
  };

  const { data, error } = await supabase
    .from("songs")
    .update(urls)
    .eq("id", currentTrack.id)
    .select();

  if (error) throw error;
  if (!data?.[0]) throw new Error("Supabase did not save the stem URLs on this song.");
  return data[0];
}
