// src/moods.js
// Emotional Mood Classifier and Definitions for Euphony Music App

export const AVAILABLE_MOODS = [
  { id: 'Romantic', label: 'Romantic', emoji: '💖', color: '#ff4d88' },
  { id: 'Chill', label: 'Chill', emoji: '☕', color: '#4da6ff' },
  { id: 'Energetic', label: 'Energetic', emoji: '⚡', color: '#ffb84d' },
  { id: 'Sad', label: 'Sad', emoji: '🌧️', color: '#a0a0c8' },
];

export const MOOD_KEYWORDS = {
  Romantic: [
    'ishq', 'pyaar', 'mohabbat', 'dil', 'haye', 'hasi', 'haseen', 'chaahat', 'deewana', 'aankhen', 'rab',
    'sanam', 'jaan', 'meherbaan', 'dhadkan', 'humsafar', 'raaz', 'khushbu', 'saaya', 'love', 'kiss', 'heart',
    'lover', 'sweet', 'romantic', 'baby', 'romance', 'teriyaan', 'tere bin', 'main rang', 'tujh mein',
    'maula', 'kasam', 'zindagi', 'shona', 'nazar', 'aashiqui', 'meri', 'deewani', 'khuda'
  ],
  Chill: [
    'hawa', 'raahon', 'khoya', 'aasmaan', 'shanti', 'sukun', 'dheere', 'haule', 'khamoshi', 'nadiya', 'behti',
    'soya', 'subah', 'shaam', 'peace', 'calm', 'soft', 'slow', 'dream', 'acoustic', 'unplugged', 'lofi', 'chill',
    'saari ki saari', 'ek tarfa', 'asal mein', 'night', 'stars', 'breeze', 'cloud', 'relax', 'safe', 'ocean',
    'behti hawa', 'sukoon'
  ],
  Energetic: [
    'party', 'dance', 'nach', 'bhangra', 'dhamaka', 'disco', 'shor', 'taali', 'dhamaal', 'hungama', 'masti',
    'zoobi doobi', 'tumse milke', 'rock', 'beat', 'groove', 'club', 'celebration', 'fire', 'fast', 'bop', 'hype',
    'loud', 'bass', 'crazy', 'dj', 'remix', 'thumka', 'chalti', 'jalwa', 'energy', 'jump', 'dhol'
  ],
  Sad: [
    'dard', 'judai', 'bewafa', 'ashq', 'aansoo', 'tanha', 'tanhai', 'gham', 'tuta', 'toota', 'chhod', 'alvida',
    'rone', 'bichhad', 'sad', 'cry', 'broken', 'alone', 'tears', 'hurt', 'pain', 'sorry', 'goodbye', 'heartbreak',
    'yaad', 'rona', 'tadap', 'ruswa', 'chhod gaya'
  ]
};

const CUSTOM_MOODS_KEY = "euphony_custom_song_moods";

export function getCustomMoodOverrides() {
  try {
    const raw = localStorage.getItem(CUSTOM_MOODS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function setCustomSongMood(songId, mood) {
  if (!songId) return getCustomMoodOverrides();
  try {
    const current = getCustomMoodOverrides();
    if (mood && typeof mood === 'string' && mood.trim()) {
      current[songId] = mood.trim();
    } else {
      delete current[songId];
    }
    localStorage.setItem(CUSTOM_MOODS_KEY, JSON.stringify(current));
    return current;
  } catch (e) {
    return {};
  }
}

export function clearCustomSongMoods() {
  try {
    localStorage.removeItem(CUSTOM_MOODS_KEY);
  } catch (e) {}
}

export function getMoodEmoji(moodId) {
  const match = AVAILABLE_MOODS.find(m => m.id === moodId);
  return match ? match.emoji : '🎵';
}

// Global owner-curated mood overrides baked into the application
export const CURATED_MOOD_OVERRIDES = {
  "0591dd49-6c49-40ee-8ec6-996c430b9691": "Energetic", // Shubhaarambh (Kai Po Che)
};

/**
 * Returns an array of moods (e.g. ['Romantic', 'Chill']) for a given song.
 * Prioritizes user custom override, then curated owner override, then database mood tag, then falls back to keyword analysis.
 */
export function getSongMoods(song, customOverrides = null) {
  if (!song) return ['Chill'];

  // 1. User manual override (highest priority)
  if (customOverrides && customOverrides[song.id]) {
    return [customOverrides[song.id]];
  }
  if (!customOverrides && typeof window !== 'undefined') {
    try {
      const stored = getCustomMoodOverrides();
      if (stored && stored[song.id]) {
        return [stored[song.id]];
      }
    } catch (e) {}
  }

  // 2. Curated owner overrides (guarantees correct classification across all users)
  if (CURATED_MOOD_OVERRIDES[song.id]) {
    return [CURATED_MOOD_OVERRIDES[song.id]];
  }

  // 3. Explicit mood stored on track (from database or local object)
  if (song.mood && typeof song.mood === 'string' && song.mood.trim()) {
    const raw = song.mood.split(',').map(m => m.trim()).filter(Boolean);
    if (raw.length > 0) return raw;
  }

  // 4. Explicit mood tag embedded in lyrics (e.g. [mood: Romantic])
  if (song.lyrics && typeof song.lyrics === 'string') {
    const match = song.lyrics.match(/\[mood:\s*([a-zA-Z]+)\]/i);
    if (match && match[1]) {
      const found = AVAILABLE_MOODS.find(m => m.id.toLowerCase() === match[1].toLowerCase());
      if (found) return [found.id];
    }
  }

  // 2. Intelligent lyrics & metadata scoring
  const title = (song.title || '').toLowerCase();
  const artist = (song.artist || '').toLowerCase();
  const album = (song.album || '').toLowerCase();
  const lyrics = (song.lyrics || '').toLowerCase();
  const text = `${title} ${artist} ${album} ${lyrics}`;

  const scores = { Romantic: 0, Chill: 0, Energetic: 0, Sad: 0 };

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    for (const kw of keywords) {
      if (title.includes(kw)) scores[mood] += 6;
      if (album.includes(kw)) scores[mood] += 3;
      
      const regex = new RegExp('\\b' + kw, 'g');
      const matches = text.match(regex);
      if (matches) scores[mood] += matches.length;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  // If no keywords matched, default to Chill
  if (sorted[0][1] === 0) return ['Chill'];

  const results = [sorted[0][0]];
  // Allow dual mood if second score is strong
  if (sorted[1][1] >= 4 && sorted[1][1] >= sorted[0][1] * 0.45) {
    results.push(sorted[1][0]);
  }

  return results;
}

/**
 * Suggests the best mood while typing in the upload modal
 */
export function suggestMood(title = '', artist = '', lyrics = '') {
  const dummy = { title, artist, lyrics };
  const moods = getSongMoods(dummy);
  return moods[0] || 'Romantic';
}
