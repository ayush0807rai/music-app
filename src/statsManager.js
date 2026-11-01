// src/statsManager.js
// Account-specific cloud-synchronized listening history, play counters, and personal stats for Euphony
import { supabase } from "./supabase";
import { getTrackArtists } from "./artistUtils";

const RECENTLY_PLAYED_KEY = "euphony_recently_played_ids";
const PLAY_COUNTS_KEY = "euphony_song_play_counts";
const LISTEN_SECONDS_KEY = "euphony_song_listen_seconds";
const CUSTOM_MOODS_KEY = "euphony_custom_song_moods";
const ACTIVE_MONTH_KEY = "euphony_active_month";
const MONTHLY_ARCHIVES_KEY = "euphony_monthly_archives";
const YEARLY_TOTALS_KEY = "euphony_yearly_totals";

const CLOUD_DATA_PREFIX = "__euphony_user_data__:::";

let activeUserId = null;
let activeUserEmail = null;
let cloudSyncTimer = null;
let cachedCloudRowId = null;

export function isLeapYear(year) {
  const y = Number(year);
  return (y % 4 === 0 && y % 100 !== 0) || (y % 400 === 0);
}

export function getDaysInMonth(year, month) {
  // month: 1 = Jan ... 12 = Dec
  return new Date(year, month, 0).getDate();
}

export function getCurrentMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getCurrentYearKey(date = new Date()) {
  return String(date.getFullYear());
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function getMonthDisplayName(monthKey) {
  if (!monthKey || !monthKey.includes("-")) return monthKey || "";
  const [yearStr, monthStr] = monthKey.split("-");
  const monthIdx = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIdx] || monthStr;
  return `${monthName} ${yearStr}`;
}

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

export function getActiveMonth(userId = activeUserId) {
  try {
    const targetId = userId || activeUserId;
    if (targetId) {
      return localStorage.getItem(getUserKey(ACTIVE_MONTH_KEY, targetId)) || null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export function getMonthlyArchives(userId = activeUserId) {
  try {
    const targetId = userId || activeUserId;
    if (targetId) {
      const raw = localStorage.getItem(getUserKey(MONTHLY_ARCHIVES_KEY, targetId));
      return raw ? JSON.parse(raw) : {};
    }
    return {};
  } catch (e) {
    return {};
  }
}

export function getYearlyTotals(userId = activeUserId) {
  try {
    const targetId = userId || activeUserId;
    if (targetId) {
      const raw = localStorage.getItem(getUserKey(YEARLY_TOTALS_KEY, targetId));
      return raw ? JSON.parse(raw) : {};
    }
    return {};
  } catch (e) {
    return {};
  }
}

export function saveLocalStats({
  playCounts,
  listenSeconds,
  recentlyPlayedIds,
  customMoods,
  activeMonth,
  monthlyArchives,
  yearlyTotals
}, userId = activeUserId) {
  const targetId = userId || activeUserId;
  if (!targetId) return; // Strictly isolate to authenticated accounts
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
    if (activeMonth !== undefined) {
      localStorage.setItem(getUserKey(ACTIVE_MONTH_KEY, targetId), activeMonth || "");
    }
    if (monthlyArchives !== undefined) {
      localStorage.setItem(getUserKey(MONTHLY_ARCHIVES_KEY, targetId), JSON.stringify(monthlyArchives));
    }
    if (yearlyTotals !== undefined) {
      localStorage.setItem(getUserKey(YEARLY_TOTALS_KEY, targetId), JSON.stringify(yearlyTotals));
    }
  } catch (e) {
    console.warn("Failed saving local stats:", e);
  }
}

/**
 * Check and perform monthly rollover:
 * Resets active monthly listening stats on the 1st of every month at 00:00:00 local time,
 * respecting the exact number of days of every month and leap years (e.g. Feb 28 or 29).
 * CRITICAL: Before reset, all stats from that active month are permanently archived
 * into monthlyArchives and aggregated into yearlyTotals, then flushed to Supabase.
 */
export async function checkAndPerformMonthlyRollover(userId = activeUserId) {
  const targetId = userId || activeUserId;
  if (!targetId) return false;

  const currentMonth = getCurrentMonthKey();
  let storedMonth = getActiveMonth(targetId);

  // If no stored active month yet, check if there are existing counts/seconds to preserve
  if (!storedMonth) {
    const existingCounts = getPlayCounts(targetId);
    const existingSeconds = getListenSeconds(targetId);
    const hasData = Object.keys(existingCounts).length > 0 || Object.keys(existingSeconds).length > 0;

    if (hasData) {
      // Historical data accumulated before November 1, 2026 -> treat as October 2026 archive
      storedMonth = "2026-10";
    } else {
      // Fresh user account
      saveLocalStats({ activeMonth: currentMonth, monthlyArchives: {}, yearlyTotals: {} }, targetId);
      return false;
    }
  }

  // If stored active month matches current month, rollover is not needed
  if (storedMonth === currentMonth) {
    return false;
  }

  // Month has changed! Archive pre-reset stats permanently into the database before resetting.
  const oldMonthCounts = getPlayCounts(targetId);
  const oldMonthSeconds = getListenSeconds(targetId);

  let oldMonthTotalPlays = 0;
  for (const count of Object.values(oldMonthCounts)) {
    oldMonthTotalPlays += Number(count) || 0;
  }

  let oldMonthTotalSeconds = 0;
  for (const sec of Object.values(oldMonthSeconds)) {
    oldMonthTotalSeconds += Number(sec) || 0;
  }

  // 1. Archive previous month
  const archives = { ...getMonthlyArchives(targetId) };
  archives[storedMonth] = {
    playCounts: oldMonthCounts,
    listenSeconds: oldMonthSeconds,
    totalPlays: oldMonthTotalPlays,
    totalSeconds: Math.round(oldMonthTotalSeconds),
    archivedAt: new Date().toISOString()
  };

  // 2. Accumulate into yearly totals
  const oldYear = storedMonth.split("-")[0] || getCurrentYearKey();
  const yearly = { ...getYearlyTotals(targetId) };
  const currentYearObj = yearly[oldYear] || { playCounts: {}, listenSeconds: {}, totalPlays: 0, totalSeconds: 0 };

  const mergedPlayCounts = { ...(currentYearObj.playCounts || {}) };
  for (const [id, cnt] of Object.entries(oldMonthCounts)) {
    mergedPlayCounts[id] = (mergedPlayCounts[id] || 0) + cnt;
  }

  const mergedListenSeconds = { ...(currentYearObj.listenSeconds || {}) };
  for (const [id, sec] of Object.entries(oldMonthSeconds)) {
    mergedListenSeconds[id] = Math.round(((mergedListenSeconds[id] || 0) + Number(sec)) * 10) / 10;
  }

  let newYearTotalPlays = 0;
  for (const c of Object.values(mergedPlayCounts)) newYearTotalPlays += Number(c) || 0;

  let newYearTotalSeconds = 0;
  for (const s of Object.values(mergedListenSeconds)) newYearTotalSeconds += Number(s) || 0;

  yearly[oldYear] = {
    playCounts: mergedPlayCounts,
    listenSeconds: mergedListenSeconds,
    totalPlays: newYearTotalPlays,
    totalSeconds: Math.round(newYearTotalSeconds)
  };

  // 3. Reset active month stats to fresh state
  const freshCounts = {};
  const freshSeconds = {};

  saveLocalStats({
    activeMonth: currentMonth,
    playCounts: freshCounts,
    listenSeconds: freshSeconds,
    monthlyArchives: archives,
    yearlyTotals: yearly
  }, targetId);

  // 4. Immediately flush to database so Supabase permanently stores it!
  await flushCloudSync(targetId);

  return true;
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
      version: 2,
      userId: targetId,
      email: activeUserEmail,
      activeMonth: getActiveMonth(targetId) || getCurrentMonthKey(),
      playCounts: getPlayCounts(targetId),
      listenSeconds: getListenSeconds(targetId),
      recentlyPlayedIds: getRecentlyPlayedIds(targetId),
      customMoods: getCustomMoods(targetId),
      monthlyArchives: getMonthlyArchives(targetId),
      yearlyTotals: getYearlyTotals(targetId),
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
    const currentYear = getCurrentYearKey();

    // 1. Update Recently Played list (keep most recent first, max 60)
    const existing = getRecentlyPlayedIds(targetId);
    const filtered = existing.filter(id => id !== track.id);
    const updated = [track.id, ...filtered].slice(0, 60);

    // 2. Increment active month play count
    const counts = { ...getPlayCounts(targetId) };
    counts[track.id] = (counts[track.id] || 0) + 1;

    // 3. Accumulate into yearly totals
    const yearly = { ...getYearlyTotals(targetId) };
    const yObj = yearly[currentYear] || { playCounts: {}, listenSeconds: {}, totalPlays: 0, totalSeconds: 0 };
    const yCounts = { ...(yObj.playCounts || {}) };
    yCounts[track.id] = (yCounts[track.id] || 0) + 1;
    let yTotalPlays = 0;
    for (const c of Object.values(yCounts)) yTotalPlays += Number(c) || 0;

    yearly[currentYear] = {
      ...yObj,
      playCounts: yCounts,
      totalPlays: yTotalPlays
    };

    saveLocalStats({
      recentlyPlayedIds: updated,
      playCounts: counts,
      yearlyTotals: yearly
    }, targetId);

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
    const currentYear = getCurrentYearKey();
    const addedSecs = Math.round(seconds * 10) / 10;

    // 1. Increment active month listen seconds
    const times = { ...getListenSeconds(targetId) };
    times[trackId] = (times[trackId] || 0) + addedSecs;

    // 2. Accumulate into yearly totals
    const yearly = { ...getYearlyTotals(targetId) };
    const yObj = yearly[currentYear] || { playCounts: {}, listenSeconds: {}, totalPlays: 0, totalSeconds: 0 };
    const ySecs = { ...(yObj.listenSeconds || {}) };
    ySecs[trackId] = Math.round(((ySecs[trackId] || 0) + addedSecs) * 10) / 10;
    let yTotalSecs = 0;
    for (const s of Object.values(ySecs)) yTotalSecs += Number(s) || 0;

    yearly[currentYear] = {
      ...yObj,
      listenSeconds: ySecs,
      totalSeconds: Math.round(yTotalSecs)
    };

    saveLocalStats({
      listenSeconds: times,
      yearlyTotals: yearly
    }, targetId);

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
        version: 2,
        userId: targetId,
        email: activeUserEmail,
        activeMonth: getActiveMonth(targetId) || getCurrentMonthKey(),
        playCounts: {},
        listenSeconds: {},
        recentlyPlayedIds: [],
        customMoods: getCustomMoods(targetId),
        monthlyArchives: getMonthlyArchives(targetId),
        yearlyTotals: getYearlyTotals(targetId),
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
 * checks for monthly rollover, and ensures both devices (desktop and mobile)
 * have the exact same combined stats.
 */
export async function syncAccountStats(user) {
  if (!user || !user.id) return null;
  setActiveUser(user);
  const targetId = user.id;

  try {
    // 1. Fetch remote stats from Supabase
    const { data: rows, error: fetchErr } = await supabase
      .from("playlists")
      .select("id, name")
      .eq("user_id", targetId)
      .like("name", `${CLOUD_DATA_PREFIX}%`)
      .limit(1);

    if (fetchErr) {
      console.warn("Could not fetch remote account stats:", fetchErr.message);
      return {
        playCounts: getPlayCounts(targetId),
        listenSeconds: getListenSeconds(targetId),
        recentlyPlayedIds: getRecentlyPlayedIds(targetId),
        customMoods: getCustomMoods(targetId)
      };
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

    const currentMonth = getCurrentMonthKey();

    if (remoteStats) {
      // Cloud database in Supabase is authoritative for this account.
      let activeMonth = remoteStats.activeMonth;
      let playCounts = remoteStats.playCounts || {};
      let listenSeconds = remoteStats.listenSeconds || {};
      let monthlyArchives = remoteStats.monthlyArchives || {};
      let yearlyTotals = remoteStats.yearlyTotals || {};

      // If activeMonth is missing from legacy data or month rolled over:
      if (!activeMonth || activeMonth !== currentMonth) {
        const legacyMonth = activeMonth || "2026-10";
        const hasLegacyData = Object.keys(playCounts).length > 0 || Object.keys(listenSeconds).length > 0;

        if (hasLegacyData) {
          const oldPlays = Object.values(playCounts).reduce((a, b) => a + Number(b || 0), 0);
          const oldSecs = Object.values(listenSeconds).reduce((a, b) => a + Number(b || 0), 0);

          monthlyArchives[legacyMonth] = {
            playCounts: { ...playCounts },
            listenSeconds: { ...listenSeconds },
            totalPlays: oldPlays,
            totalSeconds: Math.round(oldSecs),
            archivedAt: new Date().toISOString()
          };

          const oldYear = legacyMonth.split("-")[0] || getCurrentYearKey();
          const currentYearObj = yearlyTotals[oldYear] || { playCounts: {}, listenSeconds: {}, totalPlays: 0, totalSeconds: 0 };
          const mPlayCounts = { ...(currentYearObj.playCounts || {}) };
          for (const [id, cnt] of Object.entries(playCounts)) {
            mPlayCounts[id] = (mPlayCounts[id] || 0) + cnt;
          }
          const mListenSecs = { ...(currentYearObj.listenSeconds || {}) };
          for (const [id, sec] of Object.entries(listenSeconds)) {
            mListenSecs[id] = Math.round(((mListenSecs[id] || 0) + Number(sec)) * 10) / 10;
          }
          let yPlays = 0;
          for (const c of Object.values(mPlayCounts)) yPlays += Number(c) || 0;
          let ySecs = 0;
          for (const s of Object.values(mListenSecs)) ySecs += Number(s) || 0;

          yearlyTotals[oldYear] = {
            playCounts: mPlayCounts,
            listenSeconds: mListenSecs,
            totalPlays: yPlays,
            totalSeconds: Math.round(ySecs)
          };

          // Reset active month for current month
          playCounts = {};
          listenSeconds = {};
        }

        activeMonth = currentMonth;
      }

      const synced = {
        activeMonth,
        playCounts,
        listenSeconds,
        recentlyPlayedIds: remoteStats.recentlyPlayedIds || [],
        customMoods: remoteStats.customMoods || {},
        monthlyArchives,
        yearlyTotals
      };

      saveLocalStats(synced, targetId);
      // Persist the upgraded/rolled-over state back to Supabase
      await flushCloudSync(targetId);
      return synced;
    } else {
      // First time this account connects: start completely fresh
      const fresh = {
        activeMonth: currentMonth,
        playCounts: {},
        listenSeconds: {},
        recentlyPlayedIds: [],
        customMoods: {},
        monthlyArchives: {},
        yearlyTotals: {}
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

/**
 * Compute listening stats for a given timeframe:
 * - "active" (default): current month's active stats
 * - "YYYY-MM": specific archived month
 * - "YYYY": specific year totals
 * - "all": all-time combined
 */
export function computeListeningStats(allSongs = [], getSongMoodsFn, userId = activeUserId, timeframe = "active") {
  let counts = {};
  let rawSeconds = {};

  const monthlyArchives = getMonthlyArchives(userId);
  const yearlyTotals = getYearlyTotals(userId);
  const activeMonth = getActiveMonth(userId) || getCurrentMonthKey();

  if (timeframe === "active" || timeframe === activeMonth) {
    counts = getPlayCounts(userId);
    rawSeconds = getListenSeconds(userId);
  } else if (monthlyArchives[timeframe]) {
    counts = monthlyArchives[timeframe].playCounts || {};
    rawSeconds = monthlyArchives[timeframe].listenSeconds || {};
  } else if (yearlyTotals[timeframe]) {
    counts = yearlyTotals[timeframe].playCounts || {};
    rawSeconds = yearlyTotals[timeframe].listenSeconds || {};
  } else if (timeframe === "all") {
    for (const yData of Object.values(yearlyTotals)) {
      for (const [id, c] of Object.entries(yData.playCounts || {})) {
        counts[id] = (counts[id] || 0) + c;
      }
      for (const [id, s] of Object.entries(yData.listenSeconds || {})) {
        rawSeconds[id] = (rawSeconds[id] || 0) + s;
      }
    }
    for (const [id, c] of Object.entries(getPlayCounts(userId))) {
      counts[id] = (counts[id] || 0) + c;
    }
    for (const [id, s] of Object.entries(getListenSeconds(userId))) {
      rawSeconds[id] = (rawSeconds[id] || 0) + s;
    }
  } else {
    counts = getPlayCounts(userId);
    rawSeconds = getListenSeconds(userId);
  }

  const songMap = new Map((allSongs || []).map(s => [s.id, s]));

  let totalPlays = 0;
  let totalSeconds = 0;
  const artistPlayMap = {};
  const moodPlayMap = {};
  const topTracksList = [];

  // Calculate actual total listening time strictly from actively played seconds
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
    hasData: totalPlays > 0 || totalSeconds > 0,
    activeMonth,
    availableArchives: Object.keys(monthlyArchives).sort().reverse()
  };
}

/**
 * Check if the account is eligible for Spotify-style Wrapped:
 * 1. Date window: Between December 20 and January 20 of every year.
 *    - Dec 20 - Dec 31: Wrapped for current year
 *    - Jan 01 - Jan 20: Wrapped for previous year
 * 2. 15-Minute Threshold: If any user has listened < 15 minutes (900 seconds) in whole for that year,
 *    there will be NO wrapped for that account.
 */
export function getWrappedEligibility(userId = activeUserId, now = new Date()) {
  const month = now.getMonth(); // 0 = Jan, 11 = Dec
  const day = now.getDate();
  const currentYear = now.getFullYear();

  // Official dates are Dec 20 - Jan 20; enabled now for preview, viewing and testing
  let isWithinOfficialDates = true;
  let targetYear = currentYear;

  if (month === 0 && day <= 20) {
    // Jan 01 - Jan 20: Wrapped for preceding year
    targetYear = currentYear - 1;
  } else {
    targetYear = currentYear;
  }

  const yearlyTotals = getYearlyTotals(userId);
  const targetYearData = yearlyTotals[String(targetYear)] || {};

  // Also include any listening in the active month if targetYear is the current year
  let totalSeconds = Number(targetYearData.totalSeconds || 0);
  if (targetYear === currentYear) {
    const activeSecs = Object.values(getListenSeconds(userId)).reduce((a, b) => a + (Number(b) || 0), 0);
    // If yearly total is less than active seconds, ensure active seconds are factored in
    if (activeSecs > 0 && totalSeconds < activeSecs) {
      totalSeconds = activeSecs;
    }
  }

  const eligible = totalSeconds >= 900; // >= 15 minutes (900 seconds)
  const totalMinutes = Math.floor(totalSeconds / 60);

  return {
    isWithinOfficialDates,
    targetYear,
    eligible,
    totalSeconds: Math.round(totalSeconds),
    totalMinutes,
    minutesRemaining: Math.max(0, 15 - totalMinutes)
  };
}

/**
 * Mood description dictionary for Spotify Wrapped Vibe slide
 */
const MOOD_VIBE_DESCRIPTIONS = {
  Romantic: "You lived in the warmth of heartfelt melodies, serenading your days with passion and deep emotion.",
  Yearning: "You chased nostalgic echoes and bittersweet longing, finding beauty and poetry in what could be.",
  Chill: "You kept life smooth and serene, tuning into gentle soundscapes that kept the noise away.",
  Energetic: "You powered through life with high-tempo rhythms and electrifying beats that never slowed down.",
  Party: "You turned everyday moments into celebrations, bringing unmatched vibrancy everywhere you went.",
  Soulful: "You connected deeply with raw vocal mastery and acoustic resonance that moved the spirit.",
  Focus: "You immersed yourself in flow state harmony, letting melody guide your sharpest concentration."
};

/**
 * Compute complete Spotify-style Wrapped data for an account
 */
export function computeWrappedData(targetYear, allSongs = [], getSongMoodsFn, userId = activeUserId) {
  const yearKey = String(targetYear);
  const yearlyTotals = getYearlyTotals(userId);
  const yearData = yearlyTotals[yearKey] || { playCounts: {}, listenSeconds: {}, totalPlays: 0, totalSeconds: 0 };
  const currentYear = getCurrentYearKey();

  let counts = { ...(yearData.playCounts || {}) };
  let rawSeconds = { ...(yearData.listenSeconds || {}) };

  // If this is the current year, combine active month stats as well
  if (yearKey === currentYear) {
    const activeCounts = getPlayCounts(userId);
    const activeSeconds = getListenSeconds(userId);
    for (const [id, c] of Object.entries(activeCounts)) {
      counts[id] = Math.max(counts[id] || 0, c);
    }
    for (const [id, s] of Object.entries(activeSeconds)) {
      rawSeconds[id] = Math.max(rawSeconds[id] || 0, s);
    }
  }

  let totalSeconds = 0;
  for (const s of Object.values(rawSeconds)) {
    const val = Number(s);
    if (!isNaN(val) && val > 0) totalSeconds += val;
  }

  // 15-minute gate: if < 900 seconds, Wrapped is not available for this account
  if (totalSeconds < 900) {
    return {
      eligible: false,
      year: targetYear,
      totalSeconds: Math.round(totalSeconds),
      totalMinutes: Math.floor(totalSeconds / 60),
      minutesRemaining: Math.max(0, 15 - Math.floor(totalSeconds / 60))
    };
  }

  const songMap = new Map((allSongs || []).map(s => [s.id, s]));

  let totalPlays = 0;
  const artistPlayMap = {};
  const artistSongMap = {};
  const moodPlayMap = {};
  const tracksList = [];

  for (const [id, count] of Object.entries(counts)) {
    const song = songMap.get(id);
    totalPlays += count;

    if (song) {
      tracksList.push({
        id: song.id,
        title: song.title,
        artist: song.artist,
        poster_url: song.poster_url,
        url: song.url || song.song_url || song.audio_url || "",
        plays: count,
        duration: song.duration
      });

      const artists = getTrackArtists(song.artist);
      artists.forEach(a => {
        artistPlayMap[a] = (artistPlayMap[a] || 0) + count;
        if (!artistSongMap[a] && song.poster_url) {
          artistSongMap[a] = song.poster_url;
        }
      });

      if (getSongMoodsFn) {
        const moods = getSongMoodsFn(song);
        moods.forEach(m => {
          moodPlayMap[m] = (moodPlayMap[m] || 0) + count;
        });
      }
    }
  }

  // Sort top tracks
  tracksList.sort((a, b) => b.plays - a.plays);
  const topTracks = tracksList.slice(0, 25);
  const topSong = topTracks[0] || null;

  // Sort top artists
  const sortedArtists = Object.entries(artistPlayMap).sort((a, b) => b[1] - a[1]);
  const topArtists = sortedArtists.slice(0, 5).map(([name, plays], idx) => ({
    rank: idx + 1,
    name,
    plays,
    image: artistSongMap[name] || (topSong ? topSong.poster_url : null)
  }));
  const topArtist = topArtists[0] || null;

  // Top Mood
  const sortedMoods = Object.entries(moodPlayMap).sort((a, b) => b[1] - a[1]);
  const topMoodName = sortedMoods.length > 0 ? sortedMoods[0][0] : "Soulful";
  const totalMoodPlays = sortedMoods.reduce((sum, item) => sum + item[1], 0);
  const topMoodPercentage = totalMoodPlays > 0 ? Math.round((sortedMoods[0][1] / totalMoodPlays) * 100) : 100;

  // Find peak listening month in this year
  const monthlyArchives = getMonthlyArchives(userId);
  let peakMonthName = "";
  let peakMonthSeconds = 0;
  for (const [mKey, mData] of Object.entries(monthlyArchives)) {
    if (mKey.startsWith(yearKey)) {
      if ((mData.totalSeconds || 0) > peakMonthSeconds) {
        peakMonthSeconds = mData.totalSeconds;
        peakMonthName = getMonthDisplayName(mKey);
      }
    }
  }

  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = (totalSeconds / 3600).toFixed(1);

  return {
    eligible: true,
    year: targetYear,
    userEmail: activeUserEmail || "Music Enthusiast",
    userName: activeUserEmail ? activeUserEmail.split("@")[0] : "Music Lover",
    totalSeconds: Math.round(totalSeconds),
    totalMinutes,
    totalHours,
    totalPlays,
    topSong,
    topTracks,
    topArtist,
    topArtists,
    topMood: {
      name: topMoodName,
      percentage: topMoodPercentage,
      description: MOOD_VIBE_DESCRIPTIONS[topMoodName] || "Your musical journey was eclectic and wonderfully one-of-a-kind."
    },
    peakMonth: peakMonthName,
    shareText: `My ${targetYear} Euphony Wrapped:\n🎵 ${totalMinutes.toLocaleString()} minutes listened\n🎤 Top Artist: ${topArtist?.name || "Music"}\n🔥 #1 Song: ${topSong?.title || "Favorites"}\n✨ Vibe: ${topMoodName}\n\nExperience yours on Euphony!`
  };
}

/**
 * Encodes a user's Wrapped data into a compact, URL-safe base64 string
 * for shareable links that anyone can view without database dependence.
 */
export function encodeWrappedSharePayload(data) {
  if (!data) return "";
  try {
    const compact = {
      y: data.year,
      u: data.userName,
      m: data.totalMinutes,
      h: data.totalHours,
      p: data.totalPlays,
      s: data.topSong ? {
        t: data.topSong.title,
        a: data.topSong.artist,
        img: data.topSong.poster_url,
        u: data.topSong.url,
        p: data.topSong.plays
      } : null,
      art: data.topArtist ? {
        n: data.topArtist.name,
        p: data.topArtist.plays,
        img: data.topArtist.image
      } : null,
      arts: (data.topArtists || []).slice(0, 5).map(a => ({
        r: a.rank,
        n: a.name,
        p: a.plays,
        img: a.image
      })),
      vibe: data.topMood ? {
        n: data.topMood.name,
        pct: data.topMood.percentage,
        d: data.topMood.description
      } : null,
      trks: (data.topTracks || []).slice(0, 10).map(t => ({
        t: t.title,
        a: t.artist,
        img: t.poster_url,
        u: t.url,
        p: t.plays,
        dur: t.duration
      })),
      pm: data.peakMonth || ""
    };

    const json = JSON.stringify(compact);
    const utf8Bytes = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode("0x" + p1)
    );
    return btoa(utf8Bytes)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  } catch (err) {
    console.error("Error encoding wrapped share payload:", err);
    return "";
  }
}

/**
 * Decodes a shared Wrapped URL payload into a complete wrappedData object
 */
export function decodeWrappedSharePayload(str) {
  if (!str) return null;
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const binary = atob(base64);
    const json = decodeURIComponent(
      Array.prototype.map.call(binary, ch =>
        "%" + ("00" + ch.charCodeAt(0).toString(16)).slice(-2)
      ).join("")
    );
    const c = JSON.parse(json);
    if (!c || !c.y) return null;

    const topTracks = (c.trks || []).map((t, idx) => ({
      id: `shared_trk_${idx}`,
      title: t.t,
      artist: t.a,
      poster_url: t.img,
      url: t.u,
      plays: t.p,
      duration: t.dur
    }));

    const topSong = c.s ? {
      id: "shared_top_song",
      title: c.s.t,
      artist: c.s.a,
      poster_url: c.s.img,
      url: c.s.u,
      plays: c.s.p
    } : (topTracks[0] || null);

    const topArtists = (c.arts || []).map(a => ({
      rank: a.r,
      name: a.n,
      plays: a.p,
      image: a.img
    }));

    const topArtist = c.art ? {
      name: c.art.n,
      plays: c.art.p,
      image: c.art.img,
      rank: 1
    } : (topArtists[0] || null);

    const topMood = c.vibe ? {
      name: c.vibe.n,
      percentage: c.vibe.pct,
      description: c.vibe.d
    } : { name: "Romantic", percentage: 100, description: "Deeply heartfelt" };

    return {
      eligible: true,
      isSharedView: true,
      year: c.y,
      userName: c.u || "Friend",
      totalMinutes: c.m || 0,
      totalHours: c.h || ((c.m || 0) / 60).toFixed(1),
      totalPlays: c.p || 0,
      topSong,
      topTracks,
      topArtist,
      topArtists,
      topMood,
      peakMonth: c.pm || "",
      shareText: `${c.u || "My"}'s ${c.y} Euphony Wrapped:\n🎵 ${(c.m || 0).toLocaleString()} minutes listened\n🎤 Top Artist: ${topArtist?.name || "Music"}\n🔥 #1 Song: ${topSong?.title || "Favorites"}\n✨ Vibe: ${topMood.name}\n\nExperience yours on Euphony!`
    };
  } catch (err) {
    console.error("Failed to decode shared wrapped payload:", err);
    return null;
  }
}

