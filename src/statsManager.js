// src/statsManager.js
// Account-specific cloud-synchronized listening history, play counters, and personal stats for Euphony
import { supabase } from "./supabase";
import { getTrackArtists } from "./artistUtils";

const RECENTLY_PLAYED_KEY = "euphony_recently_played_ids";
const PLAY_COUNTS_KEY = "euphony_song_play_counts";
const LISTEN_SECONDS_KEY = "euphony_song_listen_seconds";
const CUSTOM_MOODS_KEY = "euphony_custom_song_moods";

const CLOUD_DATA_PREFIX = "__euphony_user_data__:::";

let activeUserId = null;
let activeUserEmail = null;
let cloudSyncTimer = null;
let cachedCloudRowId = null;

export function setActiveUser(user) {
  if (!user) {
    activeUserId = null;
    activeUserEmail = null;
    cachedCloudRowId = null;
    return;
  }
  if (typeof user === "string") {
    activeUserId = user;
  } else {
    activeUserId = user.id || null;
    activeUserEmail = user.email || null;
  }
}

export function getActiveUserId() {
  return activeUserId;
}

function getUserKey(baseKey, userId = activeUserId) {
  return userId ? `${baseKey}_${userId}` : null;
}

export function purgeLegacyGlobalStats() {
  try {
    localStorage.removeItem(RECENTLY_PLAYED_KEY);
    localStorage.removeItem(PLAY_COUNTS_KEY);
    localStorage.removeItem(LISTEN_SECONDS_KEY);
    localStorage.removeItem(CUSTOM_MOODS_KEY);
    localStorage.removeItem("euphony_cached_playlists");
    // Clear any corrupted local keys for raiayush8705 on this browser
    localStorage.removeItem(`euphony_song_play_counts_8012a3fc-8aa6-402a-bbd1-2748e454fa21`);
    localStorage.removeItem(`euphony_song_listen_seconds_8012a3fc-8aa6-402a-bbd1-2748e454fa21`);
    localStorage.removeItem(`euphony_recently_played_ids_8012a3fc-8aa6-402a-bbd1-2748e454fa21`);
    localStorage.removeItem(`euphony_custom_song_moods_8012a3fc-8aa6-402a-bbd1-2748e454fa21`);
  } catch (e) {}
}

// Purge un-scoped keys on script initialization so other accounts on the same device don't read stale data
purgeLegacyGlobalStats();

export function getRecentlyPlayedIds(userId = activeUserId) {
  try {
    const targetId = userId || activeUserId;
    if (targetId) {
      const userRaw = localStorage.getItem(getUserKey(RECENTLY_PLAYED_KEY, targetId));
      return userRaw ? JSON.parse(userRaw) : [];
    }
    return [];
  } catch (e) {
    return [];
  }
}

export function getPlayCounts(userId = activeUserId) {
  try {
    const targetId = userId || activeUserId;
    if (targetId) {
      const userRaw = localStorage.getItem(getUserKey(PLAY_COUNTS_KEY, targetId));
      return userRaw ? JSON.parse(userRaw) : {};
    }
    return {};
  } catch (e) {
    return {};
  }
}

export function getListenSeconds(userId = activeUserId) {
  try {
    const targetId = userId || activeUserId;
    if (targetId) {
      const userRaw = localStorage.getItem(getUserKey(LISTEN_SECONDS_KEY, targetId));
      return userRaw ? JSON.parse(userRaw) : {};
    }
    return {};
  } catch (e) {
    return {};
  }
}

export function getCustomMoods(userId = activeUserId) {
  try {
    const targetId = userId || activeUserId;
    if (targetId) {
      const userRaw = localStorage.getItem(getUserKey(CUSTOM_MOODS_KEY, targetId));
      return userRaw ? JSON.parse(userRaw) : {};
    }
    return {};
  } catch (e) {
    return {};
  }
}

export function saveLocalStats({ playCounts, listenSeconds, recentlyPlayedIds, customMoods }, userId = activeUserId) {
  const targetId = userId || activeUserId;
  if (!targetId) return; // Strictly isolate to authenticated accounts; do not write global un-scoped stats
  try {
    if (playCounts !== undefined) {
      localStorage.setItem(getUserKey(PLAY_COUNTS_KEY, targetId), JSON.stringify(playCounts));
    }
    if (listenSeconds !== undefined) {
      localStorage.setItem(getUserKey(LISTEN_SECONDS_KEY, targetId), JSON.stringify(listenSeconds));
    }
    if (recentlyPlayedIds !== undefined) {
      localStorage.setItem(getUserKey(RECENTLY_PLAYED_KEY, targetId), JSON.stringify(recentlyPlayedIds));
    }
    if (customMoods !== undefined) {
      localStorage.setItem(getUserKey(CUSTOM_MOODS_KEY, targetId), JSON.stringify(customMoods));
    }
  } catch (e) {
    console.warn("Failed saving local stats:", e);
  }
}

/**
 * Push stats to Supabase for the current account (debounced)
 */
export function scheduleCloudSync(userId = activeUserId) {
  if (!userId) return;
  if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
  cloudSyncTimer = setTimeout(() => {
    flushCloudSync(userId);
  }, 1500);
}

/**
 * Immediately push current local stats to Supabase
 */
export async function flushCloudSync(userId = activeUserId) {
  if (cloudSyncTimer) {
    clearTimeout(cloudSyncTimer);
    cloudSyncTimer = null;
  }
  const targetId = userId || activeUserId;
  if (!targetId) return;

  try {
    const payloadObj = {
      version: 1,
      userId: targetId,
      email: activeUserEmail,
      playCounts: getPlayCounts(targetId),
      listenSeconds: getListenSeconds(targetId),
      recentlyPlayedIds: getRecentlyPlayedIds(targetId),
      customMoods: getCustomMoods(targetId),
      updatedAt: new Date().toISOString()
    };
    const payloadStr = CLOUD_DATA_PREFIX + JSON.stringify(payloadObj);

    if (cachedCloudRowId) {
      const { error: updErr } = await supabase
        .from("playlists")
        .update({ name: payloadStr })
        .eq("id", cachedCloudRowId);
      if (!updErr) return;
    }

    // Find existing row or insert
    const { data: existingRows } = await supabase
      .from("playlists")
      .select("id")
      .eq("user_id", targetId)
      .like("name", `${CLOUD_DATA_PREFIX}%`)
      .limit(1);

    if (existingRows && existingRows.length > 0) {
      cachedCloudRowId = existingRows[0].id;
      await supabase
        .from("playlists")
        .update({ name: payloadStr })
        .eq("id", cachedCloudRowId);
    } else {
      const { data: insData } = await supabase
        .from("playlists")
        .insert([{ user_id: targetId, name: payloadStr }])
        .select();
      if (insData && insData[0]) {
        cachedCloudRowId = insData[0].id;
      }
    }
  } catch (e) {
    console.warn("Cloud sync write error:", e);
  }
}

/**
 * 1-minute qualified play recorder:
 * Called only when a track reaches >= 60 seconds (1 minute) of listening or completes playback.
 * Updates Recently Played and increments play counter, then syncs to cloud account.
 */
export function recordQualifiedPlay(track, userId = activeUserId) {
  if (!track || !track.id) return;
  const targetId = userId || activeUserId;
  try {
    // 1. Update Recently Played list (keep most recent first, max 60)
    const existing = getRecentlyPlayedIds(targetId);
    const filtered = existing.filter(id => id !== track.id);
    const updated = [track.id, ...filtered].slice(0, 60);

    // 2. Increment play count
    const counts = { ...getPlayCounts(targetId) };
    counts[track.id] = (counts[track.id] || 0) + 1;

    saveLocalStats({ recentlyPlayedIds: updated, playCounts: counts }, targetId);
    scheduleCloudSync(targetId);
  } catch (e) {
    console.warn("Could not record qualified play:", e);
  }
}

export const recordSongPlay = recordQualifiedPlay;

export function recordListeningDuration(trackId, seconds, userId = activeUserId) {
  if (!trackId || !seconds || seconds <= 0) return;
  const targetId = userId || activeUserId;
  try {
    const times = { ...getListenSeconds(targetId) };
    times[trackId] = (times[trackId] || 0) + Math.round(seconds * 10) / 10;
    saveLocalStats({ listenSeconds: times }, targetId);
    scheduleCloudSync(targetId);
  } catch (e) {
    // Ignore storage errors
  }
}

export async function clearListeningHistory(userId = activeUserId) {
  const targetId = userId || activeUserId;
  try {
    if (targetId) {
      localStorage.removeItem(getUserKey(RECENTLY_PLAYED_KEY, targetId));
      localStorage.removeItem(getUserKey(PLAY_COUNTS_KEY, targetId));
      localStorage.removeItem(getUserKey(LISTEN_SECONDS_KEY, targetId));
    }
    localStorage.removeItem(RECENTLY_PLAYED_KEY);
    localStorage.removeItem(PLAY_COUNTS_KEY);
    localStorage.removeItem(LISTEN_SECONDS_KEY);

    if (targetId) {
      const emptyPayload = CLOUD_DATA_PREFIX + JSON.stringify({
        version: 1,
        userId: targetId,
        email: activeUserEmail,
        playCounts: {},
        listenSeconds: {},
        recentlyPlayedIds: [],
        customMoods: getCustomMoods(targetId),
        updatedAt: new Date().toISOString()
      });

      if (cachedCloudRowId) {
        await supabase.from("playlists").update({ name: emptyPayload }).eq("id", cachedCloudRowId);
      } else {
        const { data: rows } = await supabase.from("playlists").select("id").eq("user_id", targetId).like("name", `${CLOUD_DATA_PREFIX}%`).limit(1);
        if (rows && rows[0]) {
          cachedCloudRowId = rows[0].id;
          await supabase.from("playlists").update({ name: emptyPayload }).eq("id", rows[0].id);
        }
      }
    }
  } catch (e) {
    console.warn("Error clearing listening history:", e);
  }
}

/**
 * Main cross-device synchronization:
 * Connects the user account to Supabase, merges local stats with remote cloud stats,
 * and ensures both devices (desktop and mobile) have the exact same combined stats.
 */
export async function syncAccountStats(user) {
  if (!user || !user.id) return null;
  setActiveUser(user);
  const targetId = user.id;

  try {
    // 1. Read current local device stats
    const localCounts = getPlayCounts(targetId);
    const localSeconds = getListenSeconds(targetId);
    const localRecent = getRecentlyPlayedIds(targetId);
    const localMoods = getCustomMoods(targetId);

    // 2. Fetch remote stats from Supabase
    const { data: rows, error: fetchErr } = await supabase
      .from("playlists")
      .select("id, name")
      .eq("user_id", targetId)
      .like("name", `${CLOUD_DATA_PREFIX}%`)
      .limit(1);

    if (fetchErr) {
      console.warn("Could not fetch remote account stats:", fetchErr.message);
      return { playCounts: localCounts, listenSeconds: localSeconds, recentlyPlayedIds: localRecent, customMoods: localMoods };
    }

    let remoteStats = null;
    if (rows && rows.length > 0) {
      cachedCloudRowId = rows[0].id;
      try {
        const jsonPart = rows[0].name.split(CLOUD_DATA_PREFIX)[1];
        remoteStats = JSON.parse(jsonPart);
      } catch (e) {
        console.warn("Failed parsing cloud user data JSON:", e);
      }
    }

    if (remoteStats) {
      // Cloud database in Supabase is authoritative for this account.
      // Update local device storage to exactly reflect the user's cloud account data.
      const synced = {
        playCounts: remoteStats.playCounts || {},
        listenSeconds: remoteStats.listenSeconds || {},
        recentlyPlayedIds: remoteStats.recentlyPlayedIds || [],
        customMoods: remoteStats.customMoods || {}
      };

      saveLocalStats(synced, targetId);
      return synced;
    } else {
      // First time this account connects: start completely fresh (0 plays, 0 seconds)
      const fresh = {
        playCounts: {},
        listenSeconds: {},
        recentlyPlayedIds: [],
        customMoods: {}
      };
      saveLocalStats(fresh, targetId);
      await flushCloudSync(targetId);
      return fresh;
    }
  } catch (err) {
    console.warn("Account stats sync failed:", err);
    return null;
  }
}

/**
 * Subscribe to realtime stats updates across devices
 */
export function subscribeToCloudStats(userId, onUpdateCallback) {
  if (!userId || typeof onUpdateCallback !== "function") return () => {};

  try {
    const channelName = `euphony_stats_sync_${userId}`;
    const channel = supabase.channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "playlists",
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const row = payload.new;
          if (row && typeof row.name === "string" && row.name.startsWith(CLOUD_DATA_PREFIX)) {
            try {
              const jsonPart = row.name.split(CLOUD_DATA_PREFIX)[1];
              const remote = JSON.parse(jsonPart);
              if (remote) {
                cachedCloudRowId = row.id;
                saveLocalStats(remote, userId);
                onUpdateCallback(remote);
              }
            } catch (e) {}
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (e) {
    return () => {};
  }
}

export function computeListeningStats(allSongs = [], getSongMoodsFn, userId = activeUserId) {
  const counts = getPlayCounts(userId);
  const rawSeconds = getListenSeconds(userId);

  const songMap = new Map((allSongs || []).map(s => [s.id, s]));

  let totalPlays = 0;
  let totalSeconds = 0;
  const artistPlayMap = {};
  const moodPlayMap = {};
  const topTracksList = [];

  // Calculate actual total listening time strictly from actively played seconds (no estimations)
  for (const s of Object.values(rawSeconds)) {
    const val = Number(s);
    if (!isNaN(val) && val > 0) {
      totalSeconds += val;
    }
  }

  for (const [id, count] of Object.entries(counts)) {
    const song = songMap.get(id);
    totalPlays += count;

    if (song) {
      topTracksList.push({ ...song, playCount: count });

      // Track artist popularity
      const artists = getTrackArtists(song.artist);
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

  // Format total time calculated strictly from actual playback duration
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.round(totalSeconds % 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  let formattedTime = "0m";
  if (hours > 0) {
    formattedTime = `${hours}h ${mins}m`;
  } else if (mins > 0) {
    formattedTime = `${mins}m`;
  } else if (totalSeconds > 0) {
    formattedTime = `${remainingSeconds}s`;
  }

  return {
    totalPlays,
    totalSeconds: Math.round(totalSeconds),
    totalMinutes,
    formattedTime,
    topArtist,
    topArtistPlays,
    topMood,
    topTracks: topTracksList.slice(0, 10),
    hasData: totalPlays > 0 || totalSeconds > 0
  };
}
