import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ArrowRight, Loader2, Plus, X, UploadCloud, Image as ImageIcon, Mic2, FolderPlus, Trash2, Clock, Home, ListMusic, LogOut, ChevronDown, RefreshCw, ListPlus, Moon, SlidersHorizontal, ArrowUpDown, Search, GripVertical
} from "lucide-react";
import { supabase } from "./supabase";
import Auth from "./Auth";

const PLAY_MODES = ["order", "repeat-all", "repeat-one", "shuffle"];
const SORT_CYCLE = [null, "title", "artist", "album"];
const SORT_LABELS = { default: "Default", title: "Title", artist: "Artist", album: "Album" };

const COLORS = {
  bgBase: "#F3F0E6",
  bgPanel: "#FAFAF7",
  primary: "#1A2B4C",
  textMain: "#1A2B4C",
  textMuted: "#64748B",
  border: "rgba(26, 43, 76, 0.12)",
  hover: "rgba(26, 43, 76, 0.06)",
  spotifyGreen: "#1DB954"
};

// --- LYRICS PARSER ---
const parseLyrics = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split('\n');
  const lineRegex = /\[(\d{2}):(\d{2}(?:\.\d{2,3})?)\](.*)/;
  const wordRegex = /<(\d{2}):(\d{2}(?:\.\d{2,3})?)>([^<]*)/g;
  const parsed = [];
  lines.forEach(line => {
    const match = lineRegex.exec(line);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseFloat(match[2]);
      const time = minutes * 60 + seconds;
      const rawText = match[3].trim();
      const words = [];
      let wordMatch;
      let hasWords = false;
      wordRegex.lastIndex = 0;
      while ((wordMatch = wordRegex.exec(rawText)) !== null) {
        hasWords = true;
        words.push({ time: parseInt(wordMatch[1], 10) * 60 + parseFloat(wordMatch[2]), text: wordMatch[3].trim() });
      }
      parsed.push({
        time,
        text: rawText.replace(/<\d{2}:\d{2}(?:\.\d{2,3})?>/g, '').trim(),
        words: hasWords ? words : null
      });
    }
  });
  return parsed;
};

export default function App() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  const [viewedPlaylistId, setViewedPlaylistId] = useState(() => {
    const saved = localStorage.getItem("euphony_playlist_id");
    return saved && saved !== "null" ? saved : null;
  });

  const [sortOrders, setSortOrders] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const [playbackQueue, setPlaybackQueue] = useState([]);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [playbackSourceName, setPlaybackSourceName] = useState("Global Library");

  const [playlist, setPlaylist] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [songForPlaylistModal, setSongForPlaylistModal] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [session, setSession] = useState(null);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [uploadAlbum, setUploadAlbum] = useState("");
  const [uploadLyrics, setUploadLyrics] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPoster, setUploadPoster] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [playMode, setPlayMode] = useState("repeat-all");

  const [showLyrics, setShowLyrics] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const lyricRefs = useRef([]);
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);

  const [userQueue, setUserQueue] = useState([]);
  const [queueCurrentTrack, setQueueCurrentTrack] = useState(null);
  const [showQueue, setShowQueue] = useState(false);
  const [queueToast, setQueueToast] = useState("");
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const [sleepTimerTarget, setSleepTimerTarget] = useState(null);

  const [showMixer, setShowMixer] = useState(false);
  const [isGeneratingStems, setIsGeneratingStems] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [stemVolumes, setStemVolumes] = useState({ vocals: 1, drums: 1, bass: 1, other: 1 });
  const [stemsBroken, setStemsBroken] = useState(false);

  const [showExitToast, setShowExitToast] = useState(false);
  const exitWarningRef = useRef(false);
  const stateRefs = useRef({});

  const pendingAutoPlayRef = useRef(false);

  const [draggedQueueIndex, setDraggedQueueIndex] = useState(-1);
  const [dragOverQueueIndex, setDragOverQueueIndex] = useState(-1);
  const queueDragState = useRef({ active: false, startIdx: -1, overIdx: -1 });
  const queueItemEls = useRef([]);

  const audioRef = useRef(null);
  const vocalsRef = useRef(null);
  const drumsRef = useRef(null);
  const bassRef = useRef(null);
  const otherRef = useRef(null);
  const isFirstRender = useRef(true);

  // ── DERIVED DATA ──────────────────────────────────────────────────────────
  const rawViewedSongs = viewedPlaylistId === null ? playlist : playlistSongs;
  const currentSortKey = sortOrders[viewedPlaylistId ?? "global"] ?? null;

  const displayedSongs = [...rawViewedSongs]
    .filter(track => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (track.title || "").toLowerCase().includes(q) ||
        (track.artist || "").toLowerCase().includes(q) ||
        (track.album || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!currentSortKey) return 0;
      return (a[currentSortKey] || "").toString().localeCompare((b[currentSortKey] || "").toString());
    });

  const activePlaylistObj = userPlaylists.find(p => p.id === viewedPlaylistId);
  const currentTrack = queueCurrentTrack || (playbackQueue.length > 0 ? playbackQueue[playbackIndex] : undefined);

  // ── DYNAMIC QUEUE LIST (Responds to Play Mode) ────────────────────────────
  const [upcomingSourceList, setUpcomingSourceList] = useState([]);

  useEffect(() => {
    if (!playbackQueue || playbackQueue.length === 0) {
      setUpcomingSourceList([]);
      return;
    }

    if (playMode === 'order') {
      const list = playbackQueue.map((track, i) => ({ track, originalIndex: i })).slice(playbackIndex + 1);
      setUpcomingSourceList(list);
    } else if (playMode === 'repeat-all' || playMode === 'repeat-one') {
      const list = [
        ...playbackQueue.map((track, i) => ({ track, originalIndex: i })).slice(playbackIndex + 1),
        ...playbackQueue.map((track, i) => ({ track, originalIndex: i })).slice(0, playbackIndex)
      ];
      setUpcomingSourceList(list);
    } else if (playMode === 'shuffle') {
      const others = playbackQueue.map((track, i) => ({ track, originalIndex: i })).filter(obj => obj.originalIndex !== playbackIndex);
      // Stable Fisher-Yates shuffle
      for (let i = others.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [others[i], others[j]] = [others[j], others[i]];
      }
      setUpcomingSourceList(others);
    }
  }, [playbackQueue, playbackIndex, playMode]);

  // ── HELPERS ───────────────────────────────────────────────────────────────
  const handleSwitchPlaylist = (playlistId) => {
    setViewedPlaylistId(playlistId);
    setSearchQuery("");
  };

  const cycleSortKey = () => {
    const key = viewedPlaylistId ?? "global";
    const current = sortOrders[key] ?? null;
    const idx = SORT_CYCLE.indexOf(current);
    setSortOrders(prev => ({ ...prev, [key]: SORT_CYCLE[(idx + 1) % SORT_CYCLE.length] }));
  };

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Euphony',
        artwork: [{ src: currentTrack.poster_url || 'https://via.placeholder.com/512', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
    }
  }, [currentTrack, playMode, userQueue]);

  useEffect(() => {
    if (!sleepTimerTarget) return;
    const interval = setInterval(() => {
      if (Date.now() >= sleepTimerTarget) {
        audioRef.current?.pause();
        setIsPlaying(false);
        setSleepTimerTarget(null);
        triggerToast("Sleep timer ended. Playback paused.");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerTarget]);

  const handleSetSleepTimer = (mins) => {
    if (mins === 0) { setSleepTimerTarget(null); triggerToast("Sleep timer turned off"); }
    else { setSleepTimerTarget(Date.now() + mins * 60000); triggerToast(`Sleep timer set for ${mins} minutes`); }
    setShowSleepTimerModal(false);
  };

  useEffect(() => {
    stateRefs.current = { showUploadModal, showPlaylistModal, songForPlaylistModal, showSleepTimerModal, isMobilePlayerOpen, viewedPlaylistId, showQueue, showMixer };
  }, [showUploadModal, showPlaylistModal, songForPlaylistModal, showSleepTimerModal, isMobilePlayerOpen, viewedPlaylistId, showQueue, showMixer]);

  useEffect(() => {
    window.history.pushState({ page: 'euphony' }, '', window.location.href);
    const handlePopState = () => {
      const s = stateRefs.current;
      let handled = false;
      if (s.showUploadModal) { setShowUploadModal(false); handled = true; }
      else if (s.showPlaylistModal) { setShowPlaylistModal(false); handled = true; }
      else if (s.songForPlaylistModal) { setSongForPlaylistModal(null); handled = true; }
      else if (s.showSleepTimerModal) { setShowSleepTimerModal(false); handled = true; }
      else if (s.showMixer) { setShowMixer(false); handled = true; }
      else if (s.showQueue) { setShowQueue(false); handled = true; }
      else if (s.isMobilePlayerOpen) { setIsMobilePlayerOpen(false); handled = true; }
      else if (s.viewedPlaylistId !== null) { setViewedPlaylistId(null); handled = true; }

      if (handled) {
        window.history.pushState({ page: 'euphony' }, '', window.location.href);
        exitWarningRef.current = false;
        setShowExitToast(false);
      } else {
        if (!exitWarningRef.current) {
          exitWarningRef.current = true;
          setShowExitToast(true);
          window.history.pushState({ page: 'euphony' }, '', window.location.href);
          setTimeout(() => { exitWarningRef.current = false; setShowExitToast(false); }, 2500);
        } else { window.history.back(); }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", handleResize);
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setIsSessionLoaded(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (session) setSession(session);
    });
    return () => { window.removeEventListener("resize", handleResize); subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (viewedPlaylistId) localStorage.setItem("euphony_playlist_id", viewedPlaylistId);
    else localStorage.removeItem("euphony_playlist_id");
  }, [viewedPlaylistId]);

  useEffect(() => {
    if (!session?.user?.id) return;
    const fetchData = async () => {
      const { data: songsData } = await supabase.from("songs").select("*").order("created_at", { ascending: true });
      if (songsData) setPlaylist(songsData);
      const { data: playlistData } = await supabase.from("playlists").select("*").eq("user_id", session.user.id).order("created_at", { ascending: true });
      if (playlistData) setUserPlaylists(playlistData);
      setIsInitialLoad(false);
    };
    fetchData();
  }, [session?.user?.id]);

  useEffect(() => {
    if (viewedPlaylistId === null) return;
    const fetchPlaylistSongs = async () => {
      const { data } = await supabase.from("playlist_songs").select("song_id, added_at, songs(*)").eq("playlist_id", viewedPlaylistId);
      if (data) {
        const formattedSongs = data.map(item => ({ ...item.songs, added_at: item.added_at })).filter(item => item.id);
        setPlaylistSongs(formattedSongs);
      }
    };
    fetchPlaylistSongs();
  }, [viewedPlaylistId]);

  useEffect(() => {
    setStemsBroken(false);
    setShowLyrics(false);
    setActiveLyricIndex(-1);
    setActiveWordIndex(-1);
    setParsedLyrics(currentTrack?.lyrics ? parseLyrics(currentTrack.lyrics) : []);
  }, [currentTrack]);

  useEffect(() => {
    const isMixerActive = showMixer && currentTrack?.stem_vocals && !stemsBroken;
    if (audioRef.current) audioRef.current.volume = isMixerActive ? 0 : (isMuted ? 0 : volume);
    if (vocalsRef.current) vocalsRef.current.volume = isMixerActive ? (isMuted ? 0 : stemVolumes.vocals * (volume || 1)) : 0;
    if (drumsRef.current)  drumsRef.current.volume  = isMixerActive ? (isMuted ? 0 : stemVolumes.drums  * (volume || 1)) : 0;
    if (bassRef.current)   bassRef.current.volume   = isMixerActive ? (isMuted ? 0 : stemVolumes.bass   * (volume || 1)) : 0;
    if (otherRef.current)  otherRef.current.volume  = isMixerActive ? (isMuted ? 0 : stemVolumes.other  * (volume || 1)) : 0;
  }, [volume, isMuted, showMixer, stemVolumes, currentTrack, stemsBroken]);

  useEffect(() => {
    if (showMixer && currentTrack?.stem_vocals && audioRef.current && !stemsBroken) {
      const t = audioRef.current.currentTime;
      if (vocalsRef.current) vocalsRef.current.currentTime = t;
      if (drumsRef.current)  drumsRef.current.currentTime  = t;
      if (bassRef.current)   bassRef.current.currentTime   = t;
      if (otherRef.current)  otherRef.current.currentTime  = t;
    }
  }, [showMixer, currentTrack, stemsBroken]);

  useEffect(() => {
    const syncPlayState = async () => {
      if (isPlaying && currentTrack) {
        if (audioRef.current?.paused) audioRef.current.play().catch(e => console.log("play err:", e));
        if (showMixer && currentTrack?.stem_vocals && !stemsBroken) {
          vocalsRef.current?.play().catch(e => e);
          drumsRef.current?.play().catch(e => e);
          bassRef.current?.play().catch(e => e);
          otherRef.current?.play().catch(e => e);
        }
      } else {
        audioRef.current?.pause();
        vocalsRef.current?.pause();
        drumsRef.current?.pause();
        bassRef.current?.pause();
        otherRef.current?.pause();
      }
    };
    syncPlayState();
  }, [isPlaying, showMixer, currentTrack, stemsBroken]);

  const handleTimeUpdateRef = useRef();
  useEffect(() => {
    handleTimeUpdateRef.current = () => {
      if (!audioRef.current) return;
      const time = audioRef.current.currentTime;
      setCurrentTime(time);
      if (Math.floor(time) % 2 === 0) localStorage.setItem("euphony_current_time", time);

      if (showMixer && currentTrack?.stem_vocals && !stemsBroken) {
        const syncStem = (ref) => {
          if (ref.current && Math.abs(ref.current.currentTime - time) > 0.3) ref.current.currentTime = time;
        };
        syncStem(vocalsRef); syncStem(drumsRef); syncStem(bassRef); syncStem(otherRef);
      }

      if (parsedLyrics.length > 0) {
        let activeIndex = -1;
        for (let i = 0; i < parsedLyrics.length; i++) {
          if (time >= parsedLyrics[i].time) activeIndex = i;
          else break;
        }
        setActiveLyricIndex(activeIndex);
        if (activeIndex !== -1 && parsedLyrics[activeIndex].words) {
          const words = parsedLyrics[activeIndex].words;
          let wIndex = -1;
          for (let j = 0; j < words.length; j++) {
            if (time >= words[j].time) wIndex = j;
            else break;
          }
          setActiveWordIndex(wIndex);
        } else setActiveWordIndex(-1);
      }
    };
  });

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        handleTimeUpdateRef.current();
      }, 100); 
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (isFirstRender.current && audioRef.current && currentTrack) {
      const savedTime = localStorage.getItem("euphony_current_time");
      if (savedTime && !isNaN(parseFloat(savedTime))) {
        audioRef.current.currentTime = parseFloat(savedTime);
        setCurrentTime(parseFloat(savedTime));
      }
      isFirstRender.current = false;
    }
  }, [currentTrack]);

  const handleCanPlay = () => {
    if (pendingAutoPlayRef.current) {
      pendingAutoPlayRef.current = false;
      audioRef.current?.play().catch(e => console.log("canplay-play err:", e));
      if (showMixer && currentTrack?.stem_vocals && !stemsBroken) {
        vocalsRef.current?.play().catch(e => e);
        drumsRef.current?.play().catch(e => e);
        bassRef.current?.play().catch(e => e);
        otherRef.current?.play().catch(e => e);
      }
    }
  };

  const handleSeek = (e) => {
    const seekTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      if (vocalsRef.current) vocalsRef.current.currentTime = seekTime;
      if (drumsRef.current)  drumsRef.current.currentTime  = seekTime;
      if (bassRef.current)   bassRef.current.currentTime   = seekTime;
      if (otherRef.current)  otherRef.current.currentTime  = seekTime;
    }
  };

  const handleLyricClick = (time, e) => {
    if (e) e.stopPropagation();
    if (audioRef.current) { audioRef.current.currentTime = time; setCurrentTime(time); if (!isPlaying) setIsPlaying(true); }
  };

  useEffect(() => {
    if (activeLyricIndex !== -1 && lyricRefs.current[activeLyricIndex]) {
      lyricRefs.current[activeLyricIndex].scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeLyricIndex]);

  // ── STEM GENERATION ────────────────────────────────────
  const handleGenerateStemsClick = async () => {
    if (!currentTrack) return;
    setIsGeneratingStems(true);
    try {
      setGenerationStatus("Checking database...");
      const { data: songRecord, error: fetchError } = await supabase.from("songs").select("stem_vocals, stem_drums, stem_bass, stem_other").eq("id", currentTrack.id).single();
      if (fetchError && fetchError.code !== "PGRST116") throw fetchError;

      if (songRecord?.stem_vocals && songRecord?.stem_drums && songRecord?.stem_bass && songRecord?.stem_other) {
        const updatedTrack = { ...currentTrack, ...songRecord };
        setPlaylist(prev => prev.map(s => s.id === currentTrack.id ? updatedTrack : s));
        setPlaylistSongs(prev => prev.map(s => s.id === currentTrack.id ? updatedTrack : s));
        setPlaybackQueue(prev => prev.map(s => s.id === currentTrack.id ? updatedTrack : s));
        if (queueCurrentTrack?.id === currentTrack.id) setQueueCurrentTrack(updatedTrack);
        setStemsBroken(false); setIsGeneratingStems(false); triggerToast("Stems loaded from database!"); return;
      }

      setGenerationStatus("Sending job to Colab Worker...");
      const { error: updateError } = await supabase.from("songs").update({ needs_stems: true }).eq("id", currentTrack.id);
      if (updateError) throw updateError;
      setGenerationStatus("Waiting for Colab (~1 min)...");

      const pollInterval = setInterval(async () => {
        const { data: pollData } = await supabase.from("songs").select("stem_vocals, stem_drums, stem_bass, stem_other, needs_stems").eq("id", currentTrack.id).single();
        if (pollData?.stem_vocals && pollData?.stem_drums) {
          clearInterval(pollInterval);
          const finishedTrack = { ...currentTrack, ...pollData };
          setPlaylist(prev => prev.map(s => s.id === currentTrack.id ? finishedTrack : s));
          setPlaylistSongs(prev => prev.map(s => s.id === currentTrack.id ? finishedTrack : s));
          setPlaybackQueue(prev => prev.map(s => s.id === currentTrack.id ? finishedTrack : s));
          if (queueCurrentTrack?.id === currentTrack.id) setQueueCurrentTrack(finishedTrack);
          setStemsBroken(false); setIsGeneratingStems(false); setGenerationStatus(""); triggerToast("AI Stems generated successfully!");
        } else if (pollData?.needs_stems === false) {
          clearInterval(pollInterval); setIsGeneratingStems(false); setGenerationStatus(""); alert("Colab encountered an error processing this track.");
        }
      }, 5000);

      setTimeout(() => {
        clearInterval(pollInterval);
        setGenerationStatus(prev => { if (prev) { setIsGeneratingStems(false); alert("Processing timed out. Please ensure your Colab worker is running."); } return ""; });
      }, 300000);
    } catch (err) {
      console.error("Stem request error:", err); alert("Database Error:\n" + err.message);
      setIsGeneratingStems(false); setGenerationStatus("");
    }
  };

  const triggerToast = (msg) => { setQueueToast(msg); setTimeout(() => setQueueToast(""), 2200); };

  // ── QUEUE HANDLERS ────────────────────────────────────────────────────────
  const addToQueue = (song, e) => { if (e) e.stopPropagation(); setUserQueue(prev => [...prev, song]); triggerToast(`Added "${song.title}" to Queue`); };
  const removeFromQueue = (index, e) => { if (e) e.stopPropagation(); setUserQueue(prev => prev.filter((_, i) => i !== index)); };
  const clearQueue = (e) => { if (e) e.stopPropagation(); setUserQueue([]); };
  
  const reorderQueue = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    setUserQueue(prev => {
      const next = [...prev];
      const [removed] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, removed);
      return next;
    });
  };

  const handleQueueTouchStart = (e, index) => {
    queueDragState.current = { active: true, startIdx: index, overIdx: index };
    setDraggedQueueIndex(index);
  };

  const handleQueueTouchMove = (e) => {
    if (!queueDragState.current.active) return;
    const touch = e.touches[0];
    for (let i = 0; i < queueItemEls.current.length; i++) {
      const el = queueItemEls.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
        if (queueDragState.current.overIdx !== i) {
          queueDragState.current.overIdx = i;
          setDragOverQueueIndex(i);
        }
        break;
      }
    }
  };

  const handleQueueTouchEnd = () => {
    if (!queueDragState.current.active) return;
    const { startIdx, overIdx } = queueDragState.current;
    reorderQueue(startIdx, overIdx);
    queueDragState.current = { active: false, startIdx: -1, overIdx: -1 };
    setDraggedQueueIndex(-1);
    setDragOverQueueIndex(-1);
  };

  const playFromQueue = (index, e) => {
    if (e) e.stopPropagation();
    const song = userQueue[index];
    setUserQueue(prev => prev.filter((_, i) => i !== index));
    setQueueCurrentTrack(song);
    resetPlaybackTime();
    setIsPlaying(true);
    if (audioRef.current && song) {
      audioRef.current.src = song.url;
      audioRef.current.play().catch(err => console.log(err));
    }
  };

  const resetPlaybackTime = () => {
    setCurrentTime(0);
    localStorage.setItem("euphony_current_time", 0);
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (vocalsRef.current) vocalsRef.current.currentTime = 0;
    if (drumsRef.current) drumsRef.current.currentTime = 0;
    if (bassRef.current) bassRef.current.currentTime = 0;
    if (otherRef.current) otherRef.current.currentTime = 0;
  };

  const handlePlaySong = (index, listToSet, sourceName) => {
    const track = listToSet[index];
    setPlaybackQueue(listToSet);
    setPlaybackIndex(index);
    setPlaybackSourceName(sourceName);
    setQueueCurrentTrack(null);
    resetPlaybackTime();
    setIsPlaying(true);
    if (audioRef.current && track) {
      audioRef.current.src = track.url;
      audioRef.current.play().catch(err => console.log(err));
    }
  };

  // ── UPLOAD & PLAYLIST CRUD ────────────────────────────────────────────────
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle || !uploadArtist) return alert("Please fill in required fields.");
    setIsUploading(true);
    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}-audio.${fileExt}`;
      const { error: audioError } = await supabase.storage.from("songs").upload(fileName, uploadFile, { cacheControl: "3600" });
      if (audioError) throw audioError;
      const { data: { publicUrl: audioUrl } } = supabase.storage.from("songs").getPublicUrl(fileName);
      let posterUrl = null;
      if (uploadPoster) {
        const posterExt = uploadPoster.name.split('.').pop();
        const posterName = `${Date.now()}-poster.${posterExt}`;
        const { error: posterError } = await supabase.storage.from("songs").upload(posterName, uploadPoster, { cacheControl: "3600" });
        if (posterError) throw posterError;
        posterUrl = supabase.storage.from("songs").getPublicUrl(posterName).data.publicUrl;
      }
      const { data: dbData, error: dbError } = await supabase.from("songs").insert([{ title: uploadTitle, artist: uploadArtist, album: uploadAlbum || null, lyrics: uploadLyrics || null, url: audioUrl, poster_url: posterUrl }]).select();
      if (dbError) throw dbError;
      setPlaylist(prev => [...prev, dbData[0]]);
      setShowUploadModal(false);
      setUploadTitle(""); setUploadArtist(""); setUploadAlbum(""); setUploadLyrics(""); setUploadFile(null); setUploadPoster(null);
      alert("Song uploaded successfully!");
    } catch (error) { alert("Error uploading: " + error.message); } finally { setIsUploading(false); }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const { data, error } = await supabase.from("playlists").insert([{ name: newPlaylistName, user_id: session.user.id }]).select();
    if (error) alert("Error creating playlist: " + error.message);
    else if (data) { setUserPlaylists(prev => [...prev, data[0]]); setNewPlaylistName(""); setShowPlaylistModal(false); }
  };

  const handleAddSongToPlaylist = async (playlistId, songId) => {
    const { error } = await supabase.from("playlist_songs").insert([{ playlist_id: playlistId, song_id: songId }]);
    if (error) { if (error.code === "23505") alert("Song is already in this playlist."); else alert("Error adding song: " + error.message); }
    else triggerToast("Added to playlist successfully!");
  };

  const handleRemoveSongFromPlaylist = async (playlistId, songId, e) => {
    e.stopPropagation();
    const { error } = await supabase.from("playlist_songs").delete().eq("playlist_id", playlistId).eq("song_id", songId);
    if (!error) setPlaylistSongs(prev => prev.filter(s => s.id !== songId));
  };

  const handlePlayPause = (e) => {
    if (e) e.stopPropagation();
    if (!audioRef.current) return;
    if (playbackQueue.length === 0 && playlist.length > 0) {
       handlePlaySong(0, playlist, "Global Library");
       return;
    }
    if (!currentTrack) return;
    setIsPlaying(prev => !prev);
  };

  const cyclePlayMode = () => {
    const idx = PLAY_MODES.indexOf(playMode);
    setPlayMode(PLAY_MODES[(idx + 1) % PLAY_MODES.length]);
  };

  // ── ALIGNED PLAYBACK ADVANCEMENT ──────────────────────────────────────────
  const handleNext = (e) => {
    if (e) e.stopPropagation();
    
    // Play user queue first
    if (userQueue.length > 0) {
      const nextSong = userQueue[0];
      setUserQueue(prev => prev.slice(1));
      setQueueCurrentTrack(nextSong);
      resetPlaybackTime();
      setIsPlaying(true);
      if (audioRef.current && nextSong) {
        audioRef.current.src = nextSong.url;
        audioRef.current.play().catch(err => console.log(err));
      }
      return;
    }
    
    // Play upcoming source queue 
    if (upcomingSourceList.length > 0) {
      const nextIdx = upcomingSourceList[0].originalIndex;
      setQueueCurrentTrack(null);
      setPlaybackIndex(nextIdx);
      resetPlaybackTime();
      setIsPlaying(true);
      if (audioRef.current && playbackQueue[nextIdx]) {
        audioRef.current.src = playbackQueue[nextIdx].url;
        audioRef.current.play().catch(err => console.log(err));
      }
    } else if (playMode === 'repeat-all' || playMode === 'repeat-one') {
      // Loop single song if it's the only one left and loop is on
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); }
    } else {
      setIsPlaying(false);
    }
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (playbackQueue.length === 0) return;
    
    // Restart song if played more than 3 seconds
    if (audioRef.current && audioRef.current.currentTime > 3) { 
        audioRef.current.currentTime = 0; 
        return; 
    }
    
    let prevIdx = playbackIndex - 1;
    if (prevIdx < 0) prevIdx = playbackQueue.length - 1; // Wrap around for previous
    
    setQueueCurrentTrack(null);
    setPlaybackIndex(prevIdx);
    resetPlaybackTime();
    setIsPlaying(true);
    
    const prevSong = playbackQueue[prevIdx];
    if (audioRef.current && prevSong) {
      audioRef.current.src = prevSong.url;
      audioRef.current.play().catch(err => console.log(err));
    }
  };

  const handleTrackEnded = () => {
    if (playMode === "repeat-one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }
    
    if (userQueue.length > 0) {
      const nextSong = userQueue[0];
      setUserQueue(prev => prev.slice(1));
      setQueueCurrentTrack(nextSong);
      resetPlaybackTime();
      setIsPlaying(true);
      if (audioRef.current && nextSong) {
        audioRef.current.src = nextSong.url;
        audioRef.current.play().catch(err => console.log(err));
      }
      return;
    }
    
    if (upcomingSourceList.length > 0) {
      const nextIdx = upcomingSourceList[0].originalIndex;
      setQueueCurrentTrack(null);
      setPlaybackIndex(nextIdx);
      resetPlaybackTime();
      setIsPlaying(true);
      if (audioRef.current && playbackQueue[nextIdx]) {
        audioRef.current.src = playbackQueue[nextIdx].url;
        audioRef.current.play().catch(err => console.log(err));
      }
    } else {
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (isMuted) { setIsMuted(false); setVolume(previousVolume || 0.5); }
    else { setPreviousVolume(volume); setIsMuted(true); setVolume(0); }
  };

  const toggleStemMixer = (e) => {
    if (e) e.stopPropagation();
    const willShow = !showMixer;
    setShowMixer(willShow);
    if (willShow) { setShowLyrics(false); setShowQueue(false); }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };
  const formatDate = (dateStr) => {
    if (!dateStr) return "Recently";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const renderModeIcon = (iconColor = COLORS.primary) => {
    switch (playMode) {
      case "repeat-all": return <Repeat size={20} color={iconColor} />;
      case "repeat-one": return <Repeat1 size={20} color={iconColor} />;
      case "shuffle": return <Shuffle size={20} color={iconColor} />;
      default: return <ArrowRight size={20} color={iconColor} />;
    }
  };

  const renderSortButton = (isMobile) => {
    const label = currentSortKey ? `By ${SORT_LABELS[currentSortKey]}` : "Sort";
    return (
      <button onClick={cycleSortKey} className="hover-effect" title={`Sort: ${currentSortKey ? SORT_LABELS[currentSortKey] : "Default"}`}
        style={{ background: currentSortKey ? COLORS.primary : "transparent", color: currentSortKey ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isMobile ? "6px 12px" : "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", transition: "all 0.2s ease", flexShrink: 0 }}>
        <ArrowUpDown size={14} />
        {!isMobile && <span>{label}</span>}
      </button>
    );
  };

  // ── MIXER BLOCK ───────────────────────────────────────────────
  const renderMixerBlock = (isMobile) => (
    <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: isMobile ? "16px" : "18px", background: "rgba(10, 15, 26, 0.75)", backdropFilter: "blur(20px)", borderRadius: "12px", textAlign: "center", color: "#FFFFFF", display: "flex", flexDirection: "column" }}>
      <h4 style={{ margin: "4px 0 12px 0", fontSize: "14px", textTransform: "uppercase", letterSpacing: "2px", color: "rgba(255,255,255,0.8)" }}>AI Stem Mixer</h4>
      {!currentTrack?.stem_vocals || stemsBroken ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          {isGeneratingStems ? (
            <><Loader2 className="animate-spin" size={40} color={COLORS.spotifyGreen} style={{ marginBottom: "16px" }} /><p style={{ fontSize: "14px", fontWeight: "bold", color: COLORS.spotifyGreen }}>{generationStatus}</p></>
          ) : (
            <><SlidersHorizontal size={40} color="rgba(255,255,255,0.4)" style={{ marginBottom: "16px" }} />
              <p style={{ fontSize: "14px", marginBottom: "20px", padding: "0 20px", color: "rgba(255,255,255,0.7)" }}>
                Unlock individual instruments and vocals using Cloud AI.
                {stemsBroken && <span style={{ display: "block", marginTop: "8px", color: "#ff6b6b", fontSize: "12px" }}>Stems failed to load. Try re-generating.</span>}
              </p>
              <button onClick={handleGenerateStemsClick} style={{ background: COLORS.spotifyGreen, color: "#fff", border: "none", padding: "12px 24px", borderRadius: "24px", fontWeight: "bold", fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }} className="hover-effect">
                {stemsBroken ? "Re-generate Stems" : "Generate Stems"}
              </button></>
          )}
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-evenly", width: "100%", flex: 1, padding: "14px 0 10px 0", alignItems: "center", overflow: "hidden" }}>
            {["vocals", "drums", "bass", "other"].map((stemType) => (
              <div key={stemType} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", height: "100%", flex: 1 }}>
                <div style={{ position: "relative", width: "30px", height: "90px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <input type="range" min="0" max="1" step="0.01" value={stemVolumes[stemType]}
                    onChange={(e) => setStemVolumes({ ...stemVolumes, [stemType]: parseFloat(e.target.value) })}
                    style={{ position: "absolute", appearance: "none", width: isMobile ? "75px" : "85px", height: "4px", background: `linear-gradient(to right, ${COLORS.spotifyGreen} ${stemVolumes[stemType] * 100}%, rgba(255,255,255,0.2) ${stemVolumes[stemType] * 100}%)`, transform: "rotate(-90deg)", transformOrigin: "center", borderRadius: "4px" }}
                    className="stem-fader" />
                </div>
                <span style={{ fontSize: "10px", fontWeight: "bold", textTransform: "capitalize", color: stemVolumes[stemType] === 0 ? "rgba(255,255,255,0.4)" : "#fff", marginTop: "12px" }}>{stemType}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderLyricsBlock = (isMobile) => (
    <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: "24px 16px", overflowY: "auto", background: COLORS.primary, textAlign: "center", borderRadius: "12px" }}>
      {parsedLyrics.length > 0 ? (
        <div style={{ padding: isMobile ? "80px 0" : "120px 0" }}>
          {parsedLyrics.map((lyric, index) => {
            const isActiveLine = index === activeLyricIndex;
            return (
              <div key={index} ref={el => lyricRefs.current[index] = el} onClick={(e) => handleLyricClick(lyric.time, e)}
                style={{ fontSize: isActiveLine ? (isMobile ? "24px" : "22px") : (isMobile ? "18px" : "16px"), fontWeight: isActiveLine ? "800" : "600", color: isActiveLine ? COLORS.bgBase : "rgba(243, 240, 230, 0.4)", textShadow: isActiveLine && !lyric.words ? `0 0 16px rgba(243, 240, 230, 0.6)` : "none", padding: "10px 0", transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)", transform: isActiveLine ? "scale(1.05)" : "scale(1)", lineHeight: "1.4", cursor: "pointer" }}>
                {lyric.words ? lyric.words.map((wordObj, wIndex) => {
                  const isActiveWord = isActiveLine && wIndex === activeWordIndex;
                  const isPastWord = isActiveLine && wIndex < activeWordIndex;
                  return (
                    <span key={wIndex} onClick={(e) => handleLyricClick(wordObj.time, e)}
                      style={{ color: (isActiveWord || isPastWord) ? COLORS.bgBase : "rgba(243, 240, 230, 0.4)", textShadow: isActiveWord ? `0 0 16px rgba(243, 240, 230, 0.8)` : "none", transition: "all 0.2s ease", marginRight: "4px", cursor: "pointer" }}>
                      {wordObj.text}
                    </span>
                  );
                }) : lyric.text}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ color: COLORS.bgBase, opacity: 0.6, fontSize: "15px", fontWeight: "500", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {currentTrack?.lyrics ? currentTrack.lyrics : "No synchronized lyrics available."}
        </div>
      )}
    </div>
  );

  // ── QUEUE BLOCK ───────────────────────────────────────────────────────────
  const renderQueueBlock = (isMobile) => {
    return (
      <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: isMobile ? "16px" : "18px", overflowY: "auto", background: "rgba(10, 15, 26, 0.75)", backdropFilter: "blur(20px)", borderRadius: "12px", textAlign: "left", color: "#FFFFFF" }}>

        {/* NOW PLAYING */}
        <div style={{ marginBottom: "22px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.6)" }}>Now Playing</h4>
          {currentTrack && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 10px", borderRadius: "8px", background: "rgba(255,255,255,0.08)" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, backgroundColor: "#222", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={18} color="#888" />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: COLORS.spotifyGreen, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.title}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.artist}</div>
              </div>
              {isPlaying && (
                <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "14px", width: "16px", paddingBottom: "1px" }}>
                  <div className="eq-bar" style={{ animationDelay: "0s" }}></div>
                  <div className="eq-bar" style={{ animationDelay: "0.2s" }}></div>
                  <div className="eq-bar" style={{ animationDelay: "0.4s" }}></div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* USER QUEUE – drag-to-reorder */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h4 style={{ margin: 0, fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.6)" }}>
              Next In Queue {userQueue.length > 0 && <span style={{ background: COLORS.spotifyGreen, color: "#fff", borderRadius: "10px", padding: "1px 7px", fontSize: "11px", marginLeft: "6px" }}>{userQueue.length}</span>}
            </h4>
            {userQueue.length > 0 && <button onClick={clearQueue} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", fontSize: "12px", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}>Clear</button>}
          </div>
          {userQueue.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {userQueue.map((song, qIndex) => (
                <div
                  key={`queue-${song.id}-${qIndex}`}
                  ref={el => { queueItemEls.current[qIndex] = el; }}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDraggedQueueIndex(qIndex); }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverQueueIndex(qIndex); }}
                  onDrop={(e) => { e.preventDefault(); reorderQueue(draggedQueueIndex, qIndex); setDraggedQueueIndex(-1); setDragOverQueueIndex(-1); }}
                  onDragEnd={() => { setDraggedQueueIndex(-1); setDragOverQueueIndex(-1); }}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "6px", background: dragOverQueueIndex === qIndex && draggedQueueIndex !== qIndex ? "rgba(29,185,84,0.18)" : "rgba(255,255,255,0.04)", opacity: draggedQueueIndex === qIndex ? 0.4 : 1, transition: "background 0.15s, opacity 0.15s", cursor: "default", borderTop: dragOverQueueIndex === qIndex && draggedQueueIndex !== qIndex && draggedQueueIndex > qIndex ? `2px solid ${COLORS.spotifyGreen}` : "2px solid transparent", borderBottom: dragOverQueueIndex === qIndex && draggedQueueIndex !== qIndex && draggedQueueIndex < qIndex ? `2px solid ${COLORS.spotifyGreen}` : "2px solid transparent" }}
                >
                  <div onTouchStart={(e) => handleQueueTouchStart(e, qIndex)} onTouchMove={handleQueueTouchMove} onTouchEnd={handleQueueTouchEnd} style={{ flexShrink: 0, cursor: "grab", padding: "4px 2px", touchAction: "none", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center" }}><GripVertical size={14} /></div>
                  <div style={{ width: "36px", height: "36px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, backgroundColor: "#222", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {song.poster_url ? <img src={song.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={16} color="#888" />}
                  </div>
                  <div onClick={(e) => playFromQueue(qIndex, e)} style={{ minWidth: 0, flex: 1, cursor: "pointer" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artist}</div>
                  </div>
                  <button onClick={(e) => removeFromQueue(qIndex, e)} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: "4px", flexShrink: 0 }}><X size={16} /></button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontStyle: "italic", padding: "4px 0" }}>
              No songs queued. Tap <ListPlus size={12} style={{ verticalAlign: "middle", margin: "0 2px" }} /> next to any song to add it.
            </div>
          )}
          {userQueue.length > 0 && (
            <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Drag <GripVertical size={10} style={{ verticalAlign: "middle" }} /> to reorder · Tap a song to play it now</p>
          )}
        </div>

        {/* NEXT FROM SOURCE - Refined via upcomingSourceList */}
        <div>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", color: "rgba(255,255,255,0.6)" }}>Next From: {playbackSourceName}</h4>
          {upcomingSourceList.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {upcomingSourceList.map((item, uIdx) => {
                const song = item.track;
                const actualIndex = item.originalIndex;
                return (
                  <div key={`next-${song.id}-${uIdx}`} onClick={() => handlePlaySong(actualIndex, playbackQueue, playbackSourceName)} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 8px", borderRadius: "6px", background: "transparent", cursor: "pointer" }} className="hover-effect">
                    <div style={{ width: "36px", height: "36px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, backgroundColor: "#222", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {song.poster_url ? <img src={song.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={16} color="#888" />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.title}</div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{song.artist}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>End of playlist.</div>
          )}
        </div>
      </div>
    );
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isSessionLoaded) return <div style={{ background: COLORS.bgBase, width: '100vw', height: '100vh' }} />;
  if (!session) return <Auth />;

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: COLORS.bgBase, color: COLORS.textMain, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        :root { max-width: none !important; }
        body, html, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; background: ${COLORS.bgBase} !important; overflow: hidden !important; box-sizing: border-box; text-align: left !important; -webkit-user-select: none; -moz-user-select: none; user-select: none; -webkit-touch-callout: none; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input, textarea { -webkit-user-select: auto; -moz-user-select: auto; user-select: auto; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes toastUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
        @keyframes bounceEq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        .fade-enter { animation: fadeIn 0.35s ease-out forwards; }
        .slide-up-enter { animation: slideUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pop-enter { animation: popIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .toast-enter { animation: toastUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hover-effect { transition: transform 0.2s ease, opacity 0.2s ease; }
        .hover-effect:hover { transform: scale(1.05); }
        .playlist-row { transition: background 0.2s ease; }
        .playlist-row:hover { background: ${COLORS.hover} !important; }
        .sidebar-item { transition: color 0.2s ease; cursor: pointer; }
        .sidebar-item:hover { color: ${COLORS.primary} !important; opacity: 0.8; }
        .eq-bar { width: 3px; height: 14px; background-color: ${COLORS.spotifyGreen}; border-radius: 3px; animation: bounceEq 1s infinite ease-in-out; transform-origin: bottom; }
        
        .glow-slider { 
          -webkit-appearance: none; 
          appearance: none; 
          height: 6px; 
          border-radius: 6px; 
          outline: none; 
          cursor: pointer; 
        }
        .glow-slider::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          appearance: none; 
          width: 2px;
          height: 6px;
          border-radius: 0;
          background: #FFFFFF;
          cursor: pointer;
          box-shadow: 
            -2px 0 6px 2px rgba(255, 255, 255, 1),
            -10px 0 10px 3px rgba(255, 255, 255, 0.8),
            -20px 0 15px 4px rgba(255, 255, 255, 0.4);
          transition: transform 0.1s ease;
        }
        .glow-slider::-moz-range-thumb { 
          width: 2px; 
          height: 6px; 
          border: none;
          border-radius: 0;
          background: #FFFFFF;
          cursor: pointer;
          box-shadow: 
            -2px 0 6px 2px rgba(255, 255, 255, 1),
            -10px 0 10px 3px rgba(255, 255, 255, 0.8),
            -20px 0 15px 4px rgba(255, 255, 255, 0.4);
          transition: transform 0.1s ease;
        }
        
        .stem-fader { -webkit-appearance: none; appearance: none; outline: none; cursor: pointer; }
        .stem-fader::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 0 10px 3px #FFFFFF; cursor: pointer; }
        .stem-fader::-moz-range-thumb { width: 14px; height: 14px; border: none; border-radius: 50%; background: #FFFFFF; box-shadow: 0 0 10px 3px #FFFFFF; cursor: pointer; }
        .upload-input { width: 100%; padding: 12px; background: #FFFFFF; border: 1px solid ${COLORS.border}; border-radius: 8px; color: ${COLORS.primary}; margin-bottom: 16px; outline: none; transition: border-color 0.2s ease; }
        .upload-input:focus { border-color: ${COLORS.primary}; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(26,43,76,0.2); border-radius: 10px; border: 2px solid transparent; }
      `}</style>

      {/* ── AUDIO ELEMENTS ── */}
      <audio
        ref={audioRef}
        src={currentTrack?.url || undefined}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={handleTrackEnded}
        onCanPlay={handleCanPlay}
        preload="auto"
        playsInline
      />
      <audio ref={vocalsRef} src={currentTrack?.stem_vocals || undefined} preload="auto" playsInline onError={() => currentTrack?.stem_vocals && setStemsBroken(true)} />
      <audio ref={drumsRef}  src={currentTrack?.stem_drums  || undefined} preload="auto" playsInline onError={() => currentTrack?.stem_drums  && setStemsBroken(true)} />
      <audio ref={bassRef}   src={currentTrack?.stem_bass   || undefined} preload="auto" playsInline onError={() => currentTrack?.stem_bass   && setStemsBroken(true)} />
      <audio ref={otherRef}  src={currentTrack?.stem_other  || undefined} preload="auto" playsInline onError={() => currentTrack?.stem_other  && setStemsBroken(true)} />

      {/* TOASTS */}
      {queueToast && (
        <div className="toast-enter" style={{ position: "fixed", top: "80px", left: "50%", background: COLORS.primary, color: COLORS.bgBase, padding: "10px 20px", borderRadius: "20px", fontSize: "14px", fontWeight: "600", zIndex: 9999, boxShadow: "0 8px 16px rgba(0,0,0,0.25)", pointerEvents: "none", transform: "translateX(-50%)" }}>
          {queueToast}
        </div>
      )}
      {showExitToast && (
        <div className="toast-enter" style={{ position: "fixed", bottom: isDesktop ? "40px" : "100px", left: "50%", background: "rgba(26, 43, 76, 0.85)", color: COLORS.bgBase, padding: "12px 24px", borderRadius: "24px", fontSize: "14px", fontWeight: "600", zIndex: 9999, backdropFilter: "blur(8px)", boxShadow: "0 8px 16px rgba(0,0,0,0.2)", pointerEvents: "none", transform: "translateX(-50%)" }}>
          Press back again to exit
        </div>
      )}

      {/* OVERLAY LOADER */}
      {isInitialLoad && (
        <div className="fade-enter" style={{ position: "fixed", inset: 0, zIndex: 9999, background: COLORS.bgBase, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: COLORS.primary }}>
          <Loader2 className="animate-spin" size={48} />
          <p style={{ marginTop: "16px", fontWeight: "500" }}>Loading your tracks...</p>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div className="fade-enter" style={{ position: "fixed", inset: 0, background: "rgba(26, 43, 76, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5500, padding: "20px" }} onClick={() => setShowUploadModal(false)}>
          <div className="pop-enter custom-scrollbar" style={{ background: COLORS.bgPanel, padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "400px", position: "relative", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(26,43,76,0.15)" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUploadModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: COLORS.primary }}><UploadCloud color={COLORS.primary} /> Add Song Globally</h2>
            <form onSubmit={handleUploadSubmit}>
              <input type="text" placeholder="Song Title *" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="upload-input" />
              <input type="text" placeholder="Artist Name *" required value={uploadArtist} onChange={e => setUploadArtist(e.target.value)} className="upload-input" />
              <input type="text" placeholder="Album Name (Optional)" value={uploadAlbum} onChange={e => setUploadAlbum(e.target.value)} className="upload-input" />
              <textarea placeholder="Paste Lyrics Here (Optional)" value={uploadLyrics} onChange={e => setUploadLyrics(e.target.value)} className="upload-input custom-scrollbar" style={{ minHeight: "100px", resize: "vertical" }} />
              <div style={{ marginBottom: "16px", padding: "12px", border: `1px dashed ${COLORS.border}`, borderRadius: "8px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: COLORS.textMuted, fontSize: "14px" }}>Poster Image (Optional)</label>
                <input type="file" accept="image/*" onChange={e => setUploadPoster(e.target.files[0])} style={{ color: COLORS.textMain, width: "100%" }} />
              </div>
              <div style={{ marginBottom: "24px", padding: "12px", border: `1px dashed ${COLORS.border}`, borderRadius: "8px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: COLORS.textMuted, fontSize: "14px" }}>MP3 Audio File *</label>
                <input type="file" accept="audio/*" required onChange={e => setUploadFile(e.target.files[0])} style={{ color: COLORS.textMain, width: "100%" }} />
              </div>
              <button type="submit" disabled={isUploading} style={{ width: "100%", padding: "14px", borderRadius: "8px", background: isUploading ? COLORS.textMuted : COLORS.primary, color: COLORS.bgPanel, border: "none", fontWeight: "bold", cursor: isUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {isUploading ? <><Loader2 size={18} className="animate-spin" /> Uploading...</> : "Upload to Cloud"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {showPlaylistModal && (
        <div className="fade-enter" style={{ position: "fixed", inset: 0, background: "rgba(26, 43, 76, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5500, padding: "20px" }} onClick={() => setShowPlaylistModal(false)}>
          <div className="pop-enter" style={{ background: COLORS.bgPanel, padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "380px", position: "relative", boxShadow: "0 20px 40px rgba(26,43,76,0.15)" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPlaylistModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: COLORS.primary }}><FolderPlus color={COLORS.primary} /> Create Private Playlist</h2>
            <form onSubmit={handleCreatePlaylist}>
              <input type="text" placeholder="Playlist Name *" required value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} className="upload-input" />
              <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: "8px", background: COLORS.primary, color: COLORS.bgPanel, border: "none", fontWeight: "bold", cursor: "pointer" }} className="hover-effect">Save Playlist</button>
            </form>
          </div>
        </div>
      )}

      {/* SLEEP TIMER MODAL */}
      {showSleepTimerModal && (
        <div className="fade-enter" style={{ position: "fixed", inset: 0, background: "rgba(26, 43, 76, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5500, padding: "20px" }} onClick={() => setShowSleepTimerModal(false)}>
          <div className="pop-enter custom-scrollbar" style={{ background: COLORS.bgPanel, padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "340px", position: "relative", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(26,43,76,0.15)" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSleepTimerModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: COLORS.primary }}><Moon color={COLORS.primary} /> Sleep Timer</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[5, 10, 20, 30, 60, 120].map(mins => (
                <button key={mins} onClick={() => handleSetSleepTimer(mins)} className="hover-effect" style={{ width: "100%", padding: "14px", borderRadius: "8px", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.primary, fontWeight: "bold", cursor: "pointer", textAlign: "left" }}>
                  {mins === 60 ? "1 hour" : mins === 120 ? "2 hours" : `${mins} minutes`}
                </button>
              ))}
              <div style={{ margin: "8px 0", height: "1px", background: COLORS.border }} />
              <button onClick={() => handleSetSleepTimer(0)} className="hover-effect" style={{ width: "100%", padding: "14px", borderRadius: "8px", background: sleepTimerTarget ? "#ffebee" : "transparent", border: `1px solid ${sleepTimerTarget ? "#ffcdd2" : COLORS.border}`, color: sleepTimerTarget ? "#d32f2f" : COLORS.textMuted, fontWeight: "bold", cursor: "pointer", textAlign: "left" }}>
                Turn off timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD TO PLAYLIST MODAL */}
      {songForPlaylistModal && (
        <div className="fade-enter" style={{ position: "fixed", inset: 0, background: "rgba(26, 43, 76, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5500, padding: "20px" }} onClick={() => setSongForPlaylistModal(null)}>
          <div className="pop-enter custom-scrollbar" style={{ background: COLORS.bgPanel, padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "380px", position: "relative", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(26,43,76,0.15)" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSongForPlaylistModal(null)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: COLORS.primary }}><FolderPlus color={COLORS.primary} /> Add to Playlist</h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: COLORS.textMuted }}>"{songForPlaylistModal.title}"</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {userPlaylists.length > 0
                ? userPlaylists.map(pl => (
                    <button key={pl.id} onClick={() => { handleAddSongToPlaylist(pl.id, songForPlaylistModal.id); setSongForPlaylistModal(null); }} className="hover-effect" style={{ width: "100%", padding: "14px", borderRadius: "8px", background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.primary, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px" }}>
                      <ListMusic size={18} /> {pl.name}
                    </button>
                  ))
                : (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <p style={{ color: COLORS.textMuted, fontSize: "14px", margin: "0 0 16px 0" }}>You don't have any playlists yet.</p>
                    <button onClick={() => { setSongForPlaylistModal(null); setShowPlaylistModal(true); }} style={{ background: COLORS.primary, color: COLORS.bgPanel, border: "none", borderRadius: "8px", padding: "12px 20px", fontWeight: "bold", cursor: "pointer" }} className="hover-effect">
                      Create a Playlist
                    </button>
                  </div>
                )
              }
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER */}
      <div style={{ height: "64px", flexShrink: 0, background: COLORS.bgBase, display: "flex", justifyContent: "space-between", alignItems: "center", padding: isDesktop ? "0 24px" : "0 12px", borderBottom: `1px solid ${COLORS.border}`, zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: isDesktop ? "24px" : "20px", color: COLORS.primary, fontWeight: "800", letterSpacing: "-0.5px" }}>Euphony</h1>
        <div style={{ display: "flex", gap: isDesktop ? "12px" : "8px", alignItems: "center" }}>
          <button className="hover-effect" onClick={() => window.location.reload()} style={{ background: "transparent", border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.primary, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <RefreshCw size={16} />{isDesktop && " Refresh"}
          </button>
          <button className="hover-effect" onClick={() => setShowUploadModal(true)} style={{ background: COLORS.primary, border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.bgPanel, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <Plus size={16} color={COLORS.bgPanel} />{isDesktop && " Add Globally"}
          </button>
          <button className="hover-effect" onClick={() => setShowPlaylistModal(true)} style={{ background: COLORS.primary, border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.bgPanel, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <FolderPlus size={16} color={COLORS.bgPanel} />{isDesktop && " New Playlist"}
          </button>
          <button className="hover-effect" onClick={() => { localStorage.clear(); supabase.auth.signOut(); }} style={{ background: "transparent", border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.primary, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center" }}>
            {isDesktop ? "Log Out" : <LogOut size={16} />}
          </button>
        </div>
      </div>

      {/* MAIN BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: isDesktop ? "12px" : "4px", gap: isDesktop ? "12px" : "0" }}>

        {/* LEFT SIDEBAR */}
        {isDesktop && (
          <div style={{ width: "260px", flexShrink: 0, background: COLORS.bgPanel, borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", border: `1px solid ${COLORS.border}` }}>
            <div>
              <div onClick={() => handleSwitchPlaylist(null)} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: viewedPlaylistId === null ? COLORS.primary : COLORS.textMuted, fontWeight: "bold", fontSize: "15px" }}>
                <Home size={24} color={viewedPlaylistId === null ? COLORS.primary : COLORS.textMuted} /> Global Library
              </div>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${COLORS.border}`, margin: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
              <span style={{ fontSize: "12px", fontWeight: "bold", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Playlists</span>
              {userPlaylists.map(pl => (
                <div key={pl.id} onClick={() => handleSwitchPlaylist(pl.id)} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "12px", color: viewedPlaylistId === pl.id ? COLORS.primary : COLORS.textMuted, fontSize: "15px", padding: "4px 0", fontWeight: viewedPlaylistId === pl.id ? "bold" : "normal" }}>
                  <ListMusic size={20} color={viewedPlaylistId === pl.id ? COLORS.primary : COLORS.textMuted} />
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CENTER CONTENT */}
        <div style={{ flex: 1, minWidth: 0, background: COLORS.bgPanel, borderRadius: isDesktop ? "12px" : "0", padding: isDesktop ? "32px" : "16px", overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: !isDesktop && currentTrack ? "100px" : "32px", border: isDesktop ? `1px solid ${COLORS.border}` : "none" }} className="custom-scrollbar">

          {/* MOBILE TABS */}
          {!isDesktop && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "16px", flexShrink: 0 }} className="custom-scrollbar">
              <button onClick={() => handleSwitchPlaylist(null)} style={{ background: viewedPlaylistId === null ? COLORS.primary : "transparent", color: viewedPlaylistId === null ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease" }}>
                Global Library
              </button>
              {userPlaylists.map(pl => (
                <button key={pl.id} onClick={() => handleSwitchPlaylist(pl.id)} style={{ background: viewedPlaylistId === pl.id ? COLORS.primary : "transparent", color: viewedPlaylistId === pl.id ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease" }}>
                  🔒 {pl.name}
                </button>
              ))}
            </div>
          )}

          <div key={viewedPlaylistId || 'global'} className="fade-enter" style={{ width: "100%" }}>

            {/* PLAYLIST HERO */}
            {viewedPlaylistId !== null && activePlaylistObj && (
              <div style={{ background: `linear-gradient(180deg, #E2D9C5 0%, ${COLORS.bgPanel} 100%)`, padding: isDesktop ? "40px 32px" : "24px", borderRadius: "12px", marginBottom: "32px", display: "flex", alignItems: isDesktop ? "flex-end" : "center", flexDirection: isDesktop ? "row" : "column", gap: "24px", border: `1px solid ${COLORS.border}` }}>
                <div style={{ width: isDesktop ? "180px" : "140px", height: isDesktop ? "180px" : "140px", backgroundColor: COLORS.primary, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(26,43,76,0.15)", flexShrink: 0 }}>
                  <FolderPlus size={isDesktop ? 72 : 56} color={COLORS.bgPanel} />
                </div>
                <div style={{ flex: 1, minWidth: 0, textAlign: isDesktop ? "left" : "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: COLORS.textMuted }}>Private Playlist</span>
                  <h2 style={{ margin: "8px 0 16px 0", fontSize: isDesktop ? "48px" : "32px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: COLORS.primary }}>{activePlaylistObj.name}</h2>
                  <p style={{ margin: 0, fontSize: "15px", color: COLORS.textMuted, fontWeight: "500" }}>Your personal collection • {playlistSongs.length} songs</p>
                </div>
              </div>
            )}

            {/* PLAYLIST VIEW */}
            {viewedPlaylistId !== null ? (
              <div style={{ width: "100%" }}>
                {playlistSongs.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", justifyContent: isDesktop ? "flex-start" : "center", flexWrap: "wrap" }}>
                    {displayedSongs.length > 0 && (
                      <button onClick={() => handlePlaySong(0, displayedSongs, activePlaylistObj?.name || "Playlist")} className="hover-effect" style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.primary, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 16px rgba(26,43,76,0.2)", flexShrink: 0 }}>
                        <Play size={24} fill={COLORS.bgPanel} color={COLORS.bgPanel} style={{ marginLeft: "3px" }} />
                      </button>
                    )}
                    
                    <div style={{ display: "flex", alignItems: "center", background: "rgba(26,43,76,0.05)", borderRadius: "20px", padding: "6px 12px", border: `1px solid ${COLORS.border}`, flex: isDesktop ? "0 0 auto" : 1, minWidth: 0 }}>
                      <Search size={16} color={COLORS.textMuted} style={{ flexShrink: 0 }} />
                      <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", marginLeft: "8px", fontSize: "14px", color: COLORS.primary, width: isDesktop ? "180px" : "100%", minWidth: 0 }} />
                      {searchQuery && <X size={14} color={COLORS.textMuted} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setSearchQuery("")} />}
                    </div>

                    {renderSortButton(!isDesktop)}

                    {currentSortKey && (
                      <span style={{ fontSize: "12px", color: COLORS.textMuted, fontStyle: "italic" }}>
                        By {SORT_LABELS[currentSortKey]} · <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSortOrders(prev => ({ ...prev, [viewedPlaylistId]: null }))}>Clear</span>
                      </span>
                    )}
                  </div>
                )}

                {displayedSongs.length > 0 ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 80px" : "30px minmax(0, 1fr) auto", padding: "0 16px 12px 16px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontSize: "13px", fontWeight: "bold" }}>
                      <span>#</span>
                      <span>Title</span>
                      {isDesktop && <span>Album</span>}
                      {isDesktop && <span>Date added</span>}
                      <span style={{ textAlign: "right" }}><Clock size={16} /></span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" }}>
                      {displayedSongs.map((track, index) => {
                        const isSelected = currentTrack?.id === track.id;
                        return (
                          <div key={track.id} className="playlist-row" onClick={() => handlePlaySong(index, displayedSongs, activePlaylistObj?.name || "Playlist")} style={{ display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 80px" : "30px minmax(0, 1fr) auto", alignItems: "center", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", background: isSelected ? COLORS.hover : "transparent" }}>
                            <span style={{ color: isSelected ? COLORS.primary : COLORS.textMuted, fontSize: "15px", fontWeight: isSelected ? "bold" : "normal" }}>{index + 1}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, paddingRight: "8px" }}>
                              <div style={{ width: "44px", height: "44px", borderRadius: "6px", backgroundColor: "#EAE2CF", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: "15px", fontWeight: isSelected ? "bold" : "600", color: isSelected ? COLORS.spotifyGreen : COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                                <div style={{ fontSize: "13px", color: COLORS.textMuted, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
                              </div>
                            </div>
                            {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "16px" }}>{track.album || "—"}</span>}
                            {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", paddingRight: "16px" }}>{formatDate(track.added_at)}</span>}
                            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: isDesktop ? "8px" : "4px", flexShrink: 0 }}>
                              <button title="Add to Queue" onClick={e => addToQueue(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px" }} className="hover-effect"><ListPlus size={isDesktop ? 18 : 16} /></button>
                              <button title="Remove from playlist" onClick={e => handleRemoveSongFromPlaylist(viewedPlaylistId, track.id, e)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: "4px" }} className="hover-effect"><Trash2 size={isDesktop ? 18 : 16} /></button>
                              {isSelected && isPlaying && (
                                <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "14px", width: "16px", paddingBottom: "1px", marginLeft: "4px" }}>
                                  <div className="eq-bar" style={{ animationDelay: "0s" }}></div>
                                  <div className="eq-bar" style={{ animationDelay: "0.2s" }}></div>
                                  <div className="eq-bar" style={{ animationDelay: "0.4s" }}></div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "80px 0", color: COLORS.textMuted }}>
                    <p style={{ margin: 0, fontSize: "16px" }}>{searchQuery ? `No results for "${searchQuery}".` : "This playlist is empty."}</p>
                  </div>
                )}
              </div>
            ) : (
              /* GLOBAL LIBRARY VIEW */
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px", flexWrap: "wrap", justifyContent: isDesktop ? "flex-start" : "center" }}>
                  <h2 style={{ fontSize: isDesktop ? "28px" : "24px", fontWeight: "800", margin: 0, paddingLeft: isDesktop ? "16px" : 0, color: COLORS.primary }}>Global Library ({playlist.length})</h2>
                  <div style={{ display: "flex", alignItems: "center", background: "rgba(26,43,76,0.05)", borderRadius: "20px", padding: "6px 12px", border: `1px solid ${COLORS.border}`, flex: isDesktop ? "0 0 auto" : 1, minWidth: 0 }}>
                    <Search size={16} color={COLORS.textMuted} style={{ flexShrink: 0 }} />
                    <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ background: "transparent", border: "none", outline: "none", marginLeft: "8px", fontSize: "14px", color: COLORS.primary, width: isDesktop ? "180px" : "100%", minWidth: 0 }} />
                    {searchQuery && <X size={14} color={COLORS.textMuted} style={{ cursor: "pointer", flexShrink: 0 }} onClick={() => setSearchQuery("")} />}
                  </div>
                  {renderSortButton(!isDesktop)}
                  {currentSortKey && (
                    <span style={{ fontSize: "12px", color: COLORS.textMuted, fontStyle: "italic" }}>
                      By {SORT_LABELS[currentSortKey]} · <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSortOrders(prev => ({ ...prev, global: null }))}>Clear</span>
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {displayedSongs.length > 0 ? displayedSongs.map((track, index) => {
                    const isSelected = currentTrack?.id === track.id;
                    return (
                      <div key={track.id} className="playlist-row" onClick={() => handlePlaySong(index, displayedSongs, "Global Library")} style={{ padding: "10px 16px", borderRadius: "8px", background: isSelected ? COLORS.hover : "transparent", cursor: "pointer", display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 80px" : "30px minmax(0, 1fr) auto", alignItems: "center" }}>
                        <span style={{ color: isSelected ? COLORS.primary : COLORS.textMuted, fontSize: "15px", fontWeight: isSelected ? "bold" : "normal" }}>{index + 1}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, paddingRight: "8px" }}>
                          <div style={{ width: "48px", height: "48px", borderRadius: "6px", backgroundColor: "#EAE2CF", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "16px", fontWeight: isSelected ? "bold" : "600", color: isSelected ? COLORS.spotifyGreen : COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                            <div style={{ fontSize: "14px", color: COLORS.textMuted, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
                          </div>
                        </div>
                        {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "16px" }}>{track.album || "—"}</span>}
                        {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", paddingRight: "16px" }}>{formatDate(track.added_at)}</span>}
                        <div style={{ display: "flex", alignItems: "center", gap: isDesktop ? "12px" : "4px", flexShrink: 0, justifyContent: "flex-end" }}>
                          <button title="Add to Queue" onClick={(e) => addToQueue(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px" }} className="hover-effect">
                            <ListPlus size={isDesktop ? 18 : 16} />
                          </button>
                          {userPlaylists.length > 0 && (
                            <button title="Add to Playlist" onClick={(e) => { e.stopPropagation(); setSongForPlaylistModal(track); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px" }} className="hover-effect">
                              <FolderPlus size={isDesktop ? 18 : 16} />
                            </button>
                          )}
                          {isSelected && isPlaying && (
                            <div style={{ display: "flex", alignItems: "flex-end", gap: "2px", height: "14px", width: "16px", paddingBottom: "1px", marginLeft: "4px" }}>
                              <div className="eq-bar" style={{ animationDelay: "0s" }}></div>
                              <div className="eq-bar" style={{ animationDelay: "0.2s" }}></div>
                              <div className="eq-bar" style={{ animationDelay: "0.4s" }}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }) : (
                    <div style={{ textAlign: "center", padding: "100px 0", color: COLORS.textMuted }}>
                      {searchQuery
                        ? <p style={{ margin: 0, fontSize: "16px" }}>No results for "{searchQuery}".</p>
                        : <><ImageIcon size={64} color={COLORS.textMuted} style={{ marginBottom: "16px", opacity: 0.5 }} /><p style={{ margin: 0, fontSize: "18px", fontWeight: "500" }}>Your library is empty. Click "Add Globally" to upload tracks.</p></>
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT DESKTOP PLAYER */}
        {isDesktop && currentTrack && (
          <div style={{ width: "320px", flexShrink: 0, background: COLORS.bgPanel, borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", boxSizing: "border-box", position: "relative", overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
            {currentTrack.poster_url && (
              <div className="fade-enter" style={{ position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%", backgroundImage: `url(${currentTrack.poster_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(50px) brightness(1) saturate(100%)", opacity: 0.35, zIndex: 0, pointerEvents: "none" }} />
            )}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ width: "100%", marginBottom: "20px", flexShrink: 0 }}>
                <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "12px", overflow: "hidden", backgroundColor: "rgba(26,43,76,0.05)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(26,43,76,0.12)" }}>
                  <div key={showMixer ? 'mixer' : showQueue ? 'queue' : showLyrics ? 'lyrics' : 'art'} className="fade-enter" style={{ width: "100%", height: "100%" }}>
                    {showMixer ? renderMixerBlock(false) : showQueue ? renderQueueBlock(false) : showLyrics ? renderLyricsBlock(false) : (currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={80} color={COLORS.textMuted} /></div>)}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "19px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#FFFFFF", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{currentTrack.title}</h3>
                  <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{currentTrack.artist}</p>
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "8px" }}>
                  {[
                    { label: "Sleep Timer", active: !!sleepTimerTarget, icon: <Moon size={15} />, action: (e) => { e.stopPropagation(); setShowSleepTimerModal(true); } },
                    { label: "Stem Mixer", active: showMixer, icon: <SlidersHorizontal size={15} />, action: toggleStemMixer },
                    { label: "Lyrics", active: showLyrics, icon: <Mic2 size={15} />, action: () => { setShowLyrics(v => !v); if (!showLyrics) { setShowQueue(false); setShowMixer(false); } }, white: showLyrics },
                    { label: "Queue", active: showQueue, icon: <ListMusic size={15} />, action: () => { setShowQueue(v => !v); if (!showQueue) { setShowLyrics(false); setShowMixer(false); } } }
                  ].map(({ label, active, icon, action, white }) => (
                    <button key={label} onClick={action} title={label} style={{ background: active ? (white ? "#FFFFFF" : COLORS.spotifyGreen) : "rgba(255,255,255,0.15)", color: (active && white) ? COLORS.primary : "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", fontSize: "12px", fontWeight: "bold", backdropFilter: "blur(4px)" }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: "auto", paddingBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", minWidth: "36px", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{formatTime(currentTime)}</span>
                  <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="glow-slider" style={{ flex: 1, background: `linear-gradient(to right, rgba(255,255,255,0.8) 0%, #FFFFFF ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%)` }} />
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.9)", minWidth: "36px", textAlign: "right", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{formatTime(duration)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "4px", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect">{renderModeIcon("#FFFFFF")}</button>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><SkipBack size={24} fill="currentColor" /></button>
                    <button onClick={handlePlayPause} className="hover-effect" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", borderRadius: "50%", border: "none", backgroundColor: "#FFFFFF", color: COLORS.primary, cursor: "pointer", boxShadow: "0 8px 16px rgba(0,0,0,0.3)" }}>
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: "4px" }} />}
                    </button>
                    <button onClick={handleNext} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><SkipForward size={24} fill="currentColor" /></button>
                  </div>
                  <button onClick={toggleMute} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect">{isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MINIMIZED MOBILE BAR */}
      {!isDesktop && currentTrack && !isMobilePlayerOpen && (
        <div onClick={() => setIsMobilePlayerOpen(true)} className="slide-up-enter" style={{ position: "fixed", bottom: "16px", left: "12px", right: "12px", background: COLORS.bgPanel, borderRadius: "12px", display: "flex", flexDirection: "column", boxShadow: "0 8px 24px rgba(26,43,76,0.15)", zIndex: 2000, border: `1px solid ${COLORS.border}`, cursor: "pointer", overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", overflow: "hidden", flex: 1, minWidth: 0 }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "6px", backgroundColor: "#EAE2CF", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
              </div>
              <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.title}</div>
                <div style={{ fontSize: "13px", color: COLORS.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500" }}>{currentTrack.artist}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
              <button onClick={e => { e.stopPropagation(); handlePrev(e); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px", display: "flex" }} className="hover-effect"><SkipBack size={22} fill="currentColor" /></button>
              <button onClick={e => { e.stopPropagation(); handlePlayPause(e); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px", display: "flex" }} className="hover-effect">
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
              </button>
              <button onClick={e => { e.stopPropagation(); handleNext(e); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px", display: "flex" }} className="hover-effect"><SkipForward size={22} fill="currentColor" /></button>
            </div>
          </div>
          <div style={{ width: "100%", height: "3px", background: "rgba(26,43,76,0.1)" }}>
            <div style={{ width: `${progressPercent}%`, height: "100%", background: COLORS.primary, transition: "width 0.1s linear" }} />
          </div>
        </div>
      )}

      {/* FULL-SCREEN MOBILE PLAYER */}
      {!isDesktop && currentTrack && isMobilePlayerOpen && (
        <div className="slide-up-enter" style={{ position: "fixed", inset: 0, zIndex: 4000, background: COLORS.bgBase, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {currentTrack.poster_url && (
            <div className="fade-enter" style={{ position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%", backgroundImage: `url(${currentTrack.poster_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(60px) brightness(1.2) saturate(80%)", opacity: 0.3, zIndex: 0, pointerEvents: "none" }} />
          )}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", paddingTop: "16px" }}>
              <button onClick={() => setIsMobilePlayerOpen(false)} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><ChevronDown size={32} /></button>
              <span style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px", color: "#FFFFFF", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>
                {showMixer ? "AI Mixer" : showQueue ? "Current Queue" : showLyrics ? "Lyrics" : "Now Playing"}
              </span>
              <div style={{ width: "40px" }} />
            </div>

            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", marginBottom: "32px" }}>
              <div style={{ width: "100%", height: "100%", maxHeight: "400px", borderRadius: "16px", overflow: "hidden", backgroundColor: "rgba(26,43,76,0.05)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: (showLyrics || showQueue || showMixer) ? "none" : "0 20px 40px rgba(26,43,76,0.2)", transition: "box-shadow 0.3s ease" }}>
                <div key={showMixer ? 'mixer' : showQueue ? 'queue' : showLyrics ? 'lyrics' : 'art'} className="fade-enter" style={{ width: "100%", height: "100%" }}>
                  {showMixer ? renderMixerBlock(true) : showQueue ? renderQueueBlock(true) : showLyrics ? renderLyricsBlock(true) : (currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={100} color={COLORS.textMuted} /></div>)}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#FFFFFF", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{currentTrack.title}</h2>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.8)", fontSize: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{currentTrack.artist}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
                <button onClick={toggleStemMixer} style={{ background: showMixer ? COLORS.spotifyGreen : "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "10px 14px", cursor: "pointer", display: "flex", backdropFilter: "blur(4px)" }}><SlidersHorizontal size={17} /></button>
                <button onClick={e => { e.stopPropagation(); setShowSleepTimerModal(true); }} style={{ background: sleepTimerTarget ? COLORS.spotifyGreen : "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "10px 14px", cursor: "pointer", display: "flex", backdropFilter: "blur(4px)" }}><Moon size={17} /></button>
                <button onClick={() => { setShowLyrics(v => !v); if (!showLyrics) { setShowQueue(false); setShowMixer(false); } }} style={{ background: showLyrics ? "#FFFFFF" : "rgba(255,255,255,0.15)", color: showLyrics ? COLORS.primary : "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "10px 14px", cursor: "pointer", display: "flex", backdropFilter: "blur(4px)" }}><Mic2 size={17} /></button>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="glow-slider" style={{ width: "100%", background: `linear-gradient(to right, rgba(255,255,255,0.8) 0%, #FFFFFF ${progressPercent}%, rgba(255,255,255,0.15) ${progressPercent}%)`, marginBottom: "8px", borderRadius: "6px" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{formatTime(currentTime)}</span>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{formatTime(duration)}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
              <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "8px", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect">{renderModeIcon("#FFFFFF")}</button>
              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><SkipBack size={36} fill="currentColor" /></button>
                <button onClick={handlePlayPause} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "72px", height: "72px", borderRadius: "50%", border: "none", backgroundColor: "#FFFFFF", color: COLORS.primary, cursor: "pointer", boxShadow: "0 12px 24px rgba(0,0,0,0.3)", transition: "transform 0.2s ease" }} className="hover-effect">
                  {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" style={{ marginLeft: "4px" }} />}
                </button>
                <button onClick={handleNext} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><SkipForward size={36} fill="currentColor" /></button>
              </div>
              <button onClick={() => { setShowQueue(v => !v); if (!showQueue) { setShowLyrics(false); setShowMixer(false); } }} style={{ background: "transparent", border: "none", color: showQueue ? COLORS.spotifyGreen : "#FFFFFF", cursor: "pointer", padding: "8px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))", position: "relative" }} className="hover-effect">
                <ListMusic size={26} />
                {userQueue.length > 0 && (
                  <span style={{ position: "absolute", top: "2px", right: "2px", background: COLORS.spotifyGreen, color: "#FFFFFF", fontSize: "10px", fontWeight: "bold", borderRadius: "50%", width: "16px", height: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>{userQueue.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}