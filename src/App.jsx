import React, { useState, useRef, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ArrowRight, Loader2, Plus, X, UploadCloud, Image as ImageIcon, Mic2
} from "lucide-react";
import { supabase } from "./supabase";
import Auth from "./Auth";

const PLAY_MODES = ["order", "repeat-all", "repeat-one", "shuffle"];

export default function App() {
  const [playlist, setPlaylist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [session, setSession] = useState(null);

  // Upload States
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [uploadAlbum, setUploadAlbum] = useState("");
  const [uploadLyrics, setUploadLyrics] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPoster, setUploadPoster] = useState(null);

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
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchSongs = async () => {
      const { data, error } = await supabase
        .from("songs")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) console.error("Error fetching songs:", error);
      else if (data) setPlaylist(data);
      setIsLoading(false);
    };
    fetchSongs();
  }, []);

  const currentTrack = playlist[currentTrackIndex];

  // Reset lyrics toggle when track changes
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

  const handlePlayPause = () => {
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
      if (playlist.length <= 1) return 0;
      let randomIndex = currentTrackIndex;
      while (randomIndex === currentTrackIndex) randomIndex = Math.floor(Math.random() * playlist.length);
      return randomIndex;
    }
    return (currentTrackIndex + 1) % playlist.length;
  };

  const handleNext = () => {
    if (playlist.length === 0) return;
    setCurrentTrackIndex(getNextTrackIndex());
  };

  const handlePrev = () => {
    if (playlist.length === 0) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    setCurrentTrackIndex((prevIndex) => prevIndex === 0 ? playlist.length - 1 : prevIndex - 1);
  };

  const handleTrackEnded = () => {
    if (playMode === "repeat-one") {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }
    if (playMode === "order" && currentTrackIndex === playlist.length - 1) {
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

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
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
  const volumePercent = isMuted ? 0 : volume * 100;

  if (!session) return <Auth />;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#121212', color: '#1DB954' }}>
        <Loader2 className="animate-spin" size={48} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ marginTop: '16px', fontFamily: 'sans-serif' }}>Loading your tracks from Supabase...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px 20px", fontFamily: "system-ui, -apple-system, sans-serif", background: "#121212", color: "#ffffff", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
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
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#181818", padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "400px", position: "relative", maxHeight: "90vh", overflowY: "auto" }} className="custom-scrollbar">
            <button onClick={() => setShowUploadModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#a0a0a0", cursor: "pointer" }}>
              <X size={24} />
            </button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <UploadCloud color="#1DB954" /> Add New Song
            </h2>
            
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
                {isUploading ? <><Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> Uploading...</> : "Upload to Cloud"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: "480px" }}>
        
        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#1DB954", fontWeight: "bold", letterSpacing: "-0.5px" }}>Euphony</h1>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="hover-effect" onClick={() => setShowUploadModal(true)} style={{ background: "#282828", border: "none", borderRadius: "8px", padding: "8px 12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
              <Plus size={16} color="#1DB954" /> Add Song
            </button>
            <button className="hover-effect" onClick={() => supabase.auth.signOut()} style={{ background: "transparent", border: "1px solid #333", borderRadius: "8px", padding: "8px 12px", color: "#fff", cursor: "pointer", fontSize: "14px" }}>
              Log Out
            </button>
          </div>
        </div>

        {playlist.length > 0 && currentTrack ? (
          <>
            <audio ref={audioRef} src={currentTrack.url} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={handleTrackEnded} />

            {/* MAIN PLAYER CARD */}
            <div style={{ background: "linear-gradient(180deg, #2a2a2a 0%, #121212 100%)", padding: "24px", borderRadius: "16px", marginBottom: "24px", boxShadow: "0 8px 32px rgba(0,0,0,0.6)" }}>
              
              {/* SPOTIFY-STYLE POSTER IMAGE OR LYRICS */}
              <div style={{ width: "100%", aspectRatio: "1/1", marginBottom: "24px", borderRadius: "8px", overflow: "hidden", backgroundColor: "#282828", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", position: "relative" }}>
                {showLyrics ? (
                  <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: "24px", overflowY: "auto", background: "#1a1a1a", color: "#fff", fontSize: "18px", lineHeight: "1.6", whiteSpace: "pre-wrap", textAlign: "center" }}>
                    {currentTrack.lyrics ? currentTrack.lyrics : <span style={{ color: "#777" }}>No lyrics available for this track.</span>}
                  </div>
                ) : (
                  currentTrack.poster_url ? (
                    <img src={currentTrack.poster_url} alt="Album Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <ImageIcon size={64} color="#555" />
                  )
                )}
              </div>

              {/* TRACK INFO & LYRICS TOGGLE */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <div style={{ textAlign: "left", flex: 1, overflow: "hidden" }}>
                  <h2 style={{ margin: "0 0 4px 0", fontSize: "24px", fontWeight: "bold", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {currentTrack.title}
                  </h2>
                  <p style={{ margin: 0, color: "#a0a0a0", fontSize: "16px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {currentTrack.artist} {currentTrack.album && `• ${currentTrack.album}`}
                  </p>
                </div>
                <button 
                  onClick={() => setShowLyrics(!showLyrics)}
                  style={{ background: showLyrics ? "#1DB954" : "transparent", color: showLyrics ? "#000" : "#a0a0a0", border: showLyrics ? "none" : "1px solid #444", borderRadius: "8px", padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", transition: "all 0.2s" }}
                >
                  <Mic2 size={16} /> {showLyrics ? "Hide Lyrics" : "Lyrics"}
                </button>
              </div>

              {/* SEEK BAR */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", color: "#a0a0a0", minWidth: "35px" }}>{formatTime(currentTime)}</span>
                <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="glow-slider" style={{ flex: 1, background: `linear-gradient(to right, #ffffff ${progressPercent}%, #4d4d4d ${progressPercent}%)` }} />
                <span style={{ fontSize: "12px", color: "#a0a0a0", minWidth: "35px", textAlign: "right" }}>{formatTime(duration)}</span>
              </div>

              {/* PLAYBACK CONTROLS */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
                <button className="hover-effect" onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {renderModeIcon()}
                </button>
                
                <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                  <button className="hover-effect" onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}><SkipBack size={28} fill="currentColor" /></button>
                  <button className="hover-effect" onClick={handlePlayPause} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "64px", height: "64px", borderRadius: "50%", border: "none", backgroundColor: "#1DB954", color: "#000", cursor: "pointer" }}>
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" style={{ marginLeft: "4px" }} />}
                  </button>
                  <button className="hover-effect" onClick={handleNext} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}><SkipForward size={28} fill="currentColor" /></button>
                </div>

                <button className="hover-effect" onClick={toggleMute} style={{ background: "transparent", border: "none", color: "#a0a0a0", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
              </div>
            </div>

            {/* PLAYLIST SECTION */}
            <h3 style={{ fontSize: "16px", color: "#ffffff", marginBottom: "16px", fontWeight: "bold" }}>Global Library ({playlist.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {playlist.map((track, index) => {
                const isSelected = index === currentTrackIndex;
                return (
                  <div key={track.id} className="playlist-track" onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }} style={{ padding: "8px 12px", borderRadius: "8px", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                    
                    <div style={{ width: "48px", height: "48px", borderRadius: "4px", backgroundColor: "#282828", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                       {track.poster_url ? (
                         <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                       ) : (
                         <ImageIcon size={20} color="#555" />
                       )}
                    </div>

                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ fontSize: "16px", fontWeight: isSelected ? "bold" : "normal", color: isSelected ? "#1DB954" : "#ffffff", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                        {track.title}
                      </div>
                      <div style={{ fontSize: "14px", color: "#a0a0a0", marginTop: "2px", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>
                        {track.artist}
                      </div>
                    </div>
                    {isSelected && isPlaying && <span style={{ fontSize: "12px", color: "#1DB954" }}><Loader2 size={16} className="animate-spin" /></span>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#a0a0a0", background: "#1e1e1e", borderRadius: "16px" }}>
            <ImageIcon size={48} color="#333" style={{ marginBottom: "16px" }} />
            <p style={{ margin: 0, fontSize: "16px" }}>Your library is empty.</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "14px", color: "#777" }}>Click "Add Song" to upload your first track.</p>
          </div>
        )}
      </div>
    </div>
  );
}