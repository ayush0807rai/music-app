import React, { useState, useRef, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ArrowRight, Loader2, Plus, X, UploadCloud, Image as ImageIcon, Mic2, FolderPlus, Trash2, Clock, Home, ListMusic, LogOut
} from "lucide-react";
import { supabase } from "./supabase";
import Auth from "./Auth";

const PLAY_MODES = ["order", "repeat-all", "repeat-one", "shuffle"];

export default function App() {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  const [playlist, setPlaylist] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null); 
  const [playlistSongs, setPlaylistSongs] = useState([]);
  
  // Changed to track initial load only
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
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

  const audioRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", handleResize);
    
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    
    return () => {
      window.removeEventListener("resize", handleResize);
      subscription.unsubscribe();
    };
  }, []);

  // FIX: Only re-run fetch if the actual User ID changes, avoiding re-renders on token refresh
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const fetchData = async () => {
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

      setIsInitialLoad(false);
    };
    fetchData();
  }, [session?.user?.id]); 

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

  useEffect(() => setShowLyrics(false), [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  useEffect(() => {
    if (audioRef.current && isPlaying && currentTrack) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch((err) => console.log("Playback error:", err));
      }
    }
  }, [currentTrackIndex, currentTrack, isPlaying]);

  // MEDIA SESSION API LOGIC
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

      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current) {
          audioRef.current.play();
          setIsPlaying(true);
        }
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      });
      
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
    }
  }, [currentTrack]);

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
    } catch (error) {
      alert("Error uploading: " + error.message);
    } finally {
      setIsUploading(false);
    }
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
      case "repeat-all": return <Repeat size={20} color="#1DB954" />;
      case "repeat-one": return <Repeat1 size={20} color="#1DB954" />;
      case "shuffle": return <Shuffle size={20} color="#1DB954" />;
      case "order": default: return <ArrowRight size={20} color="#777777" />;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (!session) return <Auth />;

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#000", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        :root { max-width: none !important; }
        body, html, #root { 
          margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important;
          background: #000 !important; overflow: hidden !important; box-sizing: border-box; text-align: left !important;
        }
        * { box-sizing: border-box; }
        .hover-effect { transition: transform 0.2s ease; }
        .hover-effect:hover { transform: scale(1.05); }
        .playlist-row { transition: background 0.2s ease; }
        .playlist-row:hover { background: rgba(255,255,255,0.08) !important; }
        .sidebar-item { transition: color 0.2s ease; cursor: pointer; }
        .sidebar-item:hover { color: #ffffff !important; }
        .glow-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 6px; outline: none; cursor: pointer; }
        .glow-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 0; height: 0; }
        .upload-input { width: 100%; padding: 12px; background: #2a2a2a; border: 1px solid #333; border-radius: 8px; color: white; margin-bottom: 16px; outline: none; }
        .upload-input:focus { border-color: #1DB954; }
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #555; border-radius: 10px; border: 2px solid #121212; }
      `}</style>

      {/* FIXED AUDIO TAG: Always mounted in the DOM to prevent unmounting drop-offs */}
      <audio 
        ref={audioRef} 
        src={currentTrack?.url || ""} 
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} 
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} 
        onEnded={handleTrackEnded} 
      />

      {/* OVERLAY LOADER: Replaces the unmounting loader component */}
      {isInitialLoad && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#121212", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#1DB954" }}>
          <Loader2 className="animate-spin" size={48} />
          <p style={{ marginTop: "16px", fontFamily: "sans-serif", color: "#b3b3b3" }}>Loading your tracks...</p>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "20px" }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: "20px" }}>
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

      {/* TOP HEADER BAR (Mobile optimized) */}
      <div style={{ height: "64px", flexShrink: 0, background: "#000000", display: "flex", justifyContent: "space-between", alignItems: "center", padding: isDesktop ? "0 24px" : "0 12px", borderBottom: "1px solid #1a1a1a", zIndex: 10 }}>
        <h1 style={{ margin: 0, fontSize: isDesktop ? "24px" : "20px", color: "#1DB954", fontWeight: "bold", letterSpacing: "-0.5px" }}>Euphony</h1>
        <div style={{ display: "flex", gap: isDesktop ? "12px" : "8px", alignItems: "center" }}>
          <button className="hover-effect" onClick={() => setShowUploadModal(true)} style={{ background: "#282828", border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <Plus size={16} color="#1DB954" /> {isDesktop && "Add Globally"}
          </button>
          <button className="hover-effect" onClick={() => setShowPlaylistModal(true)} style={{ background: "#282828", border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <FolderPlus size={16} color="#1DB954" /> {isDesktop && "New Playlist"}
          </button>
          <button className="hover-effect" onClick={() => supabase.auth.signOut()} style={{ background: "transparent", border: "1px solid #444", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: "#fff", cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center" }}>
            {isDesktop ? "Log Out" : <LogOut size={16} />}
          </button>
        </div>
      </div>

      {/* MAIN BODY LAYOUT */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: isDesktop ? "8px" : "4px", gap: isDesktop ? "8px" : "0" }}>
        
        {/* LEFT SIDEBAR NAVIGATION (Desktop Only) */}
        {isDesktop && (
          <div style={{ width: "260px", flexShrink: 0, background: "#121212", borderRadius: "8px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div onClick={() => { setSelectedPlaylistId(null); setCurrentTrackIndex(0); }} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: selectedPlaylistId === null ? "#ffffff" : "#b3b3b3", fontWeight: "bold", fontSize: "15px" }}>
                <Home size={24} color={selectedPlaylistId === null ? "#1DB954" : "#b3b3b3"} /> Global Library
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #282828", margin: "0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
              <span style={{ fontSize: "12px", fontWeight: "bold", color: "#b3b3b3", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Playlists</span>
              {userPlaylists.map(pl => (
                <div key={pl.id} onClick={() => { setSelectedPlaylistId(pl.id); setCurrentTrackIndex(0); }} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "12px", color: selectedPlaylistId === pl.id ? "#ffffff" : "#b3b3b3", fontSize: "15px", padding: "4px 0" }}>
                  <ListMusic size={20} color={selectedPlaylistId === pl.id ? "#1DB954" : "#b3b3b3"} /> 
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CENTER MAIN CONTENT AREA (Takes remaining width perfectly) */}
        <div style={{ flex: 1, minWidth: 0, background: "#121212", borderRadius: "8px", padding: isDesktop ? "32px" : "16px", overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: !isDesktop && currentTrack ? "100px" : "32px" }} className="custom-scrollbar">
          
          {/* MOBILE PLAYLIST SELECTOR TABS */}
          {!isDesktop && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "16px", flexShrink: 0 }} className="custom-scrollbar">
              <button onClick={() => { setSelectedPlaylistId(null); setCurrentTrackIndex(0); }} style={{ background: selectedPlaylistId === null ? "#1DB954" : "#282828", color: selectedPlaylistId === null ? "#000" : "#fff", border: "none", borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>
                Global Library
              </button>
              {userPlaylists.map((pl) => (
                <button key={pl.id} onClick={() => { setSelectedPlaylistId(pl.id); setCurrentTrackIndex(0); }} style={{ background: selectedPlaylistId === pl.id ? "#1DB954" : "#282828", color: selectedPlaylistId === pl.id ? "#000" : "#fff", border: "none", borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>
                  🔒 {pl.name}
                </button>
              ))}
            </div>
          )}

          {/* PLAYLIST HEADER BANNER */}
          {selectedPlaylistId !== null && activePlaylistObj && (
            <div style={{ background: "linear-gradient(180deg, #2b3833 0%, #121212 100%)", padding: isDesktop ? "40px 32px" : "24px", borderRadius: "12px", marginBottom: "32px", display: "flex", alignItems: isDesktop ? "flex-end" : "center", flexDirection: isDesktop ? "row" : "column", gap: "24px" }}>
              <div style={{ width: isDesktop ? "180px" : "140px", height: isDesktop ? "180px" : "140px", backgroundColor: "#282828", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", flexShrink: 0 }}>
                <FolderPlus size={isDesktop ? 72 : 56} color="#1DB954" />
              </div>
              <div style={{ flex: 1, minWidth: 0, textAlign: isDesktop ? "left" : "center" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: "#ccc" }}>Private Playlist</span>
                <h2 style={{ margin: "8px 0 16px 0", fontSize: isDesktop ? "48px" : "32px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activePlaylistObj.name}</h2>
                <p style={{ margin: 0, fontSize: "15px", color: "#b3b3b3" }}>Your personal collection • {playlistSongs.length} songs</p>
              </div>
            </div>
          )}

          {/* TABLE VIEW FOR PLAYLISTS */}
          {selectedPlaylistId !== null ? (
            <div style={{ width: "100%" }}>
              {playlistSongs.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "24px", justifyContent: isDesktop ? "flex-start" : "center" }}>
                  <button onClick={() => { setCurrentTrackIndex(0); setIsPlaying(true); }} className="hover-effect" style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#1DB954", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 16px rgba(0,0,0,0.4)" }}>
                    <Play size={28} fill="#000" color="#000" style={{ marginLeft: "4px" }} />
                  </button>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 50px" : "40px 1fr 40px", padding: "0 16px 12px 16px", borderBottom: "1px solid #282828", color: "#b3b3b3", fontSize: "13px", fontWeight: "bold" }}>
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
                      <div key={track.id} className="playlist-row" onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }} style={{ display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 50px" : "40px 1fr 40px", alignItems: "center", padding: "10px 16px", borderRadius: "6px", cursor: "pointer" }}>
                        <span style={{ color: isSelected ? "#1DB954" : "#b3b3b3", fontSize: "15px" }}>{index + 1}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                          <div style={{ width: "44px", height: "44px", borderRadius: "6px", backgroundColor: "#282828", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#555" />}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: "15px", fontWeight: isSelected ? "bold" : "normal", color: isSelected ? "#1DB954" : "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                            <div style={{ fontSize: "13px", color: "#a0a0a0", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
                          </div>
                        </div>
                        {isDesktop && <span style={{ color: "#b3b3b3", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "16px" }}>{track.album || "—"}</span>}
                        {isDesktop && <span style={{ color: "#b3b3b3", fontSize: "14px", paddingRight: "16px" }}>{formatDate(track.added_at)}</span>}
                        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                          <button title="Remove from playlist" onClick={(e) => handleRemoveSongFromPlaylist(selectedPlaylistId, track.id, e)} style={{ background: "transparent", border: "none", color: "#b3b3b3", cursor: "pointer", padding: "4px" }} className="hover-effect">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "80px 0", color: "#a0a0a0" }}>
                    <p style={{ margin: 0, fontSize: "16px" }}>This playlist is empty.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* GLOBAL LIBRARY */
            <div>
              <h2 style={{ fontSize: isDesktop ? "28px" : "24px", fontWeight: "bold", marginBottom: "24px", paddingLeft: isDesktop ? "16px" : "0", textAlign: isDesktop ? "left" : "center" }}>Global Library ({playlist.length})</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {playlist.length > 0 ? (
                  playlist.map((track, index) => {
                    const isSelected = index === currentTrackIndex;
                    return (
                      <div key={track.id} className="playlist-row" onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }} style={{ padding: "10px 16px", borderRadius: "8px", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: isDesktop ? "16px" : "12px" }}>
                        <div style={{ width: "48px", height: "48px", borderRadius: "6px", backgroundColor: "#282828", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                           {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#555" />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                          <div style={{ fontSize: "16px", fontWeight: isSelected ? "bold" : "normal", color: isSelected ? "#1DB954" : "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                          <div style={{ fontSize: "14px", color: "#a0a0a0", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
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
                              style={{ background: "#222", color: "#bbb", border: "1px solid #444", borderRadius: "6px", padding: "8px 12px", fontSize: "13px", cursor: "pointer", maxWidth: isDesktop ? "160px" : "120px", textOverflow: "ellipsis" }}
                            >
                              <option value="" disabled>Add to playlist...</option>
                              {userPlaylists.map(pl => (
                                <option key={pl.id} value={pl.id}>{pl.name}</option>
                              ))}
                            </select>
                          )}
                          {isSelected && isPlaying && <Loader2 size={18} className="animate-spin" color="#1DB954" />}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ textAlign: "center", padding: "100px 0", color: "#a0a0a0" }}>
                    <ImageIcon size={64} color="#333" style={{ marginBottom: "16px" }} />
                    <p style={{ margin: 0, fontSize: "18px" }}>Your library is empty. Click "Add Globally" to upload tracks.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR / ACTIVE PLAYER PANEL (Desktop View Only) */}
        {isDesktop && currentTrack && (
          <div style={{ width: "320px", flexShrink: 0, background: "#121212", borderRadius: "8px", padding: "24px", display: "flex", flexDirection: "column", boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
            
            {/* Background Blur Effect */}
            {currentTrack.poster_url && (
              <div style={{ position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%", backgroundImage: `url(${currentTrack.poster_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(60px) brightness(0.3) saturate(200%)", opacity: 0.8, zIndex: 0, pointerEvents: "none" }} />
            )}

            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
              
              {/* Perfectly Constrained Cover Art Box */}
              <div style={{ width: "100%", marginBottom: "24px", flexShrink: 0 }}>
                <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "10px", overflow: "hidden", backgroundColor: "rgba(40,40,40,0.5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 30px rgba(0,0,0,0.6)", position: "relative" }}>
                  {showLyrics ? (
                    <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: "16px", overflowY: "auto", background: "rgba(0,0,0,0.8)", color: "#fff", fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap", textAlign: "center", backdropFilter: "blur(10px)" }}>
                      {currentTrack.lyrics ? currentTrack.lyrics : <span style={{ color: "#aaa" }}>No lyrics available.</span>}
                    </div>
                  ) : (
                    currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={80} color="#555" />
                  )}
                </div>
              </div>

              {/* Track Info */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ minWidth: 0, flex: 1, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.title}</h3>
                  <p style={{ margin: 0, color: "#b3b3b3", fontSize: "15px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.artist}</p>
                </div>
                <button onClick={() => setShowLyrics(!showLyrics)} style={{ background: showLyrics ? "#1DB954" : "rgba(255,255,255,0.1)", color: showLyrics ? "#000" : "#fff", border: "none", borderRadius: "20px", padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", flexShrink: 0, marginLeft: "12px" }}>
                  <Mic2 size={16} /> {showLyrics ? "Hide" : "Lyrics"}
                </button>
              </div>

              {/* Progress & Controls */}
              <div style={{ marginTop: "auto", paddingBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "12px", color: "#b3b3b3", minWidth: "36px" }}>{formatTime(currentTime)}</span>
                  <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="glow-slider" style={{ flex: 1, background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)` }} />
                  <span style={{ fontSize: "12px", color: "#b3b3b3", minWidth: "36px", textAlign: "right" }}>{formatTime(duration)}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "4px", cursor: "pointer" }}>{renderModeIcon()}</button>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}><SkipBack size={24} fill="currentColor" /></button>
                    <button onClick={handlePlayPause} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", borderRadius: "50%", border: "none", backgroundColor: "#1DB954", color: "#000", cursor: "pointer", boxShadow: "0 4px 12px rgba(29, 185, 84, 0.4)" }}>
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: "4px" }} />}
                    </button>
                    <button onClick={handleNext} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}><SkipForward size={24} fill="currentColor" /></button>
                  </div>
                  <button onClick={toggleMute} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>{isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* MOBILE BOTTOM MINIMIZED PLAYER BAR */}
      {!isDesktop && currentTrack && (
        <div style={{ position: "fixed", bottom: "16px", left: "12px", right: "12px", background: "#282828", borderRadius: "8px", padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 12px 32px rgba(0,0,0,0.9)", zIndex: 2000, border: "1px solid #444" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", overflow: "hidden", flex: 1, minWidth: 0 }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "6px", backgroundColor: "#181818", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#555" />}
            </div>
            <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "15px", fontWeight: "bold", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.title}</div>
              <div style={{ fontSize: "13px", color: "#a0a0a0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.artist}</div>
            </div>
          </div>
          <button onClick={handlePlayPause} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer", padding: "8px", flexShrink: 0 }}>
            {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
          </button>
        </div>
      )}

    </div>
  );
}