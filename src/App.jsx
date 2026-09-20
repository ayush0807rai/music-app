import React, { useState, useRef, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ArrowRight, Loader2, Plus, X, UploadCloud, Image as ImageIcon, Mic2, ChevronDown, FolderPlus, Trash2, Clock, Home, Library, ListMusic
} from "lucide-react";
import { supabase } from "./supabase";
import Auth from "./Auth";

const PLAY_MODES = ["order", "repeat-all", "repeat-one", "shuffle"];

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) return "ios";
  if (/Macintosh|MacIntel|MacPPC|Mac68K/.test(ua)) return "mac";
  if (/Win32|Win64|Windows|WinCE/.test(ua)) return "windows";
  return "desktop";
};

export default function App() {
  const [deviceType, setDeviceType] = useState("desktop");
  const [playlist, setPlaylist] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null); 
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [session, setSession] = useState(null);

  // Upload States
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [uploadAlbum, setUploadAlbum] = useState("");
  const [uploadLyrics, setUploadLyrics] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPoster, setUploadPoster] = useState(null);

  // New Playlist Form State
  const [newPlaylistName, setNewPlaylistName] = useState("");

  // Player States
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [playMode, setPlayMode] = useState("repeat-all");
  const [showLyrics, setShowLyrics] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    setDeviceType(getDeviceType());
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    
    const fetchData = async () => {
      setIsLoading(true);
      const { data: songsData } = await supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: true });
      if (songsData) setPlaylist(songsData);

      const { data: playlistData } = await supabase
        .from("playlists")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: true });
      if (playlistData) setUserPlaylists(playlistData);

      setIsLoading(false);
    };

    fetchData();
  }, [session]);

  useEffect(() => {
    if (selectedPlaylistId === null) return;

    const fetchPlaylistSongs = async () => {
      const { data } = await supabase
        .from("playlist_songs")
        .select("song_id, added_at, songs(*)")
        .eq("playlist_id", selectedPlaylistId);

      if (data) {
        const formattedSongs = data.map(item => ({
          ...item.songs,
          added_at: item.added_at
        })).filter(item => item.id);
        setPlaylistSongs(formattedSongs);
      }
    };
    fetchPlaylistSongs();
  }, [selectedPlaylistId]);

  const activeTrackList = selectedPlaylistId === null ? playlist : playlistSongs;
  const currentTrack = activeTrackList[currentTrackIndex];
  const activePlaylistObj = userPlaylists.find(p => p.id === selectedPlaylistId);

  useEffect(() => {
    setShowLyrics(false);
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current && isPlaying && currentTrack) {
      audioRef.current.play().catch((err) => console.log("Playback error:", err));
    }
  }, [currentTrackIndex, currentTrack]);

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle || !uploadArtist) {
      alert("Please fill in the required fields and select an MP3.");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}-audio.${fileExt}`;
      const { error: audioError } = await supabase.storage
        .from("songs")
        .upload(fileName, uploadFile, { cacheControl: "3600" });
      if (audioError) throw audioError;
      const { data: { publicUrl: audioUrl } } = supabase.storage.from("songs").getPublicUrl(fileName);

      let posterUrl = null;
      if (uploadPoster) {
        const posterExt = uploadPoster.name.split('.').pop();
        const posterName = `${Date.now()}-poster.${posterExt}`;
        const { error: posterError } = await supabase.storage
          .from("songs")
          .upload(posterName, uploadPoster, { cacheControl: "3600" });
        if (posterError) throw posterError;
        posterUrl = supabase.storage.from("songs").getPublicUrl(posterName).data.publicUrl;
      }

      const { data: dbData, error: dbError } = await supabase
        .from("songs")
        .insert([{ 
          title: uploadTitle, 
          artist: uploadArtist, 
          album: uploadAlbum || null,
          lyrics: uploadLyrics || null,
          url: audioUrl,
          poster_url: posterUrl
        }])
        .select();

      if (dbError) throw dbError;

      setPlaylist([...playlist, dbData[0]]);
      setShowUploadModal(false);
      setUploadTitle("");
      setUploadArtist("");
      setUploadAlbum("");
      setUploadLyrics("");
      setUploadFile(null);
      setUploadPoster(null);
      alert("Song uploaded successfully!");

    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    const { data, error } = await supabase
      .from("playlists")
      .insert([{ name: newPlaylistName, user_id: session.user.id }])
      .select();

    if (error) {
      alert("Error creating playlist: " + error.message);
    } else if (data) {
      setUserPlaylists([...userPlaylists, data[0]]);
      setNewPlaylistName("");
      setShowPlaylistModal(false);
    }
  };

  const handleAddSongToPlaylist = async (playlistId, songId) => {
    const { error } = await supabase
      .from("playlist_songs")
      .insert([{ playlist_id: playlistId, song_id: songId }]);

    if (error) {
      if (error.code === "23505") alert("Song is already in this playlist.");
      else alert("Error adding song: " + error.message);
    } else {
      alert("Added to playlist successfully!");
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId, songId, e) => {
    e.stopPropagation();
    const { error } = await supabase
      .from("playlist_songs")
      .delete()
      .eq("playlist_id", playlistId)
      .eq("song_id", songId);

    if (error) {
      alert("Error removing song: " + error.message);
    } else {
      setPlaylistSongs(playlistSongs.filter(s => s.id !== songId));
    }
  };

  const handlePlayPause = (e) => {
    if (e) e.stopPropagation();
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
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
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setCurrentTrackIndex((prevIndex) => prevIndex === 0 ? activeTrackList.length - 1 : prevIndex - 1);
  };

  const handleTrackEnded = () => {
    if (playMode === "repeat-one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }
    if (playMode === "order" && currentTrackIndex === activeTrackList.length - 1) {
      setIsPlaying(false);
      return;
    }
    handleNext();
  };

  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setVolume(previousVolume || 0.5);
    } else {
      setPreviousVolume(volume);
      setIsMuted(true);
      setVolume(0);
    }
  };

  const handleSeek = (e) => {
    const seekTime = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
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
      case "repeat-all": return <Repeat size={20} color="#1DB954" />;
      case "repeat-one": return <Repeat1 size={20} color="#1DB954" />;
      case "shuffle": return <Shuffle size={20} color="#1DB954" />;
      case "order": default: return <ArrowRight size={20} color="#777777" />;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isDesktop = deviceType === "windows" || deviceType === "mac" || deviceType === "desktop";

  if (!session) return <Auth />;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#121212', color: '#1DB954' }}>
        <Loader2 className="animate-spin" size={48} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: '16px', fontFamily: 'sans-serif' }}>Loading your tracks and playlists...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ width: "100vw", height: "100vh", fontFamily: "system-ui, -apple-system, sans-serif", background: "#000000", color: "#ffffff", display: "flex", flexDirection: "column", overflow: "hidden", boxSizing: "border-box" }}>
      <style>{`
        body, html { margin: 0; padding: 0; background: #000; overflow: hidden; }
        .hover-effect { transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .hover-effect:hover { transform: scale(1.08); }
        .playlist-row { transition: background 0.2s ease; }
        .playlist-row:hover { background: rgba(255,255,255,0.08) !important; }
        .sidebar-item { transition: color 0.2s ease; cursor: pointer; }
        .sidebar-item:hover { color: #ffffff !important; }
        .glow-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 6px; outline: none; cursor: pointer; }
        .upload-input { width: 100%; padding: 12px; background: #2a2a2a; border: 1px solid #333; border-radius: 8px; color: white; margin-bottom: 16px; outline: none; box-sizing: border-box; }
        .upload-input:focus { border-color: #1DB954; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #555; border-radius: 10px; }
      `}</style>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "20px" }}>
          <div style={{ background: "#181818", padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "400px", position: "relative", maxHeight: "90vh", overflowY: "auto" }} className="custom-scrollbar">
            <button onClick={() => setShowUploadModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#a0a0a0", cursor: "pointer" }}><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}><UploadCloud color="#1DB954" /> Add Song Globally</h2>
            <form onSubmit={handleUploadSubmit}>
              <input type="text" placeholder="Song Title *" required value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="upload-input" />
              <input type="text" placeholder="Artist Name *" required value={uploadArtist} onChange={(e) => setUploadArtist(e.target.value)} className="upload-input" />
              <input type="text" placeholder="Album Name (Optional)" value={uploadAlbum} onChange={(e) => setUploadAlbum(e.target.value)} className="upload-input" />
              <textarea placeholder="Paste Lyrics Here (Optional)" value={uploadLyrics} onChange={(e) => setUploadLyrics(e.target.value)} className="upload-input custom-scrollbar" style={{ minHeight: "100px", resize: "vertical" }} />
              <div style={{ marginBottom: "16px", padding: "12px", border: "1px dashed #333", borderRadius: "8px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#a0a0a0", fontSize: "14px" }}>Poster Image (Optional)</label>
                <input type="file" accept="image/*" onChange={(e) => setUploadPoster(e.target.files[0])} style={{ color: "#a0a0a0", width: "100%" }} />
              </div>
              <div style={{ marginBottom: "24px", padding: "12px", border: "1px dashed #333", borderRadius: "8px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#a0a0a0", fontSize: "14px" }}>MP3 Audio File *</label>
                <input type="file" accept="audio/*" required onChange={(e) => setUploadFile(e.target.files[0])} style={{ color: "#a0a0a0", width: "100%" }} />
              </div>
              <button type="submit" disabled={isUploading} style={{ width: "100%", padding: "14px", borderRadius: "8px", background: isUploading ? "#555" : "#1DB954", color: isUploading ? "#aaa" : "#000", border: "none", fontWeight: "bold", cursor: isUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {isUploading ? <><Loader2 size={18} className="animate-spin" /> Uploading...</> : "Upload to Cloud"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PLAYLIST MODAL */}
      {showPlaylistModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "20px" }}>
          <div style={{ background: "#181818", padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "380px", position: "relative" }}>
            <button onClick={() => setShowPlaylistModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#a0a0a0", cursor: "pointer" }}><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}><FolderPlus color="#1DB954" /> Create Private Playlist</h2>
            <form onSubmit={handleCreatePlaylist}>
              <input type="text" placeholder="Playlist Name *" required value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} className="upload-input" />
              <button type="submit" style={{ width: "100%", padding: "14px", borderRadius: "8px", background: "#1DB954", color: "#000", border: "none", fontWeight: "bold", cursor: "pointer" }}>Save Playlist</button>
            </form>
          </div>
        </div>
      )}

      {activeTrackList.length > 0 && currentTrack && (
        <audio ref={audioRef} src={currentTrack.url} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={handleTrackEnded} />
      )}

      {/* TOP HEADER BAR */}
      <div style={{ height: "64px", background: "#000000", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", boxSizing: "border-box", borderBottom: "1px solid #1a1a1a", zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: "22px", color: "#1DB954", fontWeight: "bold", letterSpacing: "-0.5px" }}>Euphony</h1>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button className="hover-effect" onClick={() => setShowUploadModal(true)} style={{ background: "#282828", border: "none", borderRadius: "20px", padding: "8px 16px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <Plus size={16} color="#1DB954" /> Add Song Globally
          </button>
          <button className="hover-effect" onClick={() => setShowPlaylistModal(true)} style={{ background: "#282828", border: "none", borderRadius: "20px", padding: "8px 16px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <FolderPlus size={16} color="#1DB954" /> New Playlist
          </button>
          <button className="hover-effect" onClick={() => supabase.auth.signOut()} style={{ background: "transparent", border: "1px solid #444", borderRadius: "20px", padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
            Log Out
          </button>
        </div>
      </div>

      {/* MAIN BODY LAYOUT (Expanded Center Area & Compact Sidebar) */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: "8px", gap: "8px", boxSizing: "border-box" }}>
        
        {/* LEFT SIDEBAR NAVIGATION */}
        {isDesktop && (
          <div style={{ width: "220px", flexShrink: 0, background: "#121212", borderRadius: "8px", padding: "20px", display: "flex", flexDirection: "column", gap: "20px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div onClick={() => { setSelectedPlaylistId(null); setCurrentTrackIndex(0); }} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "14px", color: selectedPlaylistId === null ? "#ffffff" : "#b3b3b3", fontWeight: "bold", fontSize: "14px" }}>
                <Home size={22} color={selectedPlaylistId === null ? "#1DB954" : "#b3b3b3"} /> Global Library
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #282828", margin: "4px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
              <span style={{ fontSize: "12px", fontWeight: "bold", color: "#b3b3b3", textTransform: "uppercase", letterSpacing: "1px" }}>Playlists</span>
              {userPlaylists.map(pl => (
                <div key={pl.id} onClick={() => { setSelectedPlaylistId(pl.id); setCurrentTrackIndex(0); }} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "10px", color: selectedPlaylistId === pl.id ? "#ffffff" : "#b3b3b3", fontSize: "14px", padding: "4px 0" }}>
                  <ListMusic size={18} color={selectedPlaylistId === pl.id ? "#1DB954" : "#b3b3b3"} /> {pl.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CENTER MAIN CONTENT AREA (Takes up maximum available width) */}
        <div style={{ flex: 1, background: "#121212", borderRadius: "8px", padding: "32px", overflowY: "auto", boxSizing: "border-box", display: "flex", flexDirection: "column" }} className="custom-scrollbar">
          
          {/* MOBILE PLAYLIST SELECTOR TABS */}
          {!isDesktop && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "16px" }} className="custom-scrollbar">
              <button onClick={() => { setSelectedPlaylistId(null); setCurrentTrackIndex(0); }} style={{ background: selectedPlaylistId === null ? "#1DB954" : "#282828", color: selectedPlaylistId === null ? "#000" : "#fff", border: "none", borderRadius: "20px", padding: "6px 14px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>
                Global Library ({playlist.length})
              </button>
              {userPlaylists.map((pl) => (
                <button key={pl.id} onClick={() => { setSelectedPlaylistId(pl.id); setCurrentTrackIndex(0); }} style={{ background: selectedPlaylistId === pl.id ? "#1DB954" : "#282828", color: selectedPlaylistId === pl.id ? "#000" : "#fff", border: "none", borderRadius: "20px", padding: "6px 14px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>
                  🔒 {pl.name}
                </button>
              ))}
            </div>
          )}

          {/* PLAYLIST HEADER BANNER */}
          {selectedPlaylistId !== null && activePlaylistObj && (
            <div style={{ background: "linear-gradient(180deg, #2b3833 0%, #121212 100%)", padding: "32px", borderRadius: "12px", marginBottom: "24px", display: "flex", alignItems: "flex-end", gap: "24px" }}>
              <div style={{ width: "160px", height: "160px", backgroundColor: "#282828", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.6)", flexShrink: 0 }}>
                <FolderPlus size={64} color="#1DB954" />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#ccc" }}>Private Playlist</span>
                <h2 style={{ margin: "4px 0 12px 0", fontSize: "42px", fontWeight: "bold" }}>{activePlaylistObj.name}</h2>
                <p style={{ margin: 0, fontSize: "14px", color: "#b3b3b3" }}>Your personal collection • {playlistSongs.length} songs</p>
              </div>
            </div>
          )}

          {/* TABLE VIEW FOR PLAYLISTS */}
          {selectedPlaylistId !== null ? (
            <div style={{ width: "100%" }}>
              {playlistSongs.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "20px" }}>
                  <button onClick={() => { setCurrentTrackIndex(0); setIsPlaying(true); }} className="hover-effect" style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#1DB954", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}>
                    <Play size={24} fill="#000" color="#000" style={{ marginLeft: "3px" }} />
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "40px 2fr 1.5fr 1.2fr 50px", padding: "0 12px 12px 12px", borderBottom: "1px solid #282828", color: "#b3b3b3", fontSize: "13px", fontWeight: "bold" }}>
                <span>#</span>
                <span>Title</span>
                <span>Album</span>
                <span>Date added</span>
                <span style={{ textAlign: "right" }}><Clock size={16} /></span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                {playlistSongs.length > 0 ? (
                  playlistSongs.map((track, index) => {
                    const isSelected = index === currentTrackIndex;
                    return (
                      <div key={track.id} className="playlist-row" onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }} style={{ display: "grid", gridTemplateColumns: "40px 2fr 1.5fr 1.2fr 50px", alignItems: "center", padding: "10px 12px", borderRadius: "6px", cursor: "pointer" }}>
                        <span style={{ color: isSelected ? "#1DB954" : "#b3b3b3", fontSize: "14px" }}>{index + 1}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                          <div style={{ width: "40px", height: "40px", borderRadius: "4px", backgroundColor: "#282828", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={18} color="#555" />}
                          </div>
                          <div style={{ overflow: "hidden" }}>
                            <div style={{ fontSize: "14px", fontWeight: isSelected ? "bold" : "normal", color: isSelected ? "#1DB954" : "#ffffff", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{track.title}</div>
                            <div style={{ fontSize: "12px", color: "#a0a0a0", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{track.artist}</div>
                          </div>
                        </div>
                        <span style={{ color: "#b3b3b3", fontSize: "14px", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{track.album || "—"}</span>
                        <span style={{ color: "#b3b3b3", fontSize: "13px" }}>{formatDate(track.added_at)}</span>
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
                          <button title="Remove from playlist" onClick={(e) => handleRemoveSongFromPlaylist(selectedPlaylistId, track.id, e)} style={{ background: "transparent", border: "none", color: "#b3b3b3", cursor: "pointer" }} className="hover-effect">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "#a0a0a0" }}>
                    <p style={{ margin: 0, fontSize: "16px" }}>This playlist is empty. Add songs from your Global Library!</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* GLOBAL LIBRARY */
            <div>
              <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "20px" }}>Global Library ({playlist.length})</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {playlist.length > 0 ? (
                  playlist.map((track, index) => {
                    const isSelected = index === currentTrackIndex;
                    return (
                      <div key={track.id} className="playlist-row" onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }} style={{ padding: "10px 12px", borderRadius: "8px", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px" }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "4px", backgroundColor: "#282828", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                           {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#555" />}
                        </div>
                        <div style={{ flex: 1, overflow: "hidden" }}>
                          <div style={{ fontSize: "16px", fontWeight: isSelected ? "bold" : "normal", color: isSelected ? "#1DB954" : "#ffffff", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{track.title}</div>
                          <div style={{ fontSize: "14px", color: "#a0a0a0", marginTop: "2px", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{track.artist}</div>
                        </div>
                        
                        {userPlaylists.length > 0 && (
                          <select 
                            onClick={(e) => e.stopPropagation()} 
                            onChange={(e) => {
                              if (e.target.value) handleAddSongToPlaylist(e.target.value, track.id);
                              e.target.value = "";
                            }}
                            defaultValue=""
                            style={{ background: "#222", color: "#bbb", border: "1px solid #444", borderRadius: "6px", padding: "6px 10px", fontSize: "12px", cursor: "pointer" }}
                          >
                            <option value="" disabled>Add to playlist...</option>
                            {userPlaylists.map(pl => (
                              <option key={pl.id} value={pl.id}>{pl.name}</option>
                            ))}
                          </select>
                        )}
                        {isSelected && isPlaying && <Loader2 size={16} className="animate-spin" color="#1DB954" />}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "80px 0", color: "#a0a0a0" }}>
                    <ImageIcon size={48} color="#333" style={{ marginBottom: "16px" }} />
                    <p style={{ margin: 0, fontSize: "16px" }}>Your library is empty. Click "Add Song Globally" to upload tracks.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT SIDEBAR / ACTIVE PLAYER PANEL (Fixed framing: flexShrink: 0, max 160px cover art) */}
        {isDesktop && currentTrack && (
          <div style={{ width: "340px", flexShrink: 0, background: "#121212", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
            {currentTrack.poster_url && (
              <div style={{ position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%", backgroundImage: `url(${currentTrack.poster_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(60px) brightness(0.4) saturate(200%)", opacity: 0.7, zIndex: 0, pointerEvents: "none" }} />
            )}

            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              {/* COMPLETELY FRAMED COVER ART CONTAINER */}
              <div style={{ width: "100%", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                <div style={{ width: "100%", maxWidth: "160px", aspectRatio: "1/1", borderRadius: "10px", overflow: "hidden", backgroundColor: "rgba(40,40,40,0.5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.7)", position: "relative", margin: "0 auto" }}>
                  {showLyrics ? (
                    <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: "12px", overflowY: "auto", background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap", textAlign: "center", backdropFilter: "blur(10px)" }}>
                      {currentTrack.lyrics ? currentTrack.lyrics : <span style={{ color: "#aaa" }}>No lyrics available.</span>}
                    </div>
                  ) : (
                    currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={48} color="#555" />
                  )}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0" }}>
                <div style={{ textAlign: "left", flex: 1, overflow: "hidden", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
                  <h3 style={{ margin: "0 0 2px 0", fontSize: "16px", fontWeight: "bold", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{currentTrack.title}</h3>
                  <p style={{ margin: 0, color: "#d0d0d0", fontSize: "12px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{currentTrack.artist}</p>
                </div>
                <button onClick={() => setShowLyrics(!showLyrics)} style={{ background: showLyrics ? "#1DB954" : "rgba(255,255,255,0.1)", color: showLyrics ? "#000" : "#fff", border: "none", borderRadius: "20px", padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: "bold", backdropFilter: "blur(5px)" }}>
                  <Mic2 size={12} /> {showLyrics ? "Hide" : "Lyrics"}
                </button>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "11px", color: "#b3b3b3", minWidth: "30px" }}>{formatTime(currentTime)}</span>
                  <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="glow-slider" style={{ flex: 1, background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)` }} />
                  <span style={{ fontSize: "11px", color: "#b3b3b3", minWidth: "30px", textAlign: "right" }}>{formatTime(duration)}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "4px", cursor: "pointer" }}>{renderModeIcon()}</button>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}><SkipBack size={20} fill="currentColor" /></button>
                    <button onClick={handlePlayPause} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "42px", height: "42px", borderRadius: "50%", border: "none", backgroundColor: "#1DB954", color: "#000", cursor: "pointer" }}>
                      {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: "2px" }} />}
                    </button>
                    <button onClick={handleNext} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}><SkipForward size={20} fill="currentColor" /></button>
                  </div>
                  <button onClick={toggleMute} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>{isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MOBILE BOTTOM MINIMIZED PLAYER BAR */}
      {!isDesktop && currentTrack && (
        <div onClick={() => setIsPlayerOpen(true)} style={{ position: "fixed", bottom: "12px", left: "12px", right: "12px", background: "#282828", borderRadius: "8px", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 8px 24px rgba(0,0,0,0.8)", cursor: "pointer", zIndex: 2000, border: "1px solid #333" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden", flex: 1 }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "4px", backgroundColor: "#181818", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={18} color="#555" />}
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{currentTrack.title}</div>
              <div style={{ fontSize: "12px", color: "#a0a0a0", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{currentTrack.artist}</div>
            </div>
          </div>
          <button onClick={handlePlayPause} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>
            {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
          </button>
        </div>
      )}

    </div>
  );
}