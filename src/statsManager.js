// src/statsManager.js
// Client-side listening history, play counters, and personal stats for Euphony

const RECENTLY_PLAYED_KEY = "euphony_recently_played_ids";
const PLAY_COUNTS_KEY = "euphony_song_play_counts";
const LISTEN_SECONDS_KEY = "euphony_song_listen_seconds";

export function getRecentlyPlayedIds() {
  try {
    const raw = localStorage.getItem(RECENTLY_PLAYED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function recordSongPlay(track) {
  if (!track || !track.id) return;
  try {
    // 1. Update Recently Played list (keep most recent first, max 60)
    const existing = getRecentlyPlayedIds();
    const filtered = existing.filter(id => id !== track.id);
    const updated = [track.id, ...filtered].slice(0, 60);
    localStorage.setItem(RECENTLY_PLAYED_KEY, JSON.stringify(updated));

    // 2. Increment play count
    const rawCounts = localStorage.getItem(PLAY_COUNTS_KEY);
    const counts = rawCounts ? JSON.parse(rawCounts) : {};
    counts[track.id] = (counts[track.id] || 0) + 1;
    localStorage.setItem(PLAY_COUNTS_KEY, JSON.stringify(counts));
  } catch (e) {
    console.warn("Could not record song play:", e);
  }
}

export function recordListeningDuration(trackId, seconds) {
  if (!trackId || !seconds || seconds <= 0) return;
  try {
    const raw = localStorage.getItem(LISTEN_SECONDS_KEY);
    const times = raw ? JSON.parse(raw) : {};
    times[trackId] = (times[trackId] || 0) + Math.round(seconds);
    localStorage.setItem(LISTEN_SECONDS_KEY, JSON.stringify(times));
  } catch (e) {
    // Ignore storage errors
  }
}

export function getPlayCounts() {
  try {
    const raw = localStorage.getItem(PLAY_COUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function clearListeningHistory() {
  try {
    localStorage.removeItem(RECENTLY_PLAYED_KEY);
    localStorage.removeItem(PLAY_COUNTS_KEY);
    localStorage.removeItem(LISTEN_SECONDS_KEY);
  } catch (e) {}
}

export function computeListeningStats(allSongs = [], getSongMoodsFn) {
  const counts = getPlayCounts();
  const rawSeconds = (() => {
    try {
      const r = localStorage.getItem(LISTEN_SECONDS_KEY);
      return r ? JSON.parse(r) : {};
    } catch (e) { return {}; }
  })();

  const songMap = new Map((allSongs || []).map(s => [s.id, s]));

  let totalPlays = 0;
  let totalSeconds = 0;
  const artistPlayMap = {};
  const moodPlayMap = {};
  const topTracksList = [];

  for (const [id, count] of Object.entries(counts)) {
    const song = songMap.get(id);
    totalPlays += count;
    
    // Estimate seconds if not explicitly tracked: average 3.5 minutes (210s) per play
    const songSecs = rawSeconds[id] || (count * 210);
    totalSeconds += songSecs;

    if (song) {
      topTracksList.push({ ...song, playCount: count });

      // Track artist popularity
      const artists = (song.artist || '').split(/[,&]/).map(a => a.trim()).filter(Boolean);
      artists.forEach(a => {
        artistPlayMap[a] = (artistPlayMap[a] || 0) + count;
      });

      // Track mood popularity
      if (getSongMoodsFn) {
        const moods = getSongMoodsFn(song);
        moods.forEach(m => {
          moodPlayMap[m] = (moodPlayMap[m] || 0) + count;
        });
      }
    }
  }

  // Sort top tracks
  topTracksList.sort((a, b) => b.playCount - a.playCount);

  // Top artist
  const sortedArtists = Object.entries(artistPlayMap).sort((a, b) => b[1] - a[1]);
  const topArtist = sortedArtists.length > 0 ? sortedArtists[0][0] : null;
  const topArtistPlays = sortedArtists.length > 0 ? sortedArtists[0][1] : 0;

  // Top mood
  const sortedMoods = Object.entries(moodPlayMap).sort((a, b) => b[1] - a[1]);
  const topMood = sortedMoods.length > 0 ? sortedMoods[0][0] : null;

  // Format total time
  const totalMinutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const formattedTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return {
    totalPlays,
    totalMinutes,
    formattedTime,
    topArtist,
    topArtistPlays,
    topMood,
    topTracks: topTracksList.slice(0, 10),
    hasData: totalPlays > 0
  };
}
