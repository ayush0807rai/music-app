import React, { useState, useRef, useEffect } from "react";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ArrowRight, Loader2, Plus, X, UploadCloud
} from "lucide-react";
import { supabase } from "./supabase";

const PLAY_MODES = ["order", "repeat-all", "repeat-one", "shuffle"];

export default function App() {
  // Database & UI States
  const [playlist, setPlaylist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Upload Form States
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [uploadFile, setUploadFile] = useState(null);

  // Player States
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [playMode, setPlayMode] = useState("repeat-all");

  const audioRef = useRef(null);

  // Fetch playlist on load
  useEffect(() => {
    const fetchSongs = async () => {
      const { data, error } = await supabase
        .from("playlist")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) console.error("Error fetching songs:", error);
      else if (data) setPlaylist(data);
      setIsLoading(false);
    };
    fetchSongs();
  }, []);

  const currentTrack = playlist[currentTrackIndex];

  // Sync volume with native audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Autoplay next track when switching if already playing
  useEffect(() => {
    if (audioRef.current && isPlaying && currentTrack) {
      audioRef.current.play().catch((err) => console.log("Playback error:", err));
    }
  }, [currentTrackIndex, currentTrack]);

  // --- UPLOAD LOGIC ---
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle || !uploadArtist) {
      alert("Please fill in all fields and select an MP3 file.");
      return;
    }

    setIsUploading(true);

    try {
      // 1. Generate a unique filename to prevent overwriting
      const fileExt = uploadFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // 2. Upload the file to the 'songs' storage bucket
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("songs")
        .upload(fileName, uploadFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      // 3. Get the permanent public URL
      const { data: { publicUrl } } = supabase.storage
        .from("songs")
        .getPublicUrl(fileName);

      // 4. Save the track details to the 'playlist' table
      const { data: dbData, error: dbError } = await supabase
        .from("playlist")
        .insert([{ title: uploadTitle, artist: uploadArtist, url: publicUrl }])
        .select();

      if (dbError) throw dbError;

      // 5. Update the UI with the new song immediately
      setPlaylist([...playlist, dbData[0]]);
      setShowUploadModal(false);
      setUploadTitle("");
      setUploadArtist("");
      setUploadFile(null);
      alert("Song uploaded successfully!");

    } catch (error) {
      console.error("Upload error:", error);
      alert("Error uploading song: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- PLAYER CONTROLS ---
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
      `}</style>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: "#181818", padding: "32px", borderRadius: "16px", width: "100%", maxWidth: "400px", position: "relative" }}>
            <button onClick={() => setShowUploadModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#a0a0a0", cursor: "pointer" }}>
              <X size={24} />
            </button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
              <UploadCloud color="#1DB954" /> Add New Song
            </h2>
            
            <form onSubmit={handleUploadSubmit}>
              <input type="text" placeholder="Song Title" required value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="upload-input" />
              <input type="text" placeholder="Artist Name" required value={uploadArtist} onChange={(e) => setUploadArtist(e.target.value)} className="upload-input" />
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: "#a0a0a0", fontSize: "14px" }}>MP3 Audio File</label>
                <input type="file" accept="audio/*" required onChange={(e) => setUploadFile(e.target.files[0])} style={{ color: "#a0a0a0" }} />
              </div>

              <button type="submit" disabled={isUploading} style={{ width: "100%", padding: "14px", borderRadius: "8px", background: isUploading ? "#555" : "#1DB954", color: isUploading ? "#aaa" : "#000", border: "none", fontWeight: "bold", cursor: isUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {isUploading ? <><Loader2 size={18} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} /> Uploading...</> : "Upload to Cloud"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div style={{ width: "100%", maxWidth: "480px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h1 style={{ margin: 0, fontSize: "24px" }}>My Cloud Player</h1>
          <button className="hover-effect" onClick={() => setShowUploadModal(true)} style={{ background: "#282828", border: "none", borderRadius: "8px", padding: "8px 12px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px" }}>
            <Plus size={16} color="#1DB954" /> Add Song
          </button>
        </div>

        {playlist.length > 0 && currentTrack ? (
          <>
            <audio ref={audioRef} src={currentTrack.url} onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)} onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)} onEnded={handleTrackEnded} />

            <div style={{ background: "#1e1e1e", padding: "24px", borderRadius: "16px", marginBottom: "24px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
              <div style={{ marginBottom: "16px" }}>
                <h2 style={{ margin: "0 0 6px 0", fontSize: "18px" }}>{currentTrack.title}</h2>
                <p style={{ margin: 0, color: "#a0a0a0", fontSize: "14px" }}>{currentTrack.artist}</p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "#a0a0a0", minWidth: "35px" }}>{formatTime(currentTime)}</span>
                <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="glow-slider" style={{ flex: 1, background: `linear-gradient(to right, #1DB954 ${progressPercent}%, #333 ${progressPercent}%)` }} />
                <span style={{ fontSize: "12px", color: "#a0a0a0", minWidth: "35px" }}>{formatTime(duration)}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "24px", marginTop: "20px" }}>
                <button className="hover-effect" onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}><SkipBack size={22} /></button>
                <button className="hover-effect" onClick={handlePlayPause} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "52px", height: "52px", borderRadius: "50%", border: "none", backgroundColor: "#1DB954", color: "#000", cursor: "pointer" }}>
                  {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </button>
                <button className="hover-effect" onClick={handleNext} style={{ background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}><SkipForward size={22} /></button>
                <button className="hover-effect" onClick={cyclePlayMode} style={{ background: "#282828", border: "none", borderRadius: "8px", padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{renderModeIcon()}</button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "20px", paddingTop: "14px", borderTop: "1px solid #2d2d2d" }}>
                <button className="hover-effect" onClick={toggleMute} style={{ background: "transparent", border: "none", color: "#a0a0a0", cursor: "pointer", display: "flex", alignItems: "center" }}>
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input type="range" min={0} max={1} step={0.01} value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="glow-slider" style={{ flex: 1, background: `linear-gradient(to right, #1DB954 ${volumePercent}%, #333 ${volumePercent}%)` }} />
              </div>
            </div>

            <h3 style={{ fontSize: "16px", color: "#a0a0a0", marginBottom: "12px" }}>Playlist ({playlist.length} tracks)</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {playlist.map((track, index) => {
                const isSelected = index === currentTrackIndex;
                return (
                  <div key={track.id} className="playlist-track" onClick={() => { setCurrentTrackIndex(index); setIsPlaying(true); }} style={{ padding: "12px 16px", borderRadius: "8px", background: isSelected ? "#2a2a2a" : "#181818", cursor: "pointer", borderLeft: isSelected ? "4px solid #1DB954" : "4px solid transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: isSelected ? "bold" : "normal", color: isSelected ? "#1DB954" : "#ffffff" }}>{track.title}</div>
                      <div style={{ fontSize: "12px", color: "#777", marginTop: "2px" }}>{track.artist}</div>
                    </div>
                    {isSelected && isPlaying && <span style={{ fontSize: "11px", color: "#1DB954" }}>Playing</span>}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#a0a0a0" }}>
            <p>No tracks found! Click "Add Song" above to upload your first track.</p>
          </div>
        )}
      </div>
    </div>
  );
}