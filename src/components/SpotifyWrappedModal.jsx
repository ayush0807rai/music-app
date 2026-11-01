// src/components/SpotifyWrappedModal.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Play, Pause, Share2, Download, RotateCcw, Sparkles, Music, Clock, Lock, Check, Award } from "lucide-react";

const SLIDE_DURATION_MS = 6500; // 6.5 seconds per slide
const TOTAL_SLIDES = 6;

// Dynamic aesthetic background gradients for each slide
const SLIDE_THEMES = [
  {
    bg: "linear-gradient(145deg, #18002e 0%, #3d0c5a 50%, #0d011a 100%)",
    accent: "#ff007f",
    accentLight: "rgba(255, 0, 127, 0.25)"
  },
  {
    bg: "linear-gradient(145deg, #051937 0%, #004d7a 45%, #008793 100%)",
    accent: "#00ffc4",
    accentLight: "rgba(0, 255, 196, 0.25)"
  },
  {
    bg: "linear-gradient(145deg, #2c0b0e 0%, #63141f 50%, #150508 100%)",
    accent: "#ff4d6d",
    accentLight: "rgba(255, 77, 109, 0.25)"
  },
  {
    bg: "linear-gradient(145deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    accent: "#1db954",
    accentLight: "rgba(29, 185, 84, 0.25)"
  },
  {
    bg: "linear-gradient(145deg, #2b0938 0%, #59166f 50%, #1b0224 100%)",
    accent: "#e056fd",
    accentLight: "rgba(224, 86, 253, 0.25)"
  },
  {
    bg: "linear-gradient(145deg, #0b0914 0%, #1f1b33 50%, #08060f 100%)",
    accent: "#ffd166",
    accentLight: "rgba(255, 209, 102, 0.25)"
  }
];

export default function SpotifyWrappedModal({ wrappedData, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0); // 0 to 100
  const [copiedToast, setCopiedToast] = useState(false);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);

  const cardRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const touchStartXRef = useRef(null);
  const isHoldingRef = useRef(false);

  // If not eligible (< 15 mins), render gated screen
  if (!wrappedData || !wrappedData.eligible) {
    const mins = wrappedData?.totalMinutes || 0;
    const year = wrappedData?.year || new Date().getFullYear();
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10050,
          padding: "20px"
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "linear-gradient(145deg, #161a29 0%, #0e111a 100%)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "24px",
            padding: "36px 28px",
            maxWidth: "380px",
            width: "100%",
            textAlign: "center",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
            color: "#fff",
            position: "relative"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "none",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            <X size={18} />
          </button>
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "rgba(255, 77, 109, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              color: "#ff4d6d"
            }}
          >
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: "22px", fontWeight: "800", marginBottom: "10px", letterSpacing: "-0.5px" }}>
            {year} Wrapped Locked
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", lineHeight: "1.5", marginBottom: "20px" }}>
            Accounts need at least 15 minutes of listening in {year} to generate a Wrapped.
          </p>
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "14px",
              padding: "14px",
              marginBottom: "24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.7)" }}>Listening progress</span>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#1db954" }}>
              {mins} / 15 mins
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #1db954, #1aa34a)",
              border: "none",
              color: "#fff",
              fontWeight: "700",
              fontSize: "14px",
              cursor: "pointer"
            }}
          >
            Keep Listening
          </button>
        </div>
      </div>
    );
  }

  const {
    year,
    userName,
    totalMinutes,
    totalHours,
    topSong,
    topTracks,
    topArtist,
    topArtists,
    topMood,
    shareText
  } = wrappedData;

  const currentTheme = SLIDE_THEMES[currentSlide] || SLIDE_THEMES[0];

  const handleNextSlide = useCallback(() => {
    if (currentSlide < TOTAL_SLIDES - 1) {
      setCurrentSlide((prev) => prev + 1);
      setSlideProgress(0);
    } else {
      setIsPaused(true);
    }
  }, [currentSlide]);

  const handlePrevSlide = useCallback(() => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
      setSlideProgress(0);
    }
  }, [currentSlide]);

  // Story progress timer
  useEffect(() => {
    if (isPaused) {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const stepMs = 50;
    const increment = (stepMs / SLIDE_DURATION_MS) * 100;

    progressIntervalRef.current = setInterval(() => {
      setSlideProgress((prev) => {
        if (prev >= 100) {
          handleNextSlide();
          return 0;
        }
        return prev + increment;
      });
    }, stepMs);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPaused, handleNextSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " ") handleNextSlide();
      else if (e.key === "ArrowLeft") handlePrevSlide();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNextSlide, handlePrevSlide, onClose]);

  // Hold to pause interaction
  const handlePointerDown = (e) => {
    // Avoid pausing if clicking interactive buttons
    if (e.target.closest("button") || e.target.closest(".interactive-btn")) return;
    isHoldingRef.current = true;
    setIsPaused(true);
  };

  const handlePointerUp = (e) => {
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      setIsPaused(false);
    }
  };

  const handleSlideTap = (e) => {
    if (e.target.closest("button") || e.target.closest(".interactive-btn")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const tapX = (e.clientX || (e.touches && e.touches[0]?.clientX) || 0) - rect.left;
    const width = rect.width;

    if (tapX < width * 0.32) {
      handlePrevSlide();
    } else {
      handleNextSlide();
    }
  };

  const copySummaryToClipboard = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2500);
    }
  };

  const downloadCardAsImage = () => {
    try {
      setIsGeneratingCard(true);
      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext("2d");

      // Draw background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, "#0d041c");
      bgGrad.addColorStop(0.5, "#2a0a4e");
      bgGrad.addColorStop(1, "#070210");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Radial decorative glow
      const radial = ctx.createRadialGradient(540, 600, 50, 540, 600, 600);
      radial.addColorStop(0, "rgba(255, 0, 127, 0.4)");
      radial.addColorStop(1, "rgba(255, 0, 127, 0)");
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, 1080, 1920);

      // Top branding
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("EUPHONY", 540, 180);

      ctx.fillStyle = "#1db954";
      ctx.font = "900 86px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${year} WRAPPED`, 540, 280);

      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "42px system-ui, -apple-system, sans-serif";
      ctx.fillText(`Prepared for ${userName}`, 540, 360);

      // Stat card 1: Minutes
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(140, 440, 800, 240, 36);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "32px system-ui, -apple-system, sans-serif";
      ctx.fillText("TOTAL LISTENING TIME", 540, 510);

      ctx.fillStyle = "#00ffc4";
      ctx.font = "bold 96px system-ui, -apple-system, sans-serif";
      ctx.fillText(`${totalMinutes.toLocaleString()} MINS`, 540, 615);

      // Stat card 2: Top Artist
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(140, 720, 800, 240, 36);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "32px system-ui, -apple-system, sans-serif";
      ctx.fillText("TOP ARTIST", 540, 790);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 76px system-ui, -apple-system, sans-serif";
      ctx.fillText(topArtist?.name || "Music", 540, 890);

      // Stat card 3: Top Tracks
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(140, 1000, 800, 560, 36);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "32px system-ui, -apple-system, sans-serif";
      ctx.fillText("TOP SONGS", 540, 1070);

      ctx.textAlign = "left";
      topTracks.forEach((t, i) => {
        const yPos = 1150 + i * 80;
        ctx.fillStyle = "#ff4d6d";
        ctx.font = "bold 40px system-ui, -apple-system, sans-serif";
        ctx.fillText(`${i + 1}`, 180, yPos);

        ctx.fillStyle = "#ffffff";
        ctx.font = "600 38px system-ui, -apple-system, sans-serif";
        const songLine = `${t.title} - ${t.artist}`.slice(0, 32);
        ctx.fillText(songLine, 240, yPos);
      });

      // Stat card 4: Mood
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(140, 1600, 800, 180, 36);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "30px system-ui, -apple-system, sans-serif";
      ctx.fillText("DOMINANT VIBE", 540, 1660);

      ctx.fillStyle = "#ffd166";
      ctx.font = "bold 64px system-ui, -apple-system, sans-serif";
      ctx.fillText(topMood?.name || "Romantic", 540, 1740);

      // Download
      const link = document.createElement("a");
      link.download = `euphony-wrapped-${year}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setIsGeneratingCard(false);
    } catch (e) {
      console.warn("Could not generate card image:", e);
      setIsGeneratingCard(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.92)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10050,
        userSelect: "none"
      }}
      onClick={onClose}
    >
      {/* Toast */}
      {copiedToast && (
        <div
          style={{
            position: "absolute",
            top: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255, 255, 255, 0.95)",
            color: "#0d041c",
            padding: "10px 20px",
            borderRadius: "30px",
            fontSize: "13px",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
            zIndex: 10060
          }}
        >
          <Check size={16} color="#1db954" />
          Summary copied to clipboard
        </div>
      )}

      {/* Main Story Container (Full screen on mobile, portrait card on desktop) */}
      <div
        ref={cardRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={handleSlideTap}
        style={{
          width: "100%",
          maxWidth: "430px",
          height: "100%",
          maxHeight: "860px",
          background: currentTheme.bg,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 30px 90px rgba(0, 0, 0, 0.9)",
          borderRadius: "0px",
          overflow: "hidden",
          transition: "background 0.6s ease"
        }}
        className="wrapped-container"
      >
        <style>{`
          @media (min-width: 600px) {
            .wrapped-container {
              border-radius: 28px !important;
              height: 92vh !important;
              border: 1px solid rgba(255, 255, 255, 0.15) !important;
            }
          }
          @keyframes spinSlow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes pulseSoft {
            0%, 100% { transform: scale(1); opacity: 0.9; }
            50% { transform: scale(1.05); opacity: 1; }
          }
          .spin-animation {
            animation: spinSlow 16s linear infinite;
          }
          .pulse-animation {
            animation: pulseSoft 3s ease-in-out infinite;
          }
        `}</style>

        {/* Top Progress Bars (1 segment per slide) */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            padding: "16px 16px 8px",
            zIndex: 10
          }}
        >
          {Array.from({ length: TOTAL_SLIDES }).map((_, idx) => {
            let fillPct = 0;
            if (idx < currentSlide) fillPct = 100;
            else if (idx === currentSlide) fillPct = slideProgress;

            return (
              <div
                key={idx}
                style={{
                  flex: 1,
                  height: "3px",
                  background: "rgba(255, 255, 255, 0.25)",
                  borderRadius: "2px",
                  overflow: "hidden"
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${fillPct}%`,
                    background: "#ffffff",
                    borderRadius: "2px",
                    transition: idx === currentSlide ? "none" : "width 0.2s ease"
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Top Controls Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 16px 12px",
            zIndex: 10
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "900",
                letterSpacing: "1px",
                color: "rgba(255, 255, 255, 0.8)",
                textTransform: "uppercase"
              }}
            >
              Euphony {year}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused((p) => !p);
              }}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              {isPaused ? <Play size={14} /> : <Pause size={14} />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                cursor: "pointer"
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Slide Content Area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "24px",
            position: "relative",
            zIndex: 5,
            color: "#fff"
          }}
        >
          {/* SLIDE 0: Welcome / The Cover */}
          {currentSlide === 0 && (
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: "90px",
                  height: "90px",
                  borderRadius: "28px",
                  background: "linear-gradient(135deg, #ff007f, #7928ca)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 30px",
                  boxShadow: "0 20px 40px rgba(255, 0, 127, 0.45)"
                }}
                className="pulse-animation"
              >
                <Sparkles size={46} color="#ffffff" />
              </div>
              <h1
                style={{
                  fontSize: "44px",
                  fontWeight: "900",
                  lineHeight: "1.05",
                  letterSpacing: "-1.5px",
                  marginBottom: "12px",
                  textTransform: "uppercase"
                }}
              >
                Your {year}
                <br />
                <span style={{ color: "#ff007f" }}>Wrapped</span>
              </h1>
              <p
                style={{
                  fontSize: "16px",
                  color: "rgba(255, 255, 255, 0.75)",
                  lineHeight: "1.5",
                  maxWidth: "280px",
                  margin: "0 auto 36px"
                }}
              >
                A year of unforgettable rhythm, emotion, and melody.
              </p>
              <div
                style={{
                  display: "inline-block",
                  padding: "8px 18px",
                  borderRadius: "20px",
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: "rgba(255, 255, 255, 0.9)"
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  marginTop: "48px",
                  fontSize: "12px",
                  color: "rgba(255, 255, 255, 0.4)",
                  letterSpacing: "0.5px"
                }}
              >
                Tap anywhere to advance
              </div>
            </div>
          )}

          {/* SLIDE 1: Listening Time */}
          {currentSlide === 1 && (
            <div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#00ffc4",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}
              >
                Time Listened
              </span>
              <h2
                style={{
                  fontSize: "30px",
                  fontWeight: "900",
                  lineHeight: "1.15",
                  marginTop: "8px",
                  marginBottom: "32px",
                  letterSpacing: "-0.5px"
                }}
              >
                You lived in the music this year.
              </h2>
              <div
                style={{
                  background: "rgba(0, 255, 196, 0.1)",
                  border: "1px solid rgba(0, 255, 196, 0.3)",
                  borderRadius: "24px",
                  padding: "36px 24px",
                  textAlign: "center",
                  marginBottom: "28px"
                }}
              >
                <div
                  style={{
                    fontSize: "56px",
                    fontWeight: "900",
                    color: "#00ffc4",
                    letterSpacing: "-1px",
                    lineHeight: "1"
                  }}
                >
                  {totalMinutes.toLocaleString()}
                </div>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "rgba(255, 255, 255, 0.9)",
                    marginTop: "8px",
                    letterSpacing: "0.5px"
                  }}
                >
                  MINUTES LISTENED
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    color: "rgba(255, 255, 255, 0.6)",
                    marginTop: "6px"
                  }}
                >
                  That's over {totalHours} hours of playback
                </div>
              </div>
              <p
                style={{
                  fontSize: "15px",
                  color: "rgba(255, 255, 255, 0.8)",
                  lineHeight: "1.5",
                  textAlign: "center"
                }}
              >
                {totalMinutes >= 600
                  ? "You were among the most dedicated listeners on Euphony. Your days had a true soundtrack."
                  : "Every moment you listened was a moment filled with heart."}
              </p>
            </div>
          )}

          {/* SLIDE 2: Top Artist */}
          {currentSlide === 2 && (
            <div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#ff4d6d",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}
              >
                #1 Artist
              </span>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: "900",
                  lineHeight: "1.15",
                  marginTop: "6px",
                  marginBottom: "24px",
                  letterSpacing: "-0.5px"
                }}
              >
                Your most played artist.
              </h2>
              {/* Hero Spotlight */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "24px"
                }}
              >
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "4px solid #ff4d6d",
                    boxShadow: "0 15px 35px rgba(255, 77, 109, 0.4)",
                    marginBottom: "14px",
                    background: "rgba(255, 255, 255, 0.08)"
                  }}
                >
                  {topArtist?.image ? (
                    <img
                      src={topArtist.image}
                      alt={topArtist.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff"
                      }}
                    >
                      <Award size={48} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "24px", fontWeight: "900", color: "#fff", textAlign: "center" }}>
                  {topArtist?.name || "Music"}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.65)", marginTop: "4px" }}>
                  {topArtist?.plays} plays this year
                </div>
              </div>

              {/* Top 5 Artists Countdown */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "18px",
                  padding: "12px 16px",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "rgba(255, 255, 255, 0.5)",
                    marginBottom: "8px",
                    textTransform: "uppercase"
                  }}
                >
                  Top 5 Artists
                </div>
                {topArtists.map((a, i) => (
                  <div
                    key={a.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: i < topArtists.length - 1 ? "1px solid rgba(255, 255, 255, 0.06)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: i === 0 ? "#ff4d6d" : "rgba(255, 255, 255, 0.5)", width: "16px" }}>
                        {i + 1}
                      </span>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#fff" }}>
                        {a.name}
                      </span>
                    </div>
                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)" }}>
                      {a.plays} plays
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 3: Top Songs */}
          {currentSlide === 3 && (
            <div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#1db954",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}
              >
                Top Song
              </span>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: "900",
                  lineHeight: "1.15",
                  marginTop: "6px",
                  marginBottom: "20px",
                  letterSpacing: "-0.5px"
                }}
              >
                Your defining anthem.
              </h2>
              {/* Spinning Vinyl Record Artwork */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  marginBottom: "20px"
                }}
              >
                <div
                  style={{
                    width: "120px",
                    height: "120px",
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "3px solid #1db954",
                    boxShadow: "0 15px 35px rgba(29, 185, 84, 0.4)",
                    marginBottom: "12px",
                    background: "rgba(255, 255, 255, 0.08)"
                  }}
                  className="spin-animation"
                >
                  {topSong?.poster_url ? (
                    <img
                      src={topSong.poster_url}
                      alt={topSong.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      <Music size={44} color="#1db954" />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: "#fff", textAlign: "center" }}>
                  {topSong?.title || "Untitled"}
                </div>
                <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.65)", marginTop: "2px" }}>
                  {topSong?.artist}
                </div>
              </div>

              {/* Top 5 Songs List */}
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "18px",
                  padding: "12px 16px",
                  border: "1px solid rgba(255, 255, 255, 0.1)"
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "rgba(255, 255, 255, 0.5)",
                    marginBottom: "8px",
                    textTransform: "uppercase"
                  }}
                >
                  Top 5 Tracks
                </div>
                {topTracks.map((t, i) => (
                  <div
                    key={t.id || i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 0",
                      borderBottom: i < topTracks.length - 1 ? "1px solid rgba(255, 255, 255, 0.06)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <span style={{ fontSize: "13px", fontWeight: "800", color: i === 0 ? "#1db954" : "rgba(255, 255, 255, 0.5)", width: "16px" }}>
                        {i + 1}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.title}
                        </div>
                        <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.artist}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.5)", flexShrink: 0, marginLeft: "8px" }}>
                      {t.plays} plays
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 4: Sonic Persona / Mood Vibe */}
          {currentSlide === 4 && (
            <div style={{ textAlign: "center" }}>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: "800",
                  color: "#e056fd",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}
              >
                Audio Aura
              </span>
              <h2
                style={{
                  fontSize: "28px",
                  fontWeight: "900",
                  lineHeight: "1.15",
                  marginTop: "8px",
                  marginBottom: "32px",
                  letterSpacing: "-0.5px"
                }}
              >
                Your defining musical vibe.
              </h2>
              {/* Glowing Aura Ring */}
              <div
                style={{
                  width: "160px",
                  height: "160px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(224, 86, 253, 0.8) 0%, rgba(121, 40, 202, 0.4) 60%, transparent 100%)",
                  boxShadow: "0 0 60px rgba(224, 86, 253, 0.6)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 32px"
                }}
                className="pulse-animation"
              >
                <div style={{ fontSize: "28px", fontWeight: "900", color: "#fff" }}>
                  {topMood?.name}
                </div>
                <div style={{ fontSize: "13px", color: "rgba(255, 255, 255, 0.8)", marginTop: "4px" }}>
                  {topMood?.percentage}% of your listening
                </div>
              </div>
              <p
                style={{
                  fontSize: "15px",
                  color: "rgba(255, 255, 255, 0.85)",
                  lineHeight: "1.6",
                  maxWidth: "320px",
                  margin: "0 auto"
                }}
              >
                {topMood?.description}
              </p>
            </div>
          )}

          {/* SLIDE 5: The Masterpiece Share Card */}
          {currentSlide === 5 && (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "22px", fontWeight: "900", letterSpacing: "-0.5px" }}>
                      {year} Wrapped Summary
                    </h3>
                    <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.6)" }}>
                      Your complete year in music
                    </span>
                  </div>
                  <div
                    style={{
                      background: "rgba(255, 209, 102, 0.15)",
                      color: "#ffd166",
                      padding: "4px 12px",
                      borderRadius: "16px",
                      fontSize: "11px",
                      fontWeight: "800",
                      textTransform: "uppercase"
                    }}
                  >
                    Euphony
                  </div>
                </div>

                {/* Summary Card Grid */}
                <div
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "20px",
                    padding: "16px",
                    marginBottom: "16px"
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                    <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "10px", borderRadius: "12px" }}>
                      <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", fontWeight: "700" }}>Minutes</span>
                      <div style={{ fontSize: "18px", fontWeight: "900", color: "#00ffc4", marginTop: "2px" }}>
                        {totalMinutes.toLocaleString()}
                      </div>
                    </div>
                    <div style={{ background: "rgba(0, 0, 0, 0.25)", padding: "10px", borderRadius: "12px" }}>
                      <span style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", fontWeight: "700" }}>Top Artist</span>
                      <div style={{ fontSize: "15px", fontWeight: "800", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                        {topArtist?.name || "Music"}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <div style={{ fontSize: "10px", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", fontWeight: "700", marginBottom: "6px" }}>
                      Top 5 Songs
                    </div>
                    {topTracks.slice(0, 5).map((t, i) => (
                      <div key={t.id || i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", padding: "3px 0" }}>
                        <span style={{ color: "#fff", fontWeight: "600", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "230px" }}>
                          {i + 1}. {t.title}
                        </span>
                        <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "11px" }}>
                          {t.plays}p
                        </span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "8px", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
                    <span style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.6)" }}>Sonic Persona</span>
                    <span style={{ fontSize: "12px", fontWeight: "800", color: "#ffd166" }}>{topMood?.name}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copySummaryToClipboard();
                    }}
                    className="interactive-btn"
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "14px",
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "none",
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <Share2 size={16} />
                    Copy Summary
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadCardAsImage();
                    }}
                    disabled={isGeneratingCard}
                    className="interactive-btn"
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #1db954, #1aa34a)",
                      border: "none",
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer",
                      opacity: isGeneratingCard ? 0.6 : 1
                    }}
                  >
                    <Download size={16} />
                    {isGeneratingCard ? "Exporting..." : "Download Card"}
                  </button>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(0);
                      setSlideProgress(0);
                      setIsPaused(false);
                    }}
                    className="interactive-btn"
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "12px",
                      background: "transparent",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "rgba(255, 255, 255, 0.8)",
                      fontWeight: "600",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      cursor: "pointer"
                    }}
                  >
                    <RotateCcw size={14} />
                    Replay
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="interactive-btn"
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "12px",
                      background: "transparent",
                      border: "none",
                      color: "rgba(255, 255, 255, 0.6)",
                      fontWeight: "600",
                      fontSize: "12px",
                      cursor: "pointer"
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
