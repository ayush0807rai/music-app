import React, { useState, useRef, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ArrowRight, Loader2, Plus, X, UploadCloud, Image as ImageIcon, Mic2, ChevronDown, FolderPlus
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

  // Fetch Songs & User Playlists
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

  // Fetch songs inside selected playlist when changed
  useEffect(() => {
    if (selectedPlaylistId === null) return;

    const fetchPlaylistSongs = async () => {
      const { data, error } = await supabase
        .from("playlist_songs")
        .select("song_id, songs(*)")
        .eq("playlist_id", selectedPlaylistId);

      if (data) {
        const formattedSongs = data.map(item => item.songs).filter(Boolean);
        setPlaylistSongs(formattedSongs);
      }
    };
    fetchPlaylistSongs();
  }, [selectedPlaylistId]);

  const activeTrackList = selectedPlaylistId === null ? playlist : playlistSongs;
  const currentTrack = activeTrackList[currentTrackIndex];

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
    <div style={{ padding: isDesktop ? "40px" : "20px 20px 100px 20px", fontFamily: "system-ui, -apple-system, sans-serif", background: "#121212", color: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", boxSizing: "border-box" }}>
      <style>{`
        .hover-effect { transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .hover-effect:hover { transform: scale(1.15); }
        .playlist-track { transition: background 0.2s ease; }
        .playlist-track:hover { background: #2d2d2d !important; }
        .glow-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 6px; outline: none; cursor: pointer; transition: height 0.2s ease, filter 0.2s ease; }
        .glow-slider:hover { height: 8px; filter: drop-shadow(0 0 8px rgba(29, 185, 84, 0.6)); }
        .glow-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 0px; height: 0px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px rgba(29, 185, 84, 0.8); transition: width 0.2s ease, height 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease; }
        .glow-slider:hover::-webkit-slider-thumb { width: 14px; height: 14px; transform: scale(1.2); box-shadow: 0 0 15px rgba(255, 255, 255, 0.8); }
        .upload-input { width: 100%; padding: 12px; background: #2a2a2a; border: 1px solid #333; border-radius: 8px; color: white; margin-bottom: 16px; outline: none; box-sizing: border-box; }
        .upload-input:focus { border-color: #1DB954; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #555; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #777; }
      `}</style>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}>
          <div style={{ background: "#181818", padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "400px", position: "relative", maxHeight: "90vh", overflowY: "auto" }} className="custom-scrollbar">
            <button onClick={() => setShowUploadModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#a0a0a0", cursor: "pointer" }}><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}><UploadCloud color="#1DB954" /> Add New Song</h2>
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
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}>
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

      <div style={{ width: "100%", maxWidth: isDesktop ? "960px" : "480px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#1DB954", fontWeight: "bold", letterSpacing: "-0.5px" }}>Euphony</h1>
          <div style={{ display: "flex", gap: "8px" }}>
            <button className="hover-effect" onClick={() => setShowUploadModal(true)} style={{ background: "#282828", border: "none", borderRadius: "8px", padding: "8px 12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
              <Plus size={16} color="#1DB954" /> Add Song
            </button>
            <button className="hover-effect" onClick={() => setShowPlaylistModal(true)} style={{ background: "#282828", border: "none", borderRadius: "8px", padding: "8px 12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
              <FolderPlus size={16} color="#1DB954" /> New Playlist
            </button>
            <button className="hover-effect" onClick={() => supabase.auth.signOut()} style={{ background: "transparent", border: "1px solid #333", borderRadius: "8px", padding: "8px 12px", color: "#fff", cursor: "pointer", fontSize: "14px" }}>
              Log Out
            </button>
          </div>
        </div>

        {/* PLAYLIST TABS / FILTERS */}
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

        {activeTrackList.length > 0 && currentTrack && (
          <audio ref={audioRef} src={currentTrack.url} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={handleTrackEnded} />
        )}

        {/* LAYOUT CONTAINER */}
        <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", gap: "32px", alignItems: "flex-start" }}>
          
          {/* TRACK LIST SECTION */}
          <div style={{ flex: 1, width: "100%" }}>
            <h3 style={{ fontSize: "16px", color: "#ffffff", marginBottom: "16px", fontWeight: "bold" }}>
              {selectedPlaylistId === null ? `Global Library (${playlist.length})` : `Playlist Songs (${activeTrackList.length})`}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {activeTrackList.length > 0 ? (
                activeTrackList.map((track, index) => {
                  const isSelected = index === currentTrackIndex;
                  return (
                    <div key={track.id || index} className="playlist-track" onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }} style={{ padding: "8px 12px", borderRadius: "8px", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "48px", height: "48px", borderRadius: "4px", backgroundColor: "#282828", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                         {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color="#555" />}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: "16px", fontWeight: isSelected ? "bold" : "normal", color: isSelected ? "#1DB954" : "#ffffff", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{track.title}</div>
                        <div style={{ fontSize: "14px", color: "#a0a0a0", marginTop: "2px", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{track.artist}</div>
                      </div>
                      
                      {userPlaylists.length > 0 && selectedPlaylistId === null && (
                        <select 
                          onClick={(e) => e.stopPropagation()} 
                          onChange={(e) => {
                            if (e.target.value) handleAddSongToPlaylist(e.target.value, track.id);
                            e.target.value = "";
                          }}
                          defaultValue=""
                          style={{ background: "#222", color: "#bbb", border: "1px solid #444", borderRadius: "6px", padding: "4px 8px", fontSize: "12px", cursor: "pointer" }}
                        >
                          <option value="" disabled>Add to...</option>
                          {userPlaylists.map(pl => (
                            <option key={pl.id} value={pl.id}>{pl.name}</option>
                          ))}
                        </select>
                      )}

                      {isSelected && isPlaying && <span style={{ fontSize: "12px", color: "#1DB954" }}><Loader2 size={16} className="animate-spin" /></span>}
                    </div>
                  );
                })
              ) : (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#a0a0a0", background: "#1e1e1e", borderRadius: "16px" }}>
                  <ImageIcon size={48} color="#333" style={{ marginBottom: "16px" }} />
                  <p style={{ margin: 0, fontSize: "16px" }}>No songs in this view yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* DESKTOP PLAYER CARD */}
          {isDesktop && currentTrack && (
            <div style={{ width: "380px", position: "sticky", top: "20px", background: "linear-gradient(180deg, #2a2a2a 0%, #121212 100%)", padding: "24px", borderRadius: "16px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)", overflow: "hidden" }}>
              {currentTrack.poster_url && (
                <div style={{ position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%", backgroundImage: `url(${currentTrack.poster_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(60px) brightness(0.5) saturate(200%)", opacity: 0.8, zIndex: 0, pointerEvents: "none", transition: "background-image 0.5s ease" }} />
              )}

              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ width: "100%", display: "flex", justifyContent: "center", marginBottom: "20px" }}>
                  <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "12px", overflow: "hidden", backgroundColor: "rgba(40,40,40,0.5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 40px rgba(0,0,0,0.7)", position: "relative" }}>
                    {showLyrics ? (
                      <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: "20px", overflowY: "auto", background: "rgba(0,0,0,0.7)", color: "#fff", fontSize: "16px", lineHeight: "1.6", whiteSpace: "pre-wrap", textAlign: "center", backdropFilter: "blur(10px)" }}>
                        {currentTrack.lyrics ? currentTrack.lyrics : <span style={{ color: "#aaa" }}>No lyrics available.</span>}
                      </div>
                    ) : (
                      currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={64} color="#555" />
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div style={{ textAlign: "left", flex: 1, overflow: "hidden", textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
                    <h2 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: "bold", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{currentTrack.title}</h2>
                    <p style={{ margin: 0, color: "#d0d0d0", fontSize: "14px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>{currentTrack.artist} {currentTrack.album && `• ${currentTrack.album}`}</p>
                  </div>
                  <button onClick={() => setShowLyrics(!showLyrics)} style={{ background: showLyrics ? "#1DB954" : "rgba(255,255,255,0.1)", color: showLyrics ? "#000" : "#fff", border: "none", borderRadius: "20px", padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: "bold", backdropFilter: "blur(5px)" }}>
                    <Mic2 size={14} /> {showLyrics ? "Hide" : "Lyrics"}
                  </button>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#d0d0d0", minWidth: "30px" }}>{formatTime(currentTime)}</span>
                  <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="glow-slider" style={{ flex: 1, background: `linear-gradient(to right, #ffffff ${progressPercent}%, rgba(255,255,255,0.2) ${progressPercent}%)` }} />
                  <span style={{ fontSize: "11px", color: "#d0d0d0", minWidth: "30px", textAlign: "right" }}>{formatTime(duration)}</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
                  <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "6px", cursor: "pointer" }}>{renderModeIcon()}</button>
                  <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
                    <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}><SkipBack size={24} fill="currentColor" /></button>
                    <button onClick={handlePlayPause} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "52px", height: "52px", borderRadius: "50%", border: "none", backgroundColor: "#1DB954", color: "#000", cursor: "pointer" }}>
                      {isPlaying ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" style={{ marginLeft: "3px" }} />}
                    </button>
                    <button onClick={handleNext} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}><SkipForward size={24} fill="currentColor" /></button>
                  </div>
                  <button onClick={toggleMute} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}>{isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}