// src/moods.js
// Emotional Mood Classifier and Definitions for Euphony Music App

export const AVAILABLE_MOODS = [
  { id: 'Romantic', label: 'Romantic', emoji: '💖', color: '#ff4d88' },
  { id: 'Chill', label: 'Chill', emoji: '☕', color: '#4da6ff' },
  { id: 'Energetic', label: 'Energetic', emoji: '⚡', color: '#ffb84d' },
  { id: 'Sad', label: 'Sad', emoji: '🌧️', color: '#a0a0c8' },
  { id: 'Classical', label: 'Classical', emoji: '🎻', color: '#d49b5a' },
  { id: 'Party', label: 'Party', emoji: '🪩', color: '#ff007f' },
  { id: 'Retro', label: 'Retro', emoji: '📻', color: '#2a9d8f' },
  { id: 'Desi Pop', label: 'Desi Pop', emoji: '🪘', color: '#f77f00' },
  { id: 'Electronic', label: 'Electronic', emoji: '🎧', color: '#00e5ff' },
  { id: 'Monsoon', label: 'Monsoon', emoji: '☔', color: '#38bdf8' },
  { id: 'Pop', label: 'Pop', emoji: '🎤', color: '#d946ef' },
  { id: 'Festival', label: 'Festival', emoji: '🪔', color: '#ff5722' },
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
    'energy', 'jump', 'dhol', 'fire', 'fast', 'hyper', 'pump', 'rock', 'groove', 'anthem', 'roar', 'power',
    'spirit', 'run', 'workout', 'fitness', 'josh', 'junoon', 'aag', 'toofaan', 'dangal', 'sultan', 'challa',
    'singham', 'jai', 'sher', 'power'
  ],
  Sad: [
    'dard', 'judai', 'bewafa', 'ashq', 'aansoo', 'tanha', 'tanhai', 'gham', 'tuta', 'toota', 'chhod', 'alvida',
    'rone', 'bichhad', 'sad', 'cry', 'broken', 'alone', 'tears', 'hurt', 'pain', 'sorry', 'goodbye', 'heartbreak',
    'yaad', 'rona', 'tadap', 'ruswa', 'chhod gaya'
  ],
  Classical: [
    'classical', 'sitar', 'tabla', 'raag', 'raga', 'bandish', 'thumri', 'khayal', 'shehnai', 'ghazal',
    'vilambit', 'alaap', 'instrumental', 'symphony', 'orchestra', 'flute', 'bansuri', 'sarod', 'violin',
    'jugalbandi', 'hindustani', 'carnatic', 'pandit', 'ustad', 'bhimsen', 'hariprasad', 'zakir',
    'semi-classical', 'riwaz', 'shubhaarambh', 'kailash kher', 'shafqat', 'sufi', 'qawwali'
  ],
  Party: [
    'party', 'dance', 'nach', 'nacho', 'nachdi', 'bhangra', 'dhamaka', 'disco', 'shor', 'taali', 'dhamaal',
    'hungama', 'masti', 'daaru', 'sharab', 'thumka', 'swag', 'dj', 'remix', 'celebration', 'bop', 'hype',
    'jalwa', 'loud', 'crazy', 'club', 'chalti', 'patola', 'saturday', 'weekend', 'bombay rockers', 'badtameez',
    'zoobi doobi', 'tumse milke', 'shots', 'kamariya', 'chogada', 'kheech meri photo', 'criminal'
  ],
  Retro: [
    'retro', 'vintage', 'old', 'oldies', 'classic', '90s', '80s', '70s', '60s', 'evergreen', 'purana',
    'zamana', 'nostalgia', 'kishore kumar', 'mohammed rafi', 'lata mangeshkar', 'asha bhosle', 'mukesh',
    'rd burman', 'r.d. burman', 'sd burman', 'laxmikant', 'pyarelal', 'sonu nigam', 'alka yagnik',
    'kumar sanu', 'udit narayan', 'lucky ali', 'hemant kumar', 'manna dey', 'talat', 'pal pal dil ke paas',
    'bole chudiyan', 'you are my soniya', 'jab koi baat bigad jaye', 'main yahaan hoon', 'suraj hua maddham',
    'kalyanji', 'madan mohan', 'jatin-lalit', 'jatin–lalit', 'sandesh shandilya', 'a-ha', 'take on me'
  ],
  'Desi Pop': [
    'desi', 'desi pop', 'punjabi', 'indie pop', 'indipop', 'bhangra pop', 'urban', 'hook',
    'munda', 'kudi', 'nakhra', 'jatt', 'gabru', 'suit', 'kurti', 'prada', 'lehenga', 'ap dhillon',
    'diljit', 'badshah', 'honey singh', 'guru randhawa', 'hardy sandhu', 'raftaar', 'karan aujla',
    'sidhu', 'king', 'arjun kanungo', 'armaan malik', 'darshan raval', 'prateek kuhad', 'anuv jain',
    'imran khan', 'tanzeel khan', 'akull', 'brown rang', 'maan meri jaan', 'aaja we mahiya'
  ],
  Electronic: [
    'electronic', 'edm', 'synth', 'synthwave', 'cyber', 'techno', 'house', 'electro', 'drop', 'bass drop',
    'trance', 'dubstep', 'future bass', 'club mix', 'beat drop', 'djs', 'avicii', 'chainsmokers', 'alan walker',
    'tiesto', 'david guetta', 'marshmello', 'kygo', 'martin garrix', 'nucleya', 'ritviz', 'lost stories',
    'the weeknd', 'closer', 'dj snake', 'let me love you', 'tame impala', 'save your tears', 'dracula'
  ],
  Monsoon: [
    'baarish', 'barsaat', 'baras', 'rain', 'monsoon', 'badal', 'boondein', 'rimjhim', 'saawan', 'megha',
    'bijli', 'bheegi', 'bheega', 'pani', 'ghata', 'barkha', 'chhatri', 'clouds', 'storm', 'drizzle',
    'tip tip', 'baarish ki jaye', 'cham cham', 'barso re', 'bheegi bheegi', 'tum mile', 'boond', 'bundein'
  ],
  Pop: [
    'pop', 'taylor swift', 'shawn mendes', 'charlie puth', 'ed sheeran', 'justin bieber', 'selena gomez',
    'doja cat', 'one direction', 'billie eilish', 'dua lipa', 'ariana grande', 'camila cabello',
    'harry styles', 'katy perry', 'bruno mars', 'maroon 5', 'zayn', 'coldplay', 'imagine dragons',
    'hit single', 'chartbuster', 'catchy', 'radio edit', 'vocal pop', 'synthpop', 'attention',
    'senorita', 'stay', 'treat you better', 'memories', 'levitating', 'peaches', 'blank space',
    'bad guy', 'perfect', 'we don\'t talk anymore', 'shape of you', 'sunflower', 'post malone',
    'starboy', 'blinding lights'
  ],
  Festival: [
    'festival', 'utsav', 'tyohar', 'diwali', 'deepawali', 'holi re', 'rang barse', 'khele holi',
    'navratri', 'garba', 'dandiya', 'ganpati', 'ganesh visarjan', 'bappa', 'dholak',
    'chogada', 'kamariya', 'nagada', 'shubhaarambh', 'dholida', 'dholi taro', 'gulal',
    'patakhe', 'pethal pur', 'sanedo', 'badhai ho', 'eid mubarak'
  ]
};

const CUSTOM_MOODS_KEY = "euphony_custom_song_moods";

export function getCustomMoodOverrides(userId = null) {
  try {
    const key = userId ? `${CUSTOM_MOODS_KEY}_${userId}` : CUSTOM_MOODS_KEY;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function setCustomSongMood(songId, mood, userId = null) {
  if (!songId) return getCustomMoodOverrides(userId);
  try {
    const current = getCustomMoodOverrides(userId);
    if (mood && typeof mood === 'string' && mood.trim()) {
      current[songId] = mood.trim();
    } else {
      delete current[songId];
    }
    const key = userId ? `${CUSTOM_MOODS_KEY}_${userId}` : CUSTOM_MOODS_KEY;
    localStorage.setItem(key, JSON.stringify(current));
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

// Global owner-curated mood overrides baked into the application (fallback only)
export const CURATED_MOOD_OVERRIDES = {};

/**
 * Returns an array of moods (e.g. ['Romantic', 'Chill', 'Classical']) for a given song.
 * Prioritizes canonical database lyrics tag set by owner, then explicit song.mood, then user optimistic override, then falls back to keyword analysis.
 */
export function getSongMoods(song, customOverrides = null) {
  if (!song) return ['Chill'];

  // 1. Explicit mood tag embedded in lyrics (authoritative source of truth set by owner in database - shared with all users)
  if (song.lyrics && typeof song.lyrics === 'string') {
    const match = song.lyrics.match(/\[mood:\s*([a-zA-Z\s]+)\]/i);
    if (match && match[1]) {
      const found = AVAILABLE_MOODS.find(m => m.id.toLowerCase() === match[1].trim().toLowerCase());
      if (found) return [found.id];
    }
  }

  // 2. Explicit mood stored on track (from database or local object)
  if (song.mood && typeof song.mood === 'string' && song.mood.trim()) {
    const raw = song.mood.split(',').map(m => m.trim()).filter(Boolean);
    if (raw.length > 0) return raw;
  }

  // 3. User manual override / optimistic UI override
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

  // 4. Curated owner overrides (fallback for legacy mappings)
  if (CURATED_MOOD_OVERRIDES[song.id]) {
    return [CURATED_MOOD_OVERRIDES[song.id]];
  }

  // 5. Intelligent lyrics & metadata scoring
  const title = (song.title || '').toLowerCase();
  const artist = (song.artist || '').toLowerCase();
  const album = (song.album || '').toLowerCase();
  const lyrics = (song.lyrics || '').toLowerCase();
  const text = `${title} ${artist} ${album} ${lyrics}`;

  const scores = {};
  AVAILABLE_MOODS.forEach(m => { scores[m.id] = 0; });

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (!keywords || scores[mood] === undefined) continue;
    for (const kw of keywords) {
      if (title.includes(kw)) scores[mood] += 6;
      if (artist.includes(kw)) scores[mood] += 5;
      if (album.includes(kw)) scores[mood] += 3;
      if (text.includes(kw)) scores[mood] += 1;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  // If no keywords matched, default to Chill
  if (sorted[0][1] === 0) return ['Chill'];

  const results = [sorted[0][0]];
  // Allow dual mood if second score is strong
  if (sorted[1] && sorted[1][1] >= 4 && sorted[1][1] >= sorted[0][1] * 0.45) {
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
