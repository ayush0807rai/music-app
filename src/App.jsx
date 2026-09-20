import React, { useState, useRef, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ArrowRight, Loader2, Plus, X, UploadCloud, Image as ImageIcon, Mic2, FolderPlus, Trash2, Clock, Home, ListMusic, LogOut
} from "lucide-react";
import { supabase } from "./supabase";
import Auth from "./Auth";

const PLAY_MODES = ["order", "repeat-all", "repeat-one", "shuffle"];

// --- COLOR PALETTE CONSTANTS ---
const COLORS = {
  bgBase: "#F3F0E6",       
  bgPanel: "#FAFAF7",      
  primary: "#1A2B4C",      
  textMain: "#1A2B4C",     
  textMuted: "#64748B",    
  border: "rgba(26, 43, 76, 0.12)", 
  hover: "rgba(26, 43, 76, 0.06)",  
};

// --- UPGRADED LRC PARSER (Supports Standard & Enhanced Word-by-Word) ---
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
        const wMins = parseInt(wordMatch[1], 10);
        const wSecs = parseFloat(wordMatch[2]);
        words.push({
          time: wMins * 60 + wSecs,
          text: wordMatch[3].trim()
        });
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
  
  const [currentTrackIndex, setCurrentTrackIndex] = useState(() => {
    const saved = localStorage.getItem("euphony_track_index");
    return saved ? parseInt(saved, 10) : 0;
  });
  
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(() => {
    const saved = localStorage.getItem("euphony_playlist_id");
    return saved && saved !== "null" ? saved : null;
  });

  const [playlist, setPlaylist] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
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
  
  // LYRICS STATES
  const [showLyrics, setShowLyrics] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const lyricRefs = useRef([]);

  const audioRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", handleResize);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') setSession(null);
      else if (session) setSession(session);
    });
    
    return () => {
      window.removeEventListener("resize", handleResize);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("euphony_track_index", currentTrackIndex);
  }, [currentTrackIndex]);
  
  useEffect(() => {
    if (selectedPlaylistId) localStorage.setItem("euphony_playlist_id", selectedPlaylistId);
    else localStorage.removeItem("euphony_playlist_id");
  }, [selectedPlaylistId]);

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
    if (selectedPlaylistId === null) return;
    const fetchPlaylistSongs = async () => {
      const { data } = await supabase.from("playlist_songs").select("song_id, added_at, songs(*)").eq("playlist_id", selectedPlaylistId);
      if (data) {
        const formattedSongs = data.map(item => ({ ...item.songs, added_at: item.added_at })).filter(item => item.id);
        setPlaylistSongs(formattedSongs);
      }
    };
    fetchPlaylistSongs();
  }, [selectedPlaylistId]);

  const activeTrackList = selectedPlaylistId === null ? playlist : playlistSongs;
  const currentTrack = activeTrackList[currentTrackIndex] || activeTrackList[0];
  const activePlaylistObj = userPlaylists.find(p => p.id === selectedPlaylistId);

  useEffect(() => {
    setShowLyrics(false);
    setActiveLyricIndex(-1);
    setActiveWordIndex(-1);
    if (currentTrack?.lyrics) {
      setParsedLyrics(parseLyrics(currentTrack.lyrics));
    } else {
      setParsedLyrics([]);
    }
  }, [currentTrack]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current && isPlaying && currentTrack) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch((err) => {
          console.log("Playback error:", err);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrackIndex, currentTrack, isPlaying]);

  useEffect(() => {
    if (isFirstRender.current && audioRef.current && currentTrack) {
      const savedTime = localStorage.getItem("euphony_current_time");
      if (savedTime) {
        audioRef.current.currentTime = parseFloat(savedTime);
        setCurrentTime(parseFloat(savedTime));
      }
      isFirstRender.current = false;
    }
  }, [currentTrack]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'Euphony',
        artwork: currentTrack.poster_url ? [
          { src: currentTrack.poster_url, sizes: '512x512', type: 'image/jpeg' },
          { src: currentTrack.poster_url, sizes: '256x256', type: 'image/jpeg' }
        ] : []
      });

      navigator.mediaSession.setActionHandler('play', () => { if (audioRef.current) { audioRef.current.play(); setIsPlaying(true); } });
      navigator.mediaSession.setActionHandler('pause', () => { if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); } });
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
    }
  }, [currentTrack]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime;
    setCurrentTime(time);
    
    if (Math.floor(time) % 2 === 0) localStorage.setItem("euphony_current_time", time);

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
      } else {
        setActiveWordIndex(-1);
      }
    }
  };

  // INTERACTIVE CLICK-TO-SEEK LYRICS
  const handleLyricClick = (time, e) => {
    if (e) e.stopPropagation();
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    if (activeLyricIndex !== -1 && lyricRefs.current[activeLyricIndex]) {
      lyricRefs.current[activeLyricIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [activeLyricIndex]);

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
      setPlaylist([...playlist, dbData[0]]);
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
    else if (data) { setUserPlaylists([...userPlaylists, data[0]]); setNewPlaylistName(""); setShowPlaylistModal(false); }
  };

  const handleAddSongToPlaylist = async (playlistId, songId) => {
    const { error } = await supabase.from("playlist_songs").insert([{ playlist_id: playlistId, song_id: songId }]);
    if (error) {
      if (error.code === "23505") alert("Song is already in this playlist.");
      else alert("Error adding song: " + error.message);
    } else alert("Added to playlist successfully!");
  };

  const handleRemoveSongFromPlaylist = async (playlistId, songId, e) => {
    e.stopPropagation();
    const { error } = await supabase.from("playlist_songs").delete().eq("playlist_id", playlistId).eq("song_id", songId);
    if (!error) setPlaylistSongs(playlistSongs.filter(s => s.id !== songId));
  };

  const handlePlayPause = (e) => {
    if (e) e.stopPropagation();
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  const cyclePlayMode = () => {
    const currentIndex = PLAY_MODES.indexOf(playMode);
    setPlayMode(PLAY_MODES[(currentIndex + 1) % PLAY_MODES.length]);
  };

  const getNextTrackIndex = () => {
    if (playMode === "shuffle") {
      if (activeTrackList.length <= 1) return 0;
      let randomIndex = currentTrackIndex;
      while (randomIndex === currentTrackIndex) randomIndex = Math.floor(Math.random() * activeTrackList.length);
      return randomIndex;
    }
    return (currentTrackIndex + 1) % activeTrackList.length;
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    if (activeTrackList.length === 0) return;
    setCurrentTrackIndex(getNextTrackIndex());
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (activeTrackList.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) { audioRef.current.currentTime = 0; return; }
    setCurrentTrackIndex((prevIndex) => prevIndex === 0 ? activeTrackList.length - 1 : prevIndex - 1);
  };

  const handleTrackEnded = () => {
    if (playMode === "repeat-one") { audioRef.current.currentTime = 0; audioRef.current.play(); return; }
    if (playMode === "order" && currentTrackIndex === activeTrackList.length - 1) { setIsPlaying(false); return; }
    handleNext();
  };

  const toggleMute = () => {
    if (isMuted) { setIsMuted(false); setVolume(previousVolume || 0.5); }
    else { setPreviousVolume(volume); setIsMuted(true); setVolume(0); }
  };

  const handleSeek = (e) => {
    const seekTime = Number(e.target.value);
    if (audioRef.current) { audioRef.current.currentTime = seekTime; setCurrentTime(seekTime); }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const minutes = Math.floor(secs / 60);
    const seconds = Math.floor(secs % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recently";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const renderModeIcon = () => {
    switch (playMode) {
      case "repeat-all": return <Repeat size={20} color={COLORS.primary} />;
      case "repeat-one": return <Repeat1 size={20} color={COLORS.primary} />;
      case "shuffle": return <Shuffle size={20} color={COLORS.primary} />;
      case "order": default: return <ArrowRight size={20} color={COLORS.textMuted} />;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!isSessionLoaded) return <div style={{ background: COLORS.bgBase, width: '100vw', height: '100vh' }} />; 
  if (!session) return <Auth />;

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: COLORS.bgBase, color: COLORS.textMain, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        :root { max-width: none !important; }
        body, html, #root { 
          margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important;
          background: ${COLORS.bgBase} !important; overflow: hidden !important; box-sizing: border-box; text-align: left !important;
        }
        * { box-sizing: border-box; }
        .hover-effect { transition: transform 0.2s ease, opacity 0.2s ease; }
        .hover-effect:hover { transform: scale(1.05); }
        .playlist-row { transition: background 0.2s ease; }
        .playlist-row:hover { background: ${COLORS.hover} !important; }
        .sidebar-item { transition: color 0.2s ease; cursor: pointer; }
        .sidebar-item:hover { color: ${COLORS.primary} !important; opacity: 0.8; }
        .glow-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 6px; outline: none; cursor: pointer; }
        .glow-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 0; height: 0; }
        .upload-input { width: 100%; padding: 12px; background: #FFFFFF; border: 1px solid ${COLORS.border}; border-radius: 8px; color: ${COLORS.primary}; margin-bottom: 16px; outline: none; box-shadow: 0 2px 4px rgba(0,0,0,0.02); }
        .upload-input:focus { border-color: ${COLORS.primary}; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(26,43,76,0.2); border-radius: 10px; border: 2px solid transparent; }
      `}</style>

      <audio ref={audioRef} src={currentTrack?.url || undefined} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={handleTrackEnded} />

      {/* OVERLAY LOADER */}
      {isInitialLoad && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: COLORS.bgBase, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: COLORS.primary }}>
          <Loader2 className="animate-spin" size={48} />
          <p style={{ marginTop: "16px", fontWeight: "500" }}>Loading your tracks...</p>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(26, 43, 76, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "20px" }}>
          <div style={{ background: COLORS.bgPanel, padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "400px", position: "relative", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(26,43,76,0.15)" }} className="custom-scrollbar">
            <button onClick={() => setShowUploadModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }}><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: COLORS.primary }}><UploadCloud color={COLORS.primary} /> Add Song Globally</h2>
            <form onSubmit={handleUploadSubmit}>
              <input type="text" placeholder="Song Title *" required value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="upload-input" />
              <input type="text" placeholder="Artist Name *" required value={uploadArtist} onChange={(e) => setUploadArtist(e.target.value)} className="upload-input" />
              <input type="text" placeholder="Album Name (Optional)" value={uploadAlbum} onChange={(e) => setUploadAlbum(e.target.value)} className="upload-input" />
              <textarea placeholder="Paste Lyrics Here (Optional)" value={uploadLyrics} onChange={(e) => setUploadLyrics(e.target.value)} className="upload-input custom-scrollbar" style={{ minHeight: "100px", resize: "vertical" }} />
              <div style={{ marginBottom: "16px", padding: "12px", border: `1px dashed ${COLORS.border}`, borderRadius: "8px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: COLORS.textMuted, fontSize: "14px" }}>Poster Image (Optional)</label>
                <input type="file" accept="image/*" onChange={(e) => setUploadPoster(e.target.files[0])} style={{ color: COLORS.textMain, width: "100%" }} />
              </div>
              <div style={{ marginBottom: "24px", padding: "12px", border: `1px dashed ${COLORS.border}`, borderRadius: "8px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: COLORS.textMuted, fontSize: "14px" }}>MP3 Audio File *</label>
                <input type="file" accept="audio/*" required onChange={(e) => setUploadFile(e.target.files[0])} style={{ color: COLORS.textMain, width: "100%" }} />
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(26, 43, 76, 0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "20px" }}>
          <div style={{ background: COLORS.bgPanel, padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "380px", position: "relative", boxShadow: "0 20px 40px rgba(26,43,76,0.15)" }}>
            <button onClick={() => setShowPlaylistModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: COLORS.textMuted, cursor: "pointer" }}><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: COLORS.primary }}><FolderPlus color={COLORS.primary} /> Create Private Playlist</h2>
            <form onSubmit={handleCreatePlaylist}>
              <input type="text" placeholder="Playlist Name *" required value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} className="upload-input" />
              <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: "8px", background: COLORS.primary, color: COLORS.bgPanel, border: "none", fontWeight: "bold", cursor: "pointer" }}>Save Playlist</button>
            </form>
          </div>
        </div>
      )}

      {/* TOP HEADER BAR */}
      <div style={{ height: "64px", flexShrink: 0, background: COLORS.bgBase, display: "flex", justifyContent: "space-between", alignItems: "center", padding: isDesktop ? "0 24px" : "0 12px", borderBottom: `1px solid ${COLORS.border}`, zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: isDesktop ? "24px" : "20px", color: COLORS.primary, fontWeight: "800", letterSpacing: "-0.5px" }}>Euphony</h1>
        <div style={{ display: "flex", gap: isDesktop ? "12px" : "8px", alignItems: "center" }}>
          <button className="hover-effect" onClick={() => setShowUploadModal(true)} style={{ background: COLORS.primary, border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.bgPanel, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <Plus size={16} color={COLORS.bgPanel} /> {isDesktop && "Add Globally"}
          </button>
          <button className="hover-effect" onClick={() => setShowPlaylistModal(true)} style={{ background: COLORS.primary, border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.bgPanel, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <FolderPlus size={16} color={COLORS.bgPanel} /> {isDesktop && "New Playlist"}
          </button>
          <button className="hover-effect" onClick={() => { localStorage.clear(); supabase.auth.signOut(); }} style={{ background: "transparent", border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.primary, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center" }}>
            {isDesktop ? "Log Out" : <LogOut size={16} />}
          </button>
        </div>
      </div>

      {/* MAIN BODY LAYOUT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: isDesktop ? "12px" : "4px", gap: isDesktop ? "12px" : "0" }}>
        
        {/* LEFT SIDEBAR NAVIGATION */}
        {isDesktop && (
          <div style={{ width: "260px", flexShrink: 0, background: COLORS.bgPanel, borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div onClick={() => { setSelectedPlaylistId(null); setCurrentTrackIndex(0); setIsPlaying(false); }} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: selectedPlaylistId === null ? COLORS.primary : COLORS.textMuted, fontWeight: "bold", fontSize: "15px" }}>
                <Home size={24} color={selectedPlaylistId === null ? COLORS.primary : COLORS.textMuted} /> Global Library
              </div>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${COLORS.border}`, margin: "0" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
              <span style={{ fontSize: "12px", fontWeight: "bold", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Playlists</span>
              {userPlaylists.map(pl => (
                <div key={pl.id} onClick={() => { setSelectedPlaylistId(pl.id); setCurrentTrackIndex(0); setIsPlaying(false); }} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "12px", color: selectedPlaylistId === pl.id ? COLORS.primary : COLORS.textMuted, fontSize: "15px", padding: "4px 0", fontWeight: selectedPlaylistId === pl.id ? "bold" : "normal" }}>
                  <ListMusic size={20} color={selectedPlaylistId === pl.id ? COLORS.primary : COLORS.textMuted} /> 
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CENTER MAIN CONTENT AREA */}
        <div style={{ flex: 1, minWidth: 0, background: COLORS.bgPanel, borderRadius: isDesktop ? "12px" : "0", padding: isDesktop ? "32px" : "16px", overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: !isDesktop && currentTrack ? "100px" : "32px", border: isDesktop ? `1px solid ${COLORS.border}` : "none" }} className="custom-scrollbar">
          
          {!isDesktop && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "16px", flexShrink: 0 }} className="custom-scrollbar">
              <button onClick={() => { setSelectedPlaylistId(null); setCurrentTrackIndex(0); setIsPlaying(false); }} style={{ background: selectedPlaylistId === null ? COLORS.primary : "transparent", color: selectedPlaylistId === null ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>
                Global Library
              </button>
              {userPlaylists.map((pl) => (
                <button key={pl.id} onClick={() => { setSelectedPlaylistId(pl.id); setCurrentTrackIndex(0); setIsPlaying(false); }} style={{ background: selectedPlaylistId === pl.id ? COLORS.primary : "transparent", color: selectedPlaylistId === pl.id ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>
                  🔒 {pl.name}
                </button>
              ))}
            </div>
          )}

          {selectedPlaylistId !== null && activePlaylistObj && (
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

          {selectedPlaylistId !== null ? (
            <div style={{ width: "100%" }}>
              {playlistSongs.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px", justifyContent: isDesktop ? "flex-start" : "center" }}>
                  <button onClick={() => { setCurrentTrackIndex(0); setIsPlaying(true); }} className="hover-effect" style={{ width: "64px", height: "64px", borderRadius: "50%", background: COLORS.primary, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 16px rgba(26,43,76,0.2)" }}>
                    <Play size={28} fill={COLORS.bgPanel} color={COLORS.bgPanel} style={{ marginLeft: "4px" }} />
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 50px" : "40px 1fr 40px", padding: "0 16px 12px 16px", borderBottom: `1px solid ${COLORS.border}`, color: COLORS.textMuted, fontSize: "13px", fontWeight: "bold" }}>
                <span>#</span>
                <span>Title</span>
                {isDesktop && <span>Album</span>}
                {isDesktop && <span>Date added</span>}
                <span style={{ textAlign: "right" }}><Clock size={16} /></span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" }}>
                {playlistSongs.length > 0 ? (
                  playlistSongs.map((track, index) => {
                    const isSelected = index === currentTrackIndex;
                    return (
                      <div key={track.id} className="playlist-row" onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }} style={{ display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 50px" : "40px 1fr 40px", alignItems: "center", padding: "10px 16px", borderRadius: "8px", cursor: "pointer", background: isSelected ? COLORS.hover : "transparent" }}>
                        <span style={{ color: isSelected ? COLORS.primary : COLORS.textMuted, fontSize: "15px", fontWeight: isSelected ? "bold" : "normal" }}>{index + 1}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                          <div style={{ width: "44px", height: "44px", borderRadius: "6px", backgroundColor: "#EAE2CF", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: "15px", fontWeight: isSelected ? "bold" : "600", color: COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                            <div style={{ fontSize: "13px", color: COLORS.textMuted, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
                          </div>
                        </div>
                        {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "16px" }}>{track.album || "—"}</span>}
                        {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", paddingRight: "16px" }}>{formatDate(track.added_at)}</span>}
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                          <button title="Remove from playlist" onClick={(e) => handleRemoveSongFromPlaylist(selectedPlaylistId, track.id, e)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: "4px" }} className="hover-effect">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "80px 0", color: COLORS.textMuted }}>
                    <p style={{ margin: 0, fontSize: "16px" }}>This playlist is empty.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h2 style={{ fontSize: isDesktop ? "28px" : "24px", fontWeight: "800", marginBottom: "24px", paddingLeft: isDesktop ? "16px" : "0", textAlign: isDesktop ? "left" : "center", color: COLORS.primary }}>Global Library ({playlist.length})</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {playlist.length > 0 ? (
                  playlist.map((track, index) => {
                    const isSelected = index === currentTrackIndex;
                    return (
                      <div key={track.id} className="playlist-row" onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }} style={{ padding: "10px 16px", borderRadius: "8px", background: isSelected ? COLORS.hover : "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: isDesktop ? "16px" : "12px" }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "6px", backgroundColor: "#EAE2CF", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                           {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          <div style={{ fontSize: "16px", fontWeight: isSelected ? "bold" : "600", color: COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                          <div style={{ fontSize: "14px", color: COLORS.textMuted, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
                        </div>
                        
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                          {userPlaylists.length > 0 && (
                            <select 
                              onClick={(e) => e.stopPropagation()} 
                              onChange={(e) => {
                                if (e.target.value) handleAddSongToPlaylist(e.target.value, track.id);
                                e.target.value = "";
                              }}
                              defaultValue=""
                              style={{ background: "#FFFFFF", color: COLORS.primary, border: `1px solid ${COLORS.border}`, borderRadius: "6px", padding: "8px 12px", fontSize: "13px", cursor: "pointer", maxWidth: isDesktop ? "160px" : "120px", textOverflow: "ellipsis", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", fontWeight: "500" }}
                            >
                              <option value="" disabled>Add to playlist...</option>
                              {userPlaylists.map(pl => (
                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                              ))}
                            </select>
                          )}
                          {isSelected && isPlaying && <Loader2 size={18} className="animate-spin" color={COLORS.primary} />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "100px 0", color: COLORS.textMuted }}>
                    <ImageIcon size={64} color={COLORS.textMuted} style={{ marginBottom: "16px", opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: "18px", fontWeight: "500" }}>Your library is empty. Click "Add Globally" to upload tracks.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR / ACTIVE PLAYER PANEL */}
        {isDesktop && currentTrack && (
          <div style={{ width: "320px", flexShrink: 0, background: COLORS.bgPanel, borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", boxSizing: "border-box", position: "relative", overflow: "hidden", border: `1px solid ${COLORS.border}` }}>
            {currentTrack.poster_url && (
              <div style={{ position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%", backgroundImage: `url(${currentTrack.poster_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(50px) brightness(1) saturate(100%)", opacity: 0.35, zIndex: 0, pointerEvents: "none" }} />
            )}

            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ width: "100%", marginBottom: "24px", flexShrink: 0 }}>
                <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "12px", overflow: "hidden", backgroundColor: "rgba(26,43,76,0.05)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(26,43,76,0.12)", position: "relative" }}>
                  
                  {/* SCROLLING LYRICS UI WITH GLOW & CLICK-TO-SEEK */}
                  {showLyrics ? (
                    <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: "24px 16px", overflowY: "auto", background: COLORS.primary, textAlign: "center", borderRadius: "12px" }}>
                      {parsedLyrics.length > 0 ? (
                        <div style={{ padding: "120px 0" }}>
                          {parsedLyrics.map((lyric, index) => {
                            const isActiveLine = index === activeLyricIndex;
                            return (
                              <div 
                                key={index}
                                ref={el => lyricRefs.current[index] = el}
                                onClick={(e) => handleLyricClick(lyric.time, e)}
                                style={{ 
                                  fontSize: isActiveLine ? "22px" : "16px", 
                                  fontWeight: isActiveLine ? "800" : "600", 
                                  color: isActiveLine ? COLORS.bgBase : "rgba(243, 240, 230, 0.4)", 
                                  textShadow: isActiveLine && !lyric.words ? `0 0 16px rgba(243, 240, 230, 0.6)` : "none",
                                  padding: "10px 0",
                                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                                  transform: isActiveLine ? "scale(1.05)" : "scale(1)",
                                  lineHeight: "1.4",
                                  cursor: "pointer"
                                }}
                              >
                                {lyric.words ? (
                                  lyric.words.map((wordObj, wIndex) => {
                                    const isActiveWord = isActiveLine && wIndex === activeWordIndex;
                                    const isPastWord = isActiveLine && wIndex < activeWordIndex;
                                    return (
                                      <span 
                                        key={wIndex}
                                        onClick={(e) => handleLyricClick(wordObj.time, e)}
                                        style={{
                                          color: (isActiveWord || isPastWord) ? COLORS.bgBase : "rgba(243, 240, 230, 0.4)",
                                          textShadow: isActiveWord ? `0 0 16px rgba(243, 240, 230, 0.8)` : "none",
                                          transition: "all 0.2s ease",
                                          marginRight: "4px",
                                          cursor: "pointer"
                                        }}
                                      >
                                        {wordObj.text} 
                                      </span>
                                    );
                                  })
                                ) : (
                                  lyric.text
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ color: COLORS.bgBase, opacity: 0.6, fontSize: "15px", fontWeight: "500", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {currentTrack.lyrics ? currentTrack.lyrics : "No synchronized lyrics available."}
                        </div>
                      )}
                    </div>
                  ) : (
                    currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={80} color={COLORS.textMuted} />
                  )}

                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: COLORS.primary }}>{currentTrack.title}</h3>
                  <p style={{ margin: 0, color: COLORS.textMuted, fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500" }}>{currentTrack.artist}</p>
                </div>
                <button onClick={() => setShowLyrics(!showLyrics)} style={{ background: showLyrics ? COLORS.primary : "rgba(26,43,76,0.08)", color: showLyrics ? COLORS.bgPanel : COLORS.primary, border: "none", borderRadius: "20px", padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", flexShrink: 0, marginLeft: "12px" }}>
                  <Mic2 size={16} /> {showLyrics ? "Hide" : "Lyrics"}
                </button>
              </div>

              <div style={{ marginTop: "auto", paddingBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "12px", color: COLORS.textMuted, minWidth: "36px", fontWeight: "500" }}>{formatTime(currentTime)}</span>
                  <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="glow-slider" style={{ flex: 1, background: `linear-gradient(to right, ${COLORS.primary} ${progressPercent}%, rgba(26,43,76,0.15) ${progressPercent}%)` }} />
                  <span style={{ fontSize: "12px", color: COLORS.textMuted, minWidth: "36px", textAlign: "right", fontWeight: "500" }}>{formatTime(duration)}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "4px", cursor: "pointer" }}>{renderModeIcon()}</button>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", display: "flex" }} className="hover-effect"><SkipBack size={24} fill="currentColor" /></button>
                    <button onClick={handlePlayPause} className="hover-effect" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", borderRadius: "50%", border: "none", backgroundColor: COLORS.primary, color: COLORS.bgPanel, cursor: "pointer", boxShadow: "0 8px 16px rgba(26,43,76,0.25)" }}>
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: "4px" }} />}
                    </button>
                    <button onClick={handleNext} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", display: "flex" }} className="hover-effect"><SkipForward size={24} fill="currentColor" /></button>
                  </div>
                  <button onClick={toggleMute} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer" }}>{isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM MINIMIZED PLAYER BAR */}
      {!isDesktop && currentTrack && (
        <div style={{ position: "fixed", bottom: "16px", left: "12px", right: "12px", background: COLORS.bgPanel, borderRadius: "12px", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 8px 24px rgba(26,43,76,0.15)", zIndex: 2000, border: `1px solid ${COLORS.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", overflow: "hidden", flex: 1, minWidth: 0 }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "6px", backgroundColor: "#EAE2CF", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
            </div>
            <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "15px", fontWeight: "bold", color: COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.title}</div>
              <div style={{ fontSize: "13px", color: COLORS.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500" }}>{currentTrack.artist}</div>
            </div>
          </div>
          <button onClick={handlePlayPause} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "8px", flexShrink: 0 }}>
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
        </div>
      )}
    </div>
  );
}