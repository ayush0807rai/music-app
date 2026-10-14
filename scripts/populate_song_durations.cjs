// scripts/populate_song_durations.cjs
// Fast Range-request audio duration calculator for all Euphony songs
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://gbkaflawosewcrmjkmrt.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getMp3DurationAccurate(url) {
  try {
    const res1 = await fetch(url, { headers: { Range: 'bytes=0-9' } });
    const b10 = Buffer.from(await res1.arrayBuffer());
    const cr = res1.headers.get('content-range');
    const totalBytes = cr ? parseInt(cr.split('/')[1]) : 0;

    let audioStart = 0;
    if (b10.slice(0, 3).toString() === 'ID3') {
      const s0 = b10[6], s1 = b10[7], s2 = b10[8], s3 = b10[9];
      const id3Size = 10 + (((s0 & 0x7f) << 21) | ((s1 & 0x7f) << 14) | ((s2 & 0x7f) << 7) | (s3 & 0x7f));
      audioStart = id3Size;
    }

    const res2 = await fetch(url, { headers: { Range: `bytes=${audioStart}-${audioStart + 8191}` } });
    const buf = Buffer.from(await res2.arrayBuffer());

    let offset = 0;
    while (offset < buf.length - 4) {
      if (buf[offset] === 0xFF && (buf[offset + 1] & 0xE0) === 0xE0) {
        const b1 = buf[offset + 1];
        const b2 = buf[offset + 2];
        const mpegVer = (b1 >> 3) & 0x03;
        const layer = (b1 >> 1) & 0x03;
        if (layer === 1) { // Layer III
          const bitrateIdx = (b2 >> 4) & 0x0F;
          const srateIdx = (b2 >> 2) & 0x03;
          
          const bitratesV1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
          const bitratesV2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];
          const sratesV1 = [44100, 48000, 32000, 0];
          const sratesV2 = [22050, 24000, 16000, 0];
          const sampleRate = mpegVer === 3 ? sratesV1[srateIdx] : sratesV2[srateIdx];
          const bitrate = mpegVer === 3 ? bitratesV1[bitrateIdx] : bitratesV2[bitrateIdx];
          const samplesPerFrame = mpegVer === 3 ? 1152 : 576;

          // Check for Xing / Info header
          const xingOffsets = [offset + 36, offset + 21, offset + 13];
          for (const xo of xingOffsets) {
            if (xo + 8 < buf.length) {
              const tag = buf.slice(xo, xo + 4).toString();
              if (tag === 'Xing' || tag === 'Info') {
                const flags = buf.readUInt32BE(xo + 4);
                if (flags & 0x01) {
                  const frames = buf.readUInt32BE(xo + 8);
                  const dur = (frames * samplesPerFrame) / sampleRate;
                  return Math.round(dur);
                }
              }
            }
          }

          // Fallback using CBR bitrate & totalBytes
          if (totalBytes > 0 && bitrate > 0) {
            const audioBytes = totalBytes - audioStart;
            const dur = (audioBytes * 8) / (bitrate * 1000);
            return Math.round(dur);
          }
        }
      }
      offset++;
    }
  } catch (err) {
    // ignore
  }
  return null;
}

async function run() {
  const songsPath = path.join(__dirname, '../database_backups/songs.json');
  const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
  console.log(`Analyzing ${songs.length} songs for durations...`);

  const durationMap = {};
  let resolvedCount = 0;

  // Process in concurrent pools of 8
  const CONCURRENCY = 8;
  for (let i = 0; i < songs.length; i += CONCURRENCY) {
    const chunk = songs.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(async (song) => {
      if (song.duration) {
        durationMap[song.id] = song.duration;
        resolvedCount++;
        return;
      }
      const dur = await getMp3DurationAccurate(song.url);
      if (dur && dur > 0) {
        durationMap[song.id] = dur;
        song.duration = dur;
        resolvedCount++;
      } else {
        console.warn(`Could not resolve duration for: ${song.title}`);
      }
    }));
    process.stdout.write(`\rProgress: ${resolvedCount} / ${songs.length} songs`);
  }
  console.log(`\nSuccessfully resolved ${resolvedCount} / ${songs.length} song durations!`);

  // Write static map to src/songDurations.js for instant client-side lookup
  const exportContent = `// src/songDurations.js\n// Precomputed instant song durations (in seconds) for fast, zero-latency duration sorting\nexport const STATIC_SONG_DURATIONS = ${JSON.stringify(durationMap, null, 2)};\n`;
  fs.writeFileSync(path.join(__dirname, '../src/songDurations.js'), exportContent, 'utf8');
  console.log('Saved static dictionary to src/songDurations.js');

  // Update database_backups/songs.json
  fs.writeFileSync(songsPath, JSON.stringify(songs, null, 2), 'utf8');
  console.log('Updated database_backups/songs.json');

  // Also update Supabase database in batches if possible
  console.log('Updating durations in Supabase database...');
  let dbUpdates = 0;
  for (let i = 0; i < songs.length; i += 10) {
    const batch = songs.slice(i, i + 10);
    await Promise.all(batch.map(async (song) => {
      if (durationMap[song.id]) {
        const { error } = await supabase.from('songs').update({ duration: durationMap[song.id] }).eq('id', song.id);
        if (!error) dbUpdates++;
      }
    }));
  }
  console.log(`Updated ${dbUpdates} songs in Supabase database!`);
}

run().catch(console.error);
