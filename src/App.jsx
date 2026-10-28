import React, { 
  useState, useRef, useEffect, useMemo, useCallback } 
from "react";
import { flushSync } from "react-dom";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Shuffle, Repeat, Repeat1, ArrowRight, Loader2, Plus, X, UploadCloud, Image as ImageIcon, Mic2, FolderPlus, Trash2, Clock, Home, ListMusic, LogOut, ChevronDown, RefreshCw, ListPlus, Moon, Sun, SlidersHorizontal, ArrowUpDown, Search, GripVertical, Heart, MoreVertical, User, Disc, Maximize2, Minimize2, Keyboard,
  History, Flame, BarChart2, Sparkles, Blend,
  Share2, Radio, Users, Copy
} from "lucide-react";
import { supabase } from "./supabase";
import Auth from "./Auth";
import { AVAILABLE_MOODS, getSongMoods, suggestMood, getCustomMoodOverrides, setCustomSongMood, getMoodEmoji } from "./moods";
import { matchesArtist, getTrackArtists } from "./artistUtils";
import {
  getRecentlyPlayedIds,
  recordSongPlay,
  recordQualifiedPlay,
  getPlayCounts,
  getCustomMoods,
  clearListeningHistory,
  computeListeningStats,
  recordListeningDuration,
  setActiveUser,
  syncAccountStats,
  subscribeToCloudStats,
  flushCloudSync,
  saveLocalStats
} from "./statsManager";
import { STATIC_SONG_DURATIONS } from "./songDurations";

const PLAY_MODES = ["order", "repeat-all", "repeat-one", "shuffle"];
const SORT_CYCLE = [null, "title", "created_at", "duration"];
const SORT_LABELS = { default: "Default", title: "Name (A-Z)", created_at: "Date Added", duration: "Duration" };

const CrossfadeIcon = ({ size = 20, color = "currentColor", style = {} }) => (
  <Blend size={size} color={color} style={{ ...style, flexShrink: 0 }} />
);

const SortableSourceItem = ({ item, playSong, sourceName, isDarkMode = true }) => {
  const song = item.track;
  const actualIndex = item.originalIndex;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `source-${song.id}-${actualIndex}`, transition: { duration: 350, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`glass-row ${isDragging ? "active" : ""}`}
        {...attributes} 
        {...listeners}
        style={{
          display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px",
          boxShadow: isDragging ? "0 10px 20px rgba(0,0,0,0.3)" : "none",
          cursor: isDragging ? "grabbing" : "pointer"
        }}
      >
        <div onClick={(e) => { e.stopPropagation(); playSong(); }} style={{ width: "36px", height: "36px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, backgroundColor: "#222", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {song.poster_url ? <img src={song.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} /> : <ImageIcon size={16} color="#888" />}
        </div>
        <div onClick={(e) => { e.stopPropagation(); playSong(); }} style={{ minWidth: 0, flex: 1, cursor: "pointer" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>{song.title}</div>
          <div style={{ fontSize: "11px", color: isDarkMode ? "rgba(255,255,255,0.65)" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>{song.artist}</div>
        </div>

      </div>
    </div>
  );
};

const SortableQueueItem = ({ song, index, activeId, playFromQueue, removeFromQueue, isDarkMode = true }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: song.queue_id, transition: { duration: 350, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={`glass-row ${isDragging ? "active" : ""}`}
        {...attributes} 
        {...listeners}
        style={{
          display: "flex", alignItems: "center", gap: "10px", padding: "6px 8px",
          boxShadow: isDragging ? "0 10px 20px rgba(0,0,0,0.3)" : "none",
          cursor: isDragging ? "grabbing" : "pointer"
        }}
      >
        <div onClick={(e) => { e.stopPropagation(); playFromQueue(index); }} style={{ width: "36px", height: "36px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, backgroundColor: isDarkMode ? "#222" : "rgba(26,43,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          {song.poster_url ? <img src={song.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }} /> : <ImageIcon size={16} color={isDarkMode ? "#888" : "#64748B"} />}
        </div>
        <div onClick={(e) => { e.stopPropagation(); playFromQueue(index); }} style={{ minWidth: 0, flex: 1, cursor: "pointer" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>{song.title}</div>
          <div style={{ fontSize: "11px", color: isDarkMode ? "rgba(255,255,255,0.65)" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", pointerEvents: "none" }}>{song.artist}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); removeFromQueue(index, e); }} style={{ background: "transparent", border: "none", color: isDarkMode ? "rgba(255,255,255,0.45)" : "rgba(26,43,76,0.45)", cursor: "pointer", padding: "8px", flexShrink: 0 }} className="hover-effect">
          <X size={14} />
        </button>

      </div>
    </div>
  );
};

const SwipeableBottomSheet = ({ children, onClose, className, style }) => {
  const sheetRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.type !== 'touchstart') return;
    const target = e.target;
    const scrollable = target.closest('.custom-scrollbar');
    if (scrollable && scrollable.scrollTop > 0) return;

    isDragging.current = true;
    startY.current = e.clientY || (e.touches && e.touches[0].clientY);
    currentY.current = 0;
    
    if (sheetRef.current) {
      sheetRef.current.style.transition = 'none';
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaY = clientY - startY.current;

    if (deltaY > 0) {
      currentY.current = deltaY;
      if (sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${deltaY}px)`;
      }
    }
  };

  const resetSwipe = () => {
    if (sheetRef.current) {
      sheetRef.current.style.transform = 'translateY(0px)';
      sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    }
    currentY.current = 0;
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    if (currentY.current > 100) {
      if (sheetRef.current) {
        // Just call onClose and let the CSS exit animation handle the rest
      }
      onClose();
    } else {
      resetSwipe();
    }
  };

  return (
    <div
      ref={sheetRef}
      className={className}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
};

const SwipeableTrack = React.memo(({ track, onAddQueue, children, baseColor, actionColor, iconColor, className = "" }) => {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const actionBgRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const isHorizontalSwipe = useRef(false);
  const hasSwiped = useRef(false);

  const resetSwipe = () => {
    if (trackRef.current) {
      trackRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
      trackRef.current.style.transform = 'translateX(0px)';
    }
    currentX.current = 0;
    isHorizontalSwipe.current = false;
    isDragging.current = false;
    if (actionBgRef.current) {
      actionBgRef.current.style.opacity = '0';
    }
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if (e.target.closest('button, input, textarea, a, select, [role="button"]')) {
      isDragging.current = false;
      return;
    }

    startX.current = e.clientX;
    startY.current = e.clientY;
    currentX.current = 0;
    isDragging.current = true;
    isHorizontalSwipe.current = false;
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    const deltaX = clientX - startX.current;
    const deltaY = clientY - startY.current;

    if (!isHorizontalSwipe.current) {
      // If user is clearly scrolling vertically: stop tracking so native vertical scroll proceeds
      if (Math.abs(deltaY) > 12 && Math.abs(deltaY) > Math.abs(deltaX)) {
        isDragging.current = false;
        resetSwipe();
        return;
      }
      // If user is swiping horizontally to the right:
      if (deltaX > 10 && deltaX > Math.abs(deltaY)) {
        isHorizontalSwipe.current = true;
        hasSwiped.current = true;
        if (trackRef.current) {
          trackRef.current.style.transition = 'none';
        }
      } else if (deltaX < -10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Leftward movement: mark as swipe to avoid accidental tap-play, but don't translate
        hasSwiped.current = true;
        return;
      } else {
        return;
      }
    }

    // Horizontal swipe in progress:
    const maxSwipe = 120;
    let translate = 0;
    if (deltaX > 0) {
      translate = deltaX > maxSwipe ? maxSwipe + (deltaX - maxSwipe) * 0.15 : deltaX;
    }
    
    currentX.current = translate;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${translate}px)`;
    }
    if (actionBgRef.current) {
      actionBgRef.current.style.opacity = translate > 15 ? '1' : '0';
    }
  };

  const handlePointerUp = () => {
    if (!isDragging.current && !isHorizontalSwipe.current) return;

    const wasSwiping = isHorizontalSwipe.current;
    const finalX = currentX.current;
    
    isDragging.current = false;
    isHorizontalSwipe.current = false;
    resetSwipe();

    if (wasSwiping && finalX > 65) {
      onAddQueue(track);
      if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
        try { window.navigator.vibrate(50); } catch (err) {}
      }
    }

    if (wasSwiping && finalX > 15) {
      hasSwiped.current = true;
      setTimeout(() => {
        hasSwiped.current = false;
      }, 250);
    } else {
      hasSwiped.current = false;
    }
  };

  const handlePointerUpRef = useRef(null);
  handlePointerUpRef.current = handlePointerUp;

  useEffect(() => {
    const handleGlobalEnd = () => {
      if (isDragging.current || isHorizontalSwipe.current) {
        handlePointerUpRef.current?.();
      }
    };
    window.addEventListener('pointerup', handleGlobalEnd);
    window.addEventListener('pointercancel', handleGlobalEnd);
    window.addEventListener('blur', handleGlobalEnd);
    return () => {
      window.removeEventListener('pointerup', handleGlobalEnd);
      window.removeEventListener('pointercancel', handleGlobalEnd);
      window.removeEventListener('blur', handleGlobalEnd);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        borderRadius: '12px',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClickCapture={(e) => {
        // If a button inside was clicked, NEVER swallow it!
        if (e.target.closest('button, [role="button"], input, textarea, a')) {
          return;
        }
        // If a swipe just occurred, swallow the trailing click so the track doesn't play
        if (hasSwiped.current) {
          e.stopPropagation();
          e.preventDefault();
          hasSwiped.current = false;
        }
      }}
    >
      <div ref={actionBgRef} style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '100%',
        backgroundColor: actionColor || '#1DB954',
        display: 'flex', alignItems: 'center', paddingLeft: '24px', zIndex: 0,
        borderRadius: '12px', opacity: 0, transition: 'opacity 0.2s ease',
        pointerEvents: 'none'
      }}>
        <ListPlus color={iconColor || "#fff"} size={24} style={{ pointerEvents: 'none' }} />
      </div>

      <div ref={trackRef} style={{ position: 'relative', zIndex: 1, backgroundColor: 'transparent', borderRadius: '12px', willChange: 'transform', touchAction: 'pan-y' }}>
        {children}
      </div>
    </div>
  );
});

// --- LYRICS PARSER ---
const parseLyrics = (lrcString) => {
  if (!lrcString) return [];
  const lines = lrcString.split(/\r?\n/);
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

// --- ANIMATION PRESENCE HOOK ---
function useAnimatedPresence(isOpen, data, delay = 300) {
  const [render, setRender] = useState(isOpen);
  const [renderData, setRenderData] = useState(data);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      if (data !== undefined && data !== null) setRenderData(data);
    } else if (render) {
      const timer = setTimeout(() => {
        setRender(false);
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, data, delay, render]);

  return { render, isClosing: !isOpen && render, data: renderData };
}

const getCdnUrl = (url) => {
  if (!url) return url;
  try {
    const original = new URL(url);
    if (original.hostname === "rlojwqncfcbcszgdyjyz.supabase.co") {
      original.hostname = "euphony.ayush080705.workers.dev";
      return original.toString();
    }
    // Cloudflare Edge Audio Shield: when enabled, routes 320kbps audio via Cloudflare global edge
    // to bypass Cloudinary bandwidth accounting completely with 0 quality reduction.
    if (original.hostname === "res.cloudinary.com" && typeof window !== "undefined" && localStorage.getItem("euphony_use_cf_proxy") === "true") {
      return `https://euphony.ayush080705.workers.dev/cloudinary${original.pathname}${original.search}`;
    }
  } catch (e) {}
  return url;
};

// Smooth cubic-bezier curve evaluator matching CSS cubic-bezier(0.25, 1, 0.5, 1)
const cubicBezierEasing = (p1x, p1y, p2x, p2y) => {
  return (progress) => {
    if (progress <= 0) return 0;
    if (progress >= 1) return 1;
    let t = progress;
    for (let i = 0; i < 6; i++) {
      const currentX = 3 * (1 - t) * (1 - t) * t * p1x + 3 * (1 - t) * t * t * p2x + t * t * t;
      const dx = 3 * (1 - t) * (1 - t) * p1x + 6 * (1 - t) * t * (p2x - p1x) + 3 * t * t * (1 - p2x);
      if (Math.abs(currentX - progress) < 1e-4 || Math.abs(dx) < 1e-6) break;
      t -= (currentX - progress) / dx;
    }
    t = Math.max(0, Math.min(1, t));
    return 3 * (1 - t) * (1 - t) * t * p1y + 3 * (1 - t) * t * t * p2y + t * t * t;
  };
};
const smoothLyricScrollEase = cubicBezierEasing(0.25, 1, 0.5, 1);

const getSongThemeGradients = (rgb, isDark) => {
  if (!rgb || typeof rgb !== "object" || typeof rgb.r !== "number" || typeof rgb.g !== "number" || typeof rgb.b !== "number") {
    return {
      modalBg: isDark
        ? "radial-gradient(circle at 50% -10%, rgba(60, 75, 105, 0.45) 0%, rgba(20, 25, 38, 0.20) 38%, rgba(13, 17, 26, 0.96) 80%, #07090E 100%)"
        : "radial-gradient(circle at 50% 0%, rgba(26, 43, 76, 0.08) 0%, #FAFAF7 70%, #F3F0E6 100%)",
      modalOverlay: isDark
        ? "radial-gradient(circle at 50% 40%, rgba(30, 40, 60, 0.25) 0%, rgba(0, 0, 0, 0.80) 65%, rgba(0, 0, 0, 0.92) 100%)"
        : "rgba(18, 26, 47, 0.42)",
      modalBorder: isDark
        ? "1px solid rgba(255, 255, 255, 0.18)"
        : "1px solid rgba(26, 43, 76, 0.12)",
      modalShadow: isDark
        ? "0 28px 70px rgba(0,0,0,0.85), 0 0 40px rgba(40, 60, 100, 0.2)"
        : "0 20px 50px rgba(26, 43, 76, 0.16)",
      playerBg: isDark
        ? "radial-gradient(ellipse 95% 75% at 50% 32%, rgba(45, 65, 105, 0.60) 0%, rgba(16, 22, 36, 0.86) 75%, #080C14 100%)"
        : "radial-gradient(ellipse 95% 75% at 50% 30%, rgba(26, 43, 76, 0.12) 0%, rgba(244, 239, 230, 0.88) 75%, #F4EFE6 100%)",
      mobilePlayerBg: isDark
        ? "radial-gradient(circle at 50% 28%, rgba(45, 65, 105, 0.58) 0%, rgba(16, 22, 36, 0.86) 75%, #080C14 100%)"
        : "radial-gradient(circle at 50% 26%, rgba(26, 43, 76, 0.18) 0%, rgba(26, 43, 76, 0.08) 42%, rgba(244, 239, 230, 0.12) 65%), linear-gradient(180deg, rgba(244, 239, 230, 0) 35%, rgba(26, 43, 76, 0.16) 68%, rgba(26, 43, 76, 0.28) 100%)",
      sidebarBg: isDark
        ? "radial-gradient(circle at 50% 26%, rgba(45, 65, 105, 0.55) 0%, rgba(18, 26, 42, 0.82) 72%, #0A0F1A 100%)"
        : "radial-gradient(circle at 50% 24%, rgba(26, 43, 76, 0.18) 0%, rgba(26, 43, 76, 0.08) 42%, rgba(244, 239, 230, 0.12) 65%), linear-gradient(180deg, rgba(244, 239, 230, 0) 35%, rgba(26, 43, 76, 0.16) 68%, rgba(26, 43, 76, 0.28) 100%)",
      textColor: isDark ? "#FFFFFF" : "#1A2B4C",
      textMuted: isDark ? "rgba(255, 255, 255, 0.65)" : "rgba(26, 43, 76, 0.65)",
      rowBg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.8)",
      rowBorder: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(26, 43, 76, 0.1)",
      accentGlow: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(26, 43, 76, 0.12)"
    };
  }

  const { r, g, b } = rgb;
  if (isDark) {
    const darkTintR = Math.round(r * 0.14 + 10);
    const darkTintG = Math.round(g * 0.14 + 12);
    const darkTintB = Math.round(b * 0.14 + 18);
    const darkBaseR = Math.round(r * 0.08 + 6);
    const darkBaseG = Math.round(g * 0.08 + 8);
    const darkBaseB = Math.round(b * 0.08 + 12);

    return {
      modalBg: `radial-gradient(circle at 50% -10%, rgba(${r}, ${g}, ${b}, 0.58) 0%, rgba(${r}, ${g}, ${b}, 0.24) 40%, rgba(13, 17, 26, 0.97) 82%, #07090E 100%)`,
      modalOverlay: `radial-gradient(circle at 50% 40%, rgba(${r}, ${g}, ${b}, 0.32) 0%, rgba(0, 0, 0, 0.80) 65%, rgba(0, 0, 0, 0.92) 100%)`,
      modalBorder: `1px solid rgba(${r}, ${g}, ${b}, 0.42)`,
      modalShadow: `0 28px 70px rgba(0,0,0,0.85), 0 0 50px rgba(${r}, ${g}, ${b}, 0.35)`,
      playerBg: `radial-gradient(ellipse 95% 75% at 50% 32%, rgba(${r}, ${g}, ${b}, 0.62) 0%, rgba(${r}, ${g}, ${b}, 0.30) 48%, rgba(${darkTintR}, ${darkTintG}, ${darkTintB}, 0.84) 76%, rgba(${darkBaseR}, ${darkBaseG}, ${darkBaseB}, 0.96) 100%)`,
      mobilePlayerBg: `radial-gradient(circle at 50% 28%, rgba(${r}, ${g}, ${b}, 0.60) 0%, rgba(${r}, ${g}, ${b}, 0.28) 46%, rgba(${darkTintR}, ${darkTintG}, ${darkTintB}, 0.84) 76%, rgba(${darkBaseR}, ${darkBaseG}, ${darkBaseB}, 0.96) 100%)`,
      sidebarBg: `radial-gradient(circle at 50% 26%, rgba(${r}, ${g}, ${b}, 0.58) 0%, rgba(${r}, ${g}, ${b}, 0.30) 44%, rgba(${darkTintR}, ${darkTintG}, ${darkTintB}, 0.82) 75%, rgba(${darkBaseR}, ${darkBaseG}, ${darkBaseB}, 0.96) 100%)`,
      textColor: "#FFFFFF",
      textMuted: "rgba(255, 255, 255, 0.65)",
      rowBg: "rgba(255, 255, 255, 0.08)",
      rowBorder: `1px solid rgba(${r}, ${g}, ${b}, 0.25)`,
      accentGlow: `rgba(${r}, ${g}, ${b}, 0.40)`
    };
  } else {
    // Light Mode Variant
    const rShade = Math.round(r * 0.72 + 15);
    const gShade = Math.round(g * 0.72 + 15);
    const bShade = Math.round(b * 0.72 + 20);

    return {
      modalBg: `radial-gradient(circle at 50% -10%, rgba(${r}, ${g}, ${b}, 0.28) 0%, rgba(${r}, ${g}, ${b}, 0.09) 38%, rgba(250, 250, 247, 0.96) 75%, rgba(243, 240, 230, 0.98) 100%)`,
      modalOverlay: `radial-gradient(circle at 50% 40%, rgba(${r}, ${g}, ${b}, 0.16) 0%, rgba(18, 26, 47, 0.42) 70%, rgba(18, 26, 47, 0.55) 100%)`,
      modalBorder: `1px solid rgba(${r}, ${g}, ${b}, 0.28)`,
      modalShadow: `0 24px 60px rgba(26, 43, 76, 0.16), 0 0 35px rgba(${r}, ${g}, ${b}, 0.18)`,
      playerBg: `radial-gradient(ellipse 95% 75% at 50% 30%, rgba(${r}, ${g}, ${b}, 0.38) 0%, rgba(${r}, ${g}, ${b}, 0.16) 48%, rgba(244, 239, 230, 0.86) 78%, #F4EFE6 100%)`,
      mobilePlayerBg: `radial-gradient(circle at 50% 26%, rgba(${r}, ${g}, ${b}, 0.45) 0%, rgba(${r}, ${g}, ${b}, 0.20) 42%, rgba(244, 239, 230, 0.12) 65%), linear-gradient(180deg, rgba(244, 239, 230, 0) 35%, rgba(${r}, ${g}, ${b}, 0.36) 68%, rgba(${rShade}, ${gShade}, ${bShade}, 0.52) 100%)`,
      sidebarBg: `radial-gradient(circle at 50% 24%, rgba(${r}, ${g}, ${b}, 0.48) 0%, rgba(${r}, ${g}, ${b}, 0.22) 42%, rgba(244, 239, 230, 0.12) 65%), linear-gradient(180deg, rgba(244, 239, 230, 0) 35%, rgba(${r}, ${g}, ${b}, 0.36) 68%, rgba(${rShade}, ${gShade}, ${bShade}, 0.52) 100%)`,
      textColor: "#1A2B4C",
      textMuted: "rgba(26, 43, 76, 0.65)",
      rowBg: "rgba(255, 255, 255, 0.8)",
      rowBorder: "1px solid rgba(26, 43, 76, 0.1)",
      accentGlow: `rgba(${r}, ${g}, ${b}, 0.22)`
    };
  }
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("euphony_dark_mode") === "true");

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    localStorage.setItem("euphony_dark_mode", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    const nextDark = !isDarkMode;
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.documentElement.classList.add('fallback-theme-transition');
      setIsDarkMode(nextDark);
      setTimeout(() => {
        document.documentElement.classList.remove('fallback-theme-transition');
      }, 400);
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => {
        setIsDarkMode(nextDark);
      });
    });
  };

  const COLORS = isDarkMode ? {
    bgBase: "#121A2F",
    bgPanel: "#1A2B4C",
    primary: "#F3F0E6",
    textMain: "#F3F0E6",
    textMuted: "rgba(243, 240, 230, 0.6)",
    border: "rgba(243, 240, 230, 0.12)",
    hover: "rgba(243, 240, 230, 0.06)",
    spotifyGreen: "#1DB954",
    invertedMuted: "rgba(18, 26, 47, 0.4)",
    invertedShadow: "rgba(18, 26, 47, 0.6)",
    invertedShadowStrong: "rgba(18, 26, 47, 0.8)",
    heroTop: "#233B6E",
    imageBg: "rgba(255, 255, 255, 0.1)"
  } : {
    bgBase: "#F3F0E6",
    bgPanel: "#FAFAF7",
    primary: "#1A2B4C",
    textMain: "#1A2B4C",
    textMuted: "#64748B",
    border: "rgba(26, 43, 76, 0.12)",
    hover: "rgba(26, 43, 76, 0.06)",
    spotifyGreen: "#1DB954",
    invertedMuted: "rgba(243, 240, 230, 0.4)",
    invertedShadow: "rgba(243, 240, 230, 0.6)",
    invertedShadowStrong: "rgba(243, 240, 230, 0.8)",
    heroTop: "#E2D9C5",
    imageBg: "#EAE2CF"
  };

  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);

  const [viewedPlaylistId, setViewedPlaylistId] = useState(() => {
    const saved = localStorage.getItem("euphony_playlist_id");
    return saved && saved !== "null" ? saved : null;
  });

  const [sortOrders, setSortOrders] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedArtist, setSelectedArtist] = useState(null);
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [recentlyPlayedIds, setRecentlyPlayedIds] = useState(getRecentlyPlayedIds);
  const [playCounts, setPlayCounts] = useState(getPlayCounts);
  const [customMoodOverrides, setCustomMoodOverrides] = useState(() => getCustomMoodOverrides());
  const [trackForOptions, setTrackForOptions] = useState(null);
  const qualifiedPlayLoggedRef = useRef(null);
  const sessionListenDurationRef = useRef(0);
  const lastListenTickRef = useRef(null);
  const pendingListenDurationRef = useRef(0);
  const [uploadMood, setUploadMood] = useState("");

  const [songDurations, setSongDurations] = useState({});
  const fetchingDurationsRef = useRef(new Set());

  const [playbackQueue, setPlaybackQueue] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_playback_queue");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [playbackIndex, setPlaybackIndex] = useState(() => parseInt(localStorage.getItem("euphony_playback_index")) || 0);
  const playbackIndexRef = useRef(playbackIndex);
  useEffect(() => {
    playbackIndexRef.current = playbackIndex;
  }, [playbackIndex]);
  const [playbackSourceName, setPlaybackSourceName] = useState(() => localStorage.getItem("euphony_playback_source") || "Global Library");
  const [dominantRgb, setDominantRgb] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_last_dominant_rgb");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return (parsed && typeof parsed.r === 'number' && typeof parsed.g === 'number' && typeof parsed.b === 'number') ? parsed : null;
    } catch (e) { return null; }
  });
  const [dominantColor, setDominantColor] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_last_dominant_rgb");
      if (saved) {
        const p = JSON.parse(saved);
        if (p && typeof p.r === 'number' && typeof p.g === 'number' && typeof p.b === 'number') {
          return `rgb(${p.r}, ${p.g}, ${p.b})`;
        }
      }
      return null;
    } catch (e) { return null; }
  });

  const [outgoingTrackForArt, setOutgoingTrackForArt] = useState(null);
  const [outgoingDominantRgb, setOutgoingDominantRgb] = useState(null);
  const [artTransitionDuration, setArtTransitionDuration] = useState(0);
  const artTransitionTimerRef = useRef(null);

  const songTheme = getSongThemeGradients(dominantRgb, isDarkMode);
  const outgoingSongTheme = useMemo(() => {
    return outgoingDominantRgb ? getSongThemeGradients(outgoingDominantRgb, isDarkMode) : null;
  }, [outgoingDominantRgb, isDarkMode]);

  const bottomBarGradient = useMemo(() => {
    return isDarkMode
      ? (dominantRgb
          ? `linear-gradient(180deg, rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.50) 0%, rgba(${Math.round(dominantRgb.r * 0.14 + 10)}, ${Math.round(dominantRgb.g * 0.14 + 12)}, ${Math.round(dominantRgb.b * 0.14 + 18)}, 0.86) 100%)`
          : "linear-gradient(180deg, rgba(45, 65, 105, 0.50) 0%, rgba(16, 22, 36, 0.88) 100%)")
      : (dominantRgb
          ? `linear-gradient(180deg, rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.35) 0%, rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.55) 100%)`
          : "linear-gradient(180deg, rgba(26, 43, 76, 0.22) 0%, rgba(26, 43, 76, 0.40) 100%)");
  }, [dominantRgb, isDarkMode]);

  const outgoingBottomBarGradient = useMemo(() => {
    if (!outgoingDominantRgb) return null;
    return isDarkMode
      ? `linear-gradient(180deg, rgba(${outgoingDominantRgb.r}, ${outgoingDominantRgb.g}, ${outgoingDominantRgb.b}, 0.50) 0%, rgba(${Math.round(outgoingDominantRgb.r * 0.14 + 10)}, ${Math.round(outgoingDominantRgb.g * 0.14 + 12)}, ${Math.round(outgoingDominantRgb.b * 0.14 + 18)}, 0.86) 100%)`
      : `linear-gradient(180deg, rgba(${outgoingDominantRgb.r}, ${outgoingDominantRgb.g}, ${outgoingDominantRgb.b}, 0.35) 0%, rgba(${outgoingDominantRgb.r}, ${outgoingDominantRgb.g}, ${outgoingDominantRgb.b}, 0.55) 100%)`;
  }, [outgoingDominantRgb, isDarkMode]);

  const AUDIO_CACHE_NAME = 'euphony-audio-cache-v2';
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Purge legacy caches on startup to clean up any aborted downloads or corrupted audio files
  useEffect(() => {
    if (typeof window !== "undefined" && 'caches' in window) {
      caches.keys().then(keys => {
        for (const k of keys) {
          if (k === 'euphony-audio-cache' || k === 'euphony-cloudinary-audio-v1') {
            caches.delete(k).catch(() => {});
          }
        }
      }).catch(() => {});
    }
  }, []);
  

  const [playlist, setPlaylist] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_cached_playlist");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [dbArtists, setDbArtists] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_cached_artists");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // Top artists strictly include only artists with curated art covers (deduplicated by name)
  const topArtists = useMemo(() => {
    const seen = new Set();
    const result = [];
    (dbArtists || []).forEach(a => {
      if (a?.image_url && typeof a.image_url === "string" && a.image_url.trim() !== "") {
        const cleanName = (a.name || "").trim().toLowerCase();
        if (cleanName && !seen.has(cleanName)) {
          seen.add(cleanName);
          result.push(a);
        }
      }
    });
    return result;
  }, [dbArtists]);

  const [displayedTopArtists, setDisplayedTopArtists] = useState([]);
  const [isShufflingArtists, setIsShufflingArtists] = useState(false);
  const topArtistsScrollRef = useRef(null);
  const moodsScrollRef = useRef(null);

  // Deck of unshown artists for the current exhaustive shuffle cycle
  const artistCycleDeckRef = useRef([]);
  // Track the names of the immediately preceding batch to avoid boundary overlap across consecutive cycles
  const lastArtistBatchNamesRef = useRef(new Set());

  // Dynamically resolve artist poster from database for the active selected artist section
  const selectedArtistObj = useMemo(() => {
    if (!selectedArtist) return null;
    const clean = selectedArtist.trim().toLowerCase();
    const cleanNorm = clean.replace(/[\.\s\-_]/g, "");
    return (dbArtists || []).find(a => {
      if (!a?.name || !a?.image_url || typeof a.image_url !== "string" || !a.image_url.trim()) return false;
      const aName = a.name.trim().toLowerCase();
      if (aName === clean) return true;
      if (cleanNorm && aName.replace(/[\.\s\-_]/g, "") === cleanNorm) return true;
      return false;
    }) || null;
  }, [selectedArtist, dbArtists]);

  // Dynamically resolve album cover from playlist if an album is filtered
  const selectedAlbumCover = useMemo(() => {
    if (!selectedAlbum) return null;
    const clean = selectedAlbum.trim().toLowerCase();
    const track = (playlist || []).find(s => s?.album && s.album.trim().toLowerCase() === clean && s?.poster_url);
    return track?.poster_url || null;
  }, [selectedAlbum, playlist]);

  // Desktop-only ultra-smooth horizontal mouse wheel scroll handler for Top Artists and Moods categories
  const attachHorizontalWheel = useCallback((node) => {
    if (!node || !isDesktop) return () => {};

    let targetScroll = node.scrollLeft;
    let currentScroll = node.scrollLeft;
    let isAnimating = false;
    let rafId = null;
    let lastTime = null;
    let cachedMaxScroll = Math.max(0, node.scrollWidth - node.clientWidth);

    const updateMaxScroll = () => {
      cachedMaxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    };

    const stopAnimation = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      isAnimating = false;
      lastTime = null;
    };

    const animate = (time) => {
      if (!lastTime) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Framerate-independent smooth exponential decay (~95% decay within 200ms)
      const factor = 1 - Math.exp(-14 * dt);
      const diff = targetScroll - currentScroll;

      if (Math.abs(diff) < 0.8) {
        currentScroll = targetScroll;
        node.scrollLeft = targetScroll;
        stopAnimation();
        return;
      }

      currentScroll += diff * factor;
      node.scrollLeft = currentScroll;
      rafId = requestAnimationFrame(animate);
    };

    const handleWheel = (e) => {
      // Only convert vertical mouse wheel scroll (deltaY) into horizontal scroll on desktop
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX) && e.deltaY !== 0) {
        let delta = e.deltaY;
        if (e.deltaMode === 1) delta *= 33;
        else if (e.deltaMode === 2) delta *= 100;

        updateMaxScroll();
        if (cachedMaxScroll <= 0) return;

        // If not actively animating, synchronize positions with actual DOM scrollLeft
        if (!isAnimating) {
          currentScroll = node.scrollLeft;
          targetScroll = node.scrollLeft;
        }

        const newTarget = Math.max(0, Math.min(cachedMaxScroll, targetScroll + delta));
        const canScrollRight = delta > 0 && (node.scrollLeft < cachedMaxScroll - 1 || targetScroll < cachedMaxScroll);
        const canScrollLeft = delta < 0 && (node.scrollLeft > 1 || targetScroll > 0);

        if (canScrollRight || canScrollLeft) {
          e.preventDefault();
          targetScroll = newTarget;

          if (!isAnimating) {
            isAnimating = true;
            lastTime = null;
            rafId = requestAnimationFrame(animate);
          }
        }
      }
    };

    const handlePointerDown = () => {
      stopAnimation();
      targetScroll = node.scrollLeft;
      currentScroll = node.scrollLeft;
    };

    const handleScroll = () => {
      if (!isAnimating) {
        targetScroll = node.scrollLeft;
        currentScroll = node.scrollLeft;
      }
    };

    const prevScrollBehavior = node.style.scrollBehavior;
    node.style.scrollBehavior = "auto";

    node.addEventListener("wheel", handleWheel, { passive: false });
    node.addEventListener("pointerdown", handlePointerDown, { passive: true });
    node.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateMaxScroll, { passive: true });

    return () => {
      stopAnimation();
      node.style.scrollBehavior = prevScrollBehavior;
      node.removeEventListener("wheel", handleWheel);
      node.removeEventListener("pointerdown", handlePointerDown);
      node.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateMaxScroll);
    };
  }, [isDesktop]);

  const handleTopArtistsRef = useCallback((node) => {
    if (topArtistsScrollRef.current && topArtistsScrollRef.current._cleanupWheel) {
      topArtistsScrollRef.current._cleanupWheel();
      topArtistsScrollRef.current._cleanupWheel = null;
    }
    topArtistsScrollRef.current = node;
    if (node && isDesktop) {
      node._cleanupWheel = attachHorizontalWheel(node);
    }
  }, [isDesktop, attachHorizontalWheel]);

  const handleMoodsRef = useCallback((node) => {
    if (moodsScrollRef.current && moodsScrollRef.current._cleanupWheel) {
      moodsScrollRef.current._cleanupWheel();
      moodsScrollRef.current._cleanupWheel = null;
    }
    moodsScrollRef.current = node;
    if (node && isDesktop) {
      node._cleanupWheel = attachHorizontalWheel(node);
    }
  }, [isDesktop, attachHorizontalWheel]);

  // Helper to perform an immutable Fisher-Yates shuffle
  const shuffleArtistsList = useCallback((list) => {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, []);

  // Creates a freshly shuffled cycle of all top artists, arranging it so
  // that artists from the immediately preceding batch appear after non-preceding ones
  const createFreshCycle = useCallback((allArtists, avoidNames = new Set()) => {
    if (allArtists.length <= 10 || !avoidNames || avoidNames.size === 0) {
      return shuffleArtistsList(allArtists);
    }
    const nonPreceding = allArtists.filter(a => !avoidNames.has(a.name.toLowerCase()));
    const preceding = allArtists.filter(a => avoidNames.has(a.name.toLowerCase()));
    return [...shuffleArtistsList(nonPreceding), ...shuffleArtistsList(preceding)];
  }, [shuffleArtistsList]);

  // Exhaustive batch drawer: draws 10 unique artists per shuffle without repetition until
  // all artists in the database with poster are exhausted, then seamlessly starts a new randomized cycle
  const drawNextArtistBlock = useCallback((currentDisplayed = []) => {
    if (topArtists.length === 0) return [];
    if (topArtists.length <= 10) {
      return shuffleArtistsList(topArtists);
    }

    const validNames = new Set(topArtists.map(a => a.name.toLowerCase()));
    // Keep only valid artists currently in topArtists
    let deck = artistCycleDeckRef.current.filter(a => validNames.has(a.name.toLowerCase()));

    // Synchronize: if new artists were added to topArtists that aren't in deck or currently displayed, incorporate them
    const deckNames = new Set(deck.map(a => a.name.toLowerCase()));
    const displayedNames = new Set(currentDisplayed.map(a => a.name.toLowerCase()));
    const missing = topArtists.filter(a => !deckNames.has(a.name.toLowerCase()) && !displayedNames.has(a.name.toLowerCase()));
    if (missing.length > 0) {
      deck = [...deck, ...shuffleArtistsList(missing)];
    }

    // If deck has run out, start a brand-new cycle
    if (deck.length === 0) {
      deck = createFreshCycle(topArtists, displayedNames.size > 0 ? displayedNames : lastArtistBatchNamesRef.current);
    }

    let batch = [];
    if (deck.length >= 10) {
      batch = deck.slice(0, 10);
      artistCycleDeckRef.current = deck.slice(10);
    } else {
      // Fewer than 10 artists left in current cycle: take all remaining to complete this cycle
      const remainder = [...deck];
      const remainderNames = new Set(remainder.map(a => a.name.toLowerCase()));
      // Start the next cycle
      const newCycle = createFreshCycle(topArtists, remainderNames);
      // Fill the remainder of the 10-artist block from the new cycle avoiding any duplicate in this batch
      const fillCandidates = newCycle.filter(a => !remainderNames.has(a.name.toLowerCase()));
      const needed = 10 - remainder.length;
      const fill = fillCandidates.slice(0, needed);
      batch = [...remainder, ...fill];

      // Remove the items chosen for fill from the new cycle deck
      const fillNames = new Set(fill.map(a => a.name.toLowerCase()));
      artistCycleDeckRef.current = newCycle.filter(a => !fillNames.has(a.name.toLowerCase()));
    }

    lastArtistBatchNamesRef.current = new Set(batch.map(a => a.name.toLowerCase()));
    return batch;
  }, [topArtists, shuffleArtistsList, createFreshCycle]);

  // Initialize displayed top artists with first block of 10 from the curated pool
  useEffect(() => {
    if (topArtists.length > 0 && displayedTopArtists.length === 0) {
      const initialBatch = drawNextArtistBlock([]);
      setDisplayedTopArtists(initialBatch);
    }
  }, [topArtists, displayedTopArtists.length, drawNextArtistBlock]);

  const visibleTopArtists = useMemo(() => {
    if (displayedTopArtists.length > 0) {
      const valid = displayedTopArtists.filter(d => topArtists.some(t => t.name.toLowerCase() === d.name.toLowerCase()));
      if (valid.length > 0) return valid.slice(0, 10);
    }
    return topArtists.slice(0, 10);
  }, [displayedTopArtists, topArtists]);

  const handleShuffleTopArtists = useCallback(() => {
    if (topArtists.length === 0) return;
    setIsShufflingArtists(true);
    setTimeout(() => setIsShufflingArtists(false), 400);

    const nextSelection = drawNextArtistBlock(visibleTopArtists);
    setDisplayedTopArtists(nextSelection);
    if (topArtistsScrollRef.current) {
      topArtistsScrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
    }
  }, [topArtists, visibleTopArtists, drawNextArtistBlock]);
  const [userPlaylists, setUserPlaylists] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_cached_playlists");
      const list = saved ? JSON.parse(saved) : [];
      return Array.isArray(list) ? list.filter(p => p && p.name && !p.name.startsWith("__")) : [];
    } catch (e) { return []; }
  });
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_cached_playlist");
      return !saved || JSON.parse(saved).length === 0;
    } catch (e) { return true; }
  });

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [songForPlaylistModal, setSongForPlaylistModal] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [session, setSession] = useState(null);
  const isOwner = useMemo(() => {
    if (!session?.user) return false;
    const email = (session.user.email || "").toLowerCase();
    const envOwner = (import.meta.env.VITE_OWNER_EMAIL || "").toLowerCase();
    if (email === "ayush080705@gmail.com" || (envOwner && email === envOwner)) {
      return true;
    }
    if (session.user.id === "1427121b-efda-49c6-abdf-59ad35523935") {
      return true;
    }
    return false;
  }, [session?.user]);
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [uploadAlbum, setUploadAlbum] = useState("");
  const [uploadLyrics, setUploadLyrics] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadPoster, setUploadPoster] = useState(null);
  const [showArtistSuggestions, setShowArtistSuggestions] = useState(false);
  const [showAlbumSuggestions, setShowAlbumSuggestions] = useState(false);
  const [activeArtistIndex, setActiveArtistIndex] = useState(-1);
  const [activeAlbumIndex, setActiveAlbumIndex] = useState(-1);
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const decksPrimedRef = useRef(false);

  const isPlayingRef = useRef(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [playMode, setPlayMode] = useState(() => {
    return localStorage.getItem("euphony_play_mode") || "repeat-all";
  });

  useEffect(() => {
    if (typeof window !== "undefined" && "caches" in window) {
      caches.delete("euphony-cloudinary-audio").catch(() => {});
      caches.delete("euphony-media-blobs").catch(() => {});
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("euphony_play_mode", playMode);
  }, [playMode]);

  useEffect(() => {
    if (playbackQueue.length > 0) {
      try {
        const slimQueue = playbackQueue.map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          album: s.album,
          url: s.url,
          poster_url: s.poster_url,
          duration: s.duration,
          lyrics: s.lyrics,
          stem_vocals: s.stem_vocals,
          stem_drums: s.stem_drums,
          stem_bass: s.stem_bass,
          stem_other: s.stem_other,
          _play_id: s._play_id
        }));
        localStorage.setItem("euphony_playback_queue", JSON.stringify(slimQueue));
        localStorage.setItem("euphony_playback_index", playbackIndex);
        localStorage.setItem("euphony_playback_source", playbackSourceName);
      } catch (e) {
        console.warn("Failed to persist playbackQueue:", e);
      }
    }
  }, [playbackQueue, playbackIndex, playbackSourceName]);



  const [showLyrics, setShowLyrics] = useState(false);
  const [parsedLyrics, setParsedLyrics] = useState([]);
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const lyricRefs = useRef([]);
  const lyricsContainerRef = useRef(null);
  const desktopProgressRef = useRef(null);
  const mobileProgressRef = useRef(null);
  const mobileMiniProgressRef = useRef(null);
  const animationFrameRef = useRef(null);
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);
  const [isDesktopFullscreen, setIsDesktopFullscreen] = useState(false);
  const [fullscreenView, setFullscreenView] = useState("art"); // "art" | "lyrics"
  const fullscreenLyricsContainerRef = useRef(null);
  const fullscreenLyricRefs = useRef([]);
  const fullscreenProgressRef = useRef(null);
  const [showFullscreenQueueModal, setShowFullscreenQueueModal] = useState(false);

  const [userQueue, setUserQueue] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_user_queue");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [queueCurrentTrack, setQueueCurrentTrack] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_queue_current_track");
      return saved && saved !== "null" ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const currentTrack = queueCurrentTrack || (playbackQueue.length > 0 ? playbackQueue[playbackIndex] : undefined);
  const [showQueue, setShowQueue] = useState(false);
  const [queueToast, setQueueToast] = useState("");
  const toastTimeoutRef = useRef(null);
  const triggerToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setQueueToast(msg);
    toastTimeoutRef.current = setTimeout(() => setQueueToast(""), 1600);
  }, []);

  const handleSelectMood = useCallback((moodId) => {
    const targetMood = (moodId === selectedMood || !moodId) ? null : moodId;
    setSelectedMood(targetMood);

    if (targetMood) {
      const moodSongs = playlist.filter(s => getSongMoods(s, customMoodOverrides).includes(targetMood));
      const moodObj = AVAILABLE_MOODS.find(m => m.id === targetMood);
      const moodSourceName = moodObj ? `${moodObj.label} Mood` : `${targetMood} Mood`;

      if (moodSongs.length > 0) {
        const queueWithIds = moodSongs.map(s => s._play_id ? s : { ...s, _play_id: Math.random().toString() });
        const currentActiveTrack = currentTrack;
        const activeIdx = currentActiveTrack ? queueWithIds.findIndex(s => s.id === currentActiveTrack.id) : -1;

        if (activeIdx !== -1) {
          setPlaybackQueue(queueWithIds);
          setPlaybackIndex(activeIdx);
          setPlaybackSourceName(moodSourceName);
          setQueueCurrentTrack(null);
        } else {
          setPlaybackQueue(queueWithIds);
          setPlaybackIndex(-1);
          if (currentActiveTrack) {
            setQueueCurrentTrack(currentActiveTrack);
          }
          setPlaybackSourceName(moodSourceName);
        }
      }
    } else {
      if (playbackSourceName && (playbackSourceName.includes("Mood") || AVAILABLE_MOODS.some(m => playbackSourceName.includes(m.label)))) {
        const queueWithIds = playlist.map(s => s._play_id ? s : { ...s, _play_id: Math.random().toString() });
        setPlaybackQueue(queueWithIds);
        setPlaybackSourceName("Global Library");
        const currentActiveTrack = currentTrack;
        if (currentActiveTrack) {
          const foundIdx = queueWithIds.findIndex(s => s.id === currentActiveTrack.id);
          setPlaybackIndex(foundIdx !== -1 ? foundIdx : 0);
          setQueueCurrentTrack(null);
        }
      }
    }
  }, [selectedMood, playlist, customMoodOverrides, currentTrack, playbackSourceName]);

  const handleSetSongMood = useCallback((songId, moodId) => {
    if (!songId) return;
    if (!isOwner) {
      triggerToast("Only the owner can modify song categories.");
      return;
    }
    const updated = setCustomSongMood(songId, moodId);
    setCustomMoodOverrides({ ...updated });
    saveLocalStats({ customMoods: updated }, session?.user?.id);
    flushCloudSync(session?.user?.id);
    if (moodId) {
      triggerToast(`Category set to ${getMoodEmoji(moodId)} ${moodId}`);
    } else {
      triggerToast("Category reset to automatic");
    }

    try {
      const targetSong = playlist.find(s => s.id === songId);
      if (targetSong) {
        let currentLyrics = targetSong.lyrics || "";
        let cleanLyrics = currentLyrics.replace(/\[mood:\s*[a-zA-Z\s]+\]\r\n?/gi, "").trim();
        let newLyrics = moodId ? (cleanLyrics ? `[mood: ${moodId}]\r\n${cleanLyrics}` : `[mood: ${moodId}]`) : (cleanLyrics || null);

        // Optimistically update all song references immediately for 0ms UI latency
        setPlaylist(prev => prev.map(s => s.id === songId ? { ...s, lyrics: newLyrics } : s));
        setPlaylistSongs(prev => prev.map(s => s.id === songId ? { ...s, lyrics: newLyrics } : s));
        setPlaybackQueue(prev => prev.map(s => s.id === songId ? { ...s, lyrics: newLyrics } : s));
        setTrackForOptions(prev => prev && prev.id === songId ? { ...prev, lyrics: newLyrics } : prev);
        setQueueCurrentTrack(prev => prev && prev.id === songId ? { ...prev, lyrics: newLyrics } : prev);

        supabase.from('songs').update({ lyrics: newLyrics }).eq('id', songId).then(({ error }) => {
          if (error) {
            console.error("Failed to update song mood in database:", error);
            triggerToast("Error updating category in database");
          }
        });
      }
    } catch (e) {
      console.error("Exception in handleSetSongMood:", e);
    }
  }, [isOwner, triggerToast, playlist, session?.user?.id]);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(() => {
    try { return localStorage.getItem("euphony_crossfade_enabled") === "true"; } catch (e) { return false; }
  });
  const [crossfadeDuration, setCrossfadeDuration] = useState(() => {
    try {
      const saved = Number(localStorage.getItem("euphony_crossfade_duration"));
      return (saved >= 1 && saved <= 12) ? saved : 5;
    } catch (e) { return 5; }
  });
  const [showCrossfadeModal, setShowCrossfadeModal] = useState(false);
  const [tempCrossfadeEnabled, setTempCrossfadeEnabled] = useState(crossfadeEnabled);
  const [tempCrossfadeDuration, setTempCrossfadeDuration] = useState(crossfadeDuration);

  // Synchronize modal draft state with committed crossfade state whenever the modal opens
  useEffect(() => {
    if (showCrossfadeModal) {
      setTempCrossfadeEnabled(crossfadeEnabled);
      setTempCrossfadeDuration(crossfadeDuration);
    }
  }, [showCrossfadeModal, crossfadeEnabled, crossfadeDuration]);
  const isCrossfadingRef = useRef(false);
  const crossfadeTriggeredRef = useRef(false);
  const crossfadeFallbackTimerRef = useRef(null);
  const crossfadeTransitionIdRef = useRef(0);
  const crossfadeAnimFrameRef = useRef(null);
  const crossfadeIntervalRef = useRef(null);
  const crossfadeWorkerRef = useRef(null);
  const crossfadeProgressUpdaterRef = useRef(null);
  const crossfadeIncomingAudioRef = useRef(null);
  const crossfadeOutgoingAudioRef = useRef(null);
  const volumeRef = useRef(0.8);
  const isMutedRef = useRef(false);
  const isMixerActiveRef = useRef(false);

  // Dedicated background Web Worker ticker:
  // Browsers pause requestAnimationFrame and clamp main-thread timers when a tab is in the background or screen is off.
  // A dedicated Worker executes on an independent OS thread and ticks without throttling,
  // guaranteeing uninterrupted crossfade volume blending across mobile screen-lock and background tabs.
  useEffect(() => {
    let worker = null;
    try {
      const workerCode = `
        let timer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (timer) clearInterval(timer);
            timer = setInterval(() => {
              self.postMessage('tick');
            }, 25);
          } else if (e.data === 'stop') {
            if (timer) {
              clearInterval(timer);
              timer = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      worker = new Worker(URL.createObjectURL(blob));
      crossfadeWorkerRef.current = worker;
    } catch (err) {
      console.warn('Crossfade Web Worker ticker creation notice:', err);
      crossfadeWorkerRef.current = null;
    }
    return () => {
      if (worker) {
        try {
          worker.postMessage('stop');
          worker.terminate();
        } catch (e) {}
      }
    };
  }, []);

  const [showTrackOptionsModal, setShowTrackOptionsModal] = useState(false);
  const [showTrackArtistsModal, setShowTrackArtistsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showJamModal, setShowJamModal] = useState(false);
  const [jamRoomId, setJamRoomId] = useState(() => {
    try { return sessionStorage.getItem('euphony_active_jam_id') || null; } catch (e) { return null; }
  });
  const [isJamHost, setIsJamHost] = useState(() => {
    try { return sessionStorage.getItem('euphony_is_jam_host') === 'true'; } catch (e) { return false; }
  });
  const [jamListenersCount, setJamListenersCount] = useState(1);
  const [jamHostName, setJamHostName] = useState("");
  const [jamJoinCodeInput, setJamJoinCodeInput] = useState("");
  const jamChannelRef = useRef(null);
  const pendingBroadcastsRef = useRef([]);
  const isProcessingRemoteJamEventRef = useRef(false);
  const hasAutoPlayedSharedSongRef = useRef(false);
  const isJamHostRef = useRef(isJamHost);
  const isJamLeaderRef = useRef(isJamHost);
  const jamRoomIdRef = useRef(jamRoomId);
  const currentTrackRef = useRef(currentTrack);
  const lastJamDriftSyncRef = useRef(0);
  const lastJamHardSeekRef = useRef(0);

  const localClientIdRef = useRef(`client_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`);
  const [sleepTimerTarget, setSleepTimerTarget] = useState(null);

  const [showMixer, setShowMixer] = useState(false);
  const [isGeneratingStems, setIsGeneratingStems] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [stemVolumes, setStemVolumes] = useState({ vocals: 1, drums: 1, bass: 1, other: 1 });
  const [activeStems, setActiveStems] = useState({});
  const [stemsBroken, setStemsBroken] = useState(false);
  const [isCheckingJamCode, setIsCheckingJamCode] = useState(false);
  const [jamJoinError, setJamJoinError] = useState("");

  const userQueueRef = useRef(userQueue);
  const crossfadeEnabledRef = useRef(crossfadeEnabled);
  const crossfadeDurationRef = useRef(crossfadeDuration);
  const sleepTimerTargetRef = useRef(sleepTimerTarget);
  const stemVolumesRef = useRef(stemVolumes);
  const playModeRef = useRef(playMode);

  useEffect(() => {
    isJamHostRef.current = isJamHost;
    if (isJamHost && !jamRoomIdRef.current) isJamLeaderRef.current = true;
  }, [isJamHost]);

  useEffect(() => {
    isJamHostRef.current = isJamHost;
    jamRoomIdRef.current = jamRoomId;
    currentTrackRef.current = currentTrack;
    userQueueRef.current = userQueue;
    crossfadeEnabledRef.current = crossfadeEnabled;
    crossfadeDurationRef.current = crossfadeDuration;
    sleepTimerTargetRef.current = sleepTimerTarget;
    stemVolumesRef.current = stemVolumes;
    playModeRef.current = playMode;
  }, [isJamHost, jamRoomId, currentTrack, userQueue, crossfadeEnabled, crossfadeDuration, sleepTimerTarget, stemVolumes, playMode]);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const broadcastJamSync = useCallback((payload) => {
    const channel = jamChannelRef.current;
    if (!channel) return;

    const fullPayload = {
      ...payload,
      leaderClientId: payload.leaderClientId || (isJamLeaderRef.current ? localClientIdRef.current : undefined),
      senderName: sessionRef.current?.user?.user_metadata?.full_name || sessionRef.current?.user?.email?.split('@')[0] || "Jam member",
      senderId: sessionRef.current?.user?.id || localClientIdRef.current,
      senderClientId: localClientIdRef.current,
      timestamp: Date.now()
    };

    if (channel.state !== 'joined') {
      pendingBroadcastsRef.current.push(fullPayload);
      return;
    }

    try {
      channel.send({
        type: 'broadcast',
        event: 'jam_sync',
        payload: fullPayload
      });
    } catch (e) {
      console.warn("Jam broadcast error:", e);
    }
  }, []);

  const jamClockOffsetRef = useRef(0);
  const jamNetworkLatencyRef = useRef(0.04);
  const lastRealtimeKeepAliveRef = useRef(0);
  const lastJamPingRef = useRef(0);

  const lastStemBroadcastRef = useRef(0);
  const stemBroadcastTimerRef = useRef(null);

  const broadcastStemVolumes = useCallback((newVols) => {
    if (!jamChannelRef.current || !jamRoomIdRef.current) return;
    const now = Date.now();
    const send = () => {
      if (!jamChannelRef.current || !jamRoomIdRef.current) return;
      broadcastJamSync({
        type: 'stem_mixer_update',
        stemVolumes: newVols
      });
      lastStemBroadcastRef.current = Date.now();
    };

    if (now - lastStemBroadcastRef.current > 100) {
      if (stemBroadcastTimerRef.current) clearTimeout(stemBroadcastTimerRef.current);
      send();
    } else {
      if (stemBroadcastTimerRef.current) clearTimeout(stemBroadcastTimerRef.current);
      stemBroadcastTimerRef.current = setTimeout(send, 100);
    }
  }, [broadcastJamSync]);

  useEffect(() => {
    const handleGlobalRelease = () => {
      setActiveStems(prev => {
        if (Object.keys(prev).length === 0) return prev;
        return {};
      });
    };
    window.addEventListener("pointerup", handleGlobalRelease);
    window.addEventListener("touchend", handleGlobalRelease);
    window.addEventListener("pointercancel", handleGlobalRelease);
    window.addEventListener("touchcancel", handleGlobalRelease);
    return () => {
      window.removeEventListener("pointerup", handleGlobalRelease);
      window.removeEventListener("touchend", handleGlobalRelease);
      window.removeEventListener("pointercancel", handleGlobalRelease);
      window.removeEventListener("touchcancel", handleGlobalRelease);
    };
  }, []);

  const [showExitToast, setShowExitToast] = useState(false);
  const exitWarningRef = useRef(false);
  const openedFromTrackOptionsRef = useRef(false);
  const isPopStateActionRef = useRef(false);
  const lastPrevClickTimeRef = useRef(0);

  const prevModalState = useRef({
    isDesktopFullscreen: false,
    showFullscreenQueueModal: false,
    isMobilePlayerOpen: false,
    showQueue: false,
    showMixer: false,
    showUploadModal: false,
    showPlaylistModal: false,
    showTrackOptionsModal: false,
    showSleepTimerModal: false,
    showTrackArtistsModal: false,
    showStatsModal: false,
    showJamModal: false,
    hasSongForPlaylist: false,
    hasViewedPlaylist: false,
    hasSelectedArtist: false,
    hasSelectedAlbum: false
  });

  useEffect(() => {
    const currentState = {
      isDesktopFullscreen,
      showFullscreenQueueModal,
      isMobilePlayerOpen,
      showQueue,
      showMixer,
      showUploadModal,
      showPlaylistModal,
      showTrackOptionsModal,
      showSleepTimerModal,
      showTrackArtistsModal,
      showStatsModal,
      showJamModal,
      hasSongForPlaylist: !!songForPlaylistModal,
      hasViewedPlaylist: viewedPlaylistId !== null,
      hasSelectedArtist: selectedArtist !== null,
      hasSelectedAlbum: selectedAlbum !== null
    };

    if (isPopStateActionRef.current) {
      isPopStateActionRef.current = false;
      prevModalState.current = currentState;
      return;
    }

    let pushed = false;
    for (const key in currentState) {
      if (currentState[key] && !prevModalState.current[key]) {
        if (!pushed) {
          window.history.pushState({ page: 'modal' }, '', window.location.pathname + window.location.search + '#modal');
          pushed = true;
        }
      }
    }
    prevModalState.current = currentState;
  }, [isDesktopFullscreen, showFullscreenQueueModal, isMobilePlayerOpen, showQueue, showMixer, showUploadModal, showPlaylistModal, showTrackOptionsModal, showSleepTimerModal, showTrackArtistsModal, showStatsModal, songForPlaylistModal, viewedPlaylistId, selectedArtist, selectedAlbum]);
  const stateRefs = useRef({});

  const pendingAutoPlayRef = useRef(false);

  const [draggedQueueIndex, setDraggedQueueIndex] = useState(-1);
  const [dragOverQueueIndex, setDragOverQueueIndex] = useState(-1);
  const queueDragState = useRef({ active: false, startIdx: -1, overIdx: -1 });
  const queueItemEls = useRef([]);

  const silentAudioRef = useRef(null);
  const deckARef = useRef(null);
  const deckBRef = useRef(null);
  const activeDeckRef = useRef('A');
  const vocalsRef = useRef(null);
  const drumsRef = useRef(null);
  const bassRef = useRef(null);
  const otherRef = useRef(null);

  // Synchronous proxies: ALWAYS point to the active and background decks with zero delay
  const audioRef = useMemo(() => ({
    get current() {
      return activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current;
    },
    set current(el) {
      if (activeDeckRef.current === 'A') deckARef.current = el;
      else deckBRef.current = el;
    }
  }), []);

  const fadeAudioRef = useMemo(() => ({
    get current() {
      return activeDeckRef.current === 'A' ? deckBRef.current : deckARef.current;
    },
    set current(el) {
      if (activeDeckRef.current === 'A') deckBRef.current = el;
      else deckARef.current = el;
    }
  }), []);

  // Unlock both decks, stems & background silent audio loop on user interaction so background transitions & remote Jam events are never blocked by browser autoplay
  const primeAudioDecks = useCallback(() => {
    // 1. Web Audio API Context Unlock (for mobile browsers)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!window.__euphonyAudioCtx) {
          window.__euphonyAudioCtx = new AudioCtx();
        }
        if (window.__euphonyAudioCtx.state === 'suspended') {
          window.__euphonyAudioCtx.resume().catch(() => {});
        }
        const osc = window.__euphonyAudioCtx.createOscillator();
        const gain = window.__euphonyAudioCtx.createGain();
        gain.gain.value = 0.0001;
        osc.connect(gain);
        gain.connect(window.__euphonyAudioCtx.destination);
        osc.start(0);
        osc.stop(window.__euphonyAudioCtx.currentTime + 0.05);
      }
    } catch (e) {}

    // 2. Continuous Background Silent Audio loop (tells mobile OS the tab is an active media player)
    if (silentAudioRef.current) {
      try {
        silentAudioRef.current.volume = 0.001;
        silentAudioRef.current.play().catch(() => {});
      } catch (e) {}
    }

    // 3. Dual-Deck Hardware Unlock:
    // Only prime inactive audio nodes once so we never tamper with active volume or hardware pipelines
    if (decksPrimedRef.current) return;
    decksPrimedRef.current = true;

    [deckARef.current, deckBRef.current].forEach(deck => {
      if (deck) {
        const isCurrentActive = (deck === audioRef.current && isPlayingRef.current);
        if (isCurrentActive) {
          // Never mute or prime the currently playing audio element!
          const targetVol = (isMutedRef.current || isMixerActiveRef.current) ? 0 : volumeRef.current;
          deck.volume = targetVol;
          deck.muted = Boolean(isMutedRef.current || isMixerActiveRef.current);
          return;
        }
        if (!deck.src || deck.src === window.location.href) {
          deck.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
          deck.volume = 0.001;
          const p = deck.play();
          if (p && typeof p.then === 'function') {
            p.then(() => {
              deck.pause();
              deck.currentTime = 0;
            }).catch(() => {});
          }
        }
      }
    });
  }, [audioRef]);

  useEffect(() => {
    const handleGesture = () => {
      primeAudioDecks();
    };
    window.addEventListener('touchstart', handleGesture, { passive: true, once: true });
    window.addEventListener('pointerdown', handleGesture, { passive: true, once: true });
    window.addEventListener('click', handleGesture, { passive: true, once: true });
    return () => {
      window.removeEventListener('touchstart', handleGesture);
      window.removeEventListener('pointerdown', handleGesture);
      window.removeEventListener('click', handleGesture);
    };
  }, [primeAudioDecks]);

  const blobCacheRef = useRef(new Map());
  const preloadAbortRef = useRef(null);
  const nextTrackPreloadAttemptedRef = useRef(null);
  const prewarmedTrackIdRef = useRef(null);
  const stallRecoveryTimerRef = useRef(null);
  const isFirstRender = useRef(true);

  // Pre-hydrate in-memory Blob Cache from persistent CacheStorage on app launch
  // Guarantees repeat plays of 320kbps songs are served directly from device disk with 0 Cloudinary bandwidth
  // Fully compatible across Chrome, Brave, Safari (WebKit), and Comet
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Request persistent storage to prevent Safari ITP or mobile battery savers from evicting cached audio
    if (typeof navigator !== "undefined" && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }

    if (!('caches' in window)) return;

    caches.open(AUDIO_CACHE_NAME).then(async cache => {
      try {
        const keys = await cache.keys();
        for (const req of keys) {
          try {
            const match = await cache.match(req);
            if (match && !blobCacheRef.current.has(req.url)) {
              const blob = await match.blob();
              if (blob.size > 50000) {
                // Ensure explicit audio/mpeg type for Safari (WebKit) seeking and scrub support
                const safeBlob = blob.type && blob.type.includes('audio') ? blob : new Blob([blob], { type: 'audio/mpeg' });
                const bUrl = URL.createObjectURL(safeBlob);
                blobCacheRef.current.set(req.url, bUrl);
              }
            }
          } catch (e) {}
        }
      } catch (e) {}
    }).catch(() => {});
  }, [AUDIO_CACHE_NAME]);

  const { render: renderLoader, isClosing: loaderClosing } = useAnimatedPresence(isInitialLoad, null, 300);
  const { render: renderUpload, isClosing: uploadClosing } = useAnimatedPresence(showUploadModal, null, 300);
  const { render: renderPlaylistModal, isClosing: playlistModalClosing } = useAnimatedPresence(showPlaylistModal, null, 300);
  const { render: renderSleepTimer, isClosing: sleepTimerClosing } = useAnimatedPresence(showSleepTimerModal, null, 300);
  const { render: renderCrossfade, isClosing: crossfadeClosing } = useAnimatedPresence(showCrossfadeModal, null, 300);
  const { render: renderTrackOptions, isClosing: trackOptionsClosing } = useAnimatedPresence(showTrackOptionsModal, null, 300);
  const { render: renderTrackArtists, isClosing: trackArtistsClosing } = useAnimatedPresence(showTrackArtistsModal, null, 300);
  const { render: renderSongForPlaylist, isClosing: songForPlaylistClosing, data: safeSongForPlaylist } = useAnimatedPresence(!!songForPlaylistModal, songForPlaylistModal, 300);
  const { render: renderMobilePlayer, isClosing: mobilePlayerClosing } = useAnimatedPresence(isMobilePlayerOpen, null, 400);
  const { render: renderQueueToast, isClosing: queueToastClosing, data: safeQueueToast } = useAnimatedPresence(!!queueToast, queueToast, 300);
  const { render: renderExitToast, isClosing: exitToastClosing } = useAnimatedPresence(showExitToast, null, 300);
  const { render: renderShortcuts, isClosing: shortcutsClosing } = useAnimatedPresence(showShortcutsModal, null, 250);
  const { render: renderStats, isClosing: statsClosing } = useAnimatedPresence(showStatsModal, null, 300);
  const { render: renderJam, isClosing: jamClosing } = useAnimatedPresence(showJamModal, null, 300);

  const rawViewedSongs = useMemo(() => {
    if (viewedPlaylistId === null) return playlist;
    if (viewedPlaylistId === "smart_recently_played") {
      const map = new Map((playlist || []).map(s => [s.id, s]));
      return (recentlyPlayedIds || []).map(id => map.get(id)).filter(Boolean);
    }
    if (viewedPlaylistId === "smart_most_played") {
      const map = new Map((playlist || []).map(s => [s.id, s]));
      const sortedIds = Object.entries(playCounts || {})
        .filter(([_, cnt]) => cnt > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);
      return sortedIds.map(id => map.get(id)).filter(Boolean).slice(0, 50);
    }
    return playlistSongs;
  }, [viewedPlaylistId, playlist, playlistSongs, recentlyPlayedIds, playCounts]);

  const currentSortKey = sortOrders[viewedPlaylistId ?? "global"] ?? null;

  const displayedSongs = useMemo(() => {
    return [...rawViewedSongs]
      .filter(track => {
        if (viewedPlaylistId === null && selectedMood) {
          const songMoods = getSongMoods(track, customMoodOverrides);
          if (!songMoods.includes(selectedMood)) return false;
        }
        if (selectedArtist) {
          return matchesArtist(track.artist, selectedArtist);
        }
        if (selectedAlbum) {
          return (track.album || "").toLowerCase() === selectedAlbum.toLowerCase();
        }
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
        if (currentSortKey === "created_at") {
          const dateA = new Date(a.added_at || a.created_at).getTime();
          const dateB = new Date(b.added_at || b.created_at).getTime();
          return dateB - dateA;
        }
        if (currentSortKey === "duration") {
          const durA = Number(a.duration) || songDurations[a.id] || STATIC_SONG_DURATIONS[a.id] || Number.MAX_SAFE_INTEGER;
          const durB = Number(b.duration) || songDurations[b.id] || STATIC_SONG_DURATIONS[b.id] || Number.MAX_SAFE_INTEGER;
          if (durA !== durB) return durA - durB;
          return (a.title || "").localeCompare(b.title || "");
        }
        
        const valA = (a[currentSortKey] || "").toString().trim().toLowerCase();
        const valB = (b[currentSortKey] || "").toString().trim().toLowerCase();
        return valA.localeCompare(valB);
      });
  }, [rawViewedSongs, viewedPlaylistId, selectedMood, selectedArtist, selectedAlbum, searchQuery, currentSortKey, songDurations, customMoodOverrides]);

  const activePlaylistObj = useMemo(() => {
    if (viewedPlaylistId === "smart_recently_played") {
      return { id: "smart_recently_played", name: "Recently Played", isSmart: true, type: "recently_played" };
    }
    if (viewedPlaylistId === "smart_most_played") {
      return { id: "smart_most_played", name: "Most Played", isSmart: true, type: "most_played" };
    }
    return userPlaylists.find(p => p.id === viewedPlaylistId);
  }, [viewedPlaylistId, userPlaylists]);

  const moodCounts = useMemo(() => {
    const counts = {};
    AVAILABLE_MOODS.forEach(m => { counts[m.id] = 0; });
    (playlist || []).forEach(s => {
      const moods = getSongMoods(s, customMoodOverrides);
      moods.forEach(m => {
        if (counts[m] !== undefined) counts[m]++;
      });
    });
    return counts;
  }, [playlist, customMoodOverrides]);

  const listeningStats = useMemo(() => {
    return computeListeningStats(playlist, s => getSongMoods(s, customMoodOverrides), session?.user?.id);
  }, [playlist, playCounts, customMoodOverrides, showStatsModal, session?.user?.id]);

  const handleSwitchPlaylist = useCallback((playlistId) => {
    // If user re-taps the currently active playlist/smart-view (except global library which is null),
    // toggle it off and return to default Global Library
    if (playlistId !== null && viewedPlaylistId === playlistId) {
      setViewedPlaylistId(null);
    } else {
      setViewedPlaylistId(playlistId);
    }
    setSearchQuery("");
    setSelectedArtist(null);
    setSelectedAlbum(null);
    setSelectedMood(null);
    setShowStatsModal(false);
  }, [viewedPlaylistId]);

  const handleCloseStatsModal = useCallback(() => {
    setShowStatsModal(false);
    handleSwitchPlaylist(null);
  }, [handleSwitchPlaylist]);

  const handleOpenStatsModal = useCallback(() => {
    if (showStatsModal) {
      handleCloseStatsModal();
      return;
    }
    if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
      recordListeningDuration(currentTrack.id, pendingListenDurationRef.current, session?.user?.id);
      pendingListenDurationRef.current = 0;
    }
    flushCloudSync(session?.user?.id);
    if (session?.user?.id) {
      syncAccountStats(session.user).then((merged) => {
        if (merged) {
          if (merged.playCounts) setPlayCounts(merged.playCounts);
          if (merged.recentlyPlayedIds) setRecentlyPlayedIds(merged.recentlyPlayedIds);
          if (merged.customMoods) setCustomMoodOverrides(prev => ({ ...prev, ...merged.customMoods }));
        }
      });
    }
    setShowStatsModal(true);
  }, [showStatsModal, handleCloseStatsModal, currentTrack?.id, session?.user]);

  const handleLogout = useCallback(async () => {
    try {
      if (audioRef.current) audioRef.current.pause();
      if (deckARef.current) deckARef.current.pause();
      if (deckBRef.current) deckBRef.current.pause();
      setIsPlaying(false);
      isPlayingRef.current = false;

      if (jamChannelRef.current) {
        try { supabase.removeChannel(jamChannelRef.current); } catch (e) {}
        jamChannelRef.current = null;
      }

      try { sessionStorage.clear(); } catch (e) {}
      [
        "euphony_current_time",
        "euphony_playlist_id",
        "euphony_user_queue",
        "euphony_queue_current_track",
        "euphony_playback_history",
        "euphony_playback_queue",
        "euphony_playback_index",
        "euphony_playback_source",
        "euphony_active_jam_id",
        "euphony_is_jam_host",
        "euphony_cached_playlists",
        "euphony_active_user_id"
      ].forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });

      setActiveUser(null);
      setRecentlyPlayedIds([]);
      setPlayCounts({});
      setCustomMoodOverrides({});
      setUserPlaylists([]);
      setViewedPlaylistId(null);
      setUserQueue([]);
      setQueueCurrentTrack(null);
      setJamRoomId(null);
      setIsJamHost(false);

      await supabase.auth.signOut();
      window.location.href = window.location.origin;
    } catch (err) {
      console.error("Logout error:", err);
      window.location.href = window.location.origin;
    }
  }, []);

  // Ensure playbackQueue is always hydrated with songs from the library if empty, trapped, or missing lyrics
  useEffect(() => {
    if (playlist.length > 0) {
      const shouldHydrate = playbackQueue.length === 0 || 
        (playbackQueue.length <= 1 && playlist.length > 1 && (!playbackSourceName || playbackSourceName === "Global Library"));
      if (shouldHydrate) {
        if (selectedMood) {
          const moodSongs = playlist.filter(s => getSongMoods(s, customMoodOverrides).includes(selectedMood));
          if (moodSongs.length > 0) {
            const queueWithIds = moodSongs.map(s => s._play_id ? s : { ...s, _play_id: Math.random().toString() });
            setPlaybackQueue(queueWithIds);
            const activeTrack = currentTrack || queueWithIds[0];
            if (activeTrack) {
              const foundIdx = queueWithIds.findIndex(s => s.id === activeTrack.id);
              if (foundIdx !== -1) {
                setPlaybackIndex(foundIdx);
                setQueueCurrentTrack(null);
              }
            }
            return;
          }
        }
        const queueWithIds = playlist.map(s => s._play_id ? s : { ...s, _play_id: Math.random().toString() });
        setPlaybackQueue(queueWithIds);
        const activeTrack = currentTrack || (playbackQueue.length > 0 ? playbackQueue[0] : null);
        if (activeTrack) {
          const foundIdx = queueWithIds.findIndex(s => s.id === activeTrack.id);
          if (foundIdx !== -1) {
            setPlaybackIndex(foundIdx);
            setQueueCurrentTrack(null);
          }
        }
      } else {
        const hasMissingLyrics = playbackQueue.some(item => !item.lyrics);
        if (hasMissingLyrics) {
          const songMap = new Map(playlist.map(s => [s.id, s]));
          setPlaybackQueue(prevQueue =>
            prevQueue.map(item => {
              const fullSong = songMap.get(item.id);
              if (!fullSong) return item;
              return {
                ...fullSong,
                ...item,
                lyrics: fullSong.lyrics || item.lyrics,
                stem_vocals: fullSong.stem_vocals || item.stem_vocals,
                stem_drums: fullSong.stem_drums || item.stem_drums,
                stem_bass: fullSong.stem_bass || item.stem_bass,
                stem_other: fullSong.stem_other || item.stem_other,
                duration: fullSong.duration || item.duration
              };
            })
          );
        }
      }

      if (queueCurrentTrack && !queueCurrentTrack.lyrics) {
        const fullSong = playlist.find(s => s.id === queueCurrentTrack.id);
        if (fullSong?.lyrics) {
          setQueueCurrentTrack(prev => prev ? { ...fullSong, ...prev, lyrics: fullSong.lyrics } : prev);
        }
      }
    }
  }, [playlist, playbackQueue.length, currentTrack?.id, playbackSourceName, queueCurrentTrack?.id]);

  useEffect(() => {
    if (!currentTrack?.poster_url) {
      setDominantColor(null);
      setDominantRgb(null);
      return;
    }

    let isSubscribed = true;
    const trackId = currentTrack.id || currentTrack.title || "active_track";
    const cacheKey = `euphony_color_${trackId}`;

    // 1. Instant check from localStorage
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.r !== undefined && parsed?.g !== undefined && parsed?.b !== undefined) {
          setDominantRgb(parsed);
          setDominantColor(`rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`);
        }
      }
    } catch (e) {}

    const processImageData = (imgData) => {
      let bestR = 24, bestG = 40, bestB = 68;
      let maxScore = -1;
      let totalR = 0, totalG = 0, totalB = 0, count = 0;
      
      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const a = imgData[i + 3];
        if (a < 128) continue;
        
        totalR += r; totalG += g; totalB += b; count++;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        const lightness = (max + min) / 2;
        
        if (lightness > 18 && lightness < 240) {
          const saturation = delta / (255 - Math.abs(2 * lightness - 255) || 1);
          const score = saturation * 2.5 + (1 - Math.abs(lightness - 120) / 120);
          if (score > maxScore) {
            maxScore = score;
            bestR = r; bestG = g; bestB = b;
          }
        }
      }
      
      if (maxScore < 0.25 && count > 0) {
        bestR = Math.round(totalR / count);
        bestG = Math.round(totalG / count);
        bestB = Math.round(totalB / count);
      }

      if (!isSubscribed) return;

      const rgbObj = { r: bestR, g: bestG, b: bestB };
      setDominantColor(`rgb(${bestR}, ${bestG}, ${bestB})`);
      setDominantRgb(rgbObj);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(rgbObj));
        localStorage.setItem("euphony_last_dominant_rgb", JSON.stringify(rgbObj));
      } catch (e) {}
    };

    const extractFromImage = (imageElement) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 24;
        canvas.height = 24;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(imageElement, 0, 0, 24, 24);
        const imgData = ctx.getImageData(0, 0, 24, 24).data;
        processImageData(imgData);
        return true;
      } catch (err) {
        return false;
      }
    };

    const rawUrl = currentTrack.poster_url;
    // Specialized thumbnail transformation prevents Chromium non-CORS cache collision
    const targetUrl = rawUrl.includes("res.cloudinary.com") && rawUrl.includes("/image/upload/")
      ? rawUrl.replace("/image/upload/", "/image/upload/w_32,c_scale/")
      : (rawUrl.includes("?") ? `${rawUrl}&color_extract=1` : `${rawUrl}?color_extract=1`);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ok = extractFromImage(img);
      if (!ok) {
        tryFetchFallback();
      }
    };
    img.onerror = () => {
      tryFetchFallback();
    };

    const tryFetchFallback = () => {
      fetch(targetUrl, { mode: 'cors' })
        .then(res => res.blob())
        .then(blob => {
          if (!isSubscribed) return;
          const blobUrl = URL.createObjectURL(blob);
          const blobImg = new Image();
          blobImg.onload = () => {
            extractFromImage(blobImg);
            URL.revokeObjectURL(blobUrl);
          };
          blobImg.onerror = () => {
            URL.revokeObjectURL(blobUrl);
          };
          blobImg.src = blobUrl;
        })
        .catch(() => {});
    };

    img.src = targetUrl;

    return () => {
      isSubscribed = false;
    };
  }, [currentTrack?.id, currentTrack?.poster_url]);

  const themeColorAnimRef = useRef(null);
  const currentThemeRgbRef = useRef(null);

  useEffect(() => {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }

    const parseColorToRgb = (col, fallback) => {
      if (!col) return fallback;
      if (typeof col === 'object' && col.r !== undefined) return col;
      if (typeof col === 'string') {
        const rgbMatch = col.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
          return { r: parseInt(rgbMatch[1], 10), g: parseInt(rgbMatch[2], 10), b: parseInt(rgbMatch[3], 10) };
        }
        if (col.startsWith('#')) {
          const hex = col.slice(1);
          if (hex.length === 6) {
            return {
              r: parseInt(hex.slice(0, 2), 16),
              g: parseInt(hex.slice(2, 4), 16),
              b: parseInt(hex.slice(4, 6), 16)
            };
          }
        }
      }
      return fallback;
    };

    const targetRgb = isMobilePlayerOpen
      ? parseColorToRgb(dominantRgb || dominantColor, { r: 18, g: 18, b: 18 })
      : parseColorToRgb(COLORS.bgBase, { r: 18, g: 26, b: 43 });

    // Initial load: set directly
    if (!currentThemeRgbRef.current) {
      currentThemeRgbRef.current = targetRgb;
      metaTheme.content = `rgb(${targetRgb.r}, ${targetRgb.g}, ${targetRgb.b})`;
      if (isMobilePlayerOpen) {
        setTimeout(updateProgressVisuals, 10);
        setTimeout(updateProgressVisuals, 100);
      }
      return;
    }

    // Cancel any active animation frame
    if (themeColorAnimRef.current) {
      cancelAnimationFrame(themeColorAnimRef.current);
      themeColorAnimRef.current = null;
    }

    const startRgb = outgoingDominantRgb || currentThemeRgbRef.current;
    const durationMs = artTransitionDuration > 0
      ? Math.max(400, artTransitionDuration * 1000)
      : 350;

    const startTime = performance.now();

    const animateThemeColor = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Smooth easeInOut: 3 * t^2 - 2 * t^3
      const ease = progress * progress * (3 - 2 * progress);

      const r = Math.round(startRgb.r + (targetRgb.r - startRgb.r) * ease);
      const g = Math.round(startRgb.g + (targetRgb.g - startRgb.g) * ease);
      const b = Math.round(startRgb.b + (targetRgb.b - startRgb.b) * ease);

      currentThemeRgbRef.current = { r, g, b };
      metaTheme.content = `rgb(${r}, ${g}, ${b})`;

      if (progress < 1) {
        themeColorAnimRef.current = requestAnimationFrame(animateThemeColor);
      } else {
        currentThemeRgbRef.current = targetRgb;
        metaTheme.content = `rgb(${targetRgb.r}, ${targetRgb.g}, ${targetRgb.b})`;
        themeColorAnimRef.current = null;
      }
    };

    themeColorAnimRef.current = requestAnimationFrame(animateThemeColor);

    if (isMobilePlayerOpen) {
      setTimeout(updateProgressVisuals, 10);
      setTimeout(updateProgressVisuals, 100);
    }

    return () => {
      if (themeColorAnimRef.current) {
        cancelAnimationFrame(themeColorAnimRef.current);
        themeColorAnimRef.current = null;
      }
    };
  }, [isMobilePlayerOpen, dominantRgb, dominantColor, outgoingDominantRgb, artTransitionDuration, COLORS.bgBase]);

  const [upcomingSourceList, setUpcomingSourceList] = useState([]);
  const [playbackHistory, setPlaybackHistory] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_playback_history");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  useEffect(() => {
    localStorage.setItem("euphony_user_queue", JSON.stringify(userQueue));
    localStorage.setItem("euphony_queue_current_track", JSON.stringify(queueCurrentTrack));
    localStorage.setItem("euphony_playback_history", JSON.stringify(playbackHistory));
  }, [userQueue, queueCurrentTrack, playbackHistory]);

  const nextTrackInLine = userQueue.length > 0 ? userQueue[0] : (upcomingSourceList.length > 0 ? upcomingSourceList[0].track : (playbackQueue.length > 1 ? playbackQueue[(playbackIndex + 1) % playbackQueue.length] : null));
  const { render: renderDesktopFullscreen, isClosing: desktopFullscreenClosing } = useAnimatedPresence(isDesktop && !!currentTrack && isDesktopFullscreen, null, 250);
  const { render: renderFullscreenQueue, isClosing: fullscreenQueueClosing } = useAnimatedPresence(showFullscreenQueueModal, null, 250);

  const updateProgressVisuals = () => {
    if (!audioRef.current) return;
    const time = audioRef.current.currentTime || 0;
    const audioDur = audioRef.current.duration;
    const effectiveDur = (isFinite(audioDur) && audioDur > 0)
      ? audioDur
      : (currentTrack?.duration || (currentTrack?.id && STATIC_SONG_DURATIONS[currentTrack.id]) || (duration > 0 ? duration : 100));
    const percent = effectiveDur > 0 ? Math.min(100, Math.max(0, (time / effectiveDur) * 100)) : 0;
    
    const darkGradient = `linear-gradient(to right, rgba(255,255,255,0.8) 0%, #FFFFFF ${percent}%, rgba(255,255,255,0.15) ${percent}%)`;
    const lightGradient = `linear-gradient(to right, #1A2B4C 0%, #1A2B4C ${percent}%, rgba(26, 43, 76, 0.15) ${percent}%)`;
    
    const syncSlider = (ref) => {
      if (!ref?.current) return;
      const el = ref.current;
      const durStr = String(effectiveDur);
      if (el.max !== durStr) {
        el.max = durStr;
      }
      el.value = time;
      el.style.background = darkGradient;
    };

    syncSlider(desktopProgressRef);
    syncSlider(fullscreenProgressRef);
    syncSlider(mobileProgressRef);

    if (mobileMiniProgressRef.current) {
      mobileMiniProgressRef.current.style.width = `${percent}%`;
    }
  };

  useEffect(() => {
    const loop = () => {
      updateProgressVisuals();
      if (parsedLyrics.length > 0 && audioRef.current && !audioRef.current.paused) {
        const time = audioRef.current.currentTime;
        let activeIndex = -1;
        for (let i = 0; i < parsedLyrics.length; i++) {
          if (time >= parsedLyrics[i].time) activeIndex = i;
          else break;
        }
        setActiveLyricIndex(prev => (prev !== activeIndex ? activeIndex : prev));
      }
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      updateProgressVisuals();
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, isDarkMode, parsedLyrics]);

  useEffect(() => {
    let queueToUse = (playbackQueue && playbackQueue.length > 0) ? playbackQueue : playlist;
    if (queueToUse.length <= 1 && playlist.length > 1 && (!playbackSourceName || playbackSourceName === "Global Library")) {
      queueToUse = playlist;
    }
    if (!queueToUse || queueToUse.length === 0) {
      setUpcomingSourceList([]);
      return;
    }
    if (playMode === 'repeat-one' || playMode === 'order' || playMode === 'repeat-all') {
      const list = playbackIndex >= 0 ? [
        ...queueToUse.map((track, i) => ({ track, originalIndex: i, dnd_id: track._play_id || ("fallback-" + i) })).slice(playbackIndex + 1),
        ...queueToUse.map((track, i) => ({ track, originalIndex: i, dnd_id: track._play_id || ("fallback-" + i) })).slice(0, playbackIndex)
      ] : queueToUse.map((track, i) => ({ track, originalIndex: i, dnd_id: track._play_id || ("fallback-" + i) }));
      setUpcomingSourceList(list);
    } else if (playMode === 'shuffle') {
      setUpcomingSourceList(prev => {
        if (prev.length > 0 && prev[0].originalIndex === playbackIndex && playbackIndex >= 0) {
          const remaining = prev.slice(1);
          if (remaining.length > 0) return remaining;
        }
        
        const others = queueToUse.map((track, i) => ({ track, originalIndex: i, dnd_id: track._play_id || ("fallback-" + i) })).filter(obj => playbackIndex < 0 || obj.originalIndex !== playbackIndex);
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }
        return others;
      });
    }
  }, [playbackQueue, playbackIndex, playMode, playlist, playbackSourceName]);

  const cycleSortKey = () => {
    const key = viewedPlaylistId ?? "global";
    const current = sortOrders[key] ?? null;
    const idx = SORT_CYCLE.indexOf(current);
    setSortOrders(prev => ({ ...prev, [key]: SORT_CYCLE[(idx + 1) % SORT_CYCLE.length] }));
  };

  // ── BACKGROUND AUDIO CACHE & OFFLINE PRELOADER ───────────────────────────
  // Helper to determine the next 2 upcoming tracks in playback order
  const getNextTwoUpcomingTracks = useCallback(() => {
    const list = [];
    const seenIds = new Set();
    if (currentTrack?.id) seenIds.add(currentTrack.id);

    // 1. Prioritize user-added queue songs first
    if (userQueue && userQueue.length > 0) {
      for (const song of userQueue) {
        if (song?.url && !seenIds.has(song.id)) {
          seenIds.add(song.id);
          list.push(song);
          if (list.length >= 2) return list;
        }
      }
    }

    // 2. Upcoming playlist/source order (respects shuffle and custom queues)
    if (upcomingSourceList && upcomingSourceList.length > 0) {
      for (const item of upcomingSourceList) {
        const t = item?.track;
        if (t?.url && !seenIds.has(t.id)) {
          seenIds.add(t.id);
          list.push(t);
          if (list.length >= 2) return list;
        }
      }
    }

    // 3. Fallback sequential active queue sequence
    const activeQ = (playbackQueue && playbackQueue.length > 0) ? playbackQueue : playlist;
    if (activeQ && activeQ.length > 1) {
      for (let step = 1; step <= activeQ.length; step++) {
        const idx = (playbackIndex + step) % activeQ.length;
        const t = activeQ[idx];
        if (t?.url && !seenIds.has(t.id)) {
          seenIds.add(t.id);
          list.push(t);
          if (list.length >= 2) return list;
        }
      }
    }

    return list;
  }, [currentTrack?.id, userQueue, upcomingSourceList, playbackQueue, playlist, playbackIndex]);

  // Caching a single audio file with AbortController signal and low fetch priority
  const cacheAudioTrack = async (rawUrl, signal) => {
    if (!rawUrl) return null;
    const cdnUrl = getCdnUrl(rawUrl);
    if (blobCacheRef.current.has(cdnUrl)) {
      return blobCacheRef.current.get(cdnUrl);
    }
    if (typeof window === "undefined" || !('caches' in window)) return null;

    try {
      const cache = await caches.open(AUDIO_CACHE_NAME);
      let match = await cache.match(cdnUrl);
      if (!match) {
        if (signal?.aborted) return null;
        if (typeof navigator !== "undefined" && !navigator.onLine) return null;

        const res = await fetch(cdnUrl, {
          signal,
          mode: 'cors',
          priority: 'low',
          credentials: 'omit'
        });
        if (res.ok && res.status === 200) {
          const clone = res.clone();
          const blob = await clone.blob();
          // Ensure valid audio file size (> 50KB) before caching to prevent saving aborted/corrupt streams
          if (blob.size > 50000) {
            await cache.put(cdnUrl, res);
            if (!blobCacheRef.current.has(cdnUrl)) {
              const safeBlob = blob.type && blob.type.includes('audio') ? blob : new Blob([blob], { type: 'audio/mpeg' });
              const objUrl = URL.createObjectURL(safeBlob);
              blobCacheRef.current.set(cdnUrl, objUrl);
              return objUrl;
            }
          }
          return null;
        }
      } else {
        if (match && !signal?.aborted) {
          const blob = await match.blob();
          if (blob.size < 50000) {
            // Delete corrupt/truncated cache entry
            await cache.delete(cdnUrl);
            return null;
          }
          if (!blobCacheRef.current.has(cdnUrl)) {
            const safeBlob = blob.type && blob.type.includes('audio') ? blob : new Blob([blob], { type: 'audio/mpeg' });
            const objUrl = URL.createObjectURL(safeBlob);
            blobCacheRef.current.set(cdnUrl, objUrl);
            return objUrl;
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.warn("Background audio cache warning:", e.message);
      }
    }
    return null;
  };

  // Persistent Audio Caching: keeps songs persistently in CacheStorage (up to 200 tracks) so replaying never re-downloads
  const pruneUnusedAudioCache = async (allowedRawUrls) => {
    if (typeof window === "undefined" || !('caches' in window)) return;
    try {
      const allowedCdnSet = new Set(allowedRawUrls.filter(Boolean).map(u => getCdnUrl(u)));

      // 1. Maintain in-memory Blob URL Map: only revoke older blob URLs if memory exceeds 15 tracks
      if (blobCacheRef.current.size > 15) {
        for (const [cachedCdnUrl, blobUrl] of blobCacheRef.current.entries()) {
          if (!allowedCdnSet.has(cachedCdnUrl)) {
            try { URL.revokeObjectURL(blobUrl); } catch (e) {}
            blobCacheRef.current.delete(cachedCdnUrl);
            if (blobCacheRef.current.size <= 15) break;
          }
        }
      }

      // 2. CacheStorage: keep tracks permanently, only evicting the oldest entries if over 200 items
      const cache = await caches.open(AUDIO_CACHE_NAME);
      const keys = await cache.keys();
      if (keys.length > 200) {
        const excessCount = keys.length - 200;
        for (let i = 0; i < excessCount; i++) {
          if (!allowedCdnSet.has(keys[i].url)) {
            await cache.delete(keys[i]);
          }
        }
      }
    } catch (e) {
      console.warn("Audio cache pruning warning:", e);
    }
  };

  useEffect(() => {
    // 1. Immediately abort any in-flight background download whenever current track changes or stops.
    // 100% of network bandwidth is exclusively dedicated to the current song for instant start and smooth playback.
    if (preloadAbortRef.current) {
      preloadAbortRef.current.abort();
      preloadAbortRef.current = null;
    }

    if (!currentTrack || !isPlaying) return;

    const controller = new AbortController();
    preloadAbortRef.current = controller;

    // Helper: calculate exact seconds of audio buffered ahead of current playback position
    const getBufferedAheadSeconds = () => {
      if (!audioRef.current) return 0;
      const audio = audioRef.current;
      if (!audio.buffered || audio.buffered.length === 0) return 0;
      const cur = audio.currentTime || 0;
      const dur = audio.duration || 0;
      for (let i = 0; i < audio.buffered.length; i++) {
        const start = audio.buffered.start(i);
        const end = audio.buffered.end(i);
        if (start <= cur && cur <= end) {
          // If buffered all the way to the end (within 1.5s), the song is 100% fully downloaded!
          if (dur > 0 && end >= dur - 1.5) {
            return 9999;
          }
          return end - cur;
        }
      }
      return 0;
    };

    // Helper: verify network allows background downloads without choking active audio
    const isNetworkSafeForPrefetch = () => {
      if (typeof navigator === "undefined") return true;
      if (!navigator.onLine) return false;
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (conn) {
        if (conn.saveData) return false; // User has Data Saver enabled
        if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g' || conn.effectiveType === '3g') {
          return false; // Connection too slow to risk background contention
        }
      }
      return true;
    };

    // Helper: verify current song is completely safe before any background download
    const isPlaybackFullySafe = () => {
      if (!audioRef.current) return false;
      const a = audioRef.current;
      if (a.paused || a.seeking || a.readyState < 3) return false;
      if (!isNetworkSafeForPrefetch()) return false;
      // FIRST PRIORITY: Active song MUST have at least 45 seconds buffered ahead (or be 100% buffered to end)
      const ahead = getBufferedAheadSeconds();
      return ahead >= 45;
    };

    // Helper: abortable pause
    const sleep = (ms) => new Promise(res => {
      if (controller.signal.aborted) return res();
      const t = setTimeout(res, ms);
      controller.signal.addEventListener('abort', () => { clearTimeout(t); res(); }, { once: true });
    });

    // 2. Bandwidth-Optimized Progressive Prefetch Pipeline (100% 320kbps Master Quality):
    // First priority is ALWAYS active track playback. Only after the user has listened to at least
    // 35% of the song (or 40 seconds) do we gently prefetch ONLY the single immediate next track.
    // Quick skips and casual browsing consume 0 prefetch bandwidth.
    const prefetchJob = async () => {
      // Allow initial 25 seconds for current song to establish playback
      await sleep(25000);
      if (controller.signal.aborted) return;

      // Poll until the active song has accumulated at least 45 seconds of buffer headroom (max wait 60s)
      let attempts = 0;
      while (!isPlaybackFullySafe() && attempts < 12) {
        if (controller.signal.aborted) return;
        await sleep(5000);
        attempts++;
      }

      if (controller.signal.aborted || !isPlaybackFullySafe()) return;

      // Only proceed with prefetching if user is genuinely listening (played >= 35s or >= 30% of track)
      const curTime = audioRef.current?.currentTime || 0;
      const totalDur = audioRef.current?.duration || 0;
      if (curTime < 35 && (totalDur === 0 || curTime / totalDur < 0.30)) {
        return;
      }

      // Step A: Ensure current track is stored in persistent cache for future 0-bandwidth replays
      if (currentTrack?.url && !blobCacheRef.current.has(getCdnUrl(currentTrack.url))) {
        await cacheAudioTrack(currentTrack.url, controller.signal);
      }

      // Step B: Rest for 15 seconds to keep network clear
      await sleep(15000);
      if (controller.signal.aborted || !isPlaybackFullySafe()) return;

      // Step C: Gently cache ONLY the single next upcoming track (upcoming[0])
      // (Never download Track 2 in advance to avoid burning unnecessary bandwidth)
      const upcoming = getNextTwoUpcomingTracks();
      if (upcoming[0]?.url && !blobCacheRef.current.has(getCdnUrl(upcoming[0].url))) {
        await cacheAudioTrack(upcoming[0].url, controller.signal);
      }

      // Step D: Prune older tracks outside the active window to manage storage
      if (!controller.signal.aborted) {
        const prevTrack = playbackHistory.length > 0 && playbackQueue[playbackHistory[playbackHistory.length - 1]];
        const allowedUrls = [
          currentTrack?.url,
          upcoming[0]?.url,
          prevTrack?.url
        ];
        await pruneUnusedAudioCache(allowedUrls);
      }
    };

    prefetchJob().catch(e => {
      if (e.name !== 'AbortError') console.warn('Background prefetch notice:', e.message);
    });

    return () => {
      controller.abort();
    };
  }, [currentTrack?.id, isPlaying, getNextTwoUpcomingTracks]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Unknown Title',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Euphony',
        artwork: [{ src: currentTrack.poster_url || 'https://via.placeholder.com/512.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => handlePlayPauseRef.current?.());
      navigator.mediaSession.setActionHandler('pause', () => handlePlayPauseRef.current?.());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.fastSeek && 'fastSeek' in audioRef.current) {
          audioRef.current.fastSeek(details.seekTime);
        } else if (audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
        }
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.min(audioRef.current.currentTime + (details.seekOffset || 10), audioRef.current.duration);
        }
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          audioRef.current.currentTime = Math.max(audioRef.current.currentTime - (details.seekOffset || 10), 0);
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => handlePrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => handleNext());
    }
  }, [currentTrack, playMode, userQueue]);

  useEffect(() => {
    if (!sleepTimerTarget) return;
    const interval = setInterval(() => {
      if (Date.now() >= sleepTimerTarget) {
        pauseAllAudioDecksRef.current?.();
        setSleepTimerTarget(null);
        triggerToast("Sleep timer ended. Playback paused.");
        broadcastJamSync({
          type: 'play_pause',
          song: currentTrack,
          isPlaying: false,
          currentTime: audioRef.current?.currentTime || 0
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sleepTimerTarget, currentTrack, broadcastJamSync, triggerToast]);

  const handleSetSleepTimer = (mins) => {
    let target = null;
    if (mins === 0) {
      setSleepTimerTarget(null);
      triggerToast("Sleep timer turned off");
    } else {
      target = Date.now() + mins * 60000;
      setSleepTimerTarget(target);
      triggerToast(`Sleep timer set for ${mins} minutes`);
    }
    openedFromTrackOptionsRef.current = false;
    setShowSleepTimerModal(false);
    broadcastJamSync({
      type: 'sleep_timer_update',
      sleepTimerTarget: target,
      minutes: mins
    });
  };

  useEffect(() => {
    stateRefs.current = {
      isDesktopFullscreen,
      showFullscreenQueueModal,
      showUploadModal,
      showPlaylistModal,
      songForPlaylistModal,
      showSleepTimerModal,
      showTrackOptionsModal,
      showTrackArtistsModal,
      showStatsModal,
      showJamModal,
      isMobilePlayerOpen,
      viewedPlaylistId,
      showQueue,
      showMixer,
      isPlaying,
      selectedArtist,
      selectedAlbum
    };
  }, [
    isDesktopFullscreen,
    showFullscreenQueueModal,
    showUploadModal,
    showPlaylistModal,
    songForPlaylistModal,
    showSleepTimerModal,
    showTrackOptionsModal,
    showTrackArtistsModal,
    showStatsModal,
    showJamModal,
    isMobilePlayerOpen,
    viewedPlaylistId,
    showQueue,
    showMixer,
    isPlaying,
    selectedArtist,
    selectedAlbum
  ]);

  useEffect(() => {
    // Prevent accidental closure of the app when music is playing (adds OS-level protection)
    const handleBeforeUnload = (e) => {
      if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
        recordListeningDuration(currentTrack.id, pendingListenDurationRef.current, session?.user?.id);
        pendingListenDurationRef.current = 0;
      }
      flushCloudSync(session?.user?.id);
      if (stateRefs.current?.isPlaying) {
        e.preventDefault();
        e.returnValue = 'Music is playing. Are you sure you want to exit?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentTrack, session?.user?.id]);

  useEffect(() => {
    // Only trap history AFTER a user gesture (like hitting play).
    // Browsers ignore history traps placed on initial load to prevent spam.
    if (isPlaying && window.location.hash !== '#playing') {
      window.history.pushState({ page: 'euphony-playing' }, '', window.location.pathname + window.location.search + '#playing');
    }
  }, [isPlaying]);

  useEffect(() => {
    // Add an initial history state on the very first user interaction so the history stack isn't empty.
    // If the stack is empty, Android Predictive Back instantly exits without firing popstate.
    const handleFirstInteraction = () => {
      if (!window.hasPushedInitialState) {
        window.hasPushedInitialState = true;
        if (!window.location.hash) {
          window.history.pushState({ page: 'euphony-home' }, '', window.location.pathname + window.location.search + '#home');
        }
      }
    };
    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('touchstart', handleFirstInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const s = stateRefs.current;
      let handled = false;

      // Tier 1: Sub-modals opened on top (artists, sleep timer, fullscreen queue, add to playlist, stats)
      if (s.showStatsModal) {
        handleCloseStatsModal();
        handled = true;
      } else if (s.showTrackArtistsModal) {
        setShowTrackArtistsModal(false);
        if (openedFromTrackOptionsRef.current) {
          openedFromTrackOptionsRef.current = false;
          isPopStateActionRef.current = true;
          setShowTrackOptionsModal(true);
        }
        handled = true;
      } else if (s.showSleepTimerModal) {
        setShowSleepTimerModal(false);
        if (openedFromTrackOptionsRef.current) {
          openedFromTrackOptionsRef.current = false;
          isPopStateActionRef.current = true;
          setShowTrackOptionsModal(true);
        }
        handled = true;
      } else if (s.showFullscreenQueueModal) {
        setShowFullscreenQueueModal(false);
        if (openedFromTrackOptionsRef.current) {
          openedFromTrackOptionsRef.current = false;
          isPopStateActionRef.current = true;
          setShowTrackOptionsModal(true);
        }
        handled = true;
      } else if (s.songForPlaylistModal) {
        setSongForPlaylistModal(null);
        if (openedFromTrackOptionsRef.current) {
          openedFromTrackOptionsRef.current = false;
          isPopStateActionRef.current = true;
          setShowTrackOptionsModal(true);
        }
        handled = true;
      }
      // Tier 2: 3-dots options popup box
      else if (s.showTrackOptionsModal) {
        setShowTrackOptionsModal(false);
        openedFromTrackOptionsRef.current = false;
        handled = true;
      }
      // Tier 3: Standalone dialogs
      else if (s.showUploadModal) {
        setShowUploadModal(false);
        handled = true;
      } else if (s.showPlaylistModal) {
        setShowPlaylistModal(false);
        handled = true;
      } else if (s.showJamModal) {
        setShowJamModal(false);
        handled = true;
      }
      // Tier 4: Overlay panels (Queue & Mixer)
      else if (s.showQueue) {
        setShowQueue(false);
        if (openedFromTrackOptionsRef.current) {
          openedFromTrackOptionsRef.current = false;
          isPopStateActionRef.current = true;
          setShowTrackOptionsModal(true);
        }
        handled = true;
      } else if (s.showMixer) {
        setShowMixer(false);
        handled = true;
      }
      // Tier 5: Fullscreen / expanded players (music continues running minimized!)
      else if (s.isDesktopFullscreen) {
        setIsDesktopFullscreen(false);
        handled = true;
      } else if (s.isMobilePlayerOpen) {
        setIsMobilePlayerOpen(false);
        handled = true;
      }
      // Tier 6: View filters & playlists
      else if (s.viewedPlaylistId !== null) {
        setViewedPlaylistId(null);
        handled = true;
      } else if (s.selectedArtist !== null) {
        setSelectedArtist(null);
        handled = true;
      } else if (s.selectedAlbum !== null) {
        setSelectedAlbum(null);
        handled = true;
      }

      if (handled) {
        // Do NOT push state here. The browser just popped the modal's state for us.
        exitWarningRef.current = false;
        setShowExitToast(false);
      } else {
        // Double-back to exit logic applies universally (both desktop and mobile)
        if (!exitWarningRef.current) {
          exitWarningRef.current = true;
          setShowExitToast(true);
          // Push a unique hash so Chrome respects the push state and traps them for the first back press
          window.history.pushState({ page: 'euphony-exit' }, '', window.location.pathname + window.location.search + '#exit');
          setTimeout(() => { exitWarningRef.current = false; setShowExitToast(false); }, 2500);
        } else {
          // Actually exit the app on the second consecutive back press
          window.history.back();
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 768);
    window.addEventListener("resize", handleResize);

    const checkUserSwitch = (newSession) => {
      const newUserId = newSession?.user?.id || null;
      let lastUserId = null;
      try { lastUserId = localStorage.getItem("euphony_active_user_id"); } catch (e) {}

      if (newUserId && lastUserId && newUserId !== lastUserId) {
        try {
          localStorage.removeItem("euphony_cached_playlists");
          localStorage.removeItem("euphony_playlist_id");
          localStorage.removeItem("euphony_user_queue");
          localStorage.removeItem("euphony_queue_current_track");
          localStorage.removeItem("euphony_playback_history");
          localStorage.removeItem("euphony_playback_queue");
          localStorage.removeItem("euphony_playback_index");
          localStorage.removeItem("euphony_playback_source");
          localStorage.removeItem("euphony_current_time");
          localStorage.removeItem(`euphony_recently_played_ids_${newUserId}`);
          localStorage.removeItem(`euphony_song_play_counts_${newUserId}`);
          localStorage.removeItem(`euphony_song_listen_seconds_${newUserId}`);
          localStorage.removeItem(`euphony_custom_song_moods_${newUserId}`);
        } catch (e) {}

        setUserPlaylists([]);
        setViewedPlaylistId(null);
        setUserQueue([]);
        setQueueCurrentTrack(null);
        setRecentlyPlayedIds([]);
        setPlayCounts({});
        setCustomMoodOverrides({});
      }

      if (newUserId) {
        try { localStorage.setItem("euphony_active_user_id", newUserId); } catch (e) {}
      } else {
        try { localStorage.removeItem("euphony_active_user_id"); } catch (e) {}
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      checkUserSwitch(session);
      setSession(session);
      setIsSessionLoaded(true);
    }).catch((e) => {
      console.error("Session error:", e);
      setIsSessionLoaded(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      checkUserSwitch(session);
      if (event === 'SIGNED_OUT') {
        setActiveUser(null);
        setSession(null);
        setRecentlyPlayedIds([]);
        setPlayCounts({});
        setCustomMoodOverrides({});
        setUserPlaylists([]);
        setViewedPlaylistId(null);
        setUserQueue([]);
        setQueueCurrentTrack(null);
      } else if (event === 'PASSWORD_RECOVERY') {
        setSession(session);
        setShowPasswordResetModal(true);
      } else if (session) {
        setSession(session);
      }
    });
    return () => { window.removeEventListener("resize", handleResize); subscription.unsubscribe(); };
  }, []);

  // Capture shared link parameters (?song=... and ?jam=...) and cache in sessionStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlSongId = params.get('song');
      const urlJamId = params.get('jam');
      if (urlSongId) {
        sessionStorage.setItem('euphony_pending_song_id', urlSongId);
      }
      if (urlJamId) {
        sessionStorage.setItem('euphony_pending_jam_id', urlJamId);
      }
    } catch (e) {}
  }, []);

  // Handle shared jam room auto-join after session is loaded
  useEffect(() => {
    if (!session) return;
    let pendingJamId = null;
    try {
      const params = new URLSearchParams(window.location.search);
      pendingJamId = params.get('jam') || sessionStorage.getItem('euphony_pending_jam_id');
    } catch (e) {}

    if (pendingJamId && !jamRoomId) {
      try { sessionStorage.removeItem('euphony_pending_jam_id'); } catch (e) {}
      const clean = pendingJamId.trim().toUpperCase();
      setIsJamHost(false);
      setJamRoomId(clean);
      try {
        sessionStorage.setItem('euphony_active_jam_id', clean);
        sessionStorage.setItem('euphony_is_jam_host', 'false');
      } catch (e) {}
      triggerToast(`Connected to Live Jam Session: ${clean}`);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('jam');
        window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + window.location.hash);
      } catch (e) {}
    }
  }, [session, jamRoomId, triggerToast]);

  useEffect(() => {
    if (viewedPlaylistId) localStorage.setItem("euphony_playlist_id", viewedPlaylistId);
    else localStorage.removeItem("euphony_playlist_id");
  }, [viewedPlaylistId]);

  useEffect(() => {
    let isActive = true;
    if (currentSortKey !== "duration") return;
    
    const fetchDurationsInBatches = async () => {
      const tracksToProcess = [...playlist, ...playlistSongs].filter(t => 
        !t.duration && !STATIC_SONG_DURATIONS[t.id] && !songDurations[t.id] && !fetchingDurationsRef.current.has(t.id) && t.url
      );
      
      const BATCH_SIZE = 4;
      for (let i = 0; i < tracksToProcess.length; i += BATCH_SIZE) {
        if (!isActive) break;
        const batch = tracksToProcess.slice(i, i + BATCH_SIZE);
        
        await Promise.all(batch.map(track => {
          fetchingDurationsRef.current.add(track.id);
          return new Promise((resolve) => {
            const audio = new Audio();
            audio.preload = "metadata";
            audio.onloadedmetadata = () => {
              if (isActive) setSongDurations(prev => ({ ...prev, [track.id]: audio.duration }));
              resolve();
            };
            audio.onerror = resolve;
            audio.src = getCdnUrl(track.url);
            setTimeout(resolve, 2500); 
          });
        }));
      }
    };
    
    fetchDurationsInBatches();
    return () => { isActive = false; };
  }, [playlist, playlistSongs, currentSortKey]);

  const fetchAllData = useCallback(async (showToastNotice = false) => {
    try {
      setIsRefreshing(true);
      const pSongs = supabase.from("songs").select("*").order("created_at", { ascending: true }).limit(1000);
      const pArtists = supabase.from("artists").select("*").order("created_at", { ascending: true });
      const pPlaylists = session?.user?.id
        ? supabase.from("playlists").select("*, playlist_songs(song_id, songs(poster_url))").eq("user_id", session.user.id).order("created_at", { ascending: true })
        : Promise.resolve({ data: [] });

      const [songsRes, artistsRes, playlistRes] = await Promise.all([pSongs, pArtists, pPlaylists]);
      
      if (songsRes.data) {
        const uniqueSongs = Array.from(new Map(songsRes.data.map(s => [s.id, s])).values());
        setPlaylist(uniqueSongs);
        try {
          localStorage.setItem("euphony_cached_playlist", JSON.stringify(uniqueSongs));
        } catch (e) {}

        const songMap = new Map(uniqueSongs.map(s => [s.id, s]));
        setPlaybackQueue(prevQueue => {
          if (!prevQueue || prevQueue.length === 0) return uniqueSongs.map(s => ({ ...s, _play_id: Math.random().toString() }));
          return prevQueue.map(item => {
            const fresh = songMap.get(item.id);
            if (!fresh) return item;
            return {
              ...item,
              ...fresh,
              _play_id: item._play_id,
              lyrics: fresh.lyrics || item.lyrics,
              stem_vocals: fresh.stem_vocals || item.stem_vocals,
              stem_drums: fresh.stem_drums || item.stem_drums,
              stem_bass: fresh.stem_bass || item.stem_bass,
              stem_other: fresh.stem_other || item.stem_other,
              duration: fresh.duration || item.duration || (fresh.id && STATIC_SONG_DURATIONS[fresh.id]) || 0
            };
          });
        });

        setQueueCurrentTrack(prev => {
          if (!prev) return prev;
          const fresh = songMap.get(prev.id);
          if (!fresh) return prev;
          return {
            ...prev,
            ...fresh,
            lyrics: fresh.lyrics || prev.lyrics,
            stem_vocals: fresh.stem_vocals || prev.stem_vocals,
            stem_drums: fresh.stem_drums || prev.stem_drums,
            stem_bass: fresh.stem_bass || prev.stem_bass,
            stem_other: fresh.stem_other || prev.stem_other,
            duration: fresh.duration || prev.duration || (fresh.id && STATIC_SONG_DURATIONS[fresh.id]) || 0
          };
        });
      }
      
      if (!artistsRes.error && artistsRes.data && artistsRes.data.length > 0) {
        const uniqueArtists = Array.from(new Map(artistsRes.data.map(a => [a.name.trim().toLowerCase(), a])).values());
        setDbArtists(uniqueArtists);
        try {
          localStorage.setItem("euphony_cached_artists", JSON.stringify(uniqueArtists));
        } catch (e) {}
      } else {
        const defaultArtists = [
          { name: "Arijit Singh", image_url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Arijit_Singh_performance_at_Chandigarh_2025.jpg/500px-Arijit_Singh_performance_at_Chandigarh_2025.jpg" },
          { name: "Armaan Malik", image_url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Armaan_Malik_2016.jpg/500px-Armaan_Malik_2016.jpg" },
          { name: "AR Rahman", image_url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/AR_Rahman_at_Premier_Futsal_Press_Meet_%28cropped%29.jpg/500px-AR_Rahman_at_Premier_Futsal_Press_Meet_%28cropped%29.jpg" },
          { name: "Neeti Mohan", image_url: "https://upload.wikimedia.org/wikipedia/commons/1/13/Neeti_Mohan_attends_Shakti_Mohan%E2%80%99s_Nritya_Shakti_celebrations_for_World_Dance_Day_%2804%29_%28cropped%29.jpg" },
          { name: "Darshan Raval", image_url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Darshan-Raval-grace-the-12th-radio-mirchi-music-awards-2020.jpg/500px-Darshan-Raval-grace-the-12th-radio-mirchi-music-awards-2020.jpg" },
          { name: "Taylor Swift", image_url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png/500px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png" },
          { name: "Sonu Nigam", image_url: "https://upload.wikimedia.org/wikipedia/commons/7/76/Sonu_Nigam123.jpg" },
          { name: "Shawn Mendes", image_url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/191125_Shawn_Mendes_at_the_2019_American_Music_Awards.png/500px-191125_Shawn_Mendes_at_the_2019_American_Music_Awards.png" },
          { name: "Shreya Ghoshal", image_url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a0/Shreya_Ghoshal_Behindwoods_Gold_Icons_Awards_2023_%28cropped%29.jpg/500px-Shreya_Ghoshal_Behindwoods_Gold_Icons_Awards_2023_%28cropped%29.jpg" },
          { name: "Atif Aslam", image_url: "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Atif_Aslam_at_Badlapur_%28cropped%29.jpg/500px-Atif_Aslam_at_Badlapur_%28cropped%29.jpg" }
        ];
        setDbArtists(defaultArtists);
      }

      if (playlistRes.data) {
        const uniquePlaylists = Array.from(new Map(playlistRes.data.map(p => [p.id, p])).values())
          .filter(p => p.name && !p.name.startsWith("__"));
        let hasLiked = uniquePlaylists.some(p => p.name === "Liked Songs");
        let finalPlaylists = [...uniquePlaylists];
        if (!hasLiked) {
          const { data: newLiked } = await supabase.from("playlists").insert([{ name: "Liked Songs", user_id: session.user.id }]).select("*, playlist_songs(song_id, songs(poster_url))");
          if (newLiked && newLiked.length > 0) {
            finalPlaylists.unshift(newLiked[0]);
          }
        }
        setUserPlaylists(finalPlaylists);
        try {
          localStorage.setItem("euphony_cached_playlists", JSON.stringify(finalPlaylists));
        } catch (e) {}
      }
      setIsInitialLoad(false);
      if (showToastNotice) {
        triggerToast("Refreshed!");
      }
    } catch (err) {
      console.error("Error fetching library data:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchAllData();

    const channel = supabase.channel('public:songs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'songs' }, (payload) => {
        setPlaylist(prev => {
          if (prev.find(s => s.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'songs' }, (payload) => {
        setPlaylist(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
        setPlaylistSongs(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
        setPlaybackQueue(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
        setQueueCurrentTrack(prev => prev?.id === payload.new.id ? { ...prev, ...payload.new } : prev);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, fetchAllData]);

  // Cross-device listening stats and account data synchronization
  useEffect(() => {
    if (!session?.user?.id) {
      setActiveUser(null);
      setRecentlyPlayedIds([]);
      setPlayCounts({});
      setCustomMoodOverrides({});
      return;
    }
    setActiveUser(session.user);

    // Immediately isolate and populate local stats for this specific user
    const localCounts = getPlayCounts(session.user.id);
    const localRecent = getRecentlyPlayedIds(session.user.id);
    const localMoods = getCustomMoods(session.user.id);
    setPlayCounts(localCounts);
    setRecentlyPlayedIds(localRecent);
    setCustomMoodOverrides(localMoods);

    // Initial account sync: merges stats from all devices linked to this account
    syncAccountStats(session.user).then((merged) => {
      if (merged) {
        if (merged.playCounts) setPlayCounts(merged.playCounts);
        if (merged.recentlyPlayedIds) setRecentlyPlayedIds(merged.recentlyPlayedIds);
        if (merged.customMoods) setCustomMoodOverrides(prev => ({ ...prev, ...merged.customMoods }));
      }
    });

    // Realtime channel: instant sync when another device (mobile/desktop) updates stats
    const unsub = subscribeToCloudStats(session.user.id, (remote) => {
      if (remote) {
        if (remote.playCounts) setPlayCounts(remote.playCounts);
        if (remote.recentlyPlayedIds) setRecentlyPlayedIds(remote.recentlyPlayedIds);
        if (remote.customMoods) setCustomMoodOverrides(prev => ({ ...prev, ...remote.customMoods }));
      }
    });

    // Sync on tab focus or visibility changes (mobile app switches, screen unlocks)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (jamRoomIdRef.current) {
          if (supabase?.realtime && !supabase.realtime.isConnected()) {
            try { supabase.realtime.connect(); } catch (e) {}
          }
          if (jamChannelRef.current) {
            jamChannelRef.current.send({
              type: 'broadcast',
              event: 'jam_request_state',
              payload: { requester: sessionRef.current?.user?.email || "Jam Member" }
            });
          }
        }
        syncAccountStats(session.user).then((merged) => {
          if (merged) {
            if (merged.playCounts) setPlayCounts(merged.playCounts);
            if (merged.recentlyPlayedIds) setRecentlyPlayedIds(merged.recentlyPlayedIds);
            if (merged.customMoods) setCustomMoodOverrides(prev => ({ ...prev, ...merged.customMoods }));
          }
        });
      } else if (document.visibilityState === 'hidden') {
        if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
          recordListeningDuration(currentTrack.id, pendingListenDurationRef.current, session.user.id);
          pendingListenDurationRef.current = 0;
          flushCloudSync(session.user.id);
        }
      }
    };

    const handleFocus = () => {
      syncAccountStats(session.user).then((merged) => {
        if (merged) {
          if (merged.playCounts) setPlayCounts(merged.playCounts);
          if (merged.recentlyPlayedIds) setRecentlyPlayedIds(merged.recentlyPlayedIds);
          if (merged.customMoods) setCustomMoodOverrides(prev => ({ ...prev, ...merged.customMoods }));
        }
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pagehide", handleVisibility);

    return () => {
      if (unsub) unsub();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pagehide", handleVisibility);
    };
  }, [session?.user?.id, currentTrack?.id]);

  useEffect(() => {
    if (viewedPlaylistId === null || (typeof viewedPlaylistId === "string" && viewedPlaylistId.startsWith("smart_"))) return;
    const fetchPlaylistSongs = async () => {
      const { data } = await supabase.from("playlist_songs").select("song_id, added_at, songs(*)").eq("playlist_id", viewedPlaylistId);
      if (data) {
        const formattedSongs = data.map(item => ({ ...item.songs, added_at: item.added_at })).filter(item => item.id);
        setPlaylistSongs(formattedSongs);
      }
    };
    fetchPlaylistSongs();
  }, [viewedPlaylistId]);

  const effectiveTrackLyrics = currentTrack?.lyrics || playlist.find(s => s.id === currentTrack?.id)?.lyrics;

  useEffect(() => {
    setStemsBroken(false);
    setShowLyrics(false);
    setActiveLyricIndex(-1);
    setActiveWordIndex(-1);
    setStemVolumes({ vocals: 1, drums: 1, bass: 1, other: 1 });
    setParsedLyrics(effectiveTrackLyrics ? parseLyrics(effectiveTrackLyrics) : []);
  }, [currentTrack?.id]);

  useEffect(() => {
    if (effectiveTrackLyrics && parsedLyrics.length === 0) {
      setParsedLyrics(parseLyrics(effectiveTrackLyrics));
    }
  }, [effectiveTrackLyrics, parsedLyrics.length]);

  const areStemsModified = stemVolumes.vocals < 1 || stemVolumes.drums < 1 || stemVolumes.bass < 1 || stemVolumes.other < 1;
  const isMixerActive = Boolean(currentTrack?.stem_vocals && !stemsBroken && areStemsModified);
  const shouldLoadStems = Boolean((showMixer || (isDesktopFullscreen && fullscreenView === "mixer") || isMixerActive) && currentTrack?.stem_vocals);

  useEffect(() => {
    const setVol = (ref, targetVol, targetMuted) => {
      if (!ref.current || isCrossfadingRef.current) return;
      const el = ref.current;
      if (Math.abs(el.volume - targetVol) > 0.01) el.volume = targetVol;
      if (el.muted !== targetMuted) el.muted = targetMuted;
    };

    setVol(audioRef, isMixerActive ? 0 : (isMuted ? 0 : volume), isMixerActive || isMuted);
    setVol(vocalsRef, isMixerActive ? (isMuted ? 0 : stemVolumes.vocals * (volume || 1)) : 0, !isMixerActive || isMuted || stemVolumes.vocals === 0);
    setVol(drumsRef, isMixerActive ? (isMuted ? 0 : stemVolumes.drums * (volume || 1)) : 0, !isMixerActive || isMuted || stemVolumes.drums === 0);
    setVol(bassRef, isMixerActive ? (isMuted ? 0 : stemVolumes.bass * (volume || 1)) : 0, !isMixerActive || isMuted || stemVolumes.bass === 0);
    setVol(otherRef, isMixerActive ? (isMuted ? 0 : stemVolumes.other * (volume || 1)) : 0, !isMixerActive || isMuted || stemVolumes.other === 0);
  }, [volume, isMuted, stemVolumes, currentTrack, stemsBroken, isMixerActive]);

  volumeRef.current = volume;
  isMutedRef.current = isMuted;
  isMixerActiveRef.current = isMixerActive;

  const stopCrossfade = useCallback((finalize = false) => {
    crossfadeTransitionIdRef.current++;
    if (crossfadeFallbackTimerRef.current) {
      clearTimeout(crossfadeFallbackTimerRef.current);
      crossfadeFallbackTimerRef.current = null;
    }
    if (crossfadeWorkerRef.current) {
      try {
        crossfadeWorkerRef.current.onmessage = null;
        crossfadeWorkerRef.current.postMessage('stop');
      } catch (e) {}
    }
    if (crossfadeAnimFrameRef.current) {
      cancelAnimationFrame(crossfadeAnimFrameRef.current);
      crossfadeAnimFrameRef.current = null;
    }
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
    crossfadeProgressUpdaterRef.current = null;
    if (artTransitionTimerRef.current) {
      clearTimeout(artTransitionTimerRef.current);
      artTransitionTimerRef.current = null;
    }
    isCrossfadingRef.current = false;
    setOutgoingTrackForArt(null);
    setOutgoingDominantRgb(null);
    setArtTransitionDuration(0);

    const baseVol = (isMutedRef.current || isMixerActiveRef.current) ? 0 : volumeRef.current;
    const outgoing = crossfadeOutgoingAudioRef.current;
    const incoming = crossfadeIncomingAudioRef.current || audioRef.current;

    if (outgoing) {
      if (finalize && incoming && incoming.paused) {
        console.warn("Incoming deck not playing at crossfade finalization; rescuing playback on outgoing deck");
        try {
          outgoing.src = incoming.src;
          outgoing.currentTime = incoming.currentTime || 0;
          outgoing.volume = baseVol;
          outgoing.play().catch(e => e);
        } catch (e) {}
      } else {
        try {
          outgoing.pause();
          outgoing.currentTime = 0;
          outgoing.src = '';
        } catch (e) {}
      }
      crossfadeOutgoingAudioRef.current = null;
    }

    if (incoming && !isMixerActiveRef.current && !isMutedRef.current) {
      incoming.volume = baseVol;
    }
    crossfadeIncomingAudioRef.current = null;
  }, [audioRef]);

  const stopCrossfadeRef = useRef(stopCrossfade);
  stopCrossfadeRef.current = stopCrossfade;

  const handlePlayPauseRef = useRef(null);

  const pauseAllAudioDecks = useCallback(() => {
    if (stallRecoveryTimerRef.current) {
      clearTimeout(stallRecoveryTimerRef.current);
      stallRecoveryTimerRef.current = null;
    }
    deckARef.current?.pause();
    deckBRef.current?.pause();
    vocalsRef.current?.pause();
    drumsRef.current?.pause();
    bassRef.current?.pause();
    otherRef.current?.pause();
    // Keep silent audio loop playing while in a Jam to keep mobile audio session & WebSockets active
    if (!jamRoomIdRef.current) {
      silentAudioRef.current?.pause();
    }
    if (isCrossfadingRef.current) {
      stopCrossfadeRef.current?.(false);
    }
    setIsPlaying(false);
    isPlayingRef.current = false;
  }, []);

  const pauseAllAudioDecksRef = useRef(pauseAllAudioDecks);
  pauseAllAudioDecksRef.current = pauseAllAudioDecks;

  const resumeActiveAudioDecks = useCallback(() => {
    const activeEl = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current;
    if (!activeEl) return;
    setIsPlaying(true);
    isPlayingRef.current = true;
    const targetVol = (isMutedRef.current || isMixerActiveRef.current) ? 0 : volumeRef.current;
    activeEl.volume = targetVol;
    activeEl.muted = Boolean(isMutedRef.current || isMixerActiveRef.current);
    if (silentAudioRef.current) {
      silentAudioRef.current.volume = 0.001;
      silentAudioRef.current.play().catch(e => e);
    }
    const p = activeEl.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        setIsPlaying(true);
        isPlayingRef.current = true;
        if (shouldLoadStems && !stemsBroken) {
          vocalsRef.current?.play().catch(e => e);
          drumsRef.current?.play().catch(e => e);
          bassRef.current?.play().catch(e => e);
          otherRef.current?.play().catch(e => e);
        }
      }).catch((err) => {
        if (err?.name === 'AbortError') return;
        triggerToastRef.current?.("Tap screen to resume Jam audio 🎵");
        const handleUnlock = () => {
          primeAudioDecks();
          resumeActiveAudioDecks();
          window.removeEventListener('click', handleUnlock);
          window.removeEventListener('touchend', handleUnlock);
          window.removeEventListener('pointerdown', handleUnlock);
        };
        window.addEventListener('click', handleUnlock);
        window.addEventListener('touchend', handleUnlock);
        window.addEventListener('pointerdown', handleUnlock);
      });
    }
  }, [shouldLoadStems, stemsBroken, primeAudioDecks]);

  const resumeActiveAudioDecksRef = useRef(resumeActiveAudioDecks);
  resumeActiveAudioDecksRef.current = resumeActiveAudioDecks;

  useEffect(() => {
    if (shouldLoadStems && audioRef.current && !stemsBroken) {
      const t = audioRef.current.currentTime || 0;
      if (vocalsRef.current) vocalsRef.current.currentTime = t;
      if (drumsRef.current)  drumsRef.current.currentTime  = t;
      if (bassRef.current)   bassRef.current.currentTime   = t;
      if (otherRef.current)  otherRef.current.currentTime  = t;
      if (isPlaying) {
        vocalsRef.current?.play().catch(e => e);
        drumsRef.current?.play().catch(e => e);
        bassRef.current?.play().catch(e => e);
        otherRef.current?.play().catch(e => e);
      }
    }
  }, [shouldLoadStems, isPlaying, stemsBroken]);

  
  const prefetchedSignatureRef = useRef("");
  
  useEffect(() => {
    prefetchedSignatureRef.current = "";
    nextTrackPreloadAttemptedRef.current = null;
  }, [currentTrack?.url]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    const syncPlayState = async () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
      }
      if (isPlaying && currentTrack) {
        if (audioRef.current?.paused && audioRef.current.src && audioRef.current.src !== window.location.href) {
          audioRef.current.play().catch(e => e);
        }
        if (shouldLoadStems && !stemsBroken) {
          vocalsRef.current?.play().catch(e => e);
          drumsRef.current?.play().catch(e => e);
          bassRef.current?.play().catch(e => e);
          otherRef.current?.play().catch(e => e);
        }
      } else {
        pauseAllAudioDecks();
      }
    };
    syncPlayState();
  }, [isPlaying, stemsBroken, currentTrack, shouldLoadStems, pauseAllAudioDecks]);

  const handleTimeUpdateRef = useRef();
  const lastSavedTimeRef = useRef(-1);

  // Keep duration state strictly synchronized with current track and audio element
  useEffect(() => {
    if (!currentTrack) return;
    const activeEl = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current;
    const resolvedDur = (activeEl && isFinite(activeEl.duration) && activeEl.duration > 0)
      ? activeEl.duration
      : (activeEl?._cachedDuration || currentTrack.duration || (currentTrack.id && STATIC_SONG_DURATIONS[currentTrack.id]) || 0);
    if (resolvedDur > 0) {
      setDuration(resolvedDur);
    }
    updateProgressVisuals();
  }, [currentTrack?.id, currentTrack?.duration]);
  
  useEffect(() => {
    handleTimeUpdateRef.current = () => {
        if (!audioRef.current) return;
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        updateProgressVisuals(); // Force DOM update for sliders even if requestAnimationFrame died in the background
        
        const currentInt = Math.floor(time);
        if (currentInt % 2 === 0 && currentInt !== lastSavedTimeRef.current) {
          localStorage.setItem("euphony_current_time", time);
          lastSavedTimeRef.current = currentInt;
        }

        // Continuous wall-clock listening duration accumulation (calculated per active second/minute)
        const now = Date.now();
        if (lastListenTickRef.current && isPlaying && audioRef.current && !audioRef.current.paused && currentTrack?.id) {
          const delta = (now - lastListenTickRef.current) / 1000;
          if (delta >= 0.1 && delta <= 3.0) {
            sessionListenDurationRef.current += delta;
            pendingListenDurationRef.current += delta;
          }
          lastListenTickRef.current = now;
        } else if (isPlaying && audioRef.current && !audioRef.current.paused) {
          lastListenTickRef.current = now;
        }

        // Live Jam periodic drift synchronization (Active leader keeps peers locked in sync every ~1s)
        if (jamChannelRef.current && isPlaying && isJamLeaderRef.current) {
          if (now - lastJamDriftSyncRef.current > 1000) {
            lastJamDriftSyncRef.current = now;
            const activeEl = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current;
            jamChannelRef.current.send({
              type: 'broadcast',
              event: 'jam_sync',
              payload: {
                type: 'drift_sync',
                currentTime: activeEl?.currentTime || time,
                song: currentTrackRef.current || currentTrack,
                isPlaying: true,
                leaderClientId: localClientIdRef.current,
                hostName: sessionRef.current?.user?.user_metadata?.full_name || sessionRef.current?.user?.email?.split('@')[0] || "Jam member",
                senderClientId: localClientIdRef.current,
                timestamp: now
              }
            });
          }
        }

        // Live Jam Screen-Off Socket Guardian & Peer-to-Peer NTP Ping
        if (jamRoomIdRef.current && supabase?.realtime) {
          if (now - lastRealtimeKeepAliveRef.current > 8000) {
            lastRealtimeKeepAliveRef.current = now;
            if (!supabase.realtime.isConnected()) {
              try { supabase.realtime.connect(); } catch (e) {}
            } else {
              try { supabase.realtime.sendHeartbeat(); } catch (e) {}
            }
          }

          if (!isJamLeaderRef.current && jamChannelRef.current && now - lastJamPingRef.current > 5000) {
            lastJamPingRef.current = now;
            jamChannelRef.current.send({
              type: 'broadcast',
              event: 'jam_sync',
              payload: {
                type: 'jam_ping',
                clientTime: now,
                senderClientId: localClientIdRef.current
              }
            });
          }
        }

        // Flush accumulated duration in small increments (>= 1.0s) to keep stats accurate without excessive storage calls
        if (pendingListenDurationRef.current >= 1.0 && currentTrack?.id) {
          recordListeningDuration(currentTrack.id, pendingListenDurationRef.current);
          pendingListenDurationRef.current = 0;
        }

        // 1-minute qualified play:
        // A song counts as a qualified play only after listening for at least 1 minute (60 seconds)
        // (or when reaching the end if song duration is under 60s).
        const dur = audioRef.current.duration;
        const isQualifiedTime = sessionListenDurationRef.current >= 60 || (isFinite(dur) && dur > 0 && dur < 60 && time >= dur - 0.5);
        if (isQualifiedTime && currentTrack?.id && qualifiedPlayLoggedRef.current !== currentTrack.id) {
          qualifiedPlayLoggedRef.current = currentTrack.id;
          recordQualifiedPlay(currentTrack);
          setRecentlyPlayedIds(getRecentlyPlayedIds());
          setPlayCounts(getPlayCounts());
        }

        if ('mediaSession' in navigator && audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: audioRef.current.currentTime
            });
          } catch(e) {}
        }

        // Crossfade auto-trigger and background deck pre-warming when approaching song end:
        if (crossfadeEnabled && !isCrossfadingRef.current && !crossfadeTriggeredRef.current && playMode !== 'repeat-one') {
          const totalDur = (audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0)
            ? audioRef.current.duration
            : (duration || 0);
          const fadePoint = totalDur - crossfadeDuration;
          const prewarmPoint = Math.max(0, fadePoint - 7);

          if (totalDur && isFinite(totalDur) && totalDur > (crossfadeDuration * 1.8) && totalDur > 20) {
            // Pre-warm the inactive deck 7 seconds before crossfade trigger point so network buffer is ready
            if (fadePoint > 10 && time >= prewarmPoint && time < fadePoint) {
              const upcoming = getNextTwoUpcomingTracks();
              const nextSong = (userQueue && userQueue.length > 0) ? userQueue[0] : upcoming[0];
              const nextSongKey = nextSong ? (nextSong.id || nextSong.url) : null;
              if (nextSong && nextSongKey && prewarmedTrackIdRef.current !== nextSongKey) {
                prewarmedTrackIdRef.current = nextSongKey;
                if (nextSong.url) {
                  const nextCdn = getCdnUrl(nextSong.url);
                  const nextObjUrl = blobCacheRef.current?.get(nextCdn) || nextCdn;
                  const inactiveAudio = activeDeckRef.current === 'A' ? deckBRef.current : deckARef.current;
                  if (inactiveAudio && inactiveAudio.src !== nextObjUrl && !inactiveAudio.src.includes(nextCdn)) {
                    inactiveAudio.preload = "auto";
                    inactiveAudio.src = nextObjUrl;
                    inactiveAudio.volume = 0.001;
                  }
                  if (nextSong.poster_url && !localStorage.getItem(`euphony_color_${nextSong.id || nextSong.title}`)) {
                    try {
                      const pImg = new Image();
                      pImg.crossOrigin = "anonymous";
                      pImg.onload = () => {
                        try {
                          const canvas = document.createElement("canvas");
                          canvas.width = 24; canvas.height = 24;
                          const ctx = canvas.getContext("2d", { willReadFrequently: true });
                          ctx.drawImage(pImg, 0, 0, 24, 24);
                          const imgData = ctx.getImageData(0, 0, 24, 24).data;
                          let bestR = 24, bestG = 40, bestB = 68;
                          let maxScore = -1, totalR = 0, totalG = 0, totalB = 0, count = 0;
                          for (let i = 0; i < imgData.length; i += 4) {
                            const r = imgData[i], g = imgData[i+1], b = imgData[i+2], a = imgData[i+3];
                            if (a < 128) continue;
                            totalR += r; totalG += g; totalB += b; count++;
                            const max = Math.max(r, g, b), min = Math.min(r, g, b);
                            const delta = max - min, lightness = (max + min) / 2;
                            if (lightness > 18 && lightness < 240) {
                              const saturation = delta / (255 - Math.abs(2 * lightness - 255) || 1);
                              const score = saturation * 2.5 + (1 - Math.abs(lightness - 120) / 120);
                              if (score > maxScore) { maxScore = score; bestR = r; bestG = g; bestB = b; }
                            }
                          }
                          if (maxScore < 0.25 && count > 0) {
                            bestR = Math.round(totalR / count); bestG = Math.round(totalG / count); bestB = Math.round(totalB / count);
                          }
                          const preRgb = { r: bestR, g: bestG, b: bestB };
                          localStorage.setItem(`euphony_color_${nextSong.id || nextSong.title}`, JSON.stringify(preRgb));
                        } catch (e) {}
                      };
                      pImg.src = nextSong.poster_url;
                    } catch (e) {}
                  }
                }
              }
            }

            // Crossfade auto-trigger when reaching crossfade trigger point:
            // In Live Jam, only the leader auto-triggers crossfade to prevent peer track divergence
            const isJamFollower = Boolean(jamRoomIdRef.current && !isJamLeaderRef.current);
            if (!isJamFollower && fadePoint > 10 && time >= fadePoint) {
              crossfadeTriggeredRef.current = true;
              handleNext(null, true);
            }
          }
        }

        // Screen-off background audio safety:
        // Pre-buffer upcoming track to local disk via native audio timer so next song never stops midway
        if (time >= 8 && isPlaying) {
          const upcoming = getNextTwoUpcomingTracks();
          if (upcoming[0]?.url && upcoming[0].id !== nextTrackPreloadAttemptedRef.current) {
            nextTrackPreloadAttemptedRef.current = upcoming[0].id;
            const nextCdn = getCdnUrl(upcoming[0].url);
            if (!blobCacheRef.current.has(nextCdn)) {
              cacheAudioTrack(upcoming[0].url, null).catch(() => {});
            }
            if (upcoming[0]?.poster_url) {
              try {
                const preImg = new Image();
                preImg.src = upcoming[0].poster_url;
              } catch (e) {}
            }
          }
        }

      if (currentTrack?.stem_vocals && !stemsBroken) {
        const syncStem = (ref) => {
          if (ref.current && ref.current.readyState >= 3 && Math.abs(ref.current.currentTime - time) > 0.5) {
            ref.current.currentTime = time;
          }
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
      }, 200); 
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const restoreInitialTimeHandlerRef = useRef(null);

  useEffect(() => {
    if (isFirstRender.current && audioRef.current && currentTrack) {
      const cdnUrl = getCdnUrl(currentTrack.url);
      const cachedBlob = blobCacheRef.current?.get(cdnUrl);
      if (cachedBlob) {
        audioRef.current.src = cachedBlob;
      } else if (!audioRef.current.src || audioRef.current.src === window.location.href) {
        audioRef.current.src = cdnUrl;
        if (typeof window !== "undefined" && 'caches' in window) {
          caches.open(AUDIO_CACHE_NAME).then(c => c.match(cdnUrl)).then(async match => {
            if (match && !blobCacheRef.current.has(cdnUrl)) {
              const blob = await match.blob();
              if (blob.size > 50000) {
                const safeBlob = blob.type && blob.type.includes('audio') ? blob : new Blob([blob], { type: 'audio/mpeg' });
                const bUrl = URL.createObjectURL(safeBlob);
                blobCacheRef.current.set(cdnUrl, bUrl);
                if (audioRef.current && (!audioRef.current.src || audioRef.current.src === cdnUrl || audioRef.current.error || !navigator.onLine)) {
                  const cur = audioRef.current.currentTime || 0;
                  audioRef.current.src = bUrl;
                  try { audioRef.current.currentTime = cur; } catch (e) {}
                }
              } else {
                caches.open(AUDIO_CACHE_NAME).then(c => c.delete(cdnUrl)).catch(() => {});
              }
            }
          }).catch(() => {});
        }
      }
      const savedTime = localStorage.getItem("euphony_current_time");
      if (savedTime && !isNaN(parseFloat(savedTime)) && parseFloat(savedTime) > 0) {
        const restoreTime = () => {
          if (audioRef.current && !audioRef.current.error) {
            try {
              const parsedTime = parseFloat(savedTime);
              if (!audioRef.current.duration || parsedTime < audioRef.current.duration) {
                audioRef.current.currentTime = parsedTime;
                setCurrentTime(parsedTime);
                updateProgressVisuals();
              }
            } catch (e) {
              console.warn("Could not restore initial audio time:", e);
            }
          }
          audioRef.current?.removeEventListener('loadedmetadata', restoreTime);
          restoreInitialTimeHandlerRef.current = null;
        };
        restoreInitialTimeHandlerRef.current = restoreTime;
        if (audioRef.current.readyState >= 1) {
          restoreTime();
        } else {
          audioRef.current.addEventListener('loadedmetadata', restoreTime);
        }
      }
      isFirstRender.current = false;
    }
  }, [currentTrack]);

  const handleCanPlay = () => {
    if (pendingAutoPlayRef.current) {
      pendingAutoPlayRef.current = false;
    }
    if (isPlayingRef.current && isPlaying && audioRef.current && audioRef.current.paused) {
      audioRef.current.play().catch(e => console.log("canplay-play err:", e));
    }
    if (isPlayingRef.current && isPlaying && currentTrack?.stem_vocals && !stemsBroken) {
      vocalsRef.current?.play().catch(e => e);
      drumsRef.current?.play().catch(e => e);
      bassRef.current?.play().catch(e => e);
      otherRef.current?.play().catch(e => e);
    }
  };

  const handleStalledOrWaiting = () => {
    // If user clicked pause or playback is stopped, NEVER attempt to recover or auto-play!
    if (!isPlayingRef.current || !isPlaying || !audioRef.current || audioRef.current.ended) {
      if (stallRecoveryTimerRef.current) {
        clearTimeout(stallRecoveryTimerRef.current);
        stallRecoveryTimerRef.current = null;
      }
      return;
    }
    if (preloadAbortRef.current) {
      preloadAbortRef.current.abort();
      preloadAbortRef.current = null;
    }
    if (shouldLoadStems && !stemsBroken) {
      vocalsRef.current?.pause(); drumsRef.current?.pause(); bassRef.current?.pause(); otherRef.current?.pause();
    }
    // Auto-recover from background network stalls on mobile (Android Doze / iOS background) ONLY while user wants playback
    if (stallRecoveryTimerRef.current) clearTimeout(stallRecoveryTimerRef.current);
    stallRecoveryTimerRef.current = setTimeout(() => {
      if (isPlayingRef.current && isPlaying && audioRef.current && !audioRef.current.ended) {
        if (audioRef.current.paused || audioRef.current.readyState < 3) {
          audioRef.current.play().catch(() => {
            const cur = audioRef.current?.currentTime || 0;
            if (audioRef.current?.src && !audioRef.current.src.startsWith('blob:')) {
              audioRef.current.load();
              try { audioRef.current.currentTime = cur; } catch (e) {}
              audioRef.current.play().catch(() => {});
            }
          });
        }
      }
    }, 2000);
  };

  const handleSeek = (e) => {
    const seekTime = Number(e.target.value);
    if (isCrossfadingRef.current) {
      stopCrossfade(false);
    }
    if (audioRef.current) {
      audioRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
      updateProgressVisuals();
      if (vocalsRef.current) vocalsRef.current.currentTime = seekTime;
      if (drumsRef.current)  drumsRef.current.currentTime  = seekTime;
      if (bassRef.current)   bassRef.current.currentTime   = seekTime;
      if (otherRef.current)  otherRef.current.currentTime  = seekTime;
    }
    isJamLeaderRef.current = true;
    broadcastJamSync({
      type: 'seek',
      currentTime: seekTime,
      song: currentTrack,
      isPlaying: isPlayingRef.current,
      leaderClientId: localClientIdRef.current
    });
  };

  const handleLyricClick = (time, e) => {
    if (e) e.stopPropagation();
    if (isCrossfadingRef.current) {
      stopCrossfade(false);
    }
    if (audioRef.current) { 
      audioRef.current.currentTime = time; 
      setCurrentTime(time); 
      updateProgressVisuals();
      if (!isPlaying) setIsPlaying(true); 
    }
    isJamLeaderRef.current = true;
    broadcastJamSync({
      type: 'seek',
      currentTime: time,
      song: currentTrack,
      isPlaying: true,
      leaderClientId: localClientIdRef.current
    });
  };

  useEffect(() => {
    if (activeLyricIndex !== -1 && lyricRefs.current[activeLyricIndex] && lyricsContainerRef.current) {
      const container = lyricsContainerRef.current;
      const target = lyricRefs.current[activeLyricIndex];
      const targetY = target.offsetTop - (container.offsetHeight / 2) + (target.offsetHeight / 2);
      
      const startY = container.scrollTop;
      const distance = targetY - startY;
      if (Math.abs(distance) < 2) return;
      
      const startTime = performance.now();
      const duration = 700; // Silky smooth 700ms duration matching CSS cubic-bezier

      let animationFrame;
      const animateScroll = (currentTime) => {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = smoothLyricScrollEase(progress);
        container.scrollTop = startY + distance * ease;
        if (timeElapsed < duration) {
          animationFrame = requestAnimationFrame(animateScroll);
        } else {
          container.scrollTop = targetY;
        }
      };
      
      animationFrame = requestAnimationFrame(animateScroll);
      return () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
      };
    }
  }, [activeLyricIndex]);

  useEffect(() => {
    if (isDesktopFullscreen) {
      setTimeout(updateProgressVisuals, 10);
      setTimeout(updateProgressVisuals, 100);
    }
  }, [isDesktopFullscreen]);

  useEffect(() => {
    if (isDesktopFullscreen && fullscreenView === "lyrics" && activeLyricIndex !== -1 && fullscreenLyricRefs.current[activeLyricIndex] && fullscreenLyricsContainerRef.current) {
      const container = fullscreenLyricsContainerRef.current;
      const target = fullscreenLyricRefs.current[activeLyricIndex];
      if (!target) return;
      const targetY = target.offsetTop - (container.offsetHeight / 2) + (target.offsetHeight / 2);
      
      const startY = container.scrollTop;
      const distance = targetY - startY;
      if (Math.abs(distance) < 2) return;
      
      const startTime = performance.now();
      const duration = 700; // Silky smooth 700ms duration matching CSS cubic-bezier

      let animationFrame;
      const animateScroll = (currentTime) => {
        const timeElapsed = currentTime - startTime;
        const progress = Math.min(timeElapsed / duration, 1);
        const ease = smoothLyricScrollEase(progress);
        container.scrollTop = startY + distance * ease;
        if (timeElapsed < duration) {
          animationFrame = requestAnimationFrame(animateScroll);
        } else {
          container.scrollTop = targetY;
        }
      };
      
      animationFrame = requestAnimationFrame(animateScroll);
      return () => {
        if (animationFrame) cancelAnimationFrame(animationFrame);
      };
    }
  }, [activeLyricIndex, isDesktopFullscreen, fullscreenView]);

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
      console.error("Stem request error:", err); alert("Database Error:\r\n" + err.message);
      setIsGeneratingStems(false); setGenerationStatus("");
    }
  };

  const addToQueue = useCallback((song, e) => {
    if (e) {
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.preventDefault === 'function') e.preventDefault();
    }
    if (!song) return;
    const full = (playlist || []).find(s => s.id === song.id);
    const enriched = (full?.lyrics && !song.lyrics) ? { ...song, lyrics: full.lyrics } : song;
    const newQueueId = (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : (Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9));
    const newTrack = { ...enriched, queue_id: newQueueId };
    const currentQ = userQueueRef.current || [];
    const nextQueue = [...currentQ, newTrack];
    userQueueRef.current = nextQueue;
    setUserQueue(nextQueue);
    try { localStorage.setItem("euphony_user_queue", JSON.stringify(nextQueue)); } catch (err) {}
    broadcastJamSync({
      type: 'queue_update',
      userQueue: nextQueue,
      action: 'add',
      songTitle: song.title
    });
    triggerToast(`Added "${song.title || 'Song'}" to Queue`);
  }, [playlist, triggerToast, broadcastJamSync]);

  const removeFromQueue = (index, e) => {
    if (e) e.stopPropagation();
    const currentQ = userQueueRef.current || [];
    const nextQueue = currentQ.filter((_, i) => i !== index);
    userQueueRef.current = nextQueue;
    setUserQueue(nextQueue);
    try { localStorage.setItem("euphony_user_queue", JSON.stringify(nextQueue)); } catch (err) {}
    broadcastJamSync({
      type: 'queue_update',
      userQueue: nextQueue,
      action: 'remove'
    });
  };

  const clearQueue = (e) => {
    if (e) e.stopPropagation();
    userQueueRef.current = [];
    setUserQueue([]);
    try { localStorage.setItem("euphony_user_queue", JSON.stringify([])); } catch (err) {}
    broadcastJamSync({
      type: 'queue_update',
      userQueue: [],
      action: 'clear'
    });
  };
  
  const reorderQueue = (fromIdx, toIdx) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const currentQ = userQueueRef.current || [];
    const next = [...currentQ];
    const [removed] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, removed);
    userQueueRef.current = next;
    setUserQueue(next);
    try { localStorage.setItem("euphony_user_queue", JSON.stringify(next)); } catch (err) {}
    broadcastJamSync({
      type: 'queue_update',
      userQueue: next,
      action: 'reorder'
    });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const items = userQueueRef.current || [];
      const oldIndex = items.findIndex(item => item.queue_id === active.id);
      const newIndex = items.findIndex(item => item.queue_id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const nextQueue = arrayMove(items, oldIndex, newIndex);
        userQueueRef.current = nextQueue;
        setUserQueue(nextQueue);
        try { localStorage.setItem("euphony_user_queue", JSON.stringify(nextQueue)); } catch (err) {}
        broadcastJamSync({
          type: 'queue_update',
          userQueue: nextQueue,
          action: 'reorder'
        });
      }
    }
  };

  const handleSourceDragEnd = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIdx = upcomingSourceList.findIndex(item => `source-${item.track.id}-${item.originalIndex}` === active.id);
      const newIdx = upcomingSourceList.findIndex(item => `source-${item.track.id}-${item.originalIndex}` === over.id);
      
      if (oldIdx !== -1 && newIdx !== -1) {
        if (playMode === 'shuffle') {
          // In shuffle mode, upcomingSourceList is independent of playbackQueue order.
          // We just reorder it locally.
          setUpcomingSourceList(items => arrayMove(items, oldIdx, newIdx));
        } else {
          // In order/repeat modes, upcomingSourceList is strictly derived from playbackQueue.
          // We MUST reorder playbackQueue to persist the change.
          const oldOriginal = upcomingSourceList[oldIdx].originalIndex;
          const newOriginal = upcomingSourceList[newIdx].originalIndex;
          
          setPlaybackQueue(prevQueue => arrayMove(prevQueue, oldOriginal, newOriginal));
          
          setPlaybackIndex(prevIdx => {
            if (oldOriginal === prevIdx) return newOriginal;
            if (oldOriginal < prevIdx && newOriginal >= prevIdx) return prevIdx - 1;
            if (oldOriginal > prevIdx && newOriginal <= prevIdx) return prevIdx + 1;
            return prevIdx;
          });
        }
      }
    }
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
    primeAudioDecks();
    const currentQ = userQueueRef.current || userQueue;
    const rawSong = currentQ[index];
    if (!rawSong) return;
    const full = playlist.find(s => s.id === rawSong?.id);
    const song = (full?.lyrics && !rawSong?.lyrics) ? { ...rawSong, lyrics: full.lyrics } : rawSong;
    const outgoingSong = currentTrack;
    const nextQueue = currentQ.filter((_, i) => i !== index);
    userQueueRef.current = nextQueue;
    setUserQueue(nextQueue);
    try { localStorage.setItem("euphony_user_queue", JSON.stringify(nextQueue)); } catch (err) {}
    setQueueCurrentTrack(song);
    setIsPlaying(true);
    if (crossfadeEnabled && isPlaying && !jamRoomIdRef.current) {
      if (performCrossfadeTransition(song, crossfadeDuration, outgoingSong)) {
        return;
      }
    }
    resetPlaybackTime();
    playTrackWithMetadata(song, audioRef.current, blobCacheRef.current);
  };

  const resetPlaybackTime = () => {
    setCurrentTime(0);
    localStorage.setItem("euphony_current_time", 0);
    lastSavedTimeRef.current = 0;
    crossfadeTriggeredRef.current = false;
    prewarmedTrackIdRef.current = null;
    if (audioRef.current) {
      try { audioRef.current.currentTime = 0; } catch (e) {}
    }
    if (vocalsRef.current && vocalsRef.current.src) try { vocalsRef.current.currentTime = 0; } catch (e) {}
    if (drumsRef.current && drumsRef.current.src) try { drumsRef.current.currentTime = 0; } catch (e) {}
    if (bassRef.current && bassRef.current.src) try { bassRef.current.currentTime = 0; } catch (e) {}
    if (otherRef.current && otherRef.current.src) try { otherRef.current.currentTime = 0; } catch (e) {}
    updateProgressVisuals();
  };

  const playTrackWithMetadata = (track, audioEl, cacheMap, skipJamBroadcast = false) => {
    if (!audioEl || !track) return;
    if (track?.poster_url) {
      try {
        const preImg = new Image();
        preImg.src = track.poster_url;
      } catch (e) {}
    }
    if (currentTrack && track && (currentTrack.id !== track.id || currentTrack.title !== track.title) && !isCrossfadingRef.current) {
      setOutgoingTrackForArt(currentTrack);
      setOutgoingDominantRgb(dominantRgb);
      setArtTransitionDuration(0.4);
      if (artTransitionTimerRef.current) clearTimeout(artTransitionTimerRef.current);
      artTransitionTimerRef.current = setTimeout(() => {
        setOutgoingTrackForArt(null);
        setOutgoingDominantRgb(null);
        setArtTransitionDuration(0);
      }, 450);
    }
    if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
      recordListeningDuration(currentTrack.id, pendingListenDurationRef.current);
      pendingListenDurationRef.current = 0;
    }
    sessionListenDurationRef.current = 0;
    lastListenTickRef.current = Date.now();
    qualifiedPlayLoggedRef.current = null; // Reset per-playback qualified session
    if (restoreInitialTimeHandlerRef.current) {
      audioEl.removeEventListener('loadedmetadata', restoreInitialTimeHandlerRef.current);
      restoreInitialTimeHandlerRef.current = null;
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist',
        album: track.album || '-',
        artwork: [{ src: track.poster_url || 'https://via.placeholder.com/512.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.playbackState = 'playing';
    }
    const cdnUrl = getCdnUrl(track.url);
    const objUrl = cacheMap?.get(cdnUrl) || cdnUrl;
    
    setCurrentTime(0);
    localStorage.setItem("euphony_current_time", 0);
    lastSavedTimeRef.current = 0;
    crossfadeTriggeredRef.current = false;
    prewarmedTrackIdRef.current = null;

    const initialDur = (isFinite(audioEl.duration) && audioEl.duration > 0)
      ? audioEl.duration
      : (audioEl._cachedDuration || track?.duration || (track?.id && STATIC_SONG_DURATIONS[track.id]) || 0);
    if (initialDur > 0) {
      setDuration(initialDur);
    }
    
    if (audioEl.src !== objUrl) {
      audioEl.src = objUrl;
    }
    try {
      audioEl.currentTime = 0;
    } catch (e) {}
    
    if (vocalsRef.current && vocalsRef.current.src) try { vocalsRef.current.currentTime = 0; } catch (e) {}
    if (drumsRef.current && drumsRef.current.src) try { drumsRef.current.currentTime = 0; } catch (e) {}
    if (bassRef.current && bassRef.current.src) try { bassRef.current.currentTime = 0; } catch (e) {}
    if (otherRef.current && otherRef.current.src) try { otherRef.current.currentTime = 0; } catch (e) {}
    
    const targetVol = (isMutedRef.current || isMixerActiveRef.current) ? 0 : volumeRef.current;
    audioEl.volume = targetVol;
    audioEl.muted = Boolean(isMutedRef.current || isMixerActiveRef.current);

    updateProgressVisuals();
    audioEl.play().catch(e => {
      if (e?.name !== 'AbortError') console.log("play notice:", e);
    });

    // Live Jam Track Change Broadcast
    if (!skipJamBroadcast) {
      isJamLeaderRef.current = true;
      broadcastJamSync({
        type: 'track_change',
        song: track,
        isPlaying: true,
        startTime: Date.now(),
        currentTime: 0,
        leaderClientId: localClientIdRef.current,
        userQueue: userQueueRef.current || []
      });
    }

    // If objUrl was fallback cdnUrl, check CacheStorage in background to store in memory for future replays
    if (objUrl === cdnUrl && typeof window !== "undefined" && 'caches' in window) {
      caches.open(AUDIO_CACHE_NAME).then(c => c.match(cdnUrl)).then(async match => {
        if (match && !cacheMap?.has(cdnUrl)) {
          const blob = await match.blob();
          if (blob.size > 50000) {
            const safeBlob = blob.type && blob.type.includes('audio') ? blob : new Blob([blob], { type: 'audio/mpeg' });
            const bUrl = URL.createObjectURL(safeBlob);
            cacheMap?.set(cdnUrl, bUrl);
            // Do NOT swap audioEl.src while track is already actively playing.
            // This prevents audio interruptions and glitches. bUrl will be used on next play/loop.
          } else {
            caches.open(AUDIO_CACHE_NAME).then(c => c.delete(cdnUrl)).catch(() => {});
          }
        }
      }).catch(() => {});
    }
  };
  
  const handlePlaySong = (index, listToSet, sourceName) => {
    primeAudioDecks();
    let queueToSet = listToSet;
    let actualIndex = index;
    let resolvedSource = sourceName;

    const clickedTrack = listToSet[index];
    if (clickedTrack) {
      if (selectedMood && (!sourceName || sourceName === "Global Library" || sourceName.includes("Mood"))) {
        const moodSongs = playlist.filter(s => getSongMoods(s, customMoodOverrides).includes(selectedMood));
        if (moodSongs.length > 0) {
          queueToSet = moodSongs;
          resolvedSource = `${selectedMood} Mood`;
          const found = moodSongs.findIndex(s => s.id === clickedTrack.id);
          if (found !== -1) actualIndex = found;
        }
      } else if (sourceName && sourceName.includes("Mood")) {
        const moodName = sourceName.replace(" Mood", "").trim();
        const moodSongs = playlist.filter(s => getSongMoods(s, customMoodOverrides).includes(moodName));
        if (moodSongs.length > 0) {
          queueToSet = moodSongs;
          resolvedSource = `${moodName} Mood`;
          const found = moodSongs.findIndex(s => s.id === clickedTrack.id);
          if (found !== -1) actualIndex = found;
        }
      } else if (selectedArtist || (sourceName && sourceName.includes("Artist"))) {
        const artistName = selectedArtist || sourceName.replace(" Artist", "").trim();
        const artistSongs = playlist.filter(s => matchesArtist(s.artist, artistName));
        if (artistSongs.length > 0) {
          queueToSet = artistSongs;
          resolvedSource = `${artistName} Artist`;
          const found = artistSongs.findIndex(s => s.id === clickedTrack.id);
          if (found !== -1) actualIndex = found;
        }
      } else if (selectedAlbum || (sourceName && sourceName.includes("Album"))) {
        const albumName = selectedAlbum || sourceName.replace(" Album", "").trim();
        const albumSongs = playlist.filter(s => (s.album || "").toLowerCase() === albumName.toLowerCase());
        if (albumSongs.length > 0) {
          queueToSet = albumSongs;
          resolvedSource = `${albumName} Album`;
          const found = albumSongs.findIndex(s => s.id === clickedTrack.id);
          if (found !== -1) actualIndex = found;
        }
      } else if ((resolvedSource === "Global Library" || !resolvedSource) && playlist.length > listToSet.length) {
        queueToSet = playlist;
        const found = playlist.findIndex(s => s.id === clickedTrack.id);
        if (found !== -1) actualIndex = found;
      } else if (activePlaylistObj && playlistSongs.length > listToSet.length) {
        queueToSet = playlistSongs;
        const found = playlistSongs.findIndex(s => s.id === clickedTrack.id);
        if (found !== -1) actualIndex = found;
      }
    }

    const songMap = playlist.length > 0 ? new Map(playlist.map(item => [item.id, item])) : null;
    const queueWithIds = queueToSet.map(s => {
      const full = songMap?.get(s.id);
      const withLyrics = (full?.lyrics && !s.lyrics) ? { ...s, lyrics: full.lyrics } : s;
      return withLyrics._play_id ? withLyrics : { ...withLyrics, _play_id: Math.random().toString() };
    });
    const track = queueWithIds[actualIndex] || clickedTrack;
    setPlaybackHistory(prev => [...prev, playbackIndex]);
    setPlaybackQueue(queueWithIds);
    playbackIndexRef.current = actualIndex;
    setPlaybackIndex(actualIndex);
    setPlaybackSourceName(resolvedSource || "Global Library");
    const outgoingSong = currentTrack;
    setQueueCurrentTrack(null);
    setIsPlaying(true);
    if (crossfadeEnabled && isPlaying && !jamRoomIdRef.current) {
      if (performCrossfadeTransition(track, crossfadeDuration, outgoingSong)) {
        return;
      }
    }
    resetPlaybackTime();
    playTrackWithMetadata(track, audioRef.current, blobCacheRef.current);
  };

  // ── ARTIST & ALBUM AUTO-RECOMMENDATIONS FOR UPLOAD MODAL ──────────────────
  const allKnownArtists = useMemo(() => {
    const artistMap = new Map();
    (dbArtists || []).forEach(a => {
      if (a?.name && a.name.trim()) {
        const clean = a.name.trim();
        artistMap.set(clean.toLowerCase(), clean);
      }
    });
    (playlist || []).forEach(s => {
      if (s?.artist) {
        getTrackArtists(s.artist).forEach(clean => {
          if (clean && !artistMap.has(clean.toLowerCase())) {
            artistMap.set(clean.toLowerCase(), clean);
          }
        });
      }
    });
    return Array.from(artistMap.values()).sort((a, b) => a.localeCompare(b));
  }, [dbArtists, playlist]);

  const allKnownAlbums = useMemo(() => {
    const albumMap = new Map();
    (playlist || []).forEach(s => {
      if (s?.album && s.album.trim()) {
        const clean = s.album.trim();
        if (!albumMap.has(clean.toLowerCase())) {
          albumMap.set(clean.toLowerCase(), clean);
        }
      }
    });
    return Array.from(albumMap.values()).sort((a, b) => a.localeCompare(b));
  }, [playlist]);

  // Extract the active token being typed (after the last comma)
  const currentArtistToken = useMemo(() => {
    if (!uploadArtist) return "";
    const parts = uploadArtist.split(',');
    return parts[parts.length - 1].trim();
  }, [uploadArtist]);

  const artistSuggestions = useMemo(() => {
    if (!currentArtistToken) return [];
    const query = currentArtistToken.toLowerCase();

    // Exclude artists already typed in preceding comma sections
    const parts = uploadArtist.split(',').map(p => p.trim().toLowerCase());
    const alreadySelected = new Set(parts.slice(0, -1).filter(Boolean));

    // Priority 1: Prefix match (starts with typed letters, as requested)
    const startsWithMatches = allKnownArtists.filter(a => {
      const lower = a.toLowerCase();
      return lower.startsWith(query) && !alreadySelected.has(lower) && lower !== query;
    });

    // Priority 2: Substring/word match
    const containsMatches = allKnownArtists.filter(a => {
      const lower = a.toLowerCase();
      return !lower.startsWith(query) && lower.includes(query) && !alreadySelected.has(lower);
    });

    return [...startsWithMatches, ...containsMatches].slice(0, 8);
  }, [currentArtistToken, uploadArtist, allKnownArtists]);

  const isCurrentArtistNew = useMemo(() => {
    if (!currentArtistToken) return false;
    const lower = currentArtistToken.toLowerCase();
    return !allKnownArtists.some(a => a.toLowerCase() === lower);
  }, [currentArtistToken, allKnownArtists]);

  const handleSelectArtist = (artistName) => {
    const parts = uploadArtist.split(',');
    // Replace the current token with the chosen artist
    parts[parts.length - 1] = (parts.length > 1 ? ' ' : '') + artistName;
    const formatted = parts.map((p, idx) => idx === 0 ? p.trim() : ' ' + p.trim()).join(',');
    setUploadArtist(formatted);
    setShowArtistSuggestions(false);
    setActiveArtistIndex(-1);
  };

  const handleAddNewArtist = async (nameToAdd) => {
    const clean = (nameToAdd || currentArtistToken).trim();
    if (!clean) return;
    handleSelectArtist(clean);
    try {
      // Stored in database for suggestion only, without creating art cover for top artist section
      const { data, error } = await supabase.from("artists").insert([{ name: clean, image_url: null }]).select();
      if (!error && data && data[0]) {
        setDbArtists(prev => {
          if (prev.some(a => a.name.toLowerCase() === clean.toLowerCase())) return prev;
          const updated = [...prev, data[0]];
          try { localStorage.setItem("euphony_cached_artists", JSON.stringify(updated)); } catch (e) {}
          return updated;
        });
        triggerToast(`Added "${clean}" for suggestions!`);
      }
    } catch (e) {
      console.warn("Could not insert artist into database:", e);
    }
  };

  const albumSuggestions = useMemo(() => {
    if (!uploadAlbum || !uploadAlbum.trim()) return [];
    const query = uploadAlbum.trim().toLowerCase();

    const startsWithMatches = allKnownAlbums.filter(a => {
      const lower = a.toLowerCase();
      return lower.startsWith(query) && lower !== query;
    });

    const containsMatches = allKnownAlbums.filter(a => {
      const lower = a.toLowerCase();
      return !lower.startsWith(query) && lower.includes(query);
    });

    return [...startsWithMatches, ...containsMatches].slice(0, 6);
  }, [uploadAlbum, allKnownAlbums]);

  const handleSelectAlbum = (albumName) => {
    setUploadAlbum(albumName);
    setShowAlbumSuggestions(false);
    setActiveAlbumIndex(-1);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle || !uploadArtist || !uploadPoster) return alert("Please fill in all required fields, including the poster image.");
    
    // Security: File size limits (50MB audio, 5MB poster)
    if (uploadFile.size > 50 * 1024 * 1024) return alert("Audio file is too large! Maximum allowed size is 50MB.");
    if (uploadPoster.size > 5 * 1024 * 1024) return alert("Poster image is too large! Maximum allowed size is 5MB.");
    
    // Security: Strict audio file extension & MIME-type validation
    const validAudioExtensions = [".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg", ".webm"];
    const audioName = (uploadFile.name || "").toLowerCase();
    const isAudioExtValid = validAudioExtensions.some(ext => audioName.endsWith(ext));
    const isAudioMimeValid = !uploadFile.type || uploadFile.type.startsWith("audio/") || uploadFile.type === "video/mp4";
    if (!isAudioExtValid || !isAudioMimeValid) {
      return alert("Invalid audio file format. Only standard audio files (MP3, WAV, FLAC, M4A, AAC, OGG) are permitted.");
    }

    // Security: Strict image file extension & MIME-type validation (blocks executable files and malicious SVG scripts)
    const validImageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];
    const posterName = (uploadPoster.name || "").toLowerCase();
    const isPosterExtValid = validImageExtensions.some(ext => posterName.endsWith(ext));
    const isPosterMimeValid = !uploadPoster.type || (uploadPoster.type.startsWith("image/") && !uploadPoster.type.includes("svg"));
    if (!isPosterExtValid || !isPosterMimeValid) {
      return alert("Invalid poster image format. Only standard images (JPG, PNG, WebP) are permitted. SVG files are restricted for security.");
    }

    // Security: Sanitize input length to prevent payload stuffing attacks
    if (uploadTitle.trim().length > 150) return alert("Song title is too long (maximum 150 characters).");
    if (uploadArtist.trim().length > 100) return alert("Artist name is too long (maximum 100 characters).");
    if (uploadAlbum && uploadAlbum.trim().length > 100) return alert("Album name is too long (maximum 100 characters).");
    if (uploadLyrics && uploadLyrics.length > 50000) return alert("Lyrics text is too long (maximum 50,000 characters).");

    setIsUploading(true);
    try {
      // 1. Upload audio directly to Cloudinary (Free 25 GB tier)
      const audioFormData = new FormData();
      audioFormData.append("upload_preset", "app_songs");
      audioFormData.append("file", uploadFile);

      const audioRes = await fetch("https://api.cloudinary.com/v1_1/cpsimhz1/auto/upload", {
        method: "POST",
        body: audioFormData
      });
      if (!audioRes.ok) {
        const errData = await audioRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Audio upload to Cloudinary failed.");
      }
      const audioData = await audioRes.json();
      const audioUrl = audioData.secure_url;
      const audioDuration = Math.round(Number(audioData.duration) || 0) || null;
      
      // 2. Upload poster directly to Cloudinary (compulsory)
      const posterFormData = new FormData();
      posterFormData.append("upload_preset", "app_songs");
      posterFormData.append("file", uploadPoster);

      const posterRes = await fetch("https://api.cloudinary.com/v1_1/cpsimhz1/auto/upload", {
        method: "POST",
        body: posterFormData
      });
      if (!posterRes.ok) {
        const errData = await posterRes.json().catch(() => ({}));
        throw new Error(errData.error?.message || "Poster upload to Cloudinary failed.");
      }
      const posterData = await posterRes.json();
      const posterUrl = posterData.secure_url;

      if (!posterUrl) {
        throw new Error("Poster image upload failed. A valid poster image is required.");
      }

      // Parallel backup upload to secondary mirror (skqqgkpt)
      try {
        const mirrorAudioForm = new FormData();
        mirrorAudioForm.append("upload_preset", "app_songs");
        mirrorAudioForm.append("file", uploadFile);
        fetch("https://api.cloudinary.com/v1_1/skqqgkpt/auto/upload", {
          method: "POST",
          body: mirrorAudioForm
        }).catch(() => {});

        const mirrorPosterForm = new FormData();
        mirrorPosterForm.append("upload_preset", "app_songs");
        mirrorPosterForm.append("file", uploadPoster);
        fetch("https://api.cloudinary.com/v1_1/skqqgkpt/auto/upload", {
          method: "POST",
          body: mirrorPosterForm
        }).catch(() => {});
      } catch (mirrorErr) {
        console.warn("Secondary mirror upload notice:", mirrorErr);
      }

      // 3. Save song metadata and direct Cloudinary URL into Supabase database (mood assignment restricted to owner)
      const effectiveMood = isOwner ? uploadMood : "";
      let lyricsToStore = uploadLyrics ? uploadLyrics.trim() : null;
      if (lyricsToStore && !isOwner) {
        // Strip any spoofed [mood: ...] tags entered by non-owners
        lyricsToStore = lyricsToStore.replace(/\[mood:\s*[a-zA-Z\s]+\]\r\n?/gi, "").trim() || null;
      }
      if (effectiveMood) {
        const cleanLyrics = lyricsToStore ? lyricsToStore.replace(/\[mood:\s*[a-zA-Z\s]+\]\r\n?/gi, "").trim() : "";
        lyricsToStore = cleanLyrics 
          ? `[mood: ${effectiveMood}]\r\n${cleanLyrics}` 
          : `[mood: ${effectiveMood}]`;
      }

      const { data: dbData, error: dbError } = await supabase.from("songs").insert([{ 
        title: uploadTitle, 
        artist: uploadArtist, 
        album: uploadAlbum || null, 
        lyrics: lyricsToStore, 
        url: audioUrl, 
        poster_url: posterUrl,
        duration: audioDuration
      }]).select();
      if (dbError) throw dbError;

      // 4. Ensure any newly entered artists are saved into the Supabase artists table for suggestions only (no top artist art cover)
      const enteredArtistNames = getTrackArtists(uploadArtist);
      for (const aName of enteredArtistNames) {
        const lower = aName.toLowerCase();
        const exists = (dbArtists || []).some(k => k.name && k.name.toLowerCase() === lower);
        if (!exists) {
          try {
            const { data: newArt } = await supabase.from("artists").insert([{ 
              name: aName,
              image_url: null
            }]).select();
            if (newArt && newArt[0]) {
              setDbArtists(prev => {
                const next = [...prev, newArt[0]];
                try { localStorage.setItem("euphony_cached_artists", JSON.stringify(next)); } catch (e) {}
                return next;
              });
            }
          } catch (e) {
            console.warn("Could not insert artist into database:", e);
          }
        }
      }

      if (dbData && dbData[0]) {
        const createdSong = { ...dbData[0], mood: effectiveMood || null, duration: audioDuration || dbData[0].duration || null };
        if (audioDuration) {
          setSongDurations(prev => ({ ...prev, [createdSong.id]: audioDuration }));
        }
        if (effectiveMood) {
          setCustomSongMood(createdSong.id, effectiveMood);
          setCustomMoodOverrides(prev => ({ ...prev, [createdSong.id]: effectiveMood }));
          saveLocalStats({ customMoods: { ...customMoodOverrides, [createdSong.id]: effectiveMood } }, session?.user?.id);
          flushCloudSync(session?.user?.id);
        }
        setPlaylist(prev => prev.some(s => s.id === createdSong.id) ? prev : [...prev, createdSong]);
      }
      setShowUploadModal(false);
      setUploadTitle(""); setUploadArtist(""); setUploadAlbum(""); setUploadLyrics(""); setUploadFile(null); setUploadPoster(null); setUploadMood("");
      setShowArtistSuggestions(false); setShowAlbumSuggestions(false);
      alert("Song uploaded successfully to Cloudinary!");
    } catch (error) { 
      alert("Error uploading: " + error.message); 
    } finally { 
      setIsUploading(false); 
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetPasswordInput || resetPasswordInput.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }
    setResetPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: resetPasswordInput });
    setResetPasswordLoading(false);
    
    if (error) {
      alert(error.message);
    } else {
      alert("Password updated successfully!");
      setShowPasswordResetModal(false);
      setResetPasswordInput("");
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    const cleanName = newPlaylistName.trim();
    if (!cleanName) return;
    if (cleanName.length > 80) return alert("Playlist name is too long (maximum 80 characters).");
    if (cleanName.startsWith("__euphony_")) return alert("Invalid playlist name.");
    const { data, error } = await supabase.from("playlists").insert([{ name: cleanName, user_id: session.user.id }]).select();
    if (error) alert("Error creating playlist: " + error.message);
    else if (data) { setUserPlaylists(prev => [...prev, { ...data[0], playlist_songs: [] }]); setNewPlaylistName(""); setShowPlaylistModal(false); }
  };

  const handleAddSongToPlaylist = async (playlistId, songId) => {
    const { error } = await supabase.from("playlist_songs").insert([{ playlist_id: playlistId, song_id: songId }]);
    if (error) { if (error.code === "23505") alert("Song is already in this playlist."); else alert("Error adding song: " + error.message); }
    else {
      triggerToast("Added to playlist successfully!");
      const addedSong = playlist.find(s => s.id === songId);
      if (addedSong) {
        setUserPlaylists(prev => prev.map(pl => {
          if (pl.id === playlistId) return { ...pl, playlist_songs: [...(pl.playlist_songs || []), { songs: { poster_url: addedSong.poster_url } }] };
          return pl;
        }));
      }
    }
  };

  const handleRemoveSongFromPlaylist = async (playlistId, songId, e) => {
    e.stopPropagation();
    const { error } = await supabase.from("playlist_songs").delete().eq("playlist_id", playlistId).eq("song_id", songId);
    if (!error) {
      setPlaylistSongs(prev => prev.filter(s => s.id !== songId));
      supabase.from("playlists").select("*, playlist_songs(song_id, songs(poster_url))").eq("id", playlistId).single().then(({ data }) => {
        if (data) setUserPlaylists(prev => prev.map(pl => pl.id === playlistId ? data : pl));
      });
    }
  };

  const handleToggleLike = async (track, e) => {
    e.stopPropagation();
    const likedPlaylist = userPlaylists.find(p => p.name === "Liked Songs");
    if (!likedPlaylist) return;

    const isLiked = likedPlaylist.playlist_songs?.some(ps => ps.song_id === track.id);

    if (isLiked) {
      const { error } = await supabase.from("playlist_songs").delete().eq("playlist_id", likedPlaylist.id).eq("song_id", track.id);
      if (!error) {
        setUserPlaylists(prev => prev.map(pl => pl.id === likedPlaylist.id ? { ...pl, playlist_songs: pl.playlist_songs.filter(ps => ps.song_id !== track.id) } : pl));
        if (viewedPlaylistId === likedPlaylist.id) setPlaylistSongs(prev => prev.filter(s => s.id !== track.id));
      }
    } else {
      const { error } = await supabase.from("playlist_songs").insert([{ playlist_id: likedPlaylist.id, song_id: track.id }]);
      if (!error) {
        setUserPlaylists(prev => prev.map(pl => pl.id === likedPlaylist.id ? { ...pl, playlist_songs: [...(pl.playlist_songs || []), { song_id: track.id, songs: { poster_url: track.poster_url } }] } : pl));
        if (viewedPlaylistId === likedPlaylist.id) setPlaylistSongs(prev => [...prev, { ...track, added_at: new Date().toISOString() }]);
      }
    }
  };

  const handlePlayPause = (e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (!audioRef.current) return;
    if (playbackQueue.length === 0 && playlist.length > 0) {
       handlePlaySong(0, playlist, "Global Library");
       return;
    }
    if (!currentTrack) return;
    
    const nextPlaying = !isPlaying;
    if (nextPlaying) {
      resumeActiveAudioDecks();
    } else {
      pauseAllAudioDecks();
    }

    // Live Jam Play/Pause Broadcast
    isJamLeaderRef.current = true;
    const currentAudio = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current;
    broadcastJamSync({
      type: 'play_pause',
      song: currentTrack,
      isPlaying: nextPlaying,
      currentTime: currentAudio?.currentTime || 0,
      leaderClientId: localClientIdRef.current
    });
  };
  handlePlayPauseRef.current = handlePlayPause;

  const cyclePlayMode = () => {
    const idx = PLAY_MODES.indexOf(playMode);
    const newMode = PLAY_MODES[(idx + 1) % PLAY_MODES.length];
    setPlayMode(newMode);
    broadcastJamSync({
      type: 'play_mode_update',
      playMode: newMode
    });
  };

  const performCrossfadeTransition = useCallback((incomingTrack, transitionSecs = crossfadeDuration, explicitOutgoingTrack = null, isRemoteJam = false, initialSeekOffset = 0) => {
    const currentAudio = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current;
    const nextAudio = activeDeckRef.current === 'A' ? deckBRef.current : deckARef.current;
    const nextDeckId = activeDeckRef.current === 'A' ? 'B' : 'A';

    if (!currentAudio || !nextAudio || !incomingTrack) return false;

    // Must have an active playing track to crossfade out from
    if (currentAudio.paused || !currentAudio.src || currentAudio.currentTime < 0.5) {
      return false;
    }

    const outgoing = explicitOutgoingTrack || currentTrack;
    nextAudio._trackId = incomingTrack.id;
    if (outgoing?.id) {
      currentAudio._trackId = outgoing.id;
    }

    // Preload incoming track image for instant render so crossfade never flashes white/empty
    if (incomingTrack?.poster_url) {
      try {
        const preImg = new Image();
        preImg.src = incomingTrack.poster_url;
      } catch (e) {}
    }

    // Stop any existing crossfade in progress cleanly FIRST
    stopCrossfade(false);

    // Capture outgoing track & color for seamless visual cover art and shade cross-dissolve
    if (outgoing) {
      setOutgoingTrackForArt(outgoing);
      setOutgoingDominantRgb(dominantRgb);
      setArtTransitionDuration(transitionSecs);
      if (artTransitionTimerRef.current) clearTimeout(artTransitionTimerRef.current);
      const animSecs = Math.max(transitionSecs, 1);
      artTransitionTimerRef.current = setTimeout(() => {
        setOutgoingTrackForArt(null);
        setOutgoingDominantRgb(null);
        setArtTransitionDuration(0);
      }, animSecs * 1000 + 100);
    }

    // Immediately synchronize dominant color for incoming track if cached so backdrop shade never lags
    try {
      const cachedColor = localStorage.getItem(`euphony_color_${incomingTrack.id || incomingTrack.title}`);
      if (cachedColor) {
        const parsed = JSON.parse(cachedColor);
        if (parsed?.r !== undefined && parsed?.g !== undefined && parsed?.b !== undefined) {
          setDominantRgb(parsed);
          setDominantColor(`rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`);
        }
      }
    } catch (e) {}

    // 1. Prepare incoming track on nextAudio (preserving pre-warmed buffer if already loaded)
    const cdnUrl = getCdnUrl(incomingTrack.url);
    const objUrl = blobCacheRef.current?.get(cdnUrl) || cdnUrl;

    if (nextAudio.src !== objUrl && !nextAudio.src.includes(cdnUrl)) {
      nextAudio.preload = "auto";
      nextAudio.src = objUrl;
    }
    const initialTime = Math.max(0, initialSeekOffset || 0);
    try { nextAudio.currentTime = initialTime; } catch (e) {}
    if (initialTime > 0) {
      const applyInitialTime = () => {
        try { nextAudio.currentTime = initialTime; } catch (e) {}
        nextAudio.removeEventListener('loadedmetadata', applyInitialTime);
        nextAudio.removeEventListener('canplay', applyInitialTime);
      };
      if (nextAudio.readyState >= 1) {
        applyInitialTime();
      } else {
        nextAudio.addEventListener('loadedmetadata', applyInitialTime, { once: true });
        nextAudio.addEventListener('canplay', applyInitialTime, { once: true });
      }
    }
    // Inaudible initial volume (0.001) ensures mobile audio focus engine keeps audio stream active in background
    nextAudio.volume = 0.001;

    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: incomingTrack.title || 'Unknown Title',
        artist: incomingTrack.artist || 'Unknown Artist',
        album: incomingTrack.album || '-',
        artwork: [{ src: incomingTrack.poster_url || 'https://via.placeholder.com/512.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.playbackState = 'playing';
    }

    // 2. Switch active deck to the incoming deck for UI, scrubber & lyric tracking
    activeDeckRef.current = nextDeckId;
    setCurrentTime(initialTime);
    localStorage.setItem("euphony_current_time", initialTime);
    lastSavedTimeRef.current = initialTime;
    crossfadeTriggeredRef.current = false;
    prewarmedTrackIdRef.current = null;

    // Immediately synchronize duration state with the incoming deck
    const incomingDur = (isFinite(nextAudio.duration) && nextAudio.duration > 0)
      ? nextAudio.duration
      : (nextAudio._cachedDuration || incomingTrack?.duration || (incomingTrack?.id && STATIC_SONG_DURATIONS[incomingTrack.id]) || 0);
    if (incomingDur > 0) {
      setDuration(incomingDur);
    }
    updateProgressVisuals();

    if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
      recordListeningDuration(currentTrack.id, pendingListenDurationRef.current);
      pendingListenDurationRef.current = 0;
    }
    sessionListenDurationRef.current = 0;
    lastListenTickRef.current = Date.now();
    qualifiedPlayLoggedRef.current = null;

    // 3. Setup references & wall-clock timeline
    crossfadeOutgoingAudioRef.current = currentAudio;
    crossfadeIncomingAudioRef.current = nextAudio;
    isCrossfadingRef.current = true;

    const durationMs = Math.max(1000, transitionSecs * 1000);
    let startTime = null;

    const tick = () => {
      if (!isCrossfadingRef.current) return;
      if (!startTime) return;
      const now = Date.now();
      const elapsed = now - startTime;
      const p = Math.min(1, elapsed / durationMs);

      const currentBaseVol = (isMutedRef.current || isMixerActiveRef.current) ? 0 : volumeRef.current;
      
      // Equal-Power Perceptual Curve (Constant 0 dB Power)
      // Math.sqrt(p) and Math.sqrt(1 - p) guarantees that total acoustic energy
      // (inVol^2 + outVol^2) remains constant at 100%.
      // The incoming song's beats and components punch through right from the first seconds,
      // and both songs simultaneously drive the mix with 71% presence each at the midpoint!
      const inFactor = Math.sqrt(p);
      const outFactor = Math.sqrt(1 - p);
      const outVol = currentBaseVol * outFactor;
      const inVol = currentBaseVol * inFactor;

      if (currentAudio) {
        currentAudio.volume = Math.max(0, Math.min(1, outVol));
      }
      if (nextAudio && !isMixerActiveRef.current && !isMutedRef.current) {
        nextAudio.volume = Math.max(0, Math.min(1, inVol));
      }

      // Smoothly blend stem components if stem mixer is active
      if (isMixerActiveRef.current && !isMutedRef.current) {
        const stemBase = volumeRef.current;
        if (vocalsRef.current) vocalsRef.current.volume = Math.max(0, Math.min(1, stemVolumes.vocals * stemBase * outFactor));
        if (drumsRef.current)  drumsRef.current.volume  = Math.max(0, Math.min(1, stemVolumes.drums * stemBase * outFactor));
        if (bassRef.current)   bassRef.current.volume   = Math.max(0, Math.min(1, stemVolumes.bass * stemBase * outFactor));
        if (otherRef.current)  otherRef.current.volume  = Math.max(0, Math.min(1, stemVolumes.other * stemBase * outFactor));
      }

      if (p >= 1) {
        stopCrossfade(true);
      }
    };

    crossfadeProgressUpdaterRef.current = tick;

    const transitionId = ++crossfadeTransitionIdRef.current;

    let fallbackTriggered = false;
    const triggerFallbackToCurrentAudio = () => {
      if (fallbackTriggered || crossfadeTransitionIdRef.current !== transitionId || !isCrossfadingRef.current) return;
      fallbackTriggered = true;
      console.warn("Dual-deck playback unavailable; falling back to active audio element");
      stopCrossfade(false);
      activeDeckRef.current = activeDeckRef.current === 'A' ? 'B' : 'A';
      playTrackWithMetadata(incomingTrack, currentAudio, blobCacheRef.current);
    };

    let blendStarted = false;
    const startSimultaneousBlend = () => {
      if (blendStarted || !isCrossfadingRef.current || fallbackTriggered || crossfadeTransitionIdRef.current !== transitionId) return;
      blendStarted = true;
      startTime = Date.now() - (initialTime * 1000);

      // Trigger first tick
      tick();

      // Layer 1: Background Web Worker (runs in separate OS thread, immune to background throttling & screen lock)
      if (crossfadeWorkerRef.current) {
        crossfadeWorkerRef.current.onmessage = () => {
          tick();
        };
        try {
          crossfadeWorkerRef.current.postMessage('start');
        } catch (e) {}
      }

      // Layer 2: Main thread timer interval (25ms)
      crossfadeIntervalRef.current = setInterval(tick, 25);

      // Layer 3: Foreground requestAnimationFrame loop (60fps)
      const rafLoop = () => {
        if (!isCrossfadingRef.current || crossfadeTransitionIdRef.current !== transitionId) return;
        tick();
        if (isCrossfadingRef.current && crossfadeTransitionIdRef.current === transitionId) {
          crossfadeAnimFrameRef.current = requestAnimationFrame(rafLoop);
        }
      };
      crossfadeAnimFrameRef.current = requestAnimationFrame(rafLoop);
    };

    // Keep outgoing audio at full volume until incoming audio is confirmed playing
    currentAudio.volume = (isMutedRef.current || isMixerActiveRef.current) ? 0 : volumeRef.current;

    const onPlaying = () => {
      if (crossfadeTransitionIdRef.current !== transitionId || !isCrossfadingRef.current) return;
      startSimultaneousBlend();
    };
    nextAudio.addEventListener('playing', onPlaying, { once: true });

    const playPromise = nextAudio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        if (crossfadeTransitionIdRef.current !== transitionId || !isCrossfadingRef.current) return;
        startSimultaneousBlend();
      }).catch((err) => {
        if (crossfadeTransitionIdRef.current !== transitionId || !isCrossfadingRef.current) return;
        if (err.name === 'AbortError') return; // Cancelled by newer track load - DO NOT FALLBACK
        console.warn("Crossfade play retry notice:", err.message);
        nextAudio.play().then(() => {
          if (crossfadeTransitionIdRef.current !== transitionId || !isCrossfadingRef.current) return;
          startSimultaneousBlend();
        }).catch(() => {
          if (crossfadeTransitionIdRef.current !== transitionId || !isCrossfadingRef.current) return;
          triggerFallbackToCurrentAudio();
        });
      });
    }

    // Safety fallback: if hardware doesn't start playing within 3500ms, fallback so playback never permanently stalls
    if (crossfadeFallbackTimerRef.current) clearTimeout(crossfadeFallbackTimerRef.current);
    crossfadeFallbackTimerRef.current = setTimeout(() => {
      crossfadeFallbackTimerRef.current = null;
      if (crossfadeTransitionIdRef.current !== transitionId || !isCrossfadingRef.current) return;
      if (!blendStarted) {
        if (nextAudio.paused) {
          triggerFallbackToCurrentAudio();
        } else {
          startSimultaneousBlend();
        }
      }
    }, 3500);

    if (!isRemoteJam) {
      // Live Jam Track Change Broadcast on Crossfade
      isJamLeaderRef.current = true;
      broadcastJamSync({
        type: 'track_change',
        song: incomingTrack,
        isCrossfade: true,
        crossfadeDuration: transitionSecs,
        isPlaying: true,
        startTime: Date.now(),
        currentTime: 0,
        leaderClientId: localClientIdRef.current,
        userQueue: userQueueRef.current || []
      });
    }

    return true;
  }, [stopCrossfade, crossfadeDuration, currentTrack, playTrackWithMetadata, broadcastJamSync]);

  const performCrossfadeTransitionRef = useRef(performCrossfadeTransition);
  performCrossfadeTransitionRef.current = performCrossfadeTransition;

  const handleNext = (e, isAutoCrossfade = false) => {
    if (e) e.stopPropagation();
    stopCrossfade(false);
    
    const currentQ = userQueueRef.current || userQueue;
    if (currentQ.length > 0) {
      const rawNextSong = currentQ[0];
      const full = playlist.find(s => s.id === rawNextSong?.id);
      const nextSong = (full?.lyrics && !rawNextSong?.lyrics) ? { ...rawNextSong, lyrics: full.lyrics } : rawNextSong;
      const outgoingSong = currentTrack;
      const nextQueue = currentQ.slice(1);
      userQueueRef.current = nextQueue;
      setUserQueue(nextQueue);
      try { localStorage.setItem("euphony_user_queue", JSON.stringify(nextQueue)); } catch (err) {}
      setQueueCurrentTrack(nextSong);
      setIsPlaying(true);
      if (crossfadeEnabled && (isAutoCrossfade || (!jamRoomIdRef.current && isPlaying))) {
        const fadeSecs = crossfadeDuration;
        if (performCrossfadeTransition(nextSong, fadeSecs, outgoingSong)) return;
      }
      resetPlaybackTime();
      playTrackWithMetadata(nextSong, audioRef.current, blobCacheRef.current);
      return;
    }
    
    let activeQueue = (playbackQueue && playbackQueue.length > 0) ? playbackQueue : playlist;
    if (activeQueue.length <= 1 && playlist.length > 1 && (!playbackSourceName || playbackSourceName === "Global Library")) {
      const queueWithIds = playlist.map(s => s._play_id ? s : { ...s, _play_id: Math.random().toString() });
      setPlaybackQueue(queueWithIds);
      activeQueue = queueWithIds;
    }

    if (!activeQueue || activeQueue.length === 0) return;

    const curIdx = (typeof playbackIndexRef.current === 'number' && playbackIndexRef.current >= 0)
      ? playbackIndexRef.current
      : playbackIndex;

    setPlaybackHistory(prev => [...prev, curIdx]);

    let nextIdx = -1;

    if (curIdx < 0) {
      if (playMode === 'shuffle' && upcomingSourceList.length > 0) {
        nextIdx = upcomingSourceList[0].originalIndex;
      } else {
        nextIdx = 0;
      }
    } else if (playMode === 'shuffle') {
      const validUpcoming = upcomingSourceList.find(item => item.originalIndex !== curIdx);
      if (validUpcoming) {
        nextIdx = validUpcoming.originalIndex;
      } else if (activeQueue.length > 1) {
        do {
          nextIdx = Math.floor(Math.random() * activeQueue.length);
        } while (nextIdx === curIdx);
      } else {
        nextIdx = 0;
      }
    } else {
      const validUpcoming = upcomingSourceList.find(item => item.originalIndex !== curIdx);
      if (validUpcoming && validUpcoming.originalIndex !== ((curIdx + 1) % activeQueue.length)) {
        nextIdx = validUpcoming.originalIndex;
      } else if (activeQueue.length > 1) {
        nextIdx = (curIdx + 1) % activeQueue.length;
      } else {
        nextIdx = 0;
      }
    }

    if (nextIdx === -1 || nextIdx >= activeQueue.length) {
      nextIdx = 0;
    }

    const nextTrack = activeQueue[nextIdx];
    if (!nextTrack) return;
    if (nextTrack?.poster_url) {
      try {
        const preImg = new Image();
        preImg.src = nextTrack.poster_url;
      } catch (e) {}
    }

    const outgoingSong = currentTrack;
    setQueueCurrentTrack(null);
    playbackIndexRef.current = nextIdx;
    setPlaybackIndex(nextIdx);
    setIsPlaying(true);
    if (crossfadeEnabled && (isAutoCrossfade || (!jamRoomIdRef.current && isPlaying))) {
      const fadeSecs = crossfadeDuration;
      if (performCrossfadeTransition(nextTrack, fadeSecs, outgoingSong)) return;
    }
    resetPlaybackTime();
    playTrackWithMetadata(nextTrack, audioRef.current, blobCacheRef.current);
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    if (isCrossfadingRef.current) {
      stopCrossfade(false);
    }
    
    let activeQueue = (playbackQueue && playbackQueue.length > 0) ? playbackQueue : playlist;
    if (activeQueue.length <= 1 && playlist.length > 1) {
      const queueWithIds = playlist.map(s => s._play_id ? s : { ...s, _play_id: Math.random().toString() });
      setPlaybackQueue(queueWithIds);
      activeQueue = queueWithIds;
    }

    if (!activeQueue || activeQueue.length === 0) return;
    
    const now = Date.now();
    const timeSinceLastPrev = now - lastPrevClickTimeRef.current;
    lastPrevClickTimeRef.current = now;

    if (audioRef.current && audioRef.current.currentTime > 3 && timeSinceLastPrev > 2500) { 
      audioRef.current.currentTime = 0; 
      resetPlaybackTime();
      broadcastJamSync({
        type: 'seek',
        currentTime: 0,
        song: currentTrack,
        isPlaying: isPlayingRef.current
      });
      return; 
    }
    
    const curIdx = (typeof playbackIndexRef.current === 'number' && playbackIndexRef.current >= 0)
      ? playbackIndexRef.current
      : playbackIndex;
    let prevIdx = curIdx - 1;
    if (playMode === 'shuffle' && playbackHistory.length > 0) {
      prevIdx = playbackHistory[playbackHistory.length - 1];
      setPlaybackHistory(prev => prev.slice(0, -1));
    } else {
      if (prevIdx < 0) prevIdx = activeQueue.length - 1; 
    }
    
    if (prevIdx < 0 || prevIdx >= activeQueue.length) {
      prevIdx = 0;
    }

    setQueueCurrentTrack(null);
    playbackIndexRef.current = prevIdx;
    setPlaybackIndex(prevIdx);
    resetPlaybackTime();
    setIsPlaying(true);
    
    const prevSong = activeQueue[prevIdx];
    if (prevSong) {
      playTrackWithMetadata(prevSong, audioRef.current, blobCacheRef.current);
    }
  };

  const handleTrackEnded = () => {
    if (jamRoomIdRef.current && !isJamLeaderRef.current) {
      // In Live Jam, only the leader initiates track advance; followers wait for leader broadcast
      return;
    }
    if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
      recordListeningDuration(currentTrack.id, pendingListenDurationRef.current);
      pendingListenDurationRef.current = 0;
    }
    // 1-minute qualification fallback: If song completes playback (e.g. short track < 60s) or reached 60s
    const dur = audioRef.current?.duration;
    const qualifiesOnEnd = sessionListenDurationRef.current >= 60 || (isFinite(dur) && dur > 0 && dur < 60);
    if (qualifiesOnEnd && currentTrack?.id && qualifiedPlayLoggedRef.current !== currentTrack.id) {
      qualifiedPlayLoggedRef.current = currentTrack.id;
      recordQualifiedPlay(currentTrack);
      setRecentlyPlayedIds(getRecentlyPlayedIds());
      setPlayCounts(getPlayCounts());
    }

    if (playMode === "repeat-one") {
      qualifiedPlayLoggedRef.current = null; // Next repeat iteration can qualify again
      sessionListenDurationRef.current = 0;
      lastListenTickRef.current = Date.now();
      resetPlaybackTime();
      audioRef.current?.play().catch(() => {});
      if (currentTrack?.stem_vocals && !stemsBroken) {
        vocalsRef.current?.play().catch(() => {});
        drumsRef.current?.play().catch(() => {});
        bassRef.current?.play().catch(() => {});
        otherRef.current?.play().catch(() => {});
      }
      return;
    }
    
    const currentQ = userQueueRef.current || userQueue;
    if (currentQ.length > 0) {
      const rawNextSong = currentQ[0];
      const full = playlist.find(s => s.id === rawNextSong?.id);
      const nextSong = (full?.lyrics && !rawNextSong?.lyrics) ? { ...rawNextSong, lyrics: full.lyrics } : rawNextSong;
      const nextQueue = currentQ.slice(1);
      userQueueRef.current = nextQueue;
      setUserQueue(nextQueue);
      try { localStorage.setItem("euphony_user_queue", JSON.stringify(nextQueue)); } catch (err) {}
      setQueueCurrentTrack(nextSong);
      resetPlaybackTime();
      setIsPlaying(true);
      playTrackWithMetadata(nextSong, audioRef.current, blobCacheRef.current);
      return;
    }
    
    let activeQueue = (playbackQueue && playbackQueue.length > 0) ? playbackQueue : playlist;
    if (activeQueue.length <= 1 && playlist.length > 1 && (!playbackSourceName || playbackSourceName === "Global Library")) {
      const queueWithIds = playlist.map(s => s._play_id ? s : { ...s, _play_id: Math.random().toString() });
      setPlaybackQueue(queueWithIds);
      activeQueue = queueWithIds;
    }

    if (!activeQueue || activeQueue.length === 0) {
      setIsPlaying(false);
      return;
    }

    setPlaybackHistory(prev => [...prev, playbackIndex]);

    let nextIdx = -1;
    if (playbackIndex < 0) {
      if (playMode === 'shuffle' && upcomingSourceList.length > 0) {
        nextIdx = upcomingSourceList[0].originalIndex;
      } else {
        nextIdx = 0;
      }
    } else if (playMode === 'shuffle') {
      const validUpcoming = upcomingSourceList.find(item => item.originalIndex !== playbackIndex);
      if (validUpcoming) {
        nextIdx = validUpcoming.originalIndex;
      } else if (activeQueue.length > 1) {
        do {
          nextIdx = Math.floor(Math.random() * activeQueue.length);
        } while (nextIdx === playbackIndex);
      } else {
        nextIdx = 0;
      }
    } else {
      const validUpcoming = upcomingSourceList.find(item => item.originalIndex !== playbackIndex);
      if (validUpcoming && validUpcoming.originalIndex !== ((playbackIndex + 1) % activeQueue.length)) {
        nextIdx = validUpcoming.originalIndex;
      } else if (activeQueue.length > 1) {
        nextIdx = (playbackIndex + 1) % activeQueue.length;
      } else {
        nextIdx = 0;
      }
    }

    if (nextIdx === -1 || nextIdx >= activeQueue.length) {
      nextIdx = 0;
    }

    const nextTrack = activeQueue[nextIdx];
    if (nextTrack) {
      if (nextTrack?.poster_url) {
        try {
          const preImg = new Image();
          preImg.src = nextTrack.poster_url;
        } catch (e) {}
      }
      setQueueCurrentTrack(null);
      setPlaybackIndex(nextIdx);
      resetPlaybackTime();
      setIsPlaying(true);
      playTrackWithMetadata(nextTrack, audioRef.current, blobCacheRef.current);
    }
  };

  useEffect(() => {
    if (silentAudioRef.current) {
      try { silentAudioRef.current.volume = 0.001; } catch (e) {}
      if (isPlaying || jamRoomId) {
        silentAudioRef.current.play().catch(() => {});
      } else {
        silentAudioRef.current.pause();
      }
    }
  }, [isPlaying, jamRoomId]);

  const toggleMute = () => {
    if (isMuted) { setIsMuted(false); setVolume(previousVolume || 0.5); }
    else { setPreviousVolume(volume); setIsMuted(true); setVolume(0); }
  };

  const toggleStemMixer = (e) => {
    if (e) e.stopPropagation();
    const willShow = !showMixer;
    setShowMixer(willShow);
    if (willShow) {
      setShowLyrics(false);
      setShowQueue(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Ignore if user is typing in any real text input field or textarea (exclude range/checkbox/radio)
      const target = e.target;
      const isTextInput = target && (
        (target.tagName === "INPUT" && target.type !== "range" && target.type !== "checkbox" && target.type !== "radio" && target.type !== "button") ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable ||
        target.getAttribute?.("role") === "textbox" ||
        target.getAttribute?.("role") === "searchbox"
      );
      if (isTextInput) return;

      // 2. Ignore Ctrl / Meta / Alt combos to preserve native browser shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // 3. Next / Prev Track: Shift + Arrow keys only
      if (e.shiftKey && e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
        return;
      }
      if (e.shiftKey && e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
        return;
      }

      // 3. Handle Escape key for closing modals & fullscreen
      if (e.key === "Escape") {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (showCrossfadeModal) {
          setShowCrossfadeModal(false);
          return;
        }
        if (window.history.state?.page === 'modal') {
          window.history.back();
        } else {
          if (showFullscreenQueueModal) {
            setShowFullscreenQueueModal(false);
            if (openedFromTrackOptionsRef.current) {
              openedFromTrackOptionsRef.current = false;
              setShowTrackOptionsModal(true);
            }
          } else if (showTrackArtistsModal) {
            setShowTrackArtistsModal(false);
            if (openedFromTrackOptionsRef.current) {
              openedFromTrackOptionsRef.current = false;
              setShowTrackOptionsModal(true);
            }
          } else if (showSleepTimerModal) {
            setShowSleepTimerModal(false);
            if (openedFromTrackOptionsRef.current) {
              openedFromTrackOptionsRef.current = false;
              setShowTrackOptionsModal(true);
            }
          } else if (songForPlaylistModal) {
            setSongForPlaylistModal(null);
            if (openedFromTrackOptionsRef.current) {
              openedFromTrackOptionsRef.current = false;
              setShowTrackOptionsModal(true);
            }
          } else if (showTrackOptionsModal) {
            setShowTrackOptionsModal(false);
          } else if (showUploadModal) {
            setShowUploadModal(false);
          } else if (showPlaylistModal) {
            setShowPlaylistModal(false);
          } else if (isDesktopFullscreen) {
            setIsDesktopFullscreen(false);
          }
        }
        return;
      }

      // If text/form modals are open, do not trigger playback hotkeys
      if (showUploadModal || showPlaylistModal || showPasswordResetModal) return;

      // 4. Space: Play / Pause (blur active button to prevent double-toggle on Space)
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        if (document.activeElement && typeof document.activeElement.blur === "function") {
          document.activeElement.blur();
        }
        handlePlayPause();
        return;
      }

      // 5. Left / Right Arrow: Seek 5s backward / forward
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (audioRef.current && currentTrack) {
          if (isCrossfadingRef.current) {
            stopCrossfade(false);
          }
          const cur = audioRef.current.currentTime || 0;
          const dur = duration || audioRef.current.duration || 0;
          const target = dur > 0 ? Math.min(dur, cur + 5) : cur + 5;
          audioRef.current.currentTime = target;
          if (currentTrack.stem_vocals && !stemsBroken) {
            if (vocalsRef.current) vocalsRef.current.currentTime = target;
            if (drumsRef.current) drumsRef.current.currentTime = target;
            if (bassRef.current) bassRef.current.currentTime = target;
            if (otherRef.current) otherRef.current.currentTime = target;
          }
          setCurrentTime(target);
          updateProgressVisuals();
          triggerToast("+5s");
          broadcastJamSync({
            type: 'seek',
            currentTime: target,
            song: currentTrack,
            isPlaying: isPlayingRef.current
          });
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (audioRef.current && currentTrack) {
          if (isCrossfadingRef.current) {
            stopCrossfade(false);
          }
          const cur = audioRef.current.currentTime || 0;
          const target = Math.max(0, cur - 5);
          audioRef.current.currentTime = target;
          if (currentTrack.stem_vocals && !stemsBroken) {
            if (vocalsRef.current) vocalsRef.current.currentTime = target;
            if (drumsRef.current) drumsRef.current.currentTime = target;
            if (bassRef.current) bassRef.current.currentTime = target;
            if (otherRef.current) otherRef.current.currentTime = target;
          }
          setCurrentTime(target);
          updateProgressVisuals();
          triggerToast("-5s");
          broadcastJamSync({
            type: 'seek',
            currentTime: target,
            song: currentTrack,
            isPlaying: isPlayingRef.current
          });
        }
        return;
      }

      // 6. Up / Down Arrow: Volume control
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isMutedRef.current) {
          isMutedRef.current = false;
          setIsMuted(false);
        }
        setVolume(prev => {
          const next = Math.min(1, Math.round((prev + 0.05) * 100) / 100);
          volumeRef.current = next;
          if (audioRef.current && !isMixerActiveRef.current) {
            audioRef.current.volume = next;
            audioRef.current.muted = false;
          }
          triggerToast(`Volume: ${Math.round(next * 100)}%`);
          return next;
        });
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume(prev => {
          const next = Math.max(0, Math.round((prev - 0.05) * 100) / 100);
          volumeRef.current = next;
          if (next === 0) {
            isMutedRef.current = true;
            setIsMuted(true);
            if (audioRef.current) audioRef.current.muted = true;
          } else if (audioRef.current && !isMixerActiveRef.current) {
            audioRef.current.volume = next;
          }
          triggerToast(`Volume: ${Math.round(next * 100)}%`);
          return next;
        });
        return;
      }

      // 7. M / m: Mute / Unmute
      if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        toggleMute();
        triggerToast(!isMuted ? "Muted" : `Volume: ${Math.round((previousVolume || 0.5) * 100)}%`);
        return;
      }

      // 8. L / l: Toggle Lyrics
      if (e.key.toLowerCase() === "l") {
        e.preventDefault();
        if (isDesktopFullscreen) {
          setFullscreenView(prev => (prev === "lyrics" ? "art" : "lyrics"));
        } else {
          setShowLyrics(prev => {
            const next = !prev;
            if (next) {
              setShowQueue(false);
              setShowMixer(false);
            }
            return next;
          });
        }
        return;
      }

      // 9. S / s: Toggle Stem Mixer
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isDesktopFullscreen) {
          setFullscreenView(prev => (prev === "mixer" ? "art" : "mixer"));
        } else {
          toggleStemMixer();
        }
        return;
      }

      // 10. Q / q: Toggle Queue
      if (e.key.toLowerCase() === "q") {
        e.preventDefault();
        if (isDesktopFullscreen) {
          setShowFullscreenQueueModal(prev => !prev);
        } else {
          setShowQueue(prev => {
            const next = !prev;
            if (next) {
              setShowLyrics(false);
              setShowMixer(false);
            }
            return next;
          });
        }
        return;
      }

      // 11. C / c: Toggle Crossfade Settings
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setShowCrossfadeModal(prev => !prev);
        return;
      }

      // 12. F / f: Toggle Fullscreen Player
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (currentTrack) {
          setIsDesktopFullscreen(prev => !prev);
        }
        return;
      }

      // 13. ? (Shift + /): Toggle Shortcuts Cheat Sheet
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcutsModal(prev => !prev);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentTrack,
    duration,
    isPlaying,
    volume,
    isMuted,
    previousVolume,
    isDesktopFullscreen,
    fullscreenView,
    showLyrics,
    showMixer,
    showQueue,
    showShortcutsModal,
    showCrossfadeModal,
    showFullscreenQueueModal,
    showTrackArtistsModal,
    showTrackOptionsModal,
    showSleepTimerModal,
    songForPlaylistModal,
    showUploadModal,
    showPlaylistModal,
    showPasswordResetModal,
    stemsBroken,
    handlePlayPause,
    handleNext,
    handlePrev,
    toggleMute,
    toggleStemMixer,
    triggerToast,
    stopCrossfade,
    updateProgressVisuals
  ]);

  const handleShareSong = useCallback((song, e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (!song) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?song=${song.id}`;
    if (navigator.share) {
      navigator.share({
        title: song.title || 'Euphony Song',
        text: `Listen to "${song.title || 'Unknown'}" by ${song.artist || 'Unknown'} on Euphony!`,
        url: shareUrl
      }).catch(err => {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(shareUrl).then(() => {
            triggerToast("Song link copied to clipboard!");
          }).catch(() => {
            triggerToast("Link: " + shareUrl);
          });
        }
      });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        triggerToast("Song link copied to clipboard!");
      }).catch(() => {
        triggerToast("Link: " + shareUrl);
      });
    }
  }, [triggerToast]);

  const startJamSession = useCallback(() => {
    primeAudioDecks();
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setIsJamHost(true);
    isJamHostRef.current = true;
    isJamLeaderRef.current = true;
    setJamRoomId(code);
    jamRoomIdRef.current = code;
    try {
      sessionStorage.setItem('euphony_active_jam_id', code);
      sessionStorage.setItem('euphony_is_jam_host', 'true');
    } catch (e) {}
    setShowJamModal(true);
    triggerToast(`Live Jam created! Room Code: ${code}`);
  }, [triggerToast, primeAudioDecks]);

  const joinJamSession = useCallback((codeToJoin) => {
    primeAudioDecks();
    const raw = codeToJoin !== undefined ? codeToJoin : jamJoinCodeInput;
    const clean = (raw || "").trim().toUpperCase();
    if (!clean || clean.length < 3) {
      triggerToast("Please enter a valid Jam Room Code");
      setJamJoinError("Please enter a valid Jam Room Code");
      return;
    }

    setIsCheckingJamCode(true);
    setJamJoinError("");

    const channelName = `jam_${clean.toLowerCase()}`;
    const probeKey = `probe_${localClientIdRef.current}_${Date.now()}`;
    let resolved = false;
    let probeChannel = null;

    const finalize = (exists) => {
      if (resolved) return;
      resolved = true;
      if (probeTimeout) clearTimeout(probeTimeout);
      if (probeChannel) {
        try { probeChannel.untrack(); } catch (_) {}
        try { supabase.removeChannel(probeChannel); } catch (_) {}
      }

      setIsCheckingJamCode(false);

      if (!exists) {
        setJamJoinError("Jam doesn't exist! Please check the code.");
        triggerToast("Jam doesn't exist! Please check the code.");
        return;
      }

      setIsJamHost(false);
      isJamHostRef.current = false;
      isJamLeaderRef.current = false;
      setJamRoomId(clean);
      jamRoomIdRef.current = clean;
      setJamJoinCodeInput("");
      setJamJoinError("");
      try {
        sessionStorage.setItem('euphony_active_jam_id', clean);
        sessionStorage.setItem('euphony_is_jam_host', 'false');
      } catch (e) {}
      setShowJamModal(false);
      triggerToast(`Joined Jam Room: ${clean}`);
    };

    probeChannel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: probeKey }
      }
    });

    probeChannel
      .on('presence', { event: 'sync' }, () => {
        const state = probeChannel.presenceState();
        const otherMembers = Object.keys(state).filter(k => k !== probeKey);
        if (otherMembers.length > 0) {
          finalize(true);
        }
      })
      .on('broadcast', { event: 'jam_sync' }, () => {
        finalize(true);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          probeChannel.track({ isProbe: true });
          probeChannel.send({
            type: 'broadcast',
            event: 'jam_request_state',
            payload: { isProbe: true }
          });
          const immediateState = probeChannel.presenceState();
          const immediateOthers = Object.keys(immediateState).filter(k => k !== probeKey);
          if (immediateOthers.length > 0) {
            finalize(true);
          }
        }
      });

    const probeTimeout = setTimeout(() => {
      finalize(false);
    }, 1600);
  }, [jamJoinCodeInput, triggerToast, primeAudioDecks]);

  const leaveJamSession = useCallback(() => {
    silentAudioRef.current?.pause();
    if (jamChannelRef.current) {
      try { jamChannelRef.current.untrack(); } catch (e) {}
      supabase.removeChannel(jamChannelRef.current);
      jamChannelRef.current = null;
    }
    setJamRoomId(null);
    jamRoomIdRef.current = null;
    setIsJamHost(false);
    isJamHostRef.current = false;
    isJamLeaderRef.current = false;
    setJamListenersCount(1);
    setJamHostName("");
    try {
      sessionStorage.removeItem('euphony_active_jam_id');
      sessionStorage.removeItem('euphony_is_jam_host');
    } catch (e) {}
    setShowJamModal(false);
    triggerToast("Left Jam Session");
  }, [triggerToast]);

  const shareJamRoom = useCallback((e) => {
    if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    if (!jamRoomId) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?jam=${jamRoomId}`;
    if (navigator.share) {
      navigator.share({
        title: "Join my Live Jam on Euphony!",
        text: `Listen along with me in real time on Euphony! Room code: ${jamRoomId}`,
        url: shareUrl
      }).catch(err => {
        if (err.name !== 'AbortError') {
          navigator.clipboard.writeText(shareUrl).then(() => {
            triggerToast("Jam link copied to clipboard!");
          }).catch(() => {
            triggerToast("Link: " + shareUrl);
          });
        }
      });
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        triggerToast("Jam link copied to clipboard!");
      }).catch(() => {
        triggerToast("Link: " + shareUrl);
      });
    }
  }, [jamRoomId, triggerToast]);

  // Handle shared song link playback after session and playlist are loaded
  useEffect(() => {
    if (!session || !playlist || playlist.length === 0 || hasAutoPlayedSharedSongRef.current) return;
    
    let pendingSongId = null;
    try {
      const params = new URLSearchParams(window.location.search);
      pendingSongId = params.get('song') || sessionStorage.getItem('euphony_pending_song_id');
    } catch (e) {}

    if (pendingSongId) {
      hasAutoPlayedSharedSongRef.current = true;
      try { sessionStorage.removeItem('euphony_pending_song_id'); } catch (e) {}
      
      const songIdx = playlist.findIndex(s => s.id === pendingSongId);
      if (songIdx !== -1) {
        handlePlaySong(songIdx, playlist, "Shared Song");
        triggerToast(`Playing shared song: "${playlist[songIdx].title}"`);
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('song');
          window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + window.location.hash);
        } catch (e) {}
      } else {
        supabase.from('songs').select('*').eq('id', pendingSongId).single().then(({ data: song, error }) => {
          if (!error && song) {
            setPlaylist(prev => [song, ...prev.filter(s => s.id !== song.id)]);
            handlePlaySong(0, [song, ...playlist], "Shared Song");
            triggerToast(`Playing shared song: "${song.title}"`);
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('song');
              window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : '') + window.location.hash);
            } catch (e) {}
          }
        }).catch(() => {});
      }
    }
  }, [session, playlist, handlePlaySong, triggerToast]);

  const playTrackWithMetadataRef = useRef(playTrackWithMetadata);
  playTrackWithMetadataRef.current = playTrackWithMetadata;

  const updateProgressVisualsRef = useRef(updateProgressVisuals);
  updateProgressVisualsRef.current = updateProgressVisuals;

  const triggerToastRef = useRef(triggerToast);
  triggerToastRef.current = triggerToast;

  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;

  // Live Jam Realtime Channel Effect (Supabase Broadcast & Presence)
  useEffect(() => {
    if (!jamRoomId) {
      if (jamChannelRef.current) {
        supabase.removeChannel(jamChannelRef.current);
        jamChannelRef.current = null;
      }
      return;
    }

    const channelName = `jam_${jamRoomId.trim().toLowerCase()}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: localClientIdRef.current }
      }
    });

    jamChannelRef.current = channel;

    const knownJamMembers = new Map(); // clientId -> { name, leaveTimer }
    let initialPresenceSync = false;
    let listenerCountDebounceTimer = null;

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const activeClientIds = new Set(Object.keys(presenceState));

        // 1. Check for newly joined members or members returning from transient disconnect
        activeClientIds.forEach(cId => {
          if (cId === localClientIdRef.current) return;
          const memberList = presenceState[cId] || [];
          const memberInfo = memberList[0] || {};
          const memberName = memberInfo.name || "A friend";

          if (knownJamMembers.has(cId)) {
            const entry = knownJamMembers.get(cId);
            if (entry.leaveTimer) {
              // Re-appeared before grace period expired! Cancel departure.
              clearTimeout(entry.leaveTimer);
              entry.leaveTimer = null;
            }
          } else {
            // Genuinely new member
            knownJamMembers.set(cId, { name: memberName, leaveTimer: null });
            if (initialPresenceSync) {
              triggerToastRef.current?.(`${memberName} joined the Jam!`);
            }
          }
        });

        // 2. Check for members missing from presenceState (with 5s grace period)
        knownJamMembers.forEach((entry, cId) => {
          if (!activeClientIds.has(cId)) {
            if (!entry.leaveTimer) {
              entry.leaveTimer = setTimeout(() => {
                knownJamMembers.delete(cId);
                triggerToastRef.current?.(`${entry.name} left the Jam`);
                setJamListenersCount(Math.max(1, knownJamMembers.size + 1));
              }, 5000);
            }
          }
        });

        initialPresenceSync = true;

        // 3. Smooth listener count to eliminate 1 <-> 2 flickering
        const calculatedCount = Math.max(1, activeClientIds.size);
        setJamListenersCount(prevCount => {
          if (calculatedCount >= prevCount) {
            if (listenerCountDebounceTimer) {
              clearTimeout(listenerCountDebounceTimer);
              listenerCountDebounceTimer = null;
            }
            return calculatedCount;
          } else {
            if (!listenerCountDebounceTimer) {
              listenerCountDebounceTimer = setTimeout(() => {
                listenerCountDebounceTimer = null;
                const freshState = channel.presenceState();
                setJamListenersCount(Math.max(1, Object.keys(freshState).length));
              }, 2000);
            }
            return prevCount;
          }
        });
      })
      .on('broadcast', { event: 'jam_sync' }, ({ payload }) => {
        if (!payload) return;
        if (payload.senderClientId && payload.senderClientId === localClientIdRef.current) return;

        if (payload.leaderClientId) {
          isJamLeaderRef.current = (payload.leaderClientId === localClientIdRef.current);
        }
        if (payload.senderName) setJamHostName(payload.senderName);

        const currentActiveAudio = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current;

        if ((payload.type === 'track_change' || payload.type === 'full_state_sync') && payload.song) {
          const songId = payload.song.id;
          const currentPlaylist = playlistRef.current || [];
          const targetSong = currentPlaylist.find(s => s.id === songId) || payload.song;
          const previousTrack = currentTrackRef.current;

          // Only stop existing crossfade if incoming change is NOT a crossfade transition
          if (!payload.isCrossfade && isCrossfadingRef.current) {
            stopCrossfadeRef.current?.(false);
          }

          setPlaylist(prev => {
            if (prev.find(s => s.id === targetSong.id)) return prev;
            return [targetSong, ...prev];
          });
          setQueueCurrentTrack(targetSong);
          currentTrackRef.current = targetSong;
          try { localStorage.setItem("euphony_queue_current_track", JSON.stringify(targetSong)); } catch (e) {}

          if (Array.isArray(payload.userQueue)) {
            userQueueRef.current = payload.userQueue;
            setUserQueue(payload.userQueue);
            try { localStorage.setItem("euphony_user_queue", JSON.stringify(payload.userQueue)); } catch (e) {}
          }
          if (typeof payload.crossfadeEnabled === 'boolean') {
            crossfadeEnabledRef.current = payload.crossfadeEnabled;
            setCrossfadeEnabled(payload.crossfadeEnabled);
            setTempCrossfadeEnabled(payload.crossfadeEnabled);
            try { localStorage.setItem("euphony_crossfade_enabled", String(payload.crossfadeEnabled)); } catch (e) {}
            if (!payload.crossfadeEnabled && isCrossfadingRef.current) {
              stopCrossfadeRef.current?.(false);
            }
          }
          if (typeof payload.crossfadeDuration === 'number') {
            crossfadeDurationRef.current = payload.crossfadeDuration;
            setCrossfadeDuration(payload.crossfadeDuration);
            setTempCrossfadeDuration(payload.crossfadeDuration);
            try { localStorage.setItem("euphony_crossfade_duration", String(payload.crossfadeDuration)); } catch (e) {}
          }
          if (payload.sleepTimerTarget !== undefined) {
            setSleepTimerTarget(payload.sleepTimerTarget);
          }
          if (payload.stemVolumes && typeof payload.stemVolumes === 'object') {
            stemVolumesRef.current = payload.stemVolumes;
            setStemVolumes(payload.stemVolumes);
            const baseVol = isMutedRef.current ? 0 : volumeRef.current;
            const updateStemEl = (ref, volVal) => {
              const el = ref.current;
              if (!el) return;
              const targetVol = Math.max(0, Math.min(1, (volVal ?? 1) * baseVol));
              el.volume = targetVol;
              el.muted = targetVol === 0;
            };
            updateStemEl(vocalsRef, payload.stemVolumes.vocals);
            updateStemEl(drumsRef, payload.stemVolumes.drums);
            updateStemEl(bassRef, payload.stemVolumes.bass);
            updateStemEl(otherRef, payload.stemVolumes.other);
          }
          if (payload.playMode) {
            setPlayMode(payload.playMode);
          }

          // In Live Jam: crossfade smoothly if leader initiated a crossfade and follower has active playing track
          let crossfadeHandled = false;
          if (payload.isCrossfade && performCrossfadeTransitionRef.current) {
            const currentAudio = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current;
            if (currentAudio && !currentAudio.paused && currentAudio.src && currentAudio.currentTime > 0.5) {
              const leaderNow = Date.now() + jamClockOffsetRef.current;
              const elapsedTransit = payload.startTime ? Math.max(0, (leaderNow - payload.startTime) / 1000) : (jamNetworkLatencyRef.current || 0.04);
              const fadeDuration = payload.crossfadeDuration || crossfadeDurationRef.current || 5;
              if (elapsedTransit < fadeDuration - 0.5) {
                crossfadeHandled = performCrossfadeTransitionRef.current(
                  targetSong,
                  fadeDuration,
                  previousTrack,
                  true, // isRemoteJam = true (no broadcast loop, preserve follower state)
                  elapsedTransit
                );
              }
            }
          }

          if (!crossfadeHandled && currentActiveAudio) {
            if (isCrossfadingRef.current) {
              stopCrossfadeRef.current?.(false);
            }
            playTrackWithMetadataRef.current?.(targetSong, currentActiveAudio, blobCacheRef.current, true);

            const calculateLiveTargetTime = () => {
              const leaderNow = Date.now() + jamClockOffsetRef.current;
              const transitOrElapsed = payload.startTime 
                ? (leaderNow - payload.startTime) / 1000 
                : (payload.timestamp ? (leaderNow - payload.timestamp) / 1000 : (jamNetworkLatencyRef.current || 0.04));
              const clampedElapsed = Math.max(0, Math.min(60, transitOrElapsed));
              return Math.max(0, (payload.currentTime || 0) + (payload.isPlaying ? clampedElapsed : 0));
            };

            const restoreTime = () => {
              try {
                const liveTarget = calculateLiveTargetTime();
                if (liveTarget > 0.05) {
                  currentActiveAudio.currentTime = liveTarget;
                  setCurrentTime(liveTarget);
                  updateProgressVisualsRef.current?.();
                }
              } catch (e) {}
              currentActiveAudio.removeEventListener('loadedmetadata', restoreTime);
              currentActiveAudio.removeEventListener('canplay', restoreTime);
              if (restoreInitialTimeHandlerRef.current === restoreTime) {
                restoreInitialTimeHandlerRef.current = null;
              }
            };
            restoreInitialTimeHandlerRef.current = restoreTime;
            if (currentActiveAudio.readyState >= 2) {
              restoreTime();
            } else {
              currentActiveAudio.addEventListener('loadedmetadata', restoreTime, { once: true });
              currentActiveAudio.addEventListener('canplay', restoreTime, { once: true });
            }

            if (payload.isPlaying === false) {
              pauseAllAudioDecksRef.current?.();
            } else {
              resumeActiveAudioDecksRef.current?.();
            }
          }

          if (payload.type === 'track_change' && payload.senderName) {
            triggerToastRef.current?.(`${payload.senderName} started "${targetSong.title}"`);
          }
        } else if (payload.type === 'play_pause') {
          if (payload.isPlaying) {
            resumeActiveAudioDecksRef.current?.();
          } else {
            pauseAllAudioDecksRef.current?.();
          }

          if (currentActiveAudio && typeof payload.currentTime === 'number') {
            const diff = Math.abs((currentActiveAudio.currentTime || 0) - payload.currentTime);
            if (diff > 0.2) {
              try { currentActiveAudio.currentTime = payload.currentTime; } catch (e) {}
              setCurrentTime(payload.currentTime);
              updateProgressVisualsRef.current?.();
              if (vocalsRef.current) try { vocalsRef.current.currentTime = payload.currentTime; } catch (e) {}
              if (drumsRef.current)  try { drumsRef.current.currentTime  = payload.currentTime; } catch (e) {}
              if (bassRef.current)   try { bassRef.current.currentTime   = payload.currentTime; } catch (e) {}
              if (otherRef.current)  try { otherRef.current.currentTime  = payload.currentTime; } catch (e) {}
            }
          }
          if (payload.senderName) {
            triggerToastRef.current?.(`${payload.senderName} ${payload.isPlaying ? 'resumed' : 'paused'} playback`);
          }
        } else if (payload.type === 'seek') {
          if (currentActiveAudio && typeof payload.currentTime === 'number') {
            if (isCrossfadingRef.current) {
              stopCrossfadeRef.current?.(false);
            }
            try { currentActiveAudio.currentTime = payload.currentTime; } catch (e) {}
            setCurrentTime(payload.currentTime);
            updateProgressVisualsRef.current?.();
            currentActiveAudio.playbackRate = 1.0;
            if (vocalsRef.current) try { vocalsRef.current.currentTime = payload.currentTime; } catch (e) {}
            if (drumsRef.current)  try { drumsRef.current.currentTime  = payload.currentTime; } catch (e) {}
            if (bassRef.current)   try { bassRef.current.currentTime   = payload.currentTime; } catch (e) {}
            if (otherRef.current)  try { otherRef.current.currentTime  = payload.currentTime; } catch (e) {}
            if (payload.isPlaying) {
              resumeActiveAudioDecksRef.current?.();
            }
          }
        } else if (payload.type === 'drift_sync') {
          if (!isJamLeaderRef.current) {
            // 1. Fail-Safe Song Identity Lock: If follower is playing a different song than the leader, snap immediately!
            const songMatches = payload.song && currentTrackRef.current && String(payload.song.id) === String(currentTrackRef.current.id);
            const isTransitioningToLeaderSong = isCrossfadingRef.current && payload.song && (
              String(crossfadeIncomingAudioRef.current?._trackId) === String(payload.song.id) ||
              String(currentTrackRef.current?.id) === String(payload.song.id)
            );

            if (payload.song && currentTrackRef.current && !songMatches && !isTransitioningToLeaderSong) {
              const songId = payload.song.id;
              const currentPlaylist = playlistRef.current || [];
              const targetSong = currentPlaylist.find(s => String(s.id) === String(songId)) || payload.song;
              stopCrossfadeRef.current?.(false);
              setQueueCurrentTrack(targetSong);
              currentTrackRef.current = targetSong;
              try { localStorage.setItem("euphony_queue_current_track", JSON.stringify(targetSong)); } catch (e) {}

              if (currentActiveAudio) {
                playTrackWithMetadataRef.current?.(targetSong, currentActiveAudio, blobCacheRef.current, true);
                const leaderNow = Date.now() + jamClockOffsetRef.current;
                const transitDelay = payload.timestamp ? Math.max(0, Math.min(2.0, (leaderNow - payload.timestamp) / 1000)) : (jamNetworkLatencyRef.current || 0.04);
                const snapTime = Math.max(0, (payload.currentTime || 0) + (payload.isPlaying ? transitDelay : 0));
                const restoreTime = () => {
                  try {
                    const dynamicTransit = payload.timestamp ? Math.max(0, Math.min(10.0, (Date.now() + jamClockOffsetRef.current - payload.timestamp) / 1000)) : (jamNetworkLatencyRef.current || 0.04);
                    const liveSnapTime = Math.max(0, (payload.currentTime || 0) + (payload.isPlaying ? dynamicTransit : 0));
                    if (liveSnapTime > 0.05) {
                      currentActiveAudio.currentTime = liveSnapTime;
                      setCurrentTime(liveSnapTime);
                      updateProgressVisualsRef.current?.();
                    }
                  } catch (e) {}
                  currentActiveAudio.removeEventListener('loadedmetadata', restoreTime);
                  currentActiveAudio.removeEventListener('canplay', restoreTime);
                  if (restoreInitialTimeHandlerRef.current === restoreTime) {
                    restoreInitialTimeHandlerRef.current = null;
                  }
                };
                restoreInitialTimeHandlerRef.current = restoreTime;
                if (currentActiveAudio.readyState >= 2) {
                  restoreTime();
                } else {
                  currentActiveAudio.addEventListener('loadedmetadata', restoreTime, { once: true });
                  currentActiveAudio.addEventListener('canplay', restoreTime, { once: true });
                }
                if (payload.isPlaying === false) {
                  pauseAllAudioDecksRef.current?.();
                } else {
                  resumeActiveAudioDecksRef.current?.();
                }
              }
              return;
            }

            // 2. Playback position alignment with multi-tiered rate steering & hard seek fallback
            if (currentActiveAudio && typeof payload.currentTime === 'number') {
              const leaderNow = Date.now() + jamClockOffsetRef.current;
              const transitDelay = payload.timestamp ? Math.max(0, Math.min(2.0, (leaderNow - payload.timestamp) / 1000)) : (jamNetworkLatencyRef.current || 0.04);
              const expectedTime = payload.currentTime + (payload.isPlaying ? transitDelay : 0);
              const currentPos = currentActiveAudio.currentTime || 0;
              const diff = expectedTime - currentPos;
              const absDiff = Math.abs(diff);

              if (payload.isPlaying && currentActiveAudio.paused) {
                resumeActiveAudioDecksRef.current?.();
              } else if (!payload.isPlaying && !currentActiveAudio.paused) {
                pauseAllAudioDecksRef.current?.();
              }

              // Ensure follower active audio volume is restored and audible
              const baseVol = (isMutedRef.current || isMixerActiveRef.current) ? 0 : volumeRef.current;
              if (Math.abs(currentActiveAudio.volume - baseVol) > 0.05 && !isCrossfadingRef.current) {
                currentActiveAudio.volume = baseVol;
              }
              if (currentActiveAudio.muted !== Boolean(isMutedRef.current || isMixerActiveRef.current)) {
                currentActiveAudio.muted = Boolean(isMutedRef.current || isMixerActiveRef.current);
              }

              if (payload.isPlaying && isMixerActiveRef.current) {
                [vocalsRef, drumsRef, bassRef, otherRef].forEach(ref => {
                  if (ref.current && ref.current.src && ref.current.paused) {
                    ref.current.play().catch(() => {});
                  }
                });
              }

              const now = Date.now();
              // Don't steer or hard seek during an active crossfade blend unless drift is catastrophic (> 3s)
              if (isCrossfadingRef.current && absDiff < 3.0) {
                return;
              }

              // Multi-tiered synchronization strategy:
              // Tier 1: Severe drift (> 1.5s): hard seek with 2.5s cooldown to prevent repeated seeks
              if (absDiff > 1.5 && !currentActiveAudio.seeking && (now - lastJamHardSeekRef.current > 2500)) {
                lastJamHardSeekRef.current = now;
                try { currentActiveAudio.currentTime = expectedTime; } catch (e) {}
                setCurrentTime(expectedTime);
                updateProgressVisualsRef.current?.();
                currentActiveAudio.playbackRate = 1.0;
                [vocalsRef, drumsRef, bassRef, otherRef].forEach(ref => {
                  if (ref.current && ref.current.src && !ref.current.seeking) {
                    try { ref.current.currentTime = expectedTime; } catch (e) {}
                    if (payload.isPlaying && isMixerActiveRef.current && ref.current.paused) {
                      ref.current.play().catch(() => {});
                    }
                  }
                });
              } else if (absDiff > 0.4 && payload.isPlaying) {
                // Tier 2: Noticeable drift (0.4s to 1.5s): aggressive rate-steering (15%) catches up in ~2-3s with 0 stutter
                const targetRate = diff > 0 ? 1.15 : 0.85;
                currentActiveAudio.playbackRate = targetRate;
                [vocalsRef, drumsRef, bassRef, otherRef].forEach(ref => {
                  if (ref.current && ref.current.src) {
                    try { ref.current.playbackRate = targetRate; } catch (e) {}
                  }
                });
              } else if (absDiff > 0.12 && payload.isPlaying) {
                // Tier 3: Moderate drift (0.12s to 0.4s): standard rate-steering (7%)
                const targetRate = diff > 0 ? 1.07 : 0.93;
                currentActiveAudio.playbackRate = targetRate;
                [vocalsRef, drumsRef, bassRef, otherRef].forEach(ref => {
                  if (ref.current && ref.current.src) {
                    try { ref.current.playbackRate = targetRate; } catch (e) {}
                  }
                });
              } else if (absDiff > 0.03 && payload.isPlaying) {
                // Tier 4: Micro drift (0.03s to 0.12s): subtle rate-steering (2.5%) for pitch-perfect lock
                const targetRate = diff > 0 ? 1.025 : 0.975;
                currentActiveAudio.playbackRate = targetRate;
                [vocalsRef, drumsRef, bassRef, otherRef].forEach(ref => {
                  if (ref.current && ref.current.src) {
                    try { ref.current.playbackRate = targetRate; } catch (e) {}
                  }
                });
              } else {
                // In sync (< 30ms): normal 1.0x playback rate
                currentActiveAudio.playbackRate = 1.0;
                [vocalsRef, drumsRef, bassRef, otherRef].forEach(ref => {
                  if (ref.current && ref.current.src) {
                    try { ref.current.playbackRate = 1.0; } catch (e) {}
                  }
                });
              }
            }
          }
        } else if (payload.type === 'queue_update') {
          if (Array.isArray(payload.userQueue)) {
            userQueueRef.current = payload.userQueue;
            setUserQueue(payload.userQueue);
            try { localStorage.setItem("euphony_user_queue", JSON.stringify(payload.userQueue)); } catch (e) {}
            if (payload.action === 'add' && payload.songTitle) {
              triggerToastRef.current?.(`${payload.senderName || 'Jam member'} added "${payload.songTitle}" to Queue`);
            } else if (payload.action === 'clear') {
              triggerToastRef.current?.(`${payload.senderName || 'Jam member'} cleared the Queue`);
            }
          }
        } else if (payload.type === 'crossfade_update') {
          if (typeof payload.crossfadeEnabled === 'boolean') {
            crossfadeEnabledRef.current = payload.crossfadeEnabled;
            setCrossfadeEnabled(payload.crossfadeEnabled);
            setTempCrossfadeEnabled(payload.crossfadeEnabled);
            try { localStorage.setItem("euphony_crossfade_enabled", String(payload.crossfadeEnabled)); } catch (e) {}
            if (!payload.crossfadeEnabled && isCrossfadingRef.current) {
              stopCrossfadeRef.current?.(false);
            }
          }
          if (typeof payload.crossfadeDuration === 'number') {
            crossfadeDurationRef.current = payload.crossfadeDuration;
            setCrossfadeDuration(payload.crossfadeDuration);
            setTempCrossfadeDuration(payload.crossfadeDuration);
            try { localStorage.setItem("euphony_crossfade_duration", String(payload.crossfadeDuration)); } catch (e) {}
          }
          triggerToastRef.current?.(`${payload.senderName || 'Jam member'} ${payload.crossfadeEnabled ? `set Crossfade to ${payload.crossfadeDuration}s` : 'turned off Crossfade'}`);
        } else if (payload.type === 'sleep_timer_update') {
          setSleepTimerTarget(payload.sleepTimerTarget || null);
          if (payload.sleepTimerTarget) {
            triggerToastRef.current?.(`${payload.senderName || 'Jam member'} set sleep timer for ${payload.minutes} mins`);
          } else {
            triggerToastRef.current?.(`${payload.senderName || 'Jam member'} turned off sleep timer`);
          }
        } else if (payload.type === 'stem_mixer_update') {
          if (payload.stemVolumes && typeof payload.stemVolumes === 'object') {
            stemVolumesRef.current = payload.stemVolumes;
            setStemVolumes(payload.stemVolumes);
            const baseVol = isMutedRef.current ? 0 : volumeRef.current;
            const updateStemEl = (ref, volVal) => {
              const el = ref.current;
              if (!el) return;
              const targetVol = Math.max(0, Math.min(1, (volVal ?? 1) * baseVol));
              el.volume = targetVol;
              el.muted = targetVol === 0;
            };
            updateStemEl(vocalsRef, payload.stemVolumes.vocals);
            updateStemEl(drumsRef, payload.stemVolumes.drums);
            updateStemEl(bassRef, payload.stemVolumes.bass);
            updateStemEl(otherRef, payload.stemVolumes.other);
            if (isPlayingRef.current) {
              const t = currentActiveAudio?.currentTime || 0;
              [vocalsRef, drumsRef, bassRef, otherRef].forEach(ref => {
                if (ref.current) {
                  if (Math.abs((ref.current.currentTime || 0) - t) > 0.15) {
                    try { ref.current.currentTime = t; } catch (e) {}
                  }
                  if (ref.current.paused && ref.current.src) {
                    ref.current.play().catch(e => e);
                  }
                }
              });
            }
          }
        } else if (payload.type === 'jam_ping') {
          if (isJamLeaderRef.current && jamChannelRef.current) {
            jamChannelRef.current.send({
              type: 'broadcast',
              event: 'jam_sync',
              payload: {
                type: 'jam_pong',
                targetClientId: payload.senderClientId,
                clientTime: payload.clientTime,
                leaderTime: Date.now(),
                senderClientId: localClientIdRef.current
              }
            });
          }
        } else if (payload.type === 'jam_pong') {
          if (payload.targetClientId === localClientIdRef.current && typeof payload.clientTime === 'number' && typeof payload.leaderTime === 'number') {
            const now = Date.now();
            const rtt = Math.max(0, (now - payload.clientTime) / 1000);
            jamNetworkLatencyRef.current = Math.min(1.0, Math.max(0.01, rtt / 2));
            const estimatedLeaderNow = payload.leaderTime + (rtt * 1000) / 2;
            const newOffset = estimatedLeaderNow - now;
            if (jamClockOffsetRef.current === 0) {
              jamClockOffsetRef.current = newOffset;
            } else {
              jamClockOffsetRef.current = Math.round(jamClockOffsetRef.current * 0.7 + newOffset * 0.3);
            }
          }
        } else if (payload.type === 'play_mode_update') {
          if (payload.playMode) {
            setPlayMode(payload.playMode);
            triggerToastRef.current?.(`${payload.senderName || 'Jam member'} set mode to ${payload.playMode}`);
          }
        }

        setTimeout(() => {
          isProcessingRemoteJamEventRef.current = false;
        }, 200);
      })
      .on('broadcast', { event: 'jam_request_state' }, () => {
        if (currentTrackRef.current && (isJamHostRef.current || isJamLeaderRef.current)) {
          const activeEl = activeDeckRef.current === 'A' ? deckARef.current : deckBRef.current;
          const curPos = activeEl?.currentTime || 0;
          channel.send({
            type: 'broadcast',
            event: 'jam_sync',
            payload: {
              type: 'full_state_sync',
              song: currentTrackRef.current,
              isPlaying: isPlayingRef.current,
              currentTime: curPos,
              startTime: Date.now() - (curPos * 1000),
              userQueue: userQueueRef.current || [],
              crossfadeEnabled: crossfadeEnabledRef.current || false,
              crossfadeDuration: crossfadeDurationRef.current || 5,
              sleepTimerTarget: sleepTimerTargetRef.current || null,
              stemVolumes: stemVolumesRef.current || { vocals: 1, drums: 1, bass: 1, other: 1 },
              playMode: playModeRef.current || 'playlist-order',
              senderName: sessionRef.current?.user?.user_metadata?.full_name || sessionRef.current?.user?.email?.split('@')[0] || "Jam member",
              senderId: sessionRef.current?.user?.id || localClientIdRef.current,
              senderClientId: localClientIdRef.current,
              timestamp: Date.now()
            }
          });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          const userName = sessionRef.current?.user?.user_metadata?.full_name || sessionRef.current?.user?.email?.split('@')[0] || "Guest";
          channel.track({
            clientId: localClientIdRef.current,
            userId: sessionRef.current?.user?.id || null,
            name: userName,
            isHost: isJamHostRef.current,
            joinedAt: Date.now()
          });

          // Flush any broadcast messages that were queued before subscription was confirmed
          while (pendingBroadcastsRef.current.length > 0) {
            const p = pendingBroadcastsRef.current.shift();
            channel.send({
              type: 'broadcast',
              event: 'jam_sync',
              payload: p
            });
          }

          channel.send({
            type: 'broadcast',
            event: 'jam_request_state',
            payload: { requester: userName }
          });

          if (!isJamLeaderRef.current) {
            channel.send({
              type: 'broadcast',
              event: 'jam_sync',
              payload: {
                type: 'jam_ping',
                clientTime: Date.now(),
                senderClientId: localClientIdRef.current
              }
            });
          }
        }
      });

    return () => {
      if (listenerCountDebounceTimer) clearTimeout(listenerCountDebounceTimer);
      knownJamMembers.forEach(entry => {
        if (entry.leaveTimer) clearTimeout(entry.leaveTimer);
      });
      supabase.removeChannel(channel);
      jamChannelRef.current = null;
    };
  }, [jamRoomId]);

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
        style={{ background: "transparent", color: COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isMobile ? "6px 12px" : "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "bold", transition: "all 0.2s ease", flexShrink: 0 }}>
        <ArrowUpDown size={14} />
        {!isMobile && <span>{label}</span>}
      </button>
    );
  };

  const renderCrossfadingCover = (currentPoster, fallbackSize = 80, rounded = "12px") => {
    const outgoingPoster = outgoingTrackForArt?.poster_url;
    const isTransitioning = Boolean(
      outgoingTrackForArt &&
      (outgoingPoster || currentPoster) &&
      outgoingPoster !== currentPoster &&
      artTransitionDuration > 0
    );

    if (!currentPoster && !outgoingPoster) {
      return (
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: rounded, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ImageIcon size={fallbackSize} color={COLORS.textMuted} />
        </div>
      );
    }

    const animSecs = Math.max(artTransitionDuration, 0.4);

    return (
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: rounded }}>
        {/* Outgoing Poster Layer: remains steady at zIndex: 1 underneath incoming layer during crossfade */}
        {isTransitioning && outgoingPoster && (
          <img
            key={`cover-${outgoingPoster}`}
            src={outgoingPoster}
            alt=""
            loading="eager"
            decoding="async"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
              pointerEvents: "none",
              ...(!currentPoster ? {
                animation: `crossfade-art-fade-out ${animSecs}s cubic-bezier(0.4, 0, 0.2, 1) forwards`
              } : {})
            }}
          />
        )}
        {/* Current Poster Layer: sits on top at zIndex: 2 with stable key so DOM node is preserved seamlessly after fade */}
        {currentPoster ? (
          <img
            key={`cover-${currentPoster}`}
            src={currentPoster}
            alt=""
            loading="eager"
            decoding="async"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 2,
              pointerEvents: "none",
              ...(isTransitioning ? {
                animation: `crossfade-art-fade-in ${animSecs}s cubic-bezier(0.4, 0, 0.2, 1) forwards`
              } : {})
            }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
            <ImageIcon size={fallbackSize} color={COLORS.textMuted} />
          </div>
        )}
      </div>
    );
  };

  const renderCrossfadingTrackInfo = (
    currentSong,
    {
      titleTag = "h3",
      titleStyle = {},
      artistTag = "p",
      artistStyle = {},
      containerStyle = {},
      customTitleText = null,
      customArtistText = null
    } = {}
  ) => {
    const outgoing = outgoingTrackForArt;
    const isTransitioning = Boolean(
      outgoing &&
      currentSong &&
      (outgoing.id ? outgoing.id !== currentSong.id : outgoing.title !== currentSong.title) &&
      artTransitionDuration > 0
    );

    const animSecs = Math.max(artTransitionDuration, 0.4);
    const TitleElement = titleTag;
    const ArtistElement = artistTag;

    const currentTitle = customTitleText ? customTitleText(currentSong) : (currentSong?.title || "Unknown Title");
    const currentArtist = customArtistText ? customArtistText(currentSong) : (currentSong?.artist || "Unknown Artist");

    const outgoingTitle = customTitleText ? customTitleText(outgoing) : (outgoing?.title || "Unknown Title");
    const outgoingArtist = customArtistText ? customArtistText(outgoing) : (outgoing?.artist || "Unknown Artist");

    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gridTemplateRows: "1fr", minWidth: 0, width: "100%", ...containerStyle }}>
        {/* Outgoing track info: persistent key preserves existing DOM node when switching */}
        {isTransitioning && outgoing && (
          <div
            key={`info-${outgoing.id || outgoing.title}`}
            style={{
              gridArea: "1 / 1",
              minWidth: 0,
              width: "100%",
              overflow: "hidden",
              zIndex: 1,
              animation: `crossfade-art-fade-out ${animSecs}s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
              pointerEvents: "none"
            }}
          >
            <TitleElement style={titleStyle}>{outgoingTitle}</TitleElement>
            <ArtistElement style={artistStyle}>{outgoingArtist}</ArtistElement>
          </div>
        )}

        {/* Incoming / Active track info: persistent key preserves DOM node seamlessly across states */}
        <div
          key={`info-${currentSong?.id || currentSong?.title || 'active'}`}
          style={{
            gridArea: "1 / 1",
            minWidth: 0,
            width: "100%",
            overflow: "hidden",
            zIndex: 2,
            pointerEvents: "none",
            ...(isTransitioning ? {
              animation: `crossfade-art-fade-in ${animSecs}s cubic-bezier(0.4, 0, 0.2, 1) forwards`
            } : {})
          }}
        >
          <TitleElement style={titleStyle}>{currentTitle}</TitleElement>
          <ArtistElement style={artistStyle}>{currentArtist}</ArtistElement>
        </div>
      </div>
    );
  };

  const renderCrossfadingDuration = (currentDur, style = {}) => {
    const outgoing = outgoingTrackForArt;
    const isTransitioning = Boolean(
      outgoing &&
      currentTrack &&
      (outgoing.id ? outgoing.id !== currentTrack.id : outgoing.title !== currentTrack.title) &&
      artTransitionDuration > 0
    );

    const animSecs = Math.max(artTransitionDuration, 0.4);
    const incomingVal = (isFinite(currentDur) && currentDur > 0) ? currentDur : (currentTrack?.duration || (currentTrack?.id && STATIC_SONG_DURATIONS[currentTrack.id]) || 0);
    const incomingText = formatTime(incomingVal);

    if (isTransitioning) {
      const outgoingVal = outgoing?.duration || (outgoing?.id && STATIC_SONG_DURATIONS[outgoing.id]) || 0;
      const outgoingText = formatTime(outgoingVal);

      return (
        <span style={{ display: "inline-grid", gridTemplateColumns: "1fr", gridTemplateRows: "1fr", ...style }}>
          <span style={{ gridArea: "1 / 1", animation: `crossfade-art-fade-out ${animSecs}s cubic-bezier(0.4, 0, 0.2, 1) forwards`, pointerEvents: "none" }}>{outgoingText}</span>
          <span style={{ gridArea: "1 / 1", animation: `crossfade-art-fade-in ${animSecs}s cubic-bezier(0.4, 0, 0.2, 1) forwards`, pointerEvents: "none" }}>{incomingText}</span>
        </span>
      );
    }

    return <span style={style}>{incomingText}</span>;
  };

  const renderCrossfadingBackdrop = (
    currentPoster,
    filterStyle,
    opacityStyle,
    bounds = { top: "-20%", left: "-20%", width: "140%", height: "140%" },
    gradientOverlay = null,
    outgoingGradientOverlay = null
  ) => {
    const outgoingPoster = outgoingTrackForArt?.poster_url;
    const isTransitioning = Boolean(
      (outgoingPoster || outgoingGradientOverlay) &&
      (outgoingPoster !== currentPoster || outgoingGradientOverlay !== gradientOverlay) &&
      artTransitionDuration > 0
    );

    if (!currentPoster && !outgoingPoster && !gradientOverlay && !outgoingGradientOverlay) return null;

    const animSecs = Math.max(artTransitionDuration, 1);

    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          zIndex: 0,
          pointerEvents: "none"
        }}
      >
        {/* Outgoing Backdrop Layer: persistent key preserves existing DOM node when switching */}
        {isTransitioning && (outgoingPoster || outgoingGradientOverlay) && (
          <div
            key={`bd-${outgoingPoster || 'grad'}`}
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              zIndex: 0,
              pointerEvents: "none",
              ...(!currentPoster && !gradientOverlay ? {
                animation: `crossfade-art-fade-out ${animSecs}s cubic-bezier(0.4, 0, 0.2, 1) forwards`
              } : {})
            }}
          >
            {outgoingPoster && (
              <div
                style={{
                  position: "absolute",
                  top: bounds.top,
                  left: bounds.left,
                  width: bounds.width,
                  height: bounds.height,
                  backgroundImage: `url(${outgoingPoster})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: filterStyle,
                  opacity: opacityStyle,
                  transform: "scale(1.2)",
                  zIndex: 0
                }}
              />
            )}
            {outgoingGradientOverlay && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: outgoingGradientOverlay,
                  zIndex: 1
                }}
              />
            )}
          </div>
        )}

        {/* Incoming / Active Backdrop Layer: persistent key preserves DOM node seamlessly across states */}
        {(currentPoster || gradientOverlay) && (
          <div
            key={`bd-${currentPoster || 'grad'}`}
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              zIndex: 1,
              pointerEvents: "none",
              ...(isTransitioning ? {
                animation: `crossfade-art-fade-in ${animSecs}s cubic-bezier(0.4, 0, 0.2, 1) forwards`
              } : {})
            }}
          >
            {currentPoster && (
              <div
                style={{
                  position: "absolute",
                  top: bounds.top,
                  left: bounds.left,
                  width: bounds.width,
                  height: bounds.height,
                  backgroundImage: `url(${currentPoster})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: filterStyle,
                  opacity: opacityStyle,
                  transform: "scale(1.2)",
                  zIndex: 0
                }}
              />
            )}
            {gradientOverlay && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: gradientOverlay,
                  zIndex: 1
                }}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMixerBlock = (isMobile, customHeight, customBg) => {
    const sliderHeight = customHeight || (isMobile ? 140 : 160);
    return (
    <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: isMobile ? "16px" : "20px 18px", background: customBg !== undefined ? customBg : (isDarkMode ? "rgba(10, 15, 26, 0.75)" : "rgba(250, 250, 247, 0.85)"), backdropFilter: customBg !== undefined ? "none" : "blur(20px)", borderRadius: customBg !== undefined ? "0" : "12px", textAlign: "center", color: isDarkMode ? "#FFFFFF" : COLORS.primary, display: "flex", flexDirection: "column" }}>
      {!currentTrack?.stem_vocals ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
          {isGeneratingStems ? (
            <><Loader2 className="animate-spin" size={40} color={COLORS.spotifyGreen} style={{ marginBottom: "16px" }} /><p style={{ fontSize: "14px", fontWeight: "bold", color: COLORS.spotifyGreen }}>{generationStatus}</p></>
          ) : (
            <><SlidersHorizontal size={40} color={isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(26,43,76,0.35)"} style={{ marginBottom: "16px" }} />
              <p style={{ fontSize: "14px", marginBottom: "20px", padding: "0 20px", color: isDarkMode ? "rgba(255,255,255,0.7)" : COLORS.textMuted }}>
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
          <div style={{ display: "flex", justifyContent: "space-evenly", width: "100%", flex: 1, padding: "20px 0 10px 0", alignItems: "center", overflow: "hidden" }}>
            {["vocals", "drums", "bass", "other"].map((stemType) => {
              const isBroad = !!activeStems[stemType];
              return (
                <div key={stemType} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", height: "100%", flex: 1 }}>
                  <div className="stem-slider-container" style={{ position: "relative", width: "32px", height: `${sliderHeight}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div 
                      className={`stem-track ${isBroad ? "is-broad" : ""}`}
                      style={{
                        position: "absolute",
                        height: `${sliderHeight}px`,
                        width: isBroad ? "26px" : "4px",
                        borderRadius: isBroad ? "13px" : "4px",
                        background: isDarkMode
                          ? `linear-gradient(to top, ${COLORS.spotifyGreen} ${stemVolumes[stemType] * 100}%, rgba(255,255,255,0.2) ${stemVolumes[stemType] * 100}%)`
                          : `linear-gradient(to top, ${COLORS.spotifyGreen} ${stemVolumes[stemType] * 100}%, rgba(26,43,76,0.15) ${stemVolumes[stemType] * 100}%)`,
                        transition: "width 0.25s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
                        pointerEvents: "none",
                        zIndex: 1
                      }}
                    />
                    <input type="range" min="0" max="1" step="0.01" value={stemVolumes[stemType]}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        const nextVols = { ...stemVolumes, [stemType]: val };
                        setStemVolumes(nextVols);
                        broadcastStemVolumes(nextVols);
                      }}
                      onPointerDown={(e) => {
                        try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch (_) {}
                        setActiveStems(prev => ({ ...prev, [stemType]: true }));
                      }}
                      onPointerUp={(e) => {
                        try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch (_) {}
                        setActiveStems(prev => {
                          if (!prev[stemType]) return prev;
                          const next = { ...prev };
                          delete next[stemType];
                          return next;
                        });
                      }}
                      onPointerCancel={() => {
                        setActiveStems(prev => {
                          if (!prev[stemType]) return prev;
                          const next = { ...prev };
                          delete next[stemType];
                          return next;
                        });
                      }}
                      onTouchStart={() => {
                        setActiveStems(prev => ({ ...prev, [stemType]: true }));
                      }}
                      onTouchEnd={() => setActiveStems(prev => {
                        if (!prev[stemType]) return prev;
                        const next = { ...prev };
                        delete next[stemType];
                        return next;
                      })}
                      onTouchCancel={() => setActiveStems(prev => {
                        if (!prev[stemType]) return prev;
                        const next = { ...prev };
                        delete next[stemType];
                        return next;
                      })}
                      style={{ 
                        position: "absolute", 
                        appearance: "none", 
                        WebkitAppearance: "none", 
                        width: `${sliderHeight}px`, 
                        height: "32px",
                        background: "transparent",
                        transform: "rotate(-90deg)", 
                        transformOrigin: "center", 
                        margin: 0,
                        padding: 0,
                        outline: "none",
                        cursor: "pointer",
                        zIndex: 2,
                        touchAction: "none"
                      }}
                      className={isDarkMode ? "stem-fader" : "stem-fader-light"} />
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "capitalize", color: isDarkMode ? (stemVolumes[stemType] === 0 ? "rgba(255,255,255,0.4)" : "#FFFFFF") : (stemVolumes[stemType] === 0 ? "rgba(26,43,76,0.4)" : COLORS.primary), marginTop: "12px", letterSpacing: "0.2px" }}>{stemType}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
    );
  };

  const renderLyricsBlock = (isMobile) => {
    const activeColor = "#FFFFFF";
    const inactiveColor = "rgba(255, 255, 255, 0.45)";
    const activeShadow = "0 0 16px rgba(255,255,255,0.8)";
    const inactiveShadow = "none";
    const trackLyrics = currentTrack?.lyrics || playlist.find(s => s.id === currentTrack?.id)?.lyrics;

    return (
      <div ref={lyricsContainerRef} className="custom-scrollbar" style={{ position: "relative", width: "100%", height: "100%", padding: "24px 16px", overflowY: "auto", overflowX: "hidden", background: "transparent", textAlign: "center", borderRadius: "12px", WebkitOverflowScrolling: "touch", scrollBehavior: "auto" }}>
        {parsedLyrics.length > 0 ? (
          <div style={{ padding: isMobile ? "200px 0" : "300px 0" }}>
            {parsedLyrics.map((lyric, index) => {
              const isActiveLine = index === activeLyricIndex;
              return (
                <div key={index} ref={el => lyricRefs.current[index] = el} onClick={(e) => handleLyricClick(lyric.time, e)}
                  style={{ fontSize: isMobile ? "20px" : "18px", fontWeight: "700", color: isActiveLine ? activeColor : inactiveColor, opacity: isActiveLine ? 1 : 0.45, textShadow: isActiveLine && !lyric.words ? activeShadow : inactiveShadow, padding: "10px 0", transition: "transform 0.7s cubic-bezier(0.25, 1, 0.5, 1), color 0.7s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.7s cubic-bezier(0.25, 1, 0.5, 1), text-shadow 0.7s cubic-bezier(0.25, 1, 0.5, 1)", transform: isActiveLine ? (isMobile ? "scale(1.06)" : "scale(1.08)") : "scale(1)", transformOrigin: "center", lineHeight: "1.4", cursor: "pointer", willChange: "transform, color, opacity, text-shadow", WebkitFontSmoothing: "antialiased", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}>
                  {lyric.words ? lyric.words.map((wordObj, wIndex) => {
                    const isActiveWord = isActiveLine && wIndex === activeWordIndex;
                    const isPastWord = isActiveLine && wIndex < activeWordIndex;
                    return (
                      <span key={wIndex} onClick={(e) => handleLyricClick(wordObj.time, e)}
                        style={{ color: (isActiveWord || isPastWord) ? activeColor : inactiveColor, textShadow: isActiveWord ? activeShadow : inactiveShadow, transition: "all 0.3s ease", marginRight: "4px", cursor: "pointer", willChange: "color, text-shadow", WebkitFontSmoothing: "antialiased" }}>
                        {wordObj.text}
                      </span>
                    );
                  }) : lyric.text}
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ color: inactiveColor, textShadow: inactiveShadow, opacity: 0.8, fontSize: "15px", fontWeight: "600", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {trackLyrics ? (trackLyrics.replace(/\[mood:\s*[a-zA-Z\s]+\]\r\n?/gi, '').trim() || "No synchronized lyrics available.") : "No synchronized lyrics available."}
          </div>
        )}
      </div>
    );
  };

  const renderQueueBlock = (isMobile, customBg) => {
    const isDark = isDarkMode || customBg === "transparent";
    return (
      <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: customBg !== undefined ? "4px 0" : (isMobile ? "16px" : "18px"), overflowY: "auto", background: customBg !== undefined ? customBg : songTheme.modalBg, backdropFilter: customBg !== undefined ? "none" : "blur(24px)", WebkitBackdropFilter: customBg !== undefined ? "none" : "blur(24px)", border: customBg !== undefined ? "none" : songTheme.modalBorder, boxShadow: customBg !== undefined ? "none" : songTheme.modalShadow, borderRadius: "12px", textAlign: "left", color: songTheme.textColor }}>
        <div style={{ marginBottom: "22px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", color: isDark ? "rgba(255,255,255,0.7)" : COLORS.textMuted }}>Now Playing</h4>
          {currentTrack && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 10px", borderRadius: "12px", background: songTheme.rowBg, border: songTheme.rowBorder }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(26,43,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {renderCrossfadingCover(currentTrack?.poster_url, 18, "4px")}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {renderCrossfadingTrackInfo(currentTrack, {
                  titleTag: "div",
                  titleStyle: { fontSize: "14px", fontWeight: "bold", color: COLORS.spotifyGreen, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                  artistTag: "div",
                  artistStyle: { fontSize: "12px", color: isDark ? "rgba(255,255,255,0.7)" : COLORS.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
                })}
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

        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h4 style={{ margin: 0, fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", color: isDark ? "rgba(255,255,255,0.7)" : COLORS.textMuted }}>
              Next In Queue {userQueue.length > 0 && <span style={{ background: COLORS.spotifyGreen, color: "#fff", borderRadius: "10px", padding: "1px 7px", fontSize: "11px", marginLeft: "6px" }}>{userQueue.length}</span>}
            </h4>
            {userQueue.length > 0 && <button onClick={clearQueue} style={{ background: "transparent", border: "none", color: isDark ? "rgba(255,255,255,0.7)" : COLORS.textMuted, fontSize: "12px", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}>Clear</button>}
          </div>
          {userQueue.length > 0 ? (
            <DndContext id="dnd-user-queue" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext 
                items={userQueue.map(s => s.queue_id)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {userQueue.map((song, qIndex) => (
                    <SortableQueueItem
                      key={song.queue_id}
                      song={song}
                      index={qIndex}
                      playFromQueue={playFromQueue}
                      removeFromQueue={removeFromQueue}
                      isDarkMode={isDark}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : COLORS.textMuted, fontStyle: "italic", padding: "4px 0" }}>
              No songs queued. Tap <ListPlus size={12} style={{ verticalAlign: "middle", margin: "0 2px" }} /> next to any song to add it.
            </div>
          )}
          {userQueue.length > 0 && (
            <p style={{ margin: "8px 0 0 0", fontSize: "11px", color: isDark ? "rgba(255,255,255,0.4)" : COLORS.textMuted, fontStyle: "italic" }}>Drag <GripVertical size={10} style={{ verticalAlign: "middle" }} /> to reorder • Tap a song to play it now</p>
          )}
        </div>

        <div>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", color: isDark ? "rgba(255,255,255,0.7)" : COLORS.textMuted }}>Next From: {playbackSourceName}</h4>
          {upcomingSourceList.length > 0 ? (
            <DndContext id="dnd-source-list" sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSourceDragEnd}>
              <SortableContext 
                items={upcomingSourceList.map(item => `source-${item.track.id}-${item.originalIndex}`)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {upcomingSourceList.map((item, uIdx) => (
                    <SortableSourceItem
                      key={`source-${item.track.id}-${item.originalIndex}`}
                      item={item}
                      playSong={() => handlePlaySong(item.originalIndex, playbackQueue, playbackSourceName)}
                      sourceName={playbackSourceName}
                      isDarkMode={isDark}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.5)" : COLORS.textMuted, fontStyle: "italic" }}>End of playlist.</div>
          )}
        </div>
      </div>
    );
  };

  const renderMiniPlaylistCover = (pl, size = 24) => {
    const validPosters = (pl.playlist_songs || []).map(ps => ps.songs?.poster_url).filter(Boolean);
    if (validPosters.length === 0) return (
      <div style={{ width: size, height: size, backgroundColor: COLORS.primary, borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <FolderPlus size={size * 0.55} color={COLORS.bgPanel} />
      </div>
    );
    if (validPosters.length < 4) return (
      <div style={{ width: size, height: size, borderRadius: "4px", overflow: "hidden", flexShrink: 0 }}>
        <img src={validPosters[0]} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    );
    return (
      <div style={{ width: size, height: size, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "1px", borderRadius: "4px", overflow: "hidden", backgroundColor: COLORS.imageBg, padding: "1px", flexShrink: 0 }}>
        {validPosters.slice(0, 4).map((url, i) => (
          <img key={i} src={url} alt={`Cover ${i}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "2px" }} />
        ))}
      </div>
    );
  };

  const renderPlaylistCover = () => {
    const size = isDesktop ? 180 : 140;
    const currentSongs = viewedPlaylistId !== null ? rawViewedSongs : playlistSongs;
    const validPosters = currentSongs.map(s => s.poster_url).filter(Boolean);

    if (activePlaylistObj?.id === "smart_recently_played") {
      if (validPosters.length === 0) {
        return (
          <div style={{ width: size, height: size, background: "linear-gradient(135deg, #4da6ff, #1a2b4c)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(26,43,76,0.2)", flexShrink: 0 }}>
            <History size={isDesktop ? 72 : 56} color="#fff" />
          </div>
        );
      }
    }

    if (activePlaylistObj?.id === "smart_most_played") {
      if (validPosters.length === 0) {
        return (
          <div style={{ width: size, height: size, background: "linear-gradient(135deg, #ff7a18, #af002d)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(26,43,76,0.2)", flexShrink: 0 }}>
            <Flame size={isDesktop ? 72 : 56} color="#fff" />
          </div>
        );
      }
    }

    if (currentSongs.length === 0 || validPosters.length === 0) {
      return (
        <div style={{ width: size, height: size, backgroundColor: COLORS.primary, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(26,43,76,0.15)", flexShrink: 0 }}>
          <FolderPlus size={isDesktop ? 72 : 56} color={COLORS.bgPanel} />
        </div>
      );
    }

    if (currentSongs.length < 4 || validPosters.length < 4) {
      return (
        <div style={{ width: size, height: size, borderRadius: "12px", overflow: "hidden", boxShadow: "0 12px 24px rgba(26,43,76,0.15)", flexShrink: 0 }}>
          <img src={validPosters[0]} alt="Cover" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      );
    }

    return (
      <div style={{ width: size, height: size, display: "grid", gridTemplateColumns: "1fr 1fr", gridTemplateRows: "1fr 1fr", gap: "4px", borderRadius: "12px", overflow: "hidden", backgroundColor: COLORS.imageBg, padding: "4px", boxShadow: "0 12px 24px rgba(26,43,76,0.15)", flexShrink: 0 }}>
        {validPosters.slice(0, 4).map((url, i) => (
          <img key={i} src={url} alt={`Cover ${i}`} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }} />
        ))}
      </div>
    );
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const likedPlaylist = userPlaylists.find(p => p.name === "Liked Songs");

  if (!isSessionLoaded) return <div style={{ background: COLORS.bgBase, width: '100vw', height: '100vh' }} />;
  if (!session) return <Auth />;

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: COLORS.bgBase, color: COLORS.textMain, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        :root { max-width: none !important; }
        body, html, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; background: ${COLORS.bgBase} !important; overflow: hidden !important; box-sizing: border-box; text-align: left !important; -webkit-user-select: none; -moz-user-select: none; user-select: none; -webkit-touch-callout: none; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; }
        input, textarea { -webkit-user-select: auto; -moz-user-select: auto; user-select: auto; outline: none; }
        
        img {
          -webkit-user-drag: none !important;
          -khtml-user-drag: none !important;
          -moz-user-drag: none !important;
          -o-user-drag: none !important;
          user-drag: none !important;
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
          pointer-events: none !important;
        }

        svg, video, canvas {
          -webkit-user-drag: none !important;
          user-drag: none !important;
          -webkit-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }
        
        /* Fallback transition only active for non-ViewTransition browsers */
        html.fallback-theme-transition body,
        html.fallback-theme-transition #root {
          transition: background-color 0.35s ease !important;
        }

        /* View Transitions - Mobile-optimized hardware-accelerated single-layer dissolve */
        ::view-transition-group(root) {
          animation-duration: 400ms;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        ::view-transition-image-pair(root) {
          isolation: isolate;
        }

        ::view-transition-old(root),
        ::view-transition-new(root) {
          mix-blend-mode: normal !important;
        }

        /* Keep old snapshot 100% solid as base to eliminate opacity dips, flickering, and dual-layer GPU compositing lag */
        ::view-transition-old(root) {
          animation: none !important;
          z-index: 1;
        }

        /* Fade in new snapshot smoothly on top */
        ::view-transition-new(root) {
          animation: theme-fade-in 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
          z-index: 2;
          will-change: opacity;
        }

        @keyframes theme-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          ::view-transition-group(*),
          ::view-transition-old(*),
          ::view-transition-new(*) {
            animation: none !important;
          }
        }
        
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-animate { animation: spin 0.8s linear infinite; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes slideUp { 0% { transform: translateY(100%); } 99% { transform: translateY(0); } 100% { transform: none; } }
        @keyframes slideDown { to { transform: translateY(100%); } }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95); } 99% { transform: scale(1); opacity: 1; } 100% { transform: none; opacity: 1; } }
        @keyframes popOut { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(0.95); } }
        @keyframes toastUp { 0% { opacity: 0; transform: translate(-50%, 20px); } 99% { transform: translate(-50%, 0); opacity: 1; } 100% { transform: translateX(-50%); opacity: 1; } }
        @keyframes toastDown { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, 20px); } }
        @keyframes bounceEq { 0%, 100% { transform: scaleY(0.3); } 50% { transform: scaleY(1); } }
        
        @keyframes crossfade-art-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes crossfade-art-fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        .fade-enter { animation: fadeIn 0.3s ease-out forwards; }
        .fade-exit { animation: fadeOut 0.3s ease-out forwards; }
        .slide-up-enter { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .slide-down-exit { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pop-enter { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pop-exit { animation: popOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .toast-enter { animation: toastUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .toast-exit { animation: toastDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .hover-effect { transition: transform 0.2s ease, opacity 0.2s ease; }
        @media (hover: hover) and (pointer: fine) {
          .hover-effect:hover { transform: scale(1.05); }
          .playlist-row:hover { background: ${COLORS.hover} !important; }
          .sidebar-item:hover { color: ${COLORS.primary} !important; opacity: 0.8; }
        }
        .playlist-row { transition: background 0.2s ease; }
        .sidebar-item { transition: color 0.2s ease; cursor: pointer; }
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
        
        .glow-slider-light { 
          -webkit-appearance: none; 
          appearance: none; 
          height: 6px; 
          border-radius: 6px; 
          outline: none; 
          cursor: pointer; 
        }
        .glow-slider-light::-webkit-slider-thumb { 
          -webkit-appearance: none; 
          appearance: none; 
          width: 2px; 
          height: 6px; 
          border-radius: 0; 
          background: #1A2B4C; 
          cursor: pointer; 
          box-shadow: 
            -2px 0 6px 2px rgba(26, 43, 76, 0.8),
            -10px 0 10px 3px rgba(26, 43, 76, 0.4),
            -20px 0 15px 4px rgba(26, 43, 76, 0.2); 
          transition: transform 0.1s ease; 
        }
        .glow-slider-light::-moz-range-thumb { 
          width: 2px; 
          height: 6px; 
          border: none; 
          border-radius: 0; 
          background: #1A2B4C; 
          cursor: pointer; 
          box-shadow: 
            -2px 0 6px 2px rgba(26, 43, 76, 0.8),
            -10px 0 10px 3px rgba(26, 43, 76, 0.4),
            -20px 0 15px 4px rgba(26, 43, 76, 0.2); 
          transition: transform 0.1s ease; 
        }
        
        .stem-slider-container {
          position: relative;
        }

        .stem-track {
          transition: width 0.25s cubic-bezier(0.25, 1, 0.5, 1), border-radius 0.25s cubic-bezier(0.25, 1, 0.5, 1);
          will-change: width, border-radius;
        }

        @media (hover: hover) and (pointer: fine) {
          .stem-slider-container:hover .stem-track {
            width: 26px !important;
            border-radius: 13px !important;
          }
        }

        .stem-track.is-broad {
          width: 26px !important;
          border-radius: 13px !important;
        }

        .stem-fader { -webkit-appearance: none; appearance: none; outline: none; cursor: pointer; }
        .stem-fader::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 0 10px 3px #FFFFFF; cursor: pointer; }
        .stem-fader::-moz-range-thumb { width: 14px; height: 14px; border: none; border-radius: 50%; background: #FFFFFF; box-shadow: 0 0 10px 3px #FFFFFF; cursor: pointer; }
        .stem-fader-light { -webkit-appearance: none; appearance: none; outline: none; cursor: pointer; }
        .stem-fader-light::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #1A2B4C; box-shadow: 0 0 10px 2px rgba(26,43,76,0.5); cursor: pointer; }
        .stem-fader-light::-moz-range-thumb { width: 14px; height: 14px; border: none; border-radius: 50%; background: #1A2B4C; box-shadow: 0 0 10px 2px rgba(26,43,76,0.5); cursor: pointer; }
        .upload-input { width: 100%; padding: 14px; color: ${COLORS.textMain}; margin-bottom: 16px; outline: none; font-family: inherit; font-size: 14px; }
        .upload-input::placeholder { color: ${COLORS.textMuted}; }
        .upload-input:focus { border-color: ${COLORS.primary}; }
        .jam-code-input::placeholder { color: ${isDarkMode ? "rgba(255, 255, 255, 0.45)" : "rgba(26, 43, 76, 0.45)"}; }
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { 
          -ms-overflow-style: none; 
          scrollbar-width: none; 
          -webkit-overflow-scrolling: touch;
        }
        .main-scroll-container {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-y: contain;
          transform: translateZ(0);
        }
        .horizontal-scroll-container {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
          touch-action: pan-x pan-y;
          transform: translateZ(0);
        }
        .song-row-deferred {
          content-visibility: auto;
          contain-intrinsic-size: auto none auto 68px;
        }
        
        .loop-audio-fix { pointer-events: none; }
        
        .glass-panel {
          background: ${isDarkMode ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.12)"};
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          border: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.5)"};
          border-top: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.9)"};
          border-radius: 16px;
          box-shadow: ${isDarkMode ? "0 10px 40px rgba(0, 0, 0, 0.3)" : "0 10px 40px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)"};
        }
        
        .glass-row {
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
          background: ${isDarkMode ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.12)"};
          border: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.5)"};
          border-top: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.9)"};
          border-radius: 12px;
          box-shadow: ${isDarkMode ? "0 4px 12px rgba(0, 0, 0, 0.2)" : "0 8px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)"};
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          contain: paint;
          isolation: isolate;
        }
        @media (hover: hover) and (pointer: fine) {
          .glass-row:hover {
            background: ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.16)"};
            border: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.6)"};
            border-top: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 1)"};
            box-shadow: ${isDarkMode ? "0 6px 16px rgba(0, 0, 0, 0.3)" : "0 10px 28px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)"};
          }
        }
        .glass-btn-primary {
          background: ${isDarkMode ? "rgba(242, 233, 228, 0.85)" : "rgba(26, 43, 76, 0.85)"};
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          border: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.2)"};
          border-top: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.4)"};
          border-radius: 12px;
          color: ${isDarkMode ? "#1A2B4C" : "#FFFFFF"};
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
          font-weight: bold;
          cursor: pointer;
        }
        @media (hover: hover) and (pointer: fine) {
          .glass-btn-primary:hover {
            background: ${isDarkMode ? "rgba(242, 233, 228, 1)" : "rgba(26, 43, 76, 1)"};
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
          }
        }
        .glass-row.active {
          background: ${isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.22)"};
          border: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.8)"};
          border-top: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 1)"};
          box-shadow: ${isDarkMode ? "0 8px 24px rgba(0, 0, 0, 0.4)" : "0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)"};
        }
        
        .song-stack-row {
          touch-action: pan-y;
          background: ${isDarkMode ? "#1B3B78" : "rgba(0, 0, 0, 0.12)"} !important;
          border: 1px solid ${isDarkMode ? "rgba(80, 135, 220, 0.3)" : "rgba(255, 255, 255, 0.5)"} !important;
          border-top: 1px solid ${isDarkMode ? "rgba(130, 185, 255, 0.45)" : "rgba(255, 255, 255, 0.9)"} !important;
          box-shadow: ${isDarkMode ? "0 4px 14px rgba(10, 22, 50, 0.35)" : "0 8px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)"} !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          transform: translateZ(0);
        }
        @media (hover: hover) and (pointer: fine) {
          .song-stack-row:hover {
            background: ${isDarkMode ? "#22468E" : "rgba(0, 0, 0, 0.16)"} !important;
            border: 1px solid ${isDarkMode ? "rgba(100, 160, 255, 0.45)" : "rgba(255, 255, 255, 0.6)"} !important;
            border-top: 1px solid ${isDarkMode ? "rgba(150, 205, 255, 0.65)" : "rgba(255, 255, 255, 1)"} !important;
            box-shadow: ${isDarkMode ? "0 6px 18px rgba(15, 30, 70, 0.45)" : "0 10px 28px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)"} !important;
          }
        }
        .song-stack-row.active {
          background: ${isDarkMode ? "#2C55A8" : "rgba(0, 0, 0, 0.22)"} !important;
          border: 1px solid ${isDarkMode ? "rgba(120, 180, 255, 0.5)" : "rgba(255, 255, 255, 0.8)"} !important;
          border-top: 1px solid ${isDarkMode ? "rgba(170, 220, 255, 0.75)" : "rgba(255, 255, 255, 1)"} !important;
          box-shadow: ${isDarkMode ? "0 8px 24px rgba(20, 50, 120, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)" : "0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)"} !important;
        }
      `}</style>

      {/* ── AUDIO ELEMENTS (APPLE-STYLE DUAL DECK ENGINE) ── */}
      <audio ref={silentAudioRef} src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" loop playsInline autoPlay onTimeUpdate={() => handleTimeUpdateRef.current?.()} style={{ display: 'none' }} />
      {/* DECK A */}
      <audio
        ref={deckARef}
        onLoadedMetadata={(e) => {
          const dur = e.target.duration;
          if (isFinite(dur) && dur > 0) {
            deckARef.current._cachedDuration = dur;
            if (activeDeckRef.current === 'A') {
              setDuration(dur);
            }
          }
          if (activeDeckRef.current === 'A') {
            if (!restoreInitialTimeHandlerRef.current && (!jamRoomIdRef.current || isJamLeaderRef.current)) {
              if (e.target.currentTime !== 0 && !isCrossfadingRef.current) {
                try { e.target.currentTime = 0; } catch (err) {}
              }
              if (!isCrossfadingRef.current) setCurrentTime(0);
            }
            updateProgressVisuals();
          }
        }}
        onTimeUpdate={() => {
          if (isCrossfadingRef.current && crossfadeProgressUpdaterRef.current) {
            crossfadeProgressUpdaterRef.current();
          }
          if (activeDeckRef.current !== 'A') return;
          const activeEl = deckARef.current;
          if (activeEl && isFinite(activeEl.duration) && activeEl.duration > 0) {
            setDuration(prev => (Math.abs(prev - activeEl.duration) > 0.8 ? activeEl.duration : prev));
          }
          setCurrentTime(activeEl?.currentTime || 0);
          handleTimeUpdateRef.current && handleTimeUpdateRef.current();
        }}
        onEnded={() => {
          if (activeDeckRef.current !== 'A') {
            if (isCrossfadingRef.current) {
              stopCrossfade(true);
            } else {
              try { deckARef.current?.pause(); if (deckARef.current) deckARef.current.src = ""; } catch (err) {}
            }
            return;
          }
          if (jamRoomIdRef.current && !isJamLeaderRef.current) {
            return;
          }
          handleTrackEnded();
        }}
        onCanPlay={(e) => { if (activeDeckRef.current === 'A') handleCanPlay(e); }}
        onWaiting={() => { if (activeDeckRef.current === 'A') handleStalledOrWaiting(); }}
        onStalled={() => { if (activeDeckRef.current === 'A') handleStalledOrWaiting(); }}
        onPlaying={() => {
          if (activeDeckRef.current !== 'A') return;
          lastListenTickRef.current = Date.now();
          if (isPlaying && shouldLoadStems && !stemsBroken) {
            vocalsRef.current?.play().catch(e=>e); drumsRef.current?.play().catch(e=>e); bassRef.current?.play().catch(e=>e); otherRef.current?.play().catch(e=>e);
          }
        }}
        onSeeking={() => {
          if (activeDeckRef.current !== 'A') return;
          if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
            recordListeningDuration(currentTrack.id, pendingListenDurationRef.current);
            pendingListenDurationRef.current = 0;
          }
          lastListenTickRef.current = null;
          if (preloadAbortRef.current) { preloadAbortRef.current.abort(); preloadAbortRef.current = null; }
        }}
        onSeeked={() => {
          if (activeDeckRef.current !== 'A') return;
          if (isPlaying && deckARef.current && !deckARef.current.paused) {
            lastListenTickRef.current = Date.now();
          }
        }}
        onPause={() => {
          if (activeDeckRef.current !== 'A') return;
          if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
            recordListeningDuration(currentTrack.id, pendingListenDurationRef.current);
            pendingListenDurationRef.current = 0;
          }
          lastListenTickRef.current = null;
          if (stallRecoveryTimerRef.current) { clearTimeout(stallRecoveryTimerRef.current); stallRecoveryTimerRef.current = null; }
          if (preloadAbortRef.current) { preloadAbortRef.current.abort(); preloadAbortRef.current = null; }
        }}
        preload="auto"
        playsInline
        muted={isMixerActive || isMuted}
        loop={playMode === 'repeat-one'}
        onError={async () => {
          if (activeDeckRef.current !== 'A' || !currentTrack?.url) return;
          const cdn = getCdnUrl(currentTrack.url);
          console.warn("⚠️ Audio playback error encountered for track:", currentTrack.title, cdn);
          if (blobCacheRef.current.has(cdn)) {
            const oldBUrl = blobCacheRef.current.get(cdn);
            try { URL.revokeObjectURL(oldBUrl); } catch (e) {}
            blobCacheRef.current.delete(cdn);
          }
          if (typeof window !== "undefined" && 'caches' in window) {
            try {
              const appCache = await caches.open(AUDIO_CACHE_NAME);
              await appCache.delete(cdn);
              const swCache = await caches.open('euphony-cloudinary-audio-v2');
              await swCache.delete(cdn);
              const oldSwCache = await caches.open('euphony-cloudinary-audio-v1');
              await oldSwCache.delete(cdn);
            } catch (e) {}
          }
          try { localStorage.removeItem("euphony_current_time"); } catch (e) {}
          if (deckARef.current) {
            const separator = cdn.includes('?') ? '&' : '?';
            const freshUrl = `${cdn}${separator}recovery_cb=${Date.now()}`;
            console.log("🔄 Retrying audio directly from clean network URL:", freshUrl);
            deckARef.current.src = freshUrl;
            deckARef.current.currentTime = 0;
            deckARef.current.load();
            if (isPlaying) deckARef.current.play().catch(e => e);
          }
        }}
        className="loop-audio-fix"
      />
      {/* DECK B */}
      <audio
        ref={deckBRef}
        onLoadedMetadata={(e) => {
          const dur = e.target.duration;
          if (isFinite(dur) && dur > 0) {
            deckBRef.current._cachedDuration = dur;
            if (activeDeckRef.current === 'B') {
              setDuration(dur);
            }
          }
          if (activeDeckRef.current === 'B') {
            if (!restoreInitialTimeHandlerRef.current && (!jamRoomIdRef.current || isJamLeaderRef.current)) {
              if (e.target.currentTime !== 0 && !isCrossfadingRef.current) {
                try { e.target.currentTime = 0; } catch (err) {}
              }
              if (!isCrossfadingRef.current) setCurrentTime(0);
            }
            updateProgressVisuals();
          }
        }}
        onTimeUpdate={() => {
          if (isCrossfadingRef.current && crossfadeProgressUpdaterRef.current) {
            crossfadeProgressUpdaterRef.current();
          }
          if (activeDeckRef.current !== 'B') return;
          const activeEl = deckBRef.current;
          if (activeEl && isFinite(activeEl.duration) && activeEl.duration > 0) {
            setDuration(prev => (Math.abs(prev - activeEl.duration) > 0.8 ? activeEl.duration : prev));
          }
          setCurrentTime(activeEl?.currentTime || 0);
          handleTimeUpdateRef.current && handleTimeUpdateRef.current();
        }}
        onEnded={() => {
          if (activeDeckRef.current !== 'B') {
            if (isCrossfadingRef.current) {
              stopCrossfade(true);
            } else {
              try { deckBRef.current?.pause(); if (deckBRef.current) deckBRef.current.src = ""; } catch (err) {}
            }
            return;
          }
          if (jamRoomIdRef.current && !isJamLeaderRef.current) {
            return;
          }
          handleTrackEnded();
        }}
        onCanPlay={(e) => { if (activeDeckRef.current === 'B') handleCanPlay(e); }}
        onWaiting={() => { if (activeDeckRef.current === 'B') handleStalledOrWaiting(); }}
        onStalled={() => { if (activeDeckRef.current === 'B') handleStalledOrWaiting(); }}
        onPlaying={() => {
          if (activeDeckRef.current !== 'B') return;
          lastListenTickRef.current = Date.now();
          if (isPlaying && shouldLoadStems && !stemsBroken) {
            vocalsRef.current?.play().catch(e=>e); drumsRef.current?.play().catch(e=>e); bassRef.current?.play().catch(e=>e); otherRef.current?.play().catch(e=>e);
          }
        }}
        onSeeking={() => {
          if (activeDeckRef.current !== 'B') return;
          if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
            recordListeningDuration(currentTrack.id, pendingListenDurationRef.current);
            pendingListenDurationRef.current = 0;
          }
          lastListenTickRef.current = null;
          if (preloadAbortRef.current) { preloadAbortRef.current.abort(); preloadAbortRef.current = null; }
        }}
        onSeeked={() => {
          if (activeDeckRef.current !== 'B') return;
          if (isPlaying && deckBRef.current && !deckBRef.current.paused) {
            lastListenTickRef.current = Date.now();
          }
        }}
        onPause={() => {
          if (activeDeckRef.current !== 'B') return;
          if (pendingListenDurationRef.current > 0.1 && currentTrack?.id) {
            recordListeningDuration(currentTrack.id, pendingListenDurationRef.current);
            pendingListenDurationRef.current = 0;
          }
          lastListenTickRef.current = null;
          if (stallRecoveryTimerRef.current) { clearTimeout(stallRecoveryTimerRef.current); stallRecoveryTimerRef.current = null; }
          if (preloadAbortRef.current) { preloadAbortRef.current.abort(); preloadAbortRef.current = null; }
        }}
        preload="auto"
        playsInline
        muted={isMixerActive || isMuted}
        loop={playMode === 'repeat-one'}
        onError={async () => {
          if (activeDeckRef.current !== 'B' || !currentTrack?.url) return;
          const cdn = getCdnUrl(currentTrack.url);
          console.warn("⚠️ Audio playback error encountered for track:", currentTrack.title, cdn);
          if (blobCacheRef.current.has(cdn)) {
            const oldBUrl = blobCacheRef.current.get(cdn);
            try { URL.revokeObjectURL(oldBUrl); } catch (e) {}
            blobCacheRef.current.delete(cdn);
          }
          if (typeof window !== "undefined" && 'caches' in window) {
            try {
              const appCache = await caches.open(AUDIO_CACHE_NAME);
              await appCache.delete(cdn);
              const swCache = await caches.open('euphony-cloudinary-audio-v2');
              await swCache.delete(cdn);
              const oldSwCache = await caches.open('euphony-cloudinary-audio-v1');
              await oldSwCache.delete(cdn);
            } catch (e) {}
          }
          try { localStorage.removeItem("euphony_current_time"); } catch (e) {}
          if (deckBRef.current) {
            const separator = cdn.includes('?') ? '&' : '?';
            const freshUrl = `${cdn}${separator}recovery_cb=${Date.now()}`;
            console.log("🔄 Retrying audio directly from clean network URL:", freshUrl);
            deckBRef.current.src = freshUrl;
            deckBRef.current.currentTime = 0;
            deckBRef.current.load();
            if (isPlaying) deckBRef.current.play().catch(e => e);
          }
        }}
        className="loop-audio-fix"
      />
      <audio ref={vocalsRef} src={shouldLoadStems ? (getCdnUrl(currentTrack?.stem_vocals) || undefined) : undefined} preload={shouldLoadStems ? "auto" : "none"} playsInline muted={!isMixerActive || isMuted || stemVolumes.vocals === 0} loop={playMode === 'repeat-one'} onError={() => {}} className="loop-audio-fix" />
      <audio ref={drumsRef}  src={shouldLoadStems ? (getCdnUrl(currentTrack?.stem_drums)  || undefined) : undefined} preload={shouldLoadStems ? "auto" : "none"} playsInline muted={!isMixerActive || isMuted || stemVolumes.drums === 0} loop={playMode === 'repeat-one'} onError={() => {}} className="loop-audio-fix" />
      <audio ref={bassRef}   src={shouldLoadStems ? (getCdnUrl(currentTrack?.stem_bass)   || undefined) : undefined} preload={shouldLoadStems ? "auto" : "none"} playsInline muted={!isMixerActive || isMuted || stemVolumes.bass === 0} loop={playMode === 'repeat-one'} onError={() => {}} className="loop-audio-fix" />
      <audio ref={otherRef}  src={shouldLoadStems ? (getCdnUrl(currentTrack?.stem_other)  || undefined) : undefined} preload={shouldLoadStems ? "auto" : "none"} playsInline muted={!isMixerActive || isMuted || stemVolumes.other === 0} loop={playMode === 'repeat-one'} onError={() => {}} className="loop-audio-fix" />

      {/* TOASTS */}
      {renderQueueToast && (() => {
        const isCrossfadeToast = typeof safeQueueToast === "string" && safeQueueToast.startsWith("Crossfade enabled");
        return (
          <div
            className={queueToastClosing ? "toast-exit" : "toast-enter"}
            style={isCrossfadeToast ? {
              position: "fixed",
              top: "80px",
              left: "50%",
              background: COLORS.primary,
              color: COLORS.bgPanel,
              padding: "8px 18px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "700",
              zIndex: 10010,
              boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
              pointerEvents: "none",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              width: "max-content",
              maxWidth: "92vw",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1.2
            } : {
              position: "fixed",
              top: "80px",
              left: "50%",
              background: COLORS.primary,
              color: COLORS.bgPanel,
              padding: "10px 20px",
              borderRadius: "20px",
              fontSize: "14px",
              fontWeight: "600",
              zIndex: 10010,
              boxShadow: "0 8px 16px rgba(0,0,0,0.25)",
              pointerEvents: "none",
              transform: "translateX(-50%)",
              maxWidth: "85vw",
              textAlign: "center"
            }}
          >
            {safeQueueToast}
          </div>
        );
      })()}
      {renderExitToast && (
        <div className={exitToastClosing ? "toast-exit" : "toast-enter"} style={{ position: "fixed", bottom: isDesktop ? "40px" : "100px", left: "50%", background: COLORS.primary, color: COLORS.bgPanel, padding: "12px 24px", borderRadius: "24px", fontSize: "14px", fontWeight: "600", zIndex: 10010, backdropFilter: "blur(8px)", boxShadow: "0 8px 16px rgba(0,0,0,0.2)", pointerEvents: "none", transform: "translateX(-50%)", whiteSpace: "nowrap" }}>
          Press back again to exit
        </div>
      )}

      {/* OVERLAY LOADER */}
      {renderLoader && (
        <div className={loaderClosing ? "fade-exit" : "fade-enter"} style={{ position: "fixed", inset: 0, zIndex: 9999, background: COLORS.bgBase, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: COLORS.primary }}>
          <Loader2 className="animate-spin" size={48} />
          <p style={{ marginTop: "16px", fontWeight: "500" }}>Loading your tracks...</p>
        </div>
      )}

      {/* UPLOAD MODAL */}
      {renderUpload && (
        <div className={uploadClosing ? "fade-exit" : "fade-enter"} style={{ position: "fixed", inset: 0, background: songTheme.modalOverlay, backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5500, padding: "20px" }} onClick={() => setShowUploadModal(false)}>
          <div className={`${uploadClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`} style={{ background: songTheme.modalBg, backdropFilter: "blur(24px)", border: songTheme.modalBorder, boxShadow: songTheme.modalShadow, padding: "32px", borderRadius: "20px", width: "100%", maxWidth: "400px", position: "relative", maxHeight: "90vh", overflowY: "auto", color: songTheme.textColor }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowUploadModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: songTheme.textColor, cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: songTheme.textColor }}><UploadCloud color={songTheme.textColor} /> Add Song Globally</h2>
            <form onSubmit={handleUploadSubmit}>
              <input type="text" placeholder="Song Title *" required value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} className="upload-input glass-row" style={{ color: songTheme.textColor, background: songTheme.rowBg, border: songTheme.rowBorder }} />
              {/* Artist Name Input with Multi-Artist Auto-Recommendation */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="Artist Name (e.g. Arijit Singh, Shreya Ghoshal) *"
                  required
                  value={uploadArtist}
                  onFocus={() => setShowArtistSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowArtistSuggestions(false), 220)}
                  onKeyDown={(e) => {
                    if (!showArtistSuggestions) return;
                    const totalOptions = artistSuggestions.length + (currentArtistToken && isCurrentArtistNew ? 1 : 0);
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveArtistIndex(prev => (prev + 1) % (totalOptions || 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveArtistIndex(prev => (prev - 1 + (totalOptions || 1)) % (totalOptions || 1));
                    } else if (e.key === "Enter" && activeArtistIndex >= 0) {
                      e.preventDefault();
                      if (activeArtistIndex < artistSuggestions.length) {
                        handleSelectArtist(artistSuggestions[activeArtistIndex]);
                      } else if (currentArtistToken && isCurrentArtistNew) {
                        handleAddNewArtist(currentArtistToken);
                      }
                    } else if (e.key === "Escape") {
                      setShowArtistSuggestions(false);
                      setActiveArtistIndex(-1);
                    }
                  }}
                  onChange={e => {
                    setUploadArtist(e.target.value);
                    setShowArtistSuggestions(true);
                    setActiveArtistIndex(-1);
                  }}
                  className="upload-input glass-row"
                  style={{ color: songTheme.textColor, background: songTheme.rowBg, border: songTheme.rowBorder, marginBottom: 0, width: "100%" }}
                />
                {showArtistSuggestions && (artistSuggestions.length > 0 || (currentArtistToken && isCurrentArtistNew)) && (
                  <div
                    className="custom-scrollbar"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: songTheme.modalBg,
                      backdropFilter: "blur(28px)",
                      WebkitBackdropFilter: "blur(28px)",
                      border: songTheme.modalBorder,
                      borderRadius: "14px",
                      boxShadow: songTheme.modalShadow,
                      maxHeight: "190px",
                      overflowY: "auto",
                      zIndex: 6000,
                      padding: "6px"
                    }}
                  >
                    {artistSuggestions.map((artist, idx) => {
                      const isHighlighted = idx === activeArtistIndex;
                      return (
                        <div
                          key={artist}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectArtist(artist);
                          }}
                          className="hover-effect"
                          style={{
                            padding: "9px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: songTheme.textColor,
                            background: isHighlighted ? songTheme.rowBg : "transparent",
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={() => setActiveArtistIndex(idx)}
                        >
                          <User size={14} style={{ opacity: 0.6 }} />
                          <span>{artist}</span>
                        </div>
                      );
                    })}
                    {currentArtistToken && isCurrentArtistNew && (
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleAddNewArtist(currentArtistToken);
                        }}
                        className="hover-effect"
                        style={{
                          padding: "9px 12px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "13px",
                          fontWeight: "600",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          color: COLORS.spotifyGreen,
                          borderTop: songTheme.rowBorder,
                          marginTop: artistSuggestions.length > 0 ? "4px" : 0,
                          background: activeArtistIndex === artistSuggestions.length ? songTheme.rowBg : "transparent"
                        }}
                        onMouseEnter={() => setActiveArtistIndex(artistSuggestions.length)}
                      >
                        <Plus size={14} />
                        <span>Add &quot;{currentArtistToken}&quot; as new artist</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Album Name Input with Auto-Recommendation */}
              <div style={{ position: "relative", marginBottom: "16px" }}>
                <input
                  type="text"
                  placeholder="Album Name (Optional)"
                  value={uploadAlbum}
                  onFocus={() => setShowAlbumSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowAlbumSuggestions(false), 220)}
                  onKeyDown={(e) => {
                    if (!showAlbumSuggestions || albumSuggestions.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setActiveAlbumIndex(prev => (prev + 1) % albumSuggestions.length);
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveAlbumIndex(prev => (prev - 1 + albumSuggestions.length) % albumSuggestions.length);
                    } else if (e.key === "Enter" && activeAlbumIndex >= 0) {
                      e.preventDefault();
                      handleSelectAlbum(albumSuggestions[activeAlbumIndex]);
                    } else if (e.key === "Escape") {
                      setShowAlbumSuggestions(false);
                      setActiveAlbumIndex(-1);
                    }
                  }}
                  onChange={e => {
                    setUploadAlbum(e.target.value);
                    setShowAlbumSuggestions(true);
                    setActiveAlbumIndex(-1);
                  }}
                  className="upload-input glass-row"
                  style={{ color: songTheme.textColor, background: songTheme.rowBg, border: songTheme.rowBorder, marginBottom: 0, width: "100%" }}
                />
                {showAlbumSuggestions && albumSuggestions.length > 0 && (
                  <div
                    className="custom-scrollbar"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: songTheme.modalBg,
                      backdropFilter: "blur(28px)",
                      WebkitBackdropFilter: "blur(28px)",
                      border: songTheme.modalBorder,
                      borderRadius: "14px",
                      boxShadow: songTheme.modalShadow,
                      maxHeight: "170px",
                      overflowY: "auto",
                      zIndex: 6000,
                      padding: "6px"
                    }}
                  >
                    {albumSuggestions.map((album, idx) => {
                      const isHighlighted = idx === activeAlbumIndex;
                      return (
                        <div
                          key={album}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectAlbum(album);
                          }}
                          className="hover-effect"
                          style={{
                            padding: "9px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: "500",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: songTheme.textColor,
                            background: isHighlighted ? songTheme.rowBg : "transparent",
                            transition: "background 0.15s ease"
                          }}
                          onMouseEnter={() => setActiveAlbumIndex(idx)}
                        >
                          <Disc size={14} style={{ opacity: 0.6 }} />
                          <span>{album}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <textarea placeholder="Paste Lyrics Here (Optional)" value={uploadLyrics} onChange={e => setUploadLyrics(e.target.value)} className="upload-input glass-row custom-scrollbar" style={{ minHeight: "100px", resize: "vertical", color: songTheme.textColor, background: songTheme.rowBg, border: songTheme.rowBorder }} />
              
              {/* Mood Selection Pills - EXCLUSIVE TO OWNER */}
              {isOwner && (
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: songTheme.textMuted, marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>Mood / Vibe (Optional)</span>
                    <span style={{ fontSize: "10px", color: COLORS.primary, background: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(26,43,76,0.08)", padding: "1px 6px", borderRadius: "6px", fontWeight: "700" }}>Owner</span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {AVAILABLE_MOODS.map(m => {
                      const isSelected = uploadMood === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setUploadMood(isSelected ? "" : m.id)}
                          style={{
                            background: isSelected ? m.color : songTheme.rowBg,
                            color: isSelected ? "#fff" : songTheme.textColor,
                            border: isSelected ? `1px solid ${m.color}` : songTheme.rowBorder,
                            borderRadius: "20px",
                            padding: "6px 14px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.15s ease",
                            boxShadow: isSelected ? `0 4px 10px ${m.color}40` : "none"
                          }}
                          className="hover-effect"
                        >
                          <span>{m.emoji}</span>
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="glass-row" style={{ marginBottom: "16px", padding: "14px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "12px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: songTheme.textMuted, fontSize: "14px" }}>Poster Image *</label>
                <input type="file" accept="image/*" required onChange={e => setUploadPoster(e.target.files[0])} style={{ color: songTheme.textColor, width: "100%" }} />
              </div>
              <div className="glass-row" style={{ marginBottom: "24px", padding: "14px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "12px" }}>
                <label style={{ display: "block", marginBottom: "8px", color: songTheme.textMuted, fontSize: "14px" }}>MP3 Audio File *</label>
                <input type="file" accept="audio/*" required onChange={e => setUploadFile(e.target.files[0])} style={{ color: songTheme.textColor, width: "100%" }} />
              </div>
              <button type="submit" disabled={isUploading} className="glass-btn-primary" style={{ width: "100%", padding: "14px", cursor: isUploading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {isUploading ? <><Loader2 size={18} className="animate-spin" /> Uploading...</> : "Upload to Cloud"}
              </button>
            </form>
          </div>
        </div>
      )}      {/* PASSWORD RESET MODAL */}
        {showPasswordResetModal && (
          <div className="fade-enter" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 6000, padding: "20px" }}>
            <div className="pop-enter" style={{ background: "#000000", padding: "40px", borderRadius: "16px", width: "100%", maxWidth: "400px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", border: "1px solid #333", display: "flex", flexDirection: "column", alignItems: "center" }} onClick={e => e.stopPropagation()}>
              <img src="/logo.png" alt="Euphony Logo" style={{ width: "72px", height: "72px", marginBottom: "24px", borderRadius: "16px", border: "2px solid rgba(255, 255, 255, 0.4)" }} />
              <h2 style={{ margin: "0 0 8px 0", fontSize: "24px", color: "#FFFFFF", fontWeight: "600" }}>Reset Password</h2>
              <p style={{ margin: "0 0 32px 0", fontSize: "15px", color: "#a1a1a6", textAlign: "center" }}>Enter your new password below.</p>
              <form onSubmit={handlePasswordReset} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
                <div style={{ border: "2px solid transparent", borderRadius: "12px", background: "#1C1C1E", transition: "border 0.2s ease" }} onFocus={(e) => e.currentTarget.style.border = "2px solid #FA243C"} onBlur={(e) => e.currentTarget.style.border = "2px solid transparent"}>
                  <input
                    type="password"
                    placeholder="New Password"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    required
                    style={{ width: "100%", padding: "16px", background: "transparent", border: "none", color: "white", outline: "none", boxSizing: "border-box", fontSize: "16px", borderRadius: "12px" }}
                  />
                </div>
                <button type="submit" disabled={resetPasswordLoading} style={{ padding: "16px", borderRadius: "12px", background: "#FA243C", color: "#FFFFFF", fontWeight: "bold", fontSize: "16px", border: "none", cursor: resetPasswordLoading ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", opacity: resetPasswordLoading || !resetPasswordInput ? 0.5 : 1, transition: "opacity 0.2s" }}>
                  {resetPasswordLoading && <Loader2 size={18} className="animate-spin" />}
                  Update Password
                </button>
              </form>
            </div>
          </div>
        )}
  
        {/* CREATE PLAYLIST MODAL */}
      {renderPlaylistModal && (
        <div className={playlistModalClosing ? "fade-exit" : "fade-enter"} style={{ position: "fixed", inset: 0, background: songTheme.modalOverlay, backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10005, padding: "20px" }} onClick={() => setShowPlaylistModal(false)}>
          <div className={`${playlistModalClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`} style={{ background: songTheme.modalBg, backdropFilter: "blur(24px)", border: songTheme.modalBorder, padding: "32px", borderRadius: "20px", width: "100%", maxWidth: "380px", position: "relative", boxShadow: songTheme.modalShadow, color: songTheme.textColor }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPlaylistModal(false)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: songTheme.textColor, cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "8px", color: songTheme.textColor, fontWeight: "800" }}><FolderPlus color={songTheme.textColor} /> Create Private Playlist</h2>
            <form onSubmit={handleCreatePlaylist}>
              <input type="text" placeholder="Playlist Name *" required value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)} className="upload-input glass-row" style={{ color: songTheme.textColor, background: songTheme.rowBg, border: songTheme.rowBorder }} />
              <button type="submit" style={{ width: "100%", padding: "14px" }} className="glass-btn-primary">Save Playlist</button>
            </form>
          </div>
        </div>
      )}

      {/* KEYBOARD SHORTCUTS MODAL */}
      {renderShortcuts && (
        <div 
          className={shortcutsClosing ? "fade-exit" : "fade-enter"} 
          style={{ position: "fixed", inset: 0, background: songTheme.modalOverlay, backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10006, padding: "20px" }} 
          onClick={() => setShowShortcutsModal(false)}
        >
          <div 
            className={`${shortcutsClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`} 
            style={{ background: songTheme.modalBg, backdropFilter: "blur(24px)", border: songTheme.modalBorder, padding: "28px", borderRadius: "20px", width: "100%", maxWidth: "440px", position: "relative", boxShadow: songTheme.modalShadow, color: songTheme.textColor, maxHeight: "90vh", overflowY: "auto" }} 
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowShortcutsModal(false)} style={{ position: "absolute", top: "18px", right: "18px", background: "none", border: "none", color: songTheme.textColor, cursor: "pointer" }} className="hover-effect">
              <X size={20} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Keyboard size={22} color={COLORS.spotifyGreen} />
              <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: songTheme.textColor, letterSpacing: "-0.3px" }}>Keyboard Shortcuts</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { key: "Space", label: "Play / Pause" },
                { key: "←  /  →", label: "Seek backward / forward 5s" },
                { key: "Shift + ←  /  →", label: "Previous / Next track" },
                { key: "↑  /  ↓", label: "Volume up / down (5%)" },
                { key: "M", label: "Mute / Unmute" },
                { key: "L", label: "Toggle Lyrics" },
                { key: "S", label: "Toggle Stem Mixer" },
                { key: "Q", label: "Toggle Queue" },
                { key: "C", label: "Crossfade Settings" },
                { key: "F", label: "Toggle Fullscreen Player" },
                { key: "?", label: "Toggle this guide" },
                { key: "Esc", label: "Close modal / Fullscreen" }
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "12px" }}>
                  <span style={{ fontSize: "13px", color: songTheme.textColor, fontWeight: "500" }}>{item.label}</span>
                  <kbd style={{ background: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(26,43,76,0.1)", border: isDarkMode ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(26,43,76,0.18)", borderRadius: "6px", padding: "3px 8px", fontSize: "12px", fontWeight: "700", fontFamily: "monospace", color: isDarkMode ? "#FFFFFF" : COLORS.primary, boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
                    {item.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PERSONAL LISTENING STATS MODAL */}
      {renderStats && (
        <div 
          className={statsClosing ? "fade-exit" : "fade-enter"} 
          style={{ position: "fixed", inset: 0, background: songTheme.modalOverlay, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", display: "flex", alignItems: isDesktop ? "center" : "flex-end", justifyContent: "center", zIndex: 10006, padding: isDesktop ? "20px" : "0" }} 
          onClick={handleCloseStatsModal}
        >
          {isDesktop ? (
            <div 
              className={`${statsClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`} 
              style={{ background: songTheme.modalBg, backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)", border: songTheme.modalBorder, padding: "32px", borderRadius: "24px", width: "100%", maxWidth: "520px", position: "relative", boxShadow: songTheme.modalShadow, color: songTheme.textColor, maxHeight: "85vh", overflowY: "auto" }} 
              onClick={e => e.stopPropagation()}
            >
              <button onClick={handleCloseStatsModal} style={{ position: "absolute", top: "20px", right: "20px", background: "none", border: "none", color: songTheme.textColor, cursor: "pointer" }} className="hover-effect">
                <X size={20} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "linear-gradient(135deg, #4da6ff, #9933ff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <BarChart2 size={20} color="#fff" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: songTheme.textColor, letterSpacing: "-0.3px" }}>Listening Stats</h2>
                  <span style={{ fontSize: "12px", color: songTheme.textMuted }}>Synced for {session?.user?.email || "your account"}</span>
                </div>
              </div>

              {/* 4 Metrics Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
                <div style={{ background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "11px", color: songTheme.textMuted, fontWeight: "600", textTransform: "uppercase" }}>Time Listened</span>
                  <span style={{ fontSize: "24px", fontWeight: "800", color: COLORS.spotifyGreen }}>{listeningStats.formattedTime}</span>
                </div>
                <div style={{ background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "11px", color: songTheme.textMuted, fontWeight: "600", textTransform: "uppercase" }}>Total Plays</span>
                  <span style={{ fontSize: "24px", fontWeight: "800", color: COLORS.primary }}>{listeningStats.totalPlays}</span>
                  <span style={{ fontSize: "11px", color: songTheme.textMuted }}>songs played</span>
                </div>
                <div style={{ background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "11px", color: songTheme.textMuted, fontWeight: "600", textTransform: "uppercase" }}>Top Artist</span>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: songTheme.textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{listeningStats.topArtist || "—"}</span>
                  <span style={{ fontSize: "11px", color: songTheme.textMuted }}>{listeningStats.topArtistPlays > 0 ? `${listeningStats.topArtistPlays} plays` : "No plays yet"}</span>
                </div>
                <div style={{ background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "16px", padding: "16px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "11px", color: songTheme.textMuted, fontWeight: "600", textTransform: "uppercase" }}>Favorite Mood</span>
                  <span style={{ fontSize: "16px", fontWeight: "700", color: songTheme.textColor }}>{listeningStats.topMood ? `${AVAILABLE_MOODS.find(m => m.id === listeningStats.topMood)?.emoji || ''} ${listeningStats.topMood}` : "—"}</span>
                  <span style={{ fontSize: "11px", color: songTheme.textMuted }}>most listened vibe</span>
                </div>
              </div>

              {/* Reset Option */}
              {listeningStats.hasData && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button
                    onClick={() => {
                      if (window.confirm("Reset your listening stats for this account across all devices?")) {
                        clearListeningHistory(session?.user?.id);
                        pendingListenDurationRef.current = 0;
                        sessionListenDurationRef.current = 0;
                        setRecentlyPlayedIds([]);
                        setPlayCounts({});
                      }
                    }}
                    style={{ background: "transparent", border: "none", color: songTheme.textMuted, fontSize: "12px", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Reset Listening Stats
                  </button>
                </div>
              )}
            </div>
          ) : (
            <SwipeableBottomSheet
              onClose={handleCloseStatsModal}
              className={`${statsClosing ? 'slide-down-exit' : 'slide-up-enter'} custom-scrollbar`}
              style={{
                background: songTheme.modalBg,
                backdropFilter: "blur(28px)",
                WebkitBackdropFilter: "blur(28px)",
                borderTop: songTheme.modalBorder,
                padding: "24px",
                borderRadius: "24px 24px 0 0",
                width: "100%",
                maxWidth: "520px",
                position: "relative",
                maxHeight: "85vh",
                overflowY: "auto",
                boxShadow: songTheme.modalShadow,
                color: songTheme.textColor
              }}
            >
              <div style={{ width: "40px", height: "4px", background: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(26,43,76,0.2)", borderRadius: "2px", margin: "0 auto 20px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #4da6ff, #9933ff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BarChart2 size={20} color="#fff" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: songTheme.textColor }}>Listening Stats</h2>
                    <span style={{ fontSize: "12px", color: songTheme.textMuted }}>Synced for {session?.user?.email || "your account"}</span>
                  </div>
                </div>
                <button
                  onClick={handleCloseStatsModal}
                  style={{
                    background: isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(26, 43, 76, 0.08)",
                    border: "none",
                    color: songTheme.textColor,
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                  className="hover-effect"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 4 Metrics Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
                <div style={{ background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: songTheme.textMuted, fontWeight: "600", textTransform: "uppercase" }}>Time Listened</span>
                  <span style={{ fontSize: "20px", fontWeight: "800", color: COLORS.spotifyGreen }}>{listeningStats.formattedTime}</span>
                </div>
                <div style={{ background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: songTheme.textMuted, fontWeight: "600", textTransform: "uppercase" }}>Total Plays</span>
                  <span style={{ fontSize: "20px", fontWeight: "800", color: COLORS.primary }}>{listeningStats.totalPlays}</span>
                  <span style={{ fontSize: "10px", color: songTheme.textMuted }}>songs played</span>
                </div>
                <div style={{ background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: songTheme.textMuted, fontWeight: "600", textTransform: "uppercase" }}>Top Artist</span>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: songTheme.textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{listeningStats.topArtist || "—"}</span>
                  <span style={{ fontSize: "10px", color: songTheme.textMuted }}>{listeningStats.topArtistPlays > 0 ? `${listeningStats.topArtistPlays} plays` : "No plays yet"}</span>
                </div>
                <div style={{ background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px", padding: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: songTheme.textMuted, fontWeight: "600", textTransform: "uppercase" }}>Favorite Mood</span>
                  <span style={{ fontSize: "14px", fontWeight: "700", color: songTheme.textColor }}>{listeningStats.topMood ? `${AVAILABLE_MOODS.find(m => m.id === listeningStats.topMood)?.emoji || ''} ${listeningStats.topMood}` : "—"}</span>
                  <span style={{ fontSize: "10px", color: songTheme.textMuted }}>most listened</span>
                </div>
              </div>

              {/* Reset Option */}
              {listeningStats.hasData && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                  <button
                    onClick={() => {
                      if (window.confirm("Reset your listening stats for this account across all devices?")) {
                        clearListeningHistory(session?.user?.id);
                        pendingListenDurationRef.current = 0;
                        sessionListenDurationRef.current = 0;
                        setRecentlyPlayedIds([]);
                        setPlayCounts({});
                      }
                    }}
                    style={{ background: "transparent", border: "none", color: songTheme.textMuted, fontSize: "11px", cursor: "pointer", textDecoration: "underline" }}
                  >
                    Reset Listening Stats
                  </button>
                </div>
              )}
            </SwipeableBottomSheet>
          )}
        </div>
      )}

      {/* SLEEP TIMER MODAL */}
      {renderSleepTimer && (
        <div className={sleepTimerClosing ? "fade-exit" : "fade-enter"} style={{ position: "fixed", inset: 0, background: songTheme.modalOverlay, backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10005, padding: "20px" }} onClick={() => { openedFromTrackOptionsRef.current = false; setShowSleepTimerModal(false); }}>
          <div className={`${sleepTimerClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`} style={{ background: songTheme.modalBg, backdropFilter: "blur(24px)", border: songTheme.modalBorder, padding: "32px", borderRadius: "20px", width: "100%", maxWidth: "340px", position: "relative", maxHeight: "80vh", overflowY: "auto", boxShadow: songTheme.modalShadow, color: songTheme.textColor }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { openedFromTrackOptionsRef.current = false; setShowSleepTimerModal(false); }} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: songTheme.textColor, cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            <h2 style={{ margin: "0 0 24px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "10px", color: songTheme.textColor, fontWeight: "800", letterSpacing: "-0.3px" }}><Moon color={songTheme.textColor} size={22} /> Sleep Timer</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[5, 10, 20, 30, 60, 120].map(mins => (
                <div key={mins} onClick={() => handleSetSleepTimer(mins)} className="glass-row hover-effect" style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", color: songTheme.textColor, fontWeight: "700", cursor: "pointer", textAlign: "left", background: songTheme.rowBg, border: songTheme.rowBorder, transition: "all 0.2s" }}>
                  {mins === 60 ? "1 hour" : mins === 120 ? "2 hours" : `${mins} minutes`}
                </div>
              ))}
              <div style={{ margin: "8px 0", height: "1px", background: isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(26, 43, 76, 0.12)" }} />
              <button onClick={() => handleSetSleepTimer(0)} className={sleepTimerTarget ? "hover-effect" : "glass-row"} style={{ width: "100%", padding: "14px", borderRadius: "14px", background: sleepTimerTarget ? (isDarkMode ? "rgba(239, 68, 68, 0.25)" : "#ffebee") : (isDarkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(26, 43, 76, 0.04)"), border: sleepTimerTarget ? (isDarkMode ? "1px solid rgba(239, 68, 68, 0.5)" : "1px solid #ffcdd2") : (isDarkMode ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid rgba(26, 43, 76, 0.08)"), color: sleepTimerTarget ? (isDarkMode ? "#ff7b7b" : "#d32f2f") : songTheme.textMuted, fontWeight: "bold", cursor: "pointer", textAlign: "left" }}>
                Turn off timer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CROSSFADE MODAL (APPLE MUSIC STYLE) ── */}
      {renderCrossfade && (
        <div
          className={crossfadeClosing ? "fade-exit" : "fade-enter"}
          style={{
            position: "fixed",
            inset: 0,
            background: songTheme.modalOverlay,
            backdropFilter: "blur(18px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10005,
            padding: "20px"
          }}
          onClick={() => setShowCrossfadeModal(false)}
        >
          <div
            className={`${crossfadeClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`}
            style={{
              background: songTheme.modalBg,
              backdropFilter: "blur(24px)",
              border: songTheme.modalBorder,
              padding: "28px 24px",
              borderRadius: "24px",
              width: "100%",
              maxWidth: "380px",
              position: "relative",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: songTheme.modalShadow,
              color: songTheme.textColor
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowCrossfadeModal(false)}
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                background: "none",
                border: "none",
                color: songTheme.textColor,
                cursor: "pointer",
                padding: "6px"
              }}
              className="hover-effect"
            >
              <X size={22} />
            </button>

            {/* Title & Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "12px",
                  background: tempCrossfadeEnabled ? "linear-gradient(135deg, #1DB954 0%, #15883e 100%)" : (isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(26,43,76,0.08)"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: tempCrossfadeEnabled ? "0 4px 14px rgba(29, 185, 84, 0.4)" : "none",
                  transition: "all 0.3s ease"
                }}
              >
                <CrossfadeIcon size={22} color={tempCrossfadeEnabled ? "#FFFFFF" : songTheme.textColor} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", letterSpacing: "-0.3px", color: songTheme.textColor }}>
                  Crossfade
                </h2>
              </div>
            </div>

            <p style={{ margin: "10px 0 20px 0", fontSize: "13px", lineHeight: "1.5", color: songTheme.textMuted }}>
              Allows songs to blend smoothly into each other by fading out the current track while fading in the next.
            </p>

            {/* Toggle Switch Card */}
            <div
              style={{
                padding: "16px",
                borderRadius: "16px",
                background: songTheme.rowBg,
                border: songTheme.rowBorder,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
              }}
            >
              <div>
                <div style={{ fontWeight: "700", fontSize: "15px", color: songTheme.textColor }}>
                  Crossfade Songs
                </div>
                <div style={{ fontSize: "12px", color: tempCrossfadeEnabled ? COLORS.spotifyGreen : songTheme.textMuted, marginTop: "2px", fontWeight: "600" }}>
                  {tempCrossfadeEnabled ? `Active (${tempCrossfadeDuration}s transition)` : "Disabled"}
                </div>
              </div>

              {/* iOS Style Toggle Switch */}
              <button
                type="button"
                onClick={() => {
                  setTempCrossfadeEnabled(prev => !prev);
                }}
                style={{
                  width: "52px",
                  height: "30px",
                  borderRadius: "15px",
                  border: "none",
                  background: tempCrossfadeEnabled ? COLORS.spotifyGreen : (isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(26,43,76,0.2)"),
                  padding: "3px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  transition: "background-color 0.25s ease",
                  outline: "none"
                }}
                title={tempCrossfadeEnabled ? "Turn off crossfade" : "Turn on crossfade"}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                    transform: tempCrossfadeEnabled ? "translateX(22px)" : "translateX(0px)",
                    transition: "transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)"
                  }}
                />
              </button>
            </div>

            {/* Duration Slider & Presets (Visible when enabled) */}
            {tempCrossfadeEnabled && (
              <div className="fade-enter" style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "20px" }}>
                {/* Duration Value Box */}
                <div
                  style={{
                    padding: "16px",
                    borderRadius: "16px",
                    background: songTheme.rowBg,
                    border: songTheme.rowBorder
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: songTheme.textMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      Transition Length
                    </span>
                    <span
                      style={{
                        fontSize: "18px",
                        fontWeight: "800",
                        color: COLORS.spotifyGreen,
                        background: "rgba(29, 185, 84, 0.15)",
                        padding: "3px 10px",
                        borderRadius: "12px",
                        border: "1px solid rgba(29, 185, 84, 0.3)"
                      }}
                    >
                      {tempCrossfadeDuration}s
                    </span>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min={1}
                    max={12}
                    step={1}
                    value={tempCrossfadeDuration}
                    onChange={(e) => {
                      setTempCrossfadeDuration(Number(e.target.value));
                    }}
                    className={isDarkMode ? "glow-slider" : "glow-slider-light"}
                    style={{
                      width: "100%",
                      marginBottom: "14px",
                      borderRadius: "6px",
                      background: isDarkMode
                        ? `linear-gradient(to right, rgba(255,255,255,0.8) 0%, #FFFFFF ${((tempCrossfadeDuration - 1) / 11) * 100}%, rgba(255,255,255,0.15) ${((tempCrossfadeDuration - 1) / 11) * 100}%)`
                        : `linear-gradient(to right, #1A2B4C 0%, #1A2B4C ${((tempCrossfadeDuration - 1) / 11) * 100}%, rgba(26, 43, 76, 0.15) ${((tempCrossfadeDuration - 1) / 11) * 100}%)`
                    }}
                  />

                  {/* Quick Preset Pills */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px" }}>
                    {[2, 4, 6, 8, 10, 12].map(sec => {
                      const isSel = tempCrossfadeDuration === sec;
                      return (
                        <button
                          key={sec}
                          onClick={() => {
                            setTempCrossfadeDuration(sec);
                          }}
                          style={{
                            padding: "6px 0",
                            borderRadius: "8px",
                            border: isSel ? `1px solid ${COLORS.spotifyGreen}` : (isDarkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(26,43,76,0.1)"),
                            background: isSel ? "rgba(29, 185, 84, 0.2)" : "transparent",
                            color: isSel ? COLORS.spotifyGreen : songTheme.textColor,
                            fontSize: "12px",
                            fontWeight: isSel ? "800" : "600",
                            cursor: "pointer",
                            transition: "all 0.15s ease"
                          }}
                          className="hover-effect"
                        >
                          {sec}s
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visual Representation of Overlapping Audio Waves */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: "16px",
                    background: isDarkMode ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.6)",
                    border: songTheme.rowBorder,
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: songTheme.textMuted }}>
                    <span>Track 1 Fading Out</span>
                    <span>Track 2 Fading In</span>
                  </div>
                  {/* Crossover graphic */}
                  <div style={{ position: "relative", height: "36px", width: "100%", borderRadius: "8px", overflow: "hidden", background: isDarkMode ? "rgba(255,255,255,0.04)" : "rgba(26,43,76,0.04)" }}>
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to right, rgba(59, 130, 246, 0.7) 0%, rgba(59, 130, 246, 0) 80%)",
                        clipPath: "polygon(0 0, 100% 100%, 0 100%)"
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: `linear-gradient(to right, rgba(29, 185, 84, 0) 20%, ${COLORS.spotifyGreen} 100%)`,
                        clipPath: "polygon(100% 0, 100% 100%, 0 100%)"
                      }}
                    />
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "800", color: "#FFFFFF", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                      {tempCrossfadeDuration}s Blend Window
                    </div>
                  </div>
                  <div style={{ fontSize: "11px", color: songTheme.textMuted, textAlign: "center", marginTop: "2px" }}>
                    Transitions happen automatically on song completion & when clicking Next
                  </div>
                </div>
              </div>
            )}

            {/* Done Action Button */}
            <button
              onClick={() => {
                setCrossfadeEnabled(tempCrossfadeEnabled);
                setCrossfadeDuration(tempCrossfadeDuration);
                crossfadeEnabledRef.current = tempCrossfadeEnabled;
                crossfadeDurationRef.current = tempCrossfadeDuration;
                try {
                  localStorage.setItem("euphony_crossfade_enabled", String(tempCrossfadeEnabled));
                  localStorage.setItem("euphony_crossfade_duration", String(tempCrossfadeDuration));
                } catch (e) {}
                if (!tempCrossfadeEnabled && isCrossfadingRef.current) {
                  stopCrossfade(false);
                }
                triggerToast(tempCrossfadeEnabled ? `Crossfade enabled (${tempCrossfadeDuration}s)` : "Crossfade disabled");
                broadcastJamSync({
                  type: 'crossfade_update',
                  crossfadeEnabled: tempCrossfadeEnabled,
                  crossfadeDuration: tempCrossfadeDuration
                });
                setShowCrossfadeModal(false);
              }}
              className="hover-effect"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "14px",
                border: "none",
                background: COLORS.spotifyGreen,
                color: "#FFFFFF",
                fontSize: "15px",
                fontWeight: "800",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(29, 185, 84, 0.4)"
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
      
      {/* JAM SESSION MODAL */}
      {renderJam && (
        <div
          className={jamClosing ? "fade-exit" : "fade-enter"}
          style={{
            position: "fixed",
            inset: 0,
            background: songTheme.modalOverlay,
            backdropFilter: "blur(18px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10005,
            padding: "20px"
          }}
          onClick={() => setShowJamModal(false)}
        >
          <div
            className={`${jamClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`}
            style={{
              background: songTheme.modalBg,
              backdropFilter: "blur(24px)",
              border: songTheme.modalBorder,
              padding: "28px 24px",
              borderRadius: "20px",
              width: "100%",
              maxWidth: "380px",
              position: "relative",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: songTheme.modalShadow,
              color: songTheme.textColor
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowJamModal(false)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: songTheme.textColor, cursor: "pointer" }}
              className="hover-effect"
            >
              <X size={24} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(34, 197, 94, 0.2)", border: "1px solid rgba(34, 197, 94, 0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Radio size={20} color="#4ade80" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: "800", color: songTheme.textColor, letterSpacing: "-0.3px" }}>
                  Live Jam Session
                </h2>
                <p style={{ margin: 0, fontSize: "12px", color: songTheme.textMuted }}>
                  Listen along in real-time with friends
                </p>
              </div>
            </div>

            {jamRoomId ? (
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Active Session Info Box */}
                <div style={{ background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "16px", padding: "16px", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1px", color: "#4ade80", marginBottom: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#4ade80", boxShadow: "0 0 8px #4ade80" }} />
                    {isJamHost ? "Host • Shared Jam Session" : (jamHostName ? `Jam Session with ${jamHostName}` : "Shared Jam Session")}
                  </div>
                  <div style={{ fontSize: "32px", fontWeight: "900", letterSpacing: "4px", color: songTheme.textColor, margin: "8px 0" }}>
                    {jamRoomId}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", color: songTheme.textMuted }}>
                    <Users size={16} />
                    <span>{jamListenersCount} {jamListenersCount === 1 ? "listener" : "listeners"} connected</span>
                  </div>
                  <p style={{ margin: "10px 0 0 0", fontSize: "11px", color: songTheme.textMuted, lineHeight: "1.4" }}>
                    Everyone in this Jam can play, queue, skip, and adjust controls together in real time.
                  </p>
                </div>

                {/* Share / Copy buttons */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={shareJamRoom}
                    className="hover-effect"
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      background: COLORS.spotifyGreen,
                      border: "none",
                      color: "#FFFFFF",
                      fontWeight: "700",
                      fontSize: "14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      boxShadow: "0 4px 14px rgba(29, 185, 84, 0.4)"
                    }}
                  >
                    <Share2 size={16} /> Invite Friends
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?jam=${jamRoomId}`).then(() => {
                        triggerToast("Jam link copied to clipboard!");
                      });
                    }}
                    className="hover-effect"
                    title="Copy Link"
                    style={{
                      padding: "12px",
                      borderRadius: "12px",
                      background: songTheme.rowBg,
                      border: songTheme.rowBorder,
                      color: songTheme.textColor,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Copy size={16} />
                  </button>
                </div>

                {/* Leave Session */}
                <button
                  onClick={leaveJamSession}
                  className="hover-effect"
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "12px",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#f87171",
                    fontWeight: "700",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  Leave Session
                </button>
              </div>
            ) : (
              <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Host a new session */}
                <button
                  onClick={startJamSession}
                  className="hover-effect"
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "14px",
                    background: COLORS.spotifyGreen,
                    border: "none",
                    color: "#FFFFFF",
                    fontSize: "15px",
                    fontWeight: "800",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 4px 16px rgba(29, 185, 84, 0.4)"
                  }}
                >
                  <Radio size={18} /> Start a Jam Session
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
                  <div style={{ flex: 1, height: "1px", background: songTheme.rowBorder }} />
                  <span style={{ fontSize: "11px", fontWeight: "700", color: songTheme.textMuted, textTransform: "uppercase" }}>OR JOIN ONE</span>
                  <div style={{ flex: 1, height: "1px", background: songTheme.rowBorder }} />
                </div>

                {/* Join existing room by code */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    value={jamJoinCodeInput}
                    onChange={e => {
                      setJamJoinCodeInput(e.target.value.toUpperCase());
                      if (jamJoinError) setJamJoinError("");
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && !isCheckingJamCode) joinJamSession(); }}
                    placeholder="Enter 6-char Code"
                    maxLength={10}
                    disabled={isCheckingJamCode}
                    className="jam-code-input"
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: "12px",
                      background: songTheme.rowBg,
                      border: jamJoinError ? "1px solid #ef4444" : songTheme.rowBorder,
                      color: isDarkMode ? "#FFFFFF" : "#1A2B4C",
                      fontSize: "14px",
                      fontWeight: "700",
                      letterSpacing: "1px",
                      textTransform: "uppercase",
                      outline: "none"
                    }}
                  />
                  <button
                    onClick={() => joinJamSession()}
                    disabled={!jamJoinCodeInput.trim() || isCheckingJamCode}
                    className="hover-effect"
                    style={{
                      padding: "12px 18px",
                      borderRadius: "12px",
                      background: jamJoinCodeInput.trim() && !isCheckingJamCode ? COLORS.primary : (isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(26,43,76,0.08)"),
                      border: "none",
                      color: jamJoinCodeInput.trim() && !isCheckingJamCode ? COLORS.bgPanel : (isDarkMode ? "rgba(255,255,255,0.4)" : "rgba(26,43,76,0.4)"),
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: jamJoinCodeInput.trim() && !isCheckingJamCode ? "pointer" : "default"
                    }}
                  >
                    {isCheckingJamCode ? "Checking..." : "Join"}
                  </button>
                </div>
                {jamJoinError && (
                  <div style={{
                    color: "#f87171",
                    fontSize: "12px",
                    fontWeight: "700",
                    marginTop: "8px",
                    textAlign: "center"
                  }}>
                    {jamJoinError}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* TRACK OPTIONS MODAL */}
      {renderTrackOptions && (trackForOptions || currentTrack) && (() => {
        const targetTrackForOptions = trackForOptions || currentTrack;
        const currentAssignedMoods = getSongMoods(targetTrackForOptions, customMoodOverrides);
        const hasManualOverride = !!customMoodOverrides[targetTrackForOptions.id] || (targetTrackForOptions.lyrics && /\[mood:\s*[a-zA-Z\s]+\]/i.test(targetTrackForOptions.lyrics));
        return (
          <div className={trackOptionsClosing ? "fade-exit" : "fade-enter"} style={{ position: "fixed", inset: 0, background: songTheme.modalOverlay, backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10005, padding: "20px" }} onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackOptionsModal(false); setTrackForOptions(null); }}>
            <div className={`${trackOptionsClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`} style={{ background: songTheme.modalBg, backdropFilter: "blur(24px)", border: songTheme.modalBorder, padding: "28px 24px", borderRadius: "20px", width: "100%", maxWidth: "350px", position: "relative", maxHeight: "85vh", overflowY: "auto", boxShadow: songTheme.modalShadow, color: songTheme.textColor }} onClick={e => e.stopPropagation()}>
              <button onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackOptionsModal(false); setTrackForOptions(null); }} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#FFFFFF", cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
              
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px", textAlign: "center" }}>
                <div style={{ width: "120px", height: "120px", borderRadius: "16px", overflow: "hidden", marginBottom: "14px", boxShadow: isDarkMode ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(26,43,76,0.15)", backgroundColor: COLORS.imageBg }}>
                  {targetTrackForOptions.poster_url ? <img src={targetTrackForOptions.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={32} color={COLORS.textMuted} />}
                </div>
                <h2 style={{ margin: "0", fontSize: "20px", fontWeight: "800", color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{targetTrackForOptions.title}</h2>
                <div style={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.7)", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{targetTrackForOptions.artist}</div>
              </div>

              {/* CHANGE MOOD / CATEGORY SELECTOR - EXCLUSIVE TO OWNER */}
              {isOwner && (
                <div style={{ marginBottom: "16px", padding: "14px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: songTheme.textMuted, display: "flex", alignItems: "center", gap: "6px" }}>
                      Mood / Category <span style={{ fontSize: "10px", color: COLORS.primary, background: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(26,43,76,0.08)", padding: "1px 6px", borderRadius: "6px" }}>Owner</span>
                    </span>
                    {hasManualOverride && (
                      <button
                        onClick={() => handleSetSongMood(targetTrackForOptions.id, null)}
                        style={{ background: "transparent", border: "none", color: COLORS.textMuted, fontSize: "11px", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                      >
                        Reset to auto
                      </button>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    {AVAILABLE_MOODS.map(m => {
                      const isSelected = currentAssignedMoods.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSetSongMood(targetTrackForOptions.id, m.id)}
                          className="hover-effect"
                          style={{
                            background: isSelected ? `${m.color}25` : (isDarkMode ? "rgba(255,255,255,0.06)" : "rgba(26,43,76,0.05)"),
                            border: isSelected ? `2px solid ${m.color}` : `1px solid ${isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(26,43,76,0.08)"}`,
                            borderRadius: "10px",
                            padding: "8px 10px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "6px",
                            color: isSelected ? (isDarkMode ? "#ffffff" : m.color) : songTheme.textColor,
                            fontWeight: isSelected ? "bold" : "600",
                            fontSize: "13px",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <span>{m.emoji}</span>
                          <span>{m.label}</span>
                          {isSelected && <span style={{ marginLeft: "auto", fontSize: "12px", color: m.color, fontWeight: "bold" }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div onClick={() => { openedFromTrackOptionsRef.current = true; setShowTrackArtistsModal(true); setShowTrackOptionsModal(false); }} className="glass-row hover-effect" style={{ width: "100%", padding: "12px 14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                  <User size={18} /> Go to artists
                </div>
                <div onClick={() => { openedFromTrackOptionsRef.current = true; setSongForPlaylistModal(targetTrackForOptions); setShowTrackOptionsModal(false); }} className="glass-row hover-effect" style={{ width: "100%", padding: "12px 14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                  <FolderPlus size={18} /> Add to playlist
                </div>
                <div onClick={(e) => { openedFromTrackOptionsRef.current = false; addToQueue(targetTrackForOptions, e); setShowTrackOptionsModal(false); setTrackForOptions(null); }} className="glass-row hover-effect" style={{ width: "100%", padding: "12px 14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                  <ListPlus size={18} /> Add to Queue
                </div>
                <div onClick={() => { openedFromTrackOptionsRef.current = true; if (isDesktopFullscreen) { setShowFullscreenQueueModal(true); } else { setShowQueue(true); if (isMobilePlayerOpen) setIsMobilePlayerOpen(true); } setShowTrackOptionsModal(false); setTrackForOptions(null); }} className="glass-row hover-effect" style={{ width: "100%", padding: "12px 14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                  <ListMusic size={18} /> Go to Queue
                </div>
                <div onClick={() => { openedFromTrackOptionsRef.current = false; setSelectedAlbum(targetTrackForOptions.album || targetTrackForOptions.artist); setSearchQuery(''); setViewedPlaylistId(null); setIsMobilePlayerOpen(false); setIsDesktopFullscreen(false); setShowTrackOptionsModal(false); setTrackForOptions(null); }} className="glass-row hover-effect" style={{ width: "100%", padding: "12px 14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                  <Disc size={18} /> Go to album
                </div>
                {currentTrack?.id === targetTrackForOptions.id && (
                  <div onClick={() => { openedFromTrackOptionsRef.current = true; setShowSleepTimerModal(true); setShowTrackOptionsModal(false); }} className="glass-row hover-effect" style={{ width: "100%", padding: "12px 14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                    <Clock size={18} /> Sleep timer
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* TRACK ARTISTS MODAL */}
      {renderTrackArtists && (trackForOptions || currentTrack) && (() => {
        const targetTrackForArtists = trackForOptions || currentTrack;
        return (
        <div
          className={trackArtistsClosing ? "fade-exit" : "fade-enter"}
          style={{
            position: "fixed",
            inset: 0,
            background: songTheme.modalOverlay,
            backdropFilter: "blur(18px)",
            display: "flex",
            alignItems: isDesktop ? "center" : "flex-end",
            justifyContent: "center",
            zIndex: 10005,
            padding: isDesktop ? "24px" : "0"
          }}
          onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackArtistsModal(false); }}
        >
          {isDesktop ? (
            <div
              className={`${trackArtistsClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`}
              style={{
                background: songTheme.modalBg,
                backdropFilter: "blur(24px)",
                border: songTheme.modalBorder,
                padding: "28px",
                borderRadius: "22px",
                width: "100%",
                maxWidth: "420px",
                position: "relative",
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: songTheme.modalShadow,
                color: songTheme.textColor
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "22px" }}>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#FFFFFF", letterSpacing: "-0.3px" }}>Artists</h2>
                <button
                  onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackArtistsModal(false); }}
                  style={{
                    background: isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.15)",
                    border: "none",
                    color: "#FFFFFF",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  className="hover-effect"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {getTrackArtists(targetTrackForArtists.artist || "").map((artistName, idx) => {
                  const dbArtist = (dbArtists || []).find(a => a.name.toLowerCase() === artistName.toLowerCase());
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        openedFromTrackOptionsRef.current = false;
                        setSelectedArtist(artistName);
                        setSearchQuery('');
                        setViewedPlaylistId(null);
                        setIsMobilePlayerOpen(false);
                        setIsDesktopFullscreen(false);
                        setShowTrackArtistsModal(false);
                      }}
                      className="hover-effect"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        cursor: "pointer",
                        padding: "10px 14px",
                        borderRadius: "14px",
                        background: songTheme.rowBg,
                        border: songTheme.rowBorder,
                        transition: "all 0.2s ease"
                      }}
                    >
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", backgroundColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(26, 43, 76, 0.08)", flexShrink: 0, boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.3)" : "0 4px 12px rgba(26, 43, 76, 0.1)" }}>
                        {dbArtist?.image_url ? (
                          <img src={dbArtist.image_url} alt={artistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <User size={22} color={songTheme.textColor} />
                          </div>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "15px", color: songTheme.textColor, fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artistName}</span>
                        <span style={{ fontSize: "12px", color: songTheme.textMuted, marginTop: "2px" }}>View artist</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <SwipeableBottomSheet
              onClose={() => { openedFromTrackOptionsRef.current = false; setShowTrackArtistsModal(false); }}
              className={`${trackArtistsClosing ? 'slide-down-exit' : 'slide-up-enter'} custom-scrollbar`}
              style={{
                background: songTheme.modalBg,
                backdropFilter: "blur(24px)",
                borderTop: songTheme.modalBorder,
                padding: "24px",
                borderRadius: "24px 24px 0 0",
                width: "100%",
                maxWidth: "500px",
                position: "relative",
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: songTheme.modalShadow,
                color: songTheme.textColor
              }}
            >
              <div style={{ width: "40px", height: "4px", background: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.4)", borderRadius: "2px", margin: "0 auto 20px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#FFFFFF" }}>Artists</h2>
                <button
                  onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackArtistsModal(false); }}
                  style={{
                    background: isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.15)",
                    border: "none",
                    color: "#FFFFFF",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                  className="hover-effect"
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {getTrackArtists(targetTrackForArtists.artist || "").map((artistName, idx) => {
                  const dbArtist = (dbArtists || []).find(a => a.name.toLowerCase() === artistName.toLowerCase());
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        openedFromTrackOptionsRef.current = false;
                        setSelectedArtist(artistName);
                        setSearchQuery('');
                        setViewedPlaylistId(null);
                        setIsMobilePlayerOpen(false);
                        setIsDesktopFullscreen(false);
                        setShowTrackArtistsModal(false);
                      }}
                      className="hover-effect"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        cursor: "pointer",
                        padding: "10px 12px",
                        borderRadius: "14px",
                        background: songTheme.rowBg,
                        border: songTheme.rowBorder
                      }}
                    >
                      <div style={{ width: "48px", height: "48px", borderRadius: "50%", overflow: "hidden", backgroundColor: isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(26, 43, 76, 0.08)", flexShrink: 0 }}>
                        {dbArtist?.image_url ? (
                          <img src={dbArtist.image_url} alt={artistName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <User size={22} color={songTheme.textColor} />
                          </div>
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "15px", color: songTheme.textColor, fontWeight: "700" }}>{artistName}</span>
                        <span style={{ fontSize: "12px", color: songTheme.textMuted, marginTop: "2px" }}>View artist</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SwipeableBottomSheet>
          )}
        </div>
        );
      })()}

      {/* FULLSCREEN QUEUE MODAL */}
      {renderFullscreenQueue && currentTrack && (
        <div
          className={fullscreenQueueClosing ? "fade-exit" : "fade-enter"}
          style={{
            position: "fixed",
            inset: 0,
            background: songTheme.modalOverlay,
            backdropFilter: "blur(18px)",
            display: "flex",
            alignItems: isDesktop ? "center" : "flex-end",
            justifyContent: "center",
            zIndex: 10005,
            padding: isDesktop ? "24px" : "0"
          }}
          onClick={() => { openedFromTrackOptionsRef.current = false; setShowFullscreenQueueModal(false); }}
        >
          {isDesktop ? (
            <div
              className={`${fullscreenQueueClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`}
              style={{
                background: songTheme.modalBg,
                backdropFilter: "blur(24px)",
                border: songTheme.modalBorder,
                padding: "26px 28px",
                borderRadius: "22px",
                width: "100%",
                maxWidth: "460px",
                position: "relative",
                maxHeight: "82vh",
                overflowY: "auto",
                boxShadow: songTheme.modalShadow,
                color: songTheme.textColor,
                display: "flex",
                flexDirection: "column"
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ListMusic size={22} color="#FFFFFF" />
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#FFFFFF", letterSpacing: "-0.3px" }}>Queue</h2>
                  {userQueue.length > 0 && (
                    <span style={{ background: COLORS.spotifyGreen, color: "#FFFFFF", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }}>
                      {userQueue.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { openedFromTrackOptionsRef.current = false; setShowFullscreenQueueModal(false); }}
                  style={{
                    background: isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.15)",
                    border: "none",
                    color: "#FFFFFF",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  className="hover-effect"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ flex: 1, minHeight: 0 }}>
                {renderQueueBlock(false, "transparent")}
              </div>
            </div>
          ) : (
            <SwipeableBottomSheet
              onClose={() => { openedFromTrackOptionsRef.current = false; setShowFullscreenQueueModal(false); }}
              className={`${fullscreenQueueClosing ? 'slide-down-exit' : 'slide-up-enter'} custom-scrollbar`}
              style={{
                background: songTheme.modalBg,
                backdropFilter: "blur(24px)",
                borderTop: songTheme.modalBorder,
                padding: "24px",
                borderRadius: "24px 24px 0 0",
                width: "100%",
                maxWidth: "500px",
                position: "relative",
                maxHeight: "82vh",
                overflowY: "auto",
                boxShadow: songTheme.modalShadow,
                color: songTheme.textColor
              }}
            >
              <div style={{ width: "40px", height: "4px", background: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.4)", borderRadius: "2px", margin: "0 auto 20px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ListMusic size={22} color="#FFFFFF" />
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: "#FFFFFF" }}>Queue</h2>
                  {userQueue.length > 0 && (
                    <span style={{ background: COLORS.spotifyGreen, color: "#FFFFFF", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }}>
                      {userQueue.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { openedFromTrackOptionsRef.current = false; setShowFullscreenQueueModal(false); }}
                  style={{
                    background: isDarkMode ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.15)",
                    border: "none",
                    color: "#FFFFFF",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer"
                  }}
                  className="hover-effect"
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ flex: 1, minHeight: 0 }}>
                {renderQueueBlock(true, "transparent")}
              </div>
            </SwipeableBottomSheet>
          )}
        </div>
      )}

      {/* ADD TO PLAYLIST MODAL */}
      {renderSongForPlaylist && (
        <div className={songForPlaylistClosing ? "fade-exit" : "fade-enter"} style={{ position: "fixed", inset: 0, background: songTheme.modalOverlay, backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10005, padding: "20px" }} onClick={() => { openedFromTrackOptionsRef.current = false; setSongForPlaylistModal(null); }}>
          <div className={`${songForPlaylistClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`} style={{ background: songTheme.modalBg, backdropFilter: "blur(24px)", border: songTheme.modalBorder, padding: "32px", borderRadius: "20px", width: "100%", maxWidth: "380px", position: "relative", maxHeight: "80vh", overflowY: "auto", boxShadow: songTheme.modalShadow, color: songTheme.textColor }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { openedFromTrackOptionsRef.current = false; setSongForPlaylistModal(null); }} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: "#FFFFFF", cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "10px", color: "#FFFFFF", fontWeight: "800" }}><FolderPlus color="#FFFFFF" size={22} /> Add to Playlist</h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: "rgba(255, 255, 255, 0.7)" }}>"{safeSongForPlaylist?.title}"</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {userPlaylists.length > 0
                ? userPlaylists.map(pl => (
                    <button key={pl.id} onClick={() => { handleAddSongToPlaylist(pl.id, safeSongForPlaylist.id); openedFromTrackOptionsRef.current = false; setSongForPlaylistModal(null); }} className="glass-row hover-effect" style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, transition: "all 0.2s" }}>
                      <ListMusic size={18} color={songTheme.textColor} /> {pl.name}
                    </button>
                  ))
                : (
                  <div style={{ textAlign: "center", padding: "16px 0" }}>
                    <p style={{ color: songTheme.textMuted, fontSize: "14px", margin: "0 0 16px 0" }}>You don't have any playlists yet.</p>
                    <button onClick={() => { openedFromTrackOptionsRef.current = false; setSongForPlaylistModal(null); setShowPlaylistModal(true); }} style={{ background: isDarkMode ? "#FFFFFF" : "#1A2B4C", color: isDarkMode ? "#070B12" : "#FFFFFF", border: "none", borderRadius: "12px", padding: "12px 20px", fontWeight: "bold", cursor: "pointer" }} className="hover-effect">
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
      <div style={{ height: "64px", flexShrink: 0, background: COLORS.bgBase, display: "flex", justifyContent: "space-between", alignItems: "center", padding: isDesktop ? "0 24px" : "0 12px", zIndex: 10 }}>
        <button
          onClick={() => fetchAllData(true)}
          disabled={isRefreshing}
          className="hover-effect"
          style={{
            background: "transparent",
            border: "none",
            padding: "4px 6px",
            margin: "-4px -6px",
            borderRadius: "12px",
            cursor: isRefreshing ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            color: COLORS.primary,
            userSelect: "none",
            opacity: isRefreshing ? 0.6 : 1,
            transition: "opacity 0.2s ease"
          }}
          title={isRefreshing ? "Refreshing Euphony..." : "Click Euphony to refresh"}
        >
          <h1 style={{ margin: 0, fontSize: isDesktop ? "24px" : "20px", color: COLORS.primary, fontWeight: "800", letterSpacing: "-0.5px", lineHeight: 1 }}>
            Euphony
          </h1>
        </button>
        <div style={{ display: "flex", gap: isDesktop ? "12px" : "6px", alignItems: "center" }}>
          <button className="hover-effect" onClick={toggleDarkMode} style={{ background: "transparent", border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.primary, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            {isDesktop && (isDarkMode ? " Light" : " Dark")}
          </button>
          <button
            className="hover-effect"
            onClick={() => setShowJamModal(true)}
            style={{
              background: jamRoomId ? "rgba(34, 197, 94, 0.2)" : "transparent",
              border: `1px solid ${jamRoomId ? "#22c55e" : COLORS.primary}`,
              borderRadius: "20px",
              padding: isDesktop ? "8px 16px" : "8px 12px",
              color: jamRoomId ? "#22c55e" : COLORS.primary,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: "bold"
            }}
            title={jamRoomId ? `Live Jam: ${jamRoomId} (${jamListenersCount})` : "Start or Join Live Jam"}
          >
            <Radio size={16} />
            {isDesktop ? (jamRoomId ? `Jam (${jamRoomId})` : "Live Jam") : (jamRoomId ? "Jam" : "")}
          </button>
          {isDesktop && (
            <button className="hover-effect" onClick={() => setShowShortcutsModal(true)} title="Keyboard Shortcuts (?)" style={{ background: COLORS.primary, border: "none", borderRadius: "20px", padding: "8px 16px", color: COLORS.bgPanel, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
              <Keyboard size={16} color={COLORS.bgPanel} /> Shortcuts
            </button>
          )}
          <button className="hover-effect" onClick={() => setShowUploadModal(true)} style={{ background: COLORS.primary, border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.bgPanel, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <Plus size={16} color={COLORS.bgPanel} />{isDesktop && " Add Globally"}
          </button>
          <button className="hover-effect" onClick={() => setShowPlaylistModal(true)} style={{ background: COLORS.primary, border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.bgPanel, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <FolderPlus size={16} color={COLORS.bgPanel} />{isDesktop && " New Playlist"}
          </button>
          <button className="hover-effect" onClick={handleLogout} style={{ background: "transparent", border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.primary, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center" }}>
            {isDesktop ? "Log Out" : <LogOut size={16} />}
          </button>
        </div>
      </div>

      {/* MAIN BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", padding: isDesktop ? "12px" : "4px", gap: isDesktop ? "12px" : "0" }}>

        {/* LEFT SIDEBAR */}
        {isDesktop && (
          <div style={{ width: "260px", flexShrink: 0, background: COLORS.bgPanel, borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", gap: "24px", border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div onClick={() => handleSwitchPlaylist(null)} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: viewedPlaylistId === null && !showStatsModal ? COLORS.primary : COLORS.textMuted, fontWeight: "bold", fontSize: "15px", cursor: "pointer" }}>
                <Home size={24} color={viewedPlaylistId === null && !showStatsModal ? COLORS.primary : COLORS.textMuted} /> Global Library
              </div>
              {likedPlaylist && (
                <div onClick={() => handleSwitchPlaylist(likedPlaylist.id)} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: viewedPlaylistId === likedPlaylist.id && !showStatsModal ? COLORS.primary : COLORS.textMuted, fontWeight: "bold", fontSize: "15px", cursor: "pointer" }}>
                  <Heart size={24} color={viewedPlaylistId === likedPlaylist.id && !showStatsModal ? COLORS.primary : COLORS.textMuted} fill={viewedPlaylistId === likedPlaylist.id && !showStatsModal ? COLORS.primary : "none"} /> Liked Songs
                </div>
              )}
              <div onClick={() => handleSwitchPlaylist("smart_recently_played")} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: viewedPlaylistId === "smart_recently_played" && !showStatsModal ? COLORS.primary : COLORS.textMuted, fontWeight: "bold", fontSize: "15px", cursor: "pointer" }}>
                <History size={24} color={viewedPlaylistId === "smart_recently_played" && !showStatsModal ? COLORS.primary : COLORS.textMuted} /> Recently Played
              </div>
              <div onClick={() => handleSwitchPlaylist("smart_most_played")} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: viewedPlaylistId === "smart_most_played" && !showStatsModal ? COLORS.primary : COLORS.textMuted, fontWeight: "bold", fontSize: "15px", cursor: "pointer" }}>
                <Flame size={24} color={viewedPlaylistId === "smart_most_played" && !showStatsModal ? COLORS.primary : COLORS.textMuted} /> Most Played
              </div>
              <div onClick={handleOpenStatsModal} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: showStatsModal ? COLORS.primary : COLORS.textMuted, fontWeight: "bold", fontSize: "15px", cursor: "pointer" }}>
                <BarChart2 size={24} color={showStatsModal ? COLORS.primary : COLORS.textMuted} /> Listening Stats
              </div>
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${COLORS.border}`, margin: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
              <span style={{ fontSize: "12px", fontWeight: "bold", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Playlists</span>
              {userPlaylists.filter(pl => pl.name !== "Liked Songs").map(pl => (
                <div key={pl.id} onClick={() => handleSwitchPlaylist(pl.id)} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "12px", color: viewedPlaylistId === pl.id && !showStatsModal ? COLORS.primary : COLORS.textMuted, fontSize: "15px", padding: "4px 0", fontWeight: viewedPlaylistId === pl.id && !showStatsModal ? "bold" : "normal", cursor: "pointer" }}>
                  {renderMiniPlaylistCover(pl, 24)}
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CENTER CONTENT */}
        <div style={{ flex: 1, minWidth: 0, background: COLORS.bgPanel, borderRadius: isDesktop ? "12px" : "0", padding: isDesktop ? "32px" : "16px", overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: !isDesktop && currentTrack ? "100px" : "32px", border: isDesktop ? `1px solid ${COLORS.border}` : "none" }} className="custom-scrollbar main-scroll-container">

          {/* MOBILE PLAYLIST TABS */}
          {!isDesktop && !selectedArtist && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "14px", flexShrink: 0 }} className="custom-scrollbar horizontal-scroll-container">
              <button onClick={() => handleSwitchPlaylist(null)} style={{ background: viewedPlaylistId === null && !showStatsModal ? COLORS.primary : "transparent", color: viewedPlaylistId === null && !showStatsModal ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease" }}>
                Global Library
              </button>
              {likedPlaylist && (
                <button onClick={() => handleSwitchPlaylist(likedPlaylist.id)} style={{ background: viewedPlaylistId === likedPlaylist.id && !showStatsModal ? COLORS.primary : "transparent", color: viewedPlaylistId === likedPlaylist.id && !showStatsModal ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Heart size={14} fill={viewedPlaylistId === likedPlaylist.id && !showStatsModal ? COLORS.bgPanel : "none"} /> Liked Songs
                </button>
              )}
              {userPlaylists.filter(pl => pl.name !== "Liked Songs").map(pl => (
                <button key={pl.id} onClick={() => handleSwitchPlaylist(pl.id)} style={{ background: viewedPlaylistId === pl.id && !showStatsModal ? COLORS.primary : "transparent", color: viewedPlaylistId === pl.id && !showStatsModal ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease" }}>
                  🔒 {pl.name}
                </button>
              ))}
            </div>
          )}

          {/* MOBILE QUICK ACTION PILLS (Recent, Top, Stats) - BETWEEN PLAYLIST SECTION AND TOP ARTIST SECTION */}
          {!isDesktop && !selectedArtist && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "28px", flexShrink: 0 }}>
              <button
                onClick={() => handleSwitchPlaylist("smart_recently_played")}
                className="hover-effect"
                style={{
                  background: viewedPlaylistId === "smart_recently_played" && !showStatsModal ? COLORS.primary : "transparent",
                  color: viewedPlaylistId === "smart_recently_played" && !showStatsModal ? COLORS.bgPanel : COLORS.primary,
                  border: `1px solid ${COLORS.primary}`,
                  borderRadius: "20px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <History size={14} /> Recent
              </button>
              <button
                onClick={() => handleSwitchPlaylist("smart_most_played")}
                className="hover-effect"
                style={{
                  background: viewedPlaylistId === "smart_most_played" && !showStatsModal ? COLORS.primary : "transparent",
                  color: viewedPlaylistId === "smart_most_played" && !showStatsModal ? COLORS.bgPanel : COLORS.primary,
                  border: `1px solid ${COLORS.primary}`,
                  borderRadius: "20px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <Flame size={14} /> Top
              </button>
              <button
                onClick={handleOpenStatsModal}
                className="hover-effect"
                style={{
                  background: showStatsModal ? COLORS.primary : "transparent",
                  color: showStatsModal ? COLORS.bgPanel : COLORS.primary,
                  border: `1px solid ${COLORS.primary}`,
                  borderRadius: "20px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <BarChart2 size={14} /> Stats
              </button>
            </div>
          )}

          <div key={viewedPlaylistId || 'global'} className="fade-enter" style={{ width: "100%" }}>

            {/* PLAYLIST HERO */}
            {viewedPlaylistId !== null && activePlaylistObj && (
              <div style={{ background: `linear-gradient(180deg, ${COLORS.heroTop} 0%, ${COLORS.bgPanel} 100%)`, padding: isDesktop ? "40px 32px" : "24px", borderRadius: "12px", marginBottom: "32px", display: "flex", alignItems: isDesktop ? "flex-end" : "center", flexDirection: isDesktop ? "row" : "column", gap: "24px", border: `1px solid ${COLORS.border}` }}>
                {renderPlaylistCover()}
                <div style={{ flex: 1, minWidth: 0, textAlign: isDesktop ? "left" : "center" }}>
                  <span style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", color: COLORS.textMuted }}>
                    {activePlaylistObj?.isSmart ? "Smart Playlist" : "Private Playlist"}
                  </span>
                  <h2 style={{ margin: "8px 0 16px 0", fontSize: isDesktop ? "48px" : "32px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: COLORS.primary }}>{activePlaylistObj.name}</h2>
                  <p style={{ margin: 0, fontSize: "15px", color: COLORS.textMuted, fontWeight: "500" }}>
                    {activePlaylistObj?.isSmart
                      ? (activePlaylistObj.id === "smart_recently_played" ? "Your latest listened songs" : "Your top tracks on repeat")
                      : "Your personal collection"} • {rawViewedSongs.length} songs
                  </p>
                </div>
              </div>
            )}

            {/* PLAYLIST VIEW */}
            {viewedPlaylistId !== null ? (
              <div style={{ width: "100%" }}>
                {rawViewedSongs.length > 0 && (
                  <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", alignItems: isDesktop ? "center" : "stretch", gap: "12px", marginBottom: "24px", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between" }}>
                      {displayedSongs.length > 0 && (
                        <button onClick={() => handlePlaySong(0, displayedSongs, activePlaylistObj?.name || "Playlist")} className="hover-effect" style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.primary, color: COLORS.bgPanel, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 16px rgba(26,43,76,0.2)", flexShrink: 0 }}>
                          <Play size={24} fill="currentColor" style={{ marginLeft: "3px" }} />
                        </button>
                      )}
                      {!isDesktop && renderSortButton(true)}
                      {activePlaylistObj?.id === "smart_recently_played" && rawViewedSongs.length > 0 && (
                        <button
                          onClick={() => {
                            if (window.confirm("Clear your recently played listening history?")) {
                              clearListeningHistory();
                              setRecentlyPlayedIds([]);
                            }
                          }}
                          style={{
                            background: "transparent",
                            color: COLORS.textMuted,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: "20px",
                            padding: "6px 14px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer"
                          }}
                          className="hover-effect"
                        >
                          Clear History
                        </button>
                      )}
                      {activePlaylistObj?.id === "smart_most_played" && rawViewedSongs.length > 0 && (
                        <button
                          onClick={() => {
                            if (window.confirm("Reset your play counts and most played playlist on this device?")) {
                              clearListeningHistory();
                              setPlayCounts({});
                              setRecentlyPlayedIds([]);
                            }
                          }}
                          style={{
                            background: "transparent",
                            color: COLORS.textMuted,
                            border: `1px solid ${COLORS.border}`,
                            borderRadius: "20px",
                            padding: "6px 14px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: "pointer"
                          }}
                          className="hover-effect"
                        >
                          Reset Plays
                        </button>
                      )}
                    </div>
                    
                    <div onClick={() => document.getElementById("playlist-search-input")?.focus()} style={{ display: "flex", alignItems: "center", background: "transparent", borderRadius: "20px", padding: "10px 16px", border: `1px solid ${COLORS.primary}`, flex: isDesktop ? "0 0 auto" : 1, cursor: "text", width: isDesktop ? "180px" : "100%", boxSizing: "border-box" }}>
                      <Search size={16} color={COLORS.primary} style={{ flexShrink: 0 }} />
                      <input 
                        id="playlist-search-input"
                        type="text" 
                        placeholder="Search..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        style={{ background: "transparent", border: "none", outline: "none", marginLeft: "10px", fontSize: "15px", color: COLORS.primary, width: "100%", minWidth: 0 }} 
                      />
                      {searchQuery && <X size={16} color={COLORS.primary} style={{ cursor: "pointer", flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }} />}
                    </div>

                    {isDesktop && renderSortButton(false)}

                    {currentSortKey && (
                      <span style={{ fontSize: "12px", color: COLORS.textMuted, fontStyle: "italic", alignSelf: isDesktop ? "center" : "flex-end" }}>
                        By {SORT_LABELS[currentSortKey]} &middot; <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSortOrders(prev => ({ ...prev, [viewedPlaylistId]: null }))}>Clear</span>
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
                      {isDesktop && <span>{viewedPlaylistId === "smart_most_played" ? "Plays" : "Date added"}</span>}
                      <span style={{ textAlign: "right" }}><Clock size={16} /></span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" }}>
                      {displayedSongs.map((track, index) => {
                        const isSelected = currentTrack?.id === track.id;
                        return (
                          <SwipeableTrack key={track.id} track={track} onAddQueue={addToQueue} baseColor={COLORS.bgBase} actionColor={COLORS.primary} iconColor={COLORS.bgBase} className={index >= 10 ? "song-row-deferred" : ""}>
                            <div className={`glass-row song-stack-row ${isSelected ? 'active' : ''}`} onClick={() => handlePlaySong(index, displayedSongs, activePlaylistObj?.name || "Playlist")} style={{ display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 80px" : "30px minmax(0, 1fr) auto", alignItems: "center", padding: "10px 16px", cursor: "pointer" }}>
                              <span style={{ color: isSelected ? COLORS.primary : COLORS.textMuted, fontSize: "15px", fontWeight: isSelected ? "bold" : "normal" }}>{index + 1}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, paddingRight: "8px" }}>
                                <div style={{ width: "44px", height: "44px", borderRadius: "6px", backgroundColor: COLORS.imageBg, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {track.poster_url ? <img src={track.poster_url} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: "15px", fontWeight: isSelected ? "bold" : "600", color: isSelected ? COLORS.spotifyGreen : COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                                  <div style={{ fontSize: "13px", color: COLORS.textMuted, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</span>
                                    {!isDesktop && viewedPlaylistId === "smart_most_played" && (
                                      <span style={{ color: COLORS.primary, fontSize: "11px", fontWeight: "bold", background: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(26,43,76,0.08)", border: `1px solid ${COLORS.border}`, padding: "1px 7px", borderRadius: "10px", flexShrink: 0, display: "inline-flex", alignItems: "center", gap: "3px" }}>
                                        🔥 {(playCounts && playCounts[track.id]) || 0} {((playCounts && playCounts[track.id]) === 1) ? 'play' : 'plays'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "16px" }}>{track.album || '-'}</span>}
                              {isDesktop && (
                                viewedPlaylistId === "smart_most_played" ? (
                                  <span style={{ color: COLORS.primary, fontSize: "14px", fontWeight: "700", paddingRight: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
                                    🔥 {(playCounts && playCounts[track.id]) || 0} {((playCounts && playCounts[track.id]) === 1) ? 'play' : 'plays'}
                                  </span>
                                ) : (
                                  <span style={{ color: COLORS.textMuted, fontSize: "14px", paddingRight: "16px" }}>{formatDate(track.added_at || track.created_at)}</span>
                                )
                              )}
                              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: isDesktop ? "8px" : "2px", flexShrink: 0 }}>
                                <button type="button" title="Add to Queue" onPointerDown={e => e.stopPropagation()} onClick={e => addToQueue(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: isDesktop ? "4px" : "8px 6px", minWidth: isDesktop ? "auto" : "32px", minHeight: isDesktop ? "auto" : "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }} className="hover-effect"><ListPlus size={isDesktop ? 18 : 16} style={{ pointerEvents: "none" }} /></button>
                                <button type="button" title={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === track.id) ? "Unlike" : "Like"} onPointerDown={e => e.stopPropagation()} onClick={(e) => handleToggleLike(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: isDesktop ? "4px" : "8px 6px", minWidth: isDesktop ? "auto" : "32px", minHeight: isDesktop ? "auto" : "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }} className="hover-effect"><Heart size={isDesktop ? 18 : 16} fill={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === track.id) ? COLORS.primary : "none"} style={{ pointerEvents: "none" }} /></button>
                                {!activePlaylistObj?.isSmart && (
                                  <button type="button" title="Remove from playlist" onPointerDown={e => e.stopPropagation()} onClick={e => handleRemoveSongFromPlaylist(viewedPlaylistId, track.id, e)} style={{ background: "transparent", border: "none", color: COLORS.textMuted, cursor: "pointer", padding: isDesktop ? "4px" : "8px 6px", minWidth: isDesktop ? "auto" : "32px", minHeight: isDesktop ? "auto" : "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }} className="hover-effect"><Trash2 size={isDesktop ? 18 : 16} style={{ pointerEvents: "none" }} /></button>
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
                          </SwipeableTrack>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "80px 0", color: COLORS.textMuted }}>
                    <p style={{ margin: 0, fontSize: "16px" }}>
                      {searchQuery
                        ? `No results for "${searchQuery}".`
                        : (viewedPlaylistId === "smart_most_played"
                            ? "No tracks played yet! Listen to any song for 1 minute or more to see it ranked here."
                            : (viewedPlaylistId === "smart_recently_played"
                                ? "No recently played tracks yet. Start listening to build your history!"
                                : "This playlist is empty."))}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* GLOBAL LIBRARY VIEW */
              <div>
                {visibleTopArtists.length > 0 && !searchQuery && !selectedArtist && !selectedAlbum && (
                  <div style={{ marginBottom: isDesktop ? "32px" : "20px", paddingLeft: isDesktop ? "16px" : "0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                      <h3 style={{ fontSize: "20px", fontWeight: "bold", color: COLORS.primary, margin: 0 }}>Top Artists</h3>
                      <button
                        onClick={handleShuffleTopArtists}
                        className="hover-effect"
                        title="Shuffle artists"
                        style={{
                          background: "transparent",
                          color: COLORS.primary,
                          border: `1px solid ${COLORS.primary}`,
                          borderRadius: "20px",
                          padding: isDesktop ? "6px 14px" : "6px 12px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "12px",
                          fontWeight: "bold",
                          transition: "all 0.2s ease",
                          flexShrink: 0
                        }}
                      >
                        <Shuffle size={14} style={{ transition: "transform 0.4s ease", transform: isShufflingArtists ? "rotate(180deg)" : "rotate(0deg)" }} />
                        <span>Shuffle</span>
                      </button>
                    </div>
                    <div ref={handleTopArtistsRef} style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: isDesktop ? "12px" : "8px" }} className="custom-scrollbar horizontal-scroll-container">
                      {visibleTopArtists.map(artist => (
                        <div key={artist.name} onClick={() => setSelectedArtist(artist.name)} style={{ cursor: "pointer", width: isDesktop ? "140px" : "120px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }} className="hover-effect">
                          <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "16px", overflow: "hidden", backgroundColor: COLORS.imageBg, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                            {artist.image_url ? (
                               <img 
                                 src={artist.image_url} 
                                 alt={artist.name} 
                                 loading="lazy"
                                 decoding="async"
                                 style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                                 onError={(e) => {
                                   e.target.onerror = null;
                                   e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(artist.name)}&background=2A1B38&color=fff&size=256`;
                                 }}
                               />
                            ) : (
                               <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.textMuted }}><ImageIcon size={32} /></div>
                            )}
                          </div>
                          <span style={{ color: COLORS.primary, fontSize: "14px", fontWeight: "600", textAlign: "center", width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artist.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedArtist || selectedAlbum ? (
                  (() => {
                    const headerImage = selectedArtist ? selectedArtistObj?.image_url : selectedAlbumCover;
                    return (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", paddingLeft: isDesktop ? "16px" : "0", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: isDesktop ? "16px" : "12px", minWidth: 0, flex: 1 }}>
                          <button
                            onClick={() => { setSelectedArtist(null); setSelectedAlbum(null); }}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: COLORS.primary,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "8px",
                              borderRadius: "50%",
                              backgroundColor: isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(26,43,76,0.06)",
                              flexShrink: 0
                            }}
                            className="hover-effect"
                            title="Clear filter"
                          >
                            <X size={20} />
                          </button>

                          {headerImage && (
                            <div
                              style={{
                                width: isDesktop ? "56px" : "44px",
                                height: isDesktop ? "56px" : "44px",
                                borderRadius: isDesktop ? "16px" : "12px",
                                overflow: "hidden",
                                backgroundColor: COLORS.imageBg,
                                boxShadow: isDarkMode ? "0 6px 16px rgba(0,0,0,0.4)" : "0 4px 12px rgba(26,43,76,0.12)",
                                flexShrink: 0,
                                border: `1px solid ${isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(26,43,76,0.1)"}`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <img
                                src={headerImage}
                                alt={selectedArtist || selectedAlbum || "Artist"}
                                loading="eager"
                                decoding="async"
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  if (e.currentTarget.parentElement) {
                                    e.currentTarget.parentElement.style.display = "none";
                                  }
                                }}
                              />
                            </div>
                          )}

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <h2 style={{ fontSize: isDesktop ? "28px" : "22px", fontWeight: "800", margin: 0, color: COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {selectedArtist || selectedAlbum}
                            </h2>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
                          {renderSortButton(!isDesktop)}
                          {currentSortKey && (
                            <span style={{ fontSize: "12px", color: COLORS.textMuted, fontStyle: "italic" }}>
                              By {SORT_LABELS[currentSortKey]} &middot; <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSortOrders(prev => ({ ...prev, global: null }))}>Clear</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", alignItems: isDesktop ? "center" : "stretch", gap: "12px", marginBottom: "24px", width: "100%", paddingLeft: isDesktop ? "16px" : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between" }}>
                      <h2 style={{ fontSize: isDesktop ? "28px" : "24px", fontWeight: "800", margin: 0, color: COLORS.primary }}>Global Library ({playlist.length})</h2>
                      {!isDesktop && renderSortButton(true)}
                    </div>
                    
                    <div onClick={() => document.getElementById("global-search-input")?.focus()} style={{ display: "flex", alignItems: "center", background: "transparent", borderRadius: "20px", padding: "10px 16px", border: `1px solid ${COLORS.primary}`, flex: isDesktop ? "0 0 auto" : 1, cursor: "text", width: isDesktop ? "180px" : "100%", boxSizing: "border-box" }}>
                      <Search size={16} color={COLORS.primary} style={{ flexShrink: 0 }} />
                      <input 
                        id="global-search-input"
                        type="text" 
                        placeholder="Search..." 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        style={{ background: "transparent", border: "none", outline: "none", marginLeft: "10px", fontSize: "15px", color: COLORS.primary, width: "100%", minWidth: 0 }} 
                      />
                      {searchQuery && <X size={16} color={COLORS.primary} style={{ cursor: "pointer", flexShrink: 0 }} onClick={(e) => { e.stopPropagation(); setSearchQuery(""); }} />}
                    </div>

                    {isDesktop && renderSortButton(false)}
                    
                    {currentSortKey && (
                      <span style={{ fontSize: "12px", color: COLORS.textMuted, fontStyle: "italic", alignSelf: isDesktop ? "center" : "flex-end" }}>
                        By {SORT_LABELS[currentSortKey]} &middot; <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSortOrders(prev => ({ ...prev, global: null }))}>Clear</span>
                      </span>
                    )}
                  </div>
                )}

                {/* MOOD FILTER BAR */}
                {viewedPlaylistId === null && !selectedArtist && !selectedAlbum && (
                  <div ref={handleMoodsRef} style={{ display: "flex", alignItems: "center", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "16px", paddingLeft: isDesktop ? "16px" : 0 }} className="custom-scrollbar horizontal-scroll-container">
                    <button
                      onClick={() => handleSelectMood(null)}
                      style={{
                        background: selectedMood === null ? COLORS.primary : "transparent",
                        color: selectedMood === null ? COLORS.bgPanel : COLORS.primary,
                        border: `1px solid ${selectedMood === null ? COLORS.primary : COLORS.border}`,
                        borderRadius: "20px",
                        padding: "6px 14px",
                        fontSize: "13px",
                        fontWeight: "700",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        transition: "all 0.2s ease"
                      }}
                      className="hover-effect"
                    >
                      <span>All</span>
                      <span style={{ fontSize: "11px", opacity: 0.75 }}>({playlist.length})</span>
                    </button>
                    {AVAILABLE_MOODS.map(m => {
                      const isSelected = selectedMood === m.id;
                      const count = moodCounts[m.id] || 0;
                      return (
                        <button
                          key={m.id}
                          onClick={() => handleSelectMood(m.id)}
                          style={{
                            background: isSelected ? m.color : "transparent",
                            color: isSelected ? "#fff" : COLORS.primary,
                            border: `1px solid ${isSelected ? m.color : COLORS.border}`,
                            borderRadius: "20px",
                            padding: "6px 14px",
                            fontSize: "13px",
                            fontWeight: "700",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.2s ease",
                            boxShadow: isSelected ? `0 4px 12px ${m.color}40` : "none"
                          }}
                          className="hover-effect"
                        >
                          <span>{m.emoji}</span>
                          <span>{m.label}</span>
                          <span style={{ fontSize: "11px", opacity: 0.75 }}>({count})</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {displayedSongs.length > 0 ? displayedSongs.map((track, index) => {
                    const isSelected = currentTrack?.id === track.id;
                    return (
                      <SwipeableTrack key={`g-${track.id}`} track={track} onAddQueue={addToQueue} baseColor={COLORS.bgBase} actionColor={COLORS.primary} iconColor={COLORS.bgBase} className={index >= 10 ? "song-row-deferred" : ""}>
                        <div className={`glass-row song-stack-row ${isSelected ? 'active' : ''}`} onClick={() => handlePlaySong(index, displayedSongs, selectedMood ? `${selectedMood} Mood` : (selectedArtist ? `${selectedArtist} Artist` : (selectedAlbum ? `${selectedAlbum} Album` : "Global Library")))} style={{ padding: "10px 16px", cursor: "pointer", display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 80px" : "30px minmax(0, 1fr) auto", alignItems: "center" }}>
                          <span style={{ color: isSelected ? COLORS.primary : COLORS.textMuted, fontSize: "15px", fontWeight: isSelected ? "bold" : "normal" }}>{index + 1}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, paddingRight: "8px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "6px", backgroundColor: COLORS.imageBg, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {track.poster_url ? <img src={track.poster_url} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "16px", fontWeight: isSelected ? "bold" : "600", color: isSelected ? COLORS.spotifyGreen : COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                              <div style={{ fontSize: "14px", color: COLORS.textMuted, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</span>
                              </div>
                            </div>
                          </div>
                          {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "16px" }}>{track.album || '-'}</span>}
                          {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", paddingRight: "16px" }}>{formatDate(track.added_at || track.created_at)}</span>}
                          <div style={{ display: "flex", alignItems: "center", gap: isDesktop ? "12px" : "2px", flexShrink: 0, justifyContent: "flex-end" }}>
                            <button type="button" title="Add to Queue" onPointerDown={e => e.stopPropagation()} onClick={(e) => addToQueue(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: isDesktop ? "4px" : "8px 6px", minWidth: isDesktop ? "auto" : "32px", minHeight: isDesktop ? "auto" : "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }} className="hover-effect">
                              <ListPlus size={isDesktop ? 18 : 16} style={{ pointerEvents: "none" }} />
                            </button>
                            <button type="button" title={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === track.id) ? "Unlike" : "Like"} onPointerDown={e => e.stopPropagation()} onClick={(e) => handleToggleLike(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: isDesktop ? "4px" : "8px 6px", minWidth: isDesktop ? "auto" : "32px", minHeight: isDesktop ? "auto" : "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }} className="hover-effect">
                              <Heart size={isDesktop ? 18 : 16} fill={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === track.id) ? COLORS.primary : "none"} style={{ pointerEvents: "none" }} />
                            </button>
                            {userPlaylists.length > 0 && (
                              <button type="button" title="Add to Playlist" onPointerDown={e => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); openedFromTrackOptionsRef.current = false; setSongForPlaylistModal(track); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: isDesktop ? "4px" : "8px 6px", minWidth: isDesktop ? "auto" : "32px", minHeight: isDesktop ? "auto" : "32px", display: "inline-flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }} className="hover-effect">
                                <FolderPlus size={isDesktop ? 18 : 16} style={{ pointerEvents: "none" }} />
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
                      </SwipeableTrack>
                    );
                  }) : (
                    <div style={{ textAlign: "center", padding: "100px 0", color: COLORS.textMuted }}>
                      {selectedArtist || selectedAlbum
                        ? <p style={{ margin: 0, fontSize: "16px" }}>No songs found for {selectedArtist || selectedAlbum}.</p>
                        : searchQuery
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
          <div style={{
            width: "320px",
            flexShrink: 0,
            background: isDarkMode
              ? (dominantRgb ? `rgb(${Math.round(dominantRgb.r * 0.08 + 6)}, ${Math.round(dominantRgb.g * 0.08 + 8)}, ${Math.round(dominantRgb.b * 0.08 + 12)})` : "#0A0F1A")
              : "#F4EFE6",
            borderRadius: "12px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            border: isDarkMode ? (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.32)` : "1px solid rgba(255, 255, 255, 0.1)") : `1px solid ${COLORS.border}`,
            boxShadow: isDarkMode ? (dominantRgb ? `0 12px 36px rgba(0,0,0,0.4), 0 0 24px rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.22)` : "none") : "0 8px 24px rgba(26,43,76,0.06)",
            transition: "background 0.5s ease, border 0.5s ease, box-shadow 0.5s ease"
          }}>
            {renderCrossfadingBackdrop(
              currentTrack.poster_url,
              isDarkMode ? "blur(75px) brightness(0.88) saturate(160%)" : "blur(80px) brightness(0.98) saturate(155%)",
              isDarkMode ? 0.55 : 0.42,
              { top: "-20%", left: "-20%", width: "140%", height: "140%" },
              songTheme.sidebarBg,
              outgoingSongTheme?.sidebarBg
            )}
            
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
              {/* TOP HEADER WITH MAXIMIZE BUTTON (Desktop Only) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#FFFFFF", letterSpacing: "0.5px", textShadow: "0 1px 4px rgba(0,0,0,0.7)", textTransform: "uppercase" }}>
                  Now Playing
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {currentTrack && (
                    <button
                      onClick={(e) => handleShareSong(currentTrack, e)}
                      title="Share song"
                      style={{
                        background: "rgba(255, 255, 255, 0.12)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        color: "#FFFFFF",
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        backdropFilter: "blur(4px)",
                        transition: "all 0.2s ease"
                      }}
                      className="hover-effect"
                    >
                      <Share2 size={15} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsDesktopFullscreen(true);
                      setFullscreenView(showMixer ? "mixer" : showLyrics ? "lyrics" : "art");
                    }}
                    title="Full screen"
                    style={{
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#FFFFFF",
                      width: "30px",
                      height: "30px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      backdropFilter: "blur(4px)",
                      transition: "all 0.2s ease"
                    }}
                    className="hover-effect"
                  >
                    <Maximize2 size={15} />
                  </button>
                </div>
              </div>

              {/* ARTWORK / DYNAMIC PLAYER VIEW */}
              <div style={{ width: "100%", flex: 1, minHeight: 0, marginBottom: "20px", display: "flex", flexDirection: "column" }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden", backgroundColor: isDarkMode ? "rgba(26,43,76,0.05)" : "rgba(26,43,76,0.04)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isDarkMode ? "0 12px 30px rgba(26,43,76,0.12)" : "0 12px 30px rgba(26,43,76,0.08)", position: "relative" }}>
                  <div key={showMixer ? 'mixer' : showQueue ? 'queue' : showLyrics ? 'lyrics' : 'art'} className="fade-enter" style={{ width: "100%", height: "100%" }}>
                    {showMixer ? renderMixerBlock(false) : showQueue ? renderQueueBlock(false) : showLyrics ? renderLyricsBlock(false) : renderCrossfadingCover(currentTrack?.poster_url, 80, "12px")}
                  </div>
                </div>
              </div>
              
              {/* TRACK INFO & SECONDARY ACTIONS */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexShrink: 0 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {renderCrossfadingTrackInfo(currentTrack, {
                    titleTag: "h3",
                    titleStyle: { margin: "0 0 4px 0", fontSize: "19px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#FFFFFF", textShadow: "0 2px 8px rgba(0,0,0,0.7)" },
                    artistTag: "p",
                    artistStyle: { margin: 0, color: "rgba(255, 255, 255, 0.85)", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }
                  })}
                </div>
                <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "8px" }}>
                  {[
                    { label: "Sleep Timer", active: !!sleepTimerTarget, icon: <Moon size={15} />, action: (e) => { e.stopPropagation(); openedFromTrackOptionsRef.current = false; setShowSleepTimerModal(true); } },
                    { label: "Options", active: false, icon: <MoreVertical size={15} />, action: (e) => { e.stopPropagation(); openedFromTrackOptionsRef.current = false; setShowTrackOptionsModal(true); } },
                    { label: "Stem Mixer", active: showMixer, icon: <SlidersHorizontal size={15} />, action: toggleStemMixer },
                    { label: "Lyrics", active: showLyrics, icon: <Mic2 size={15} />, action: () => { setShowLyrics(v => !v); if (!showLyrics) { setShowQueue(false); setShowMixer(false); } } },
                    { label: "Queue", active: showQueue, icon: <ListMusic size={15} />, action: () => { setShowQueue(v => !v); if (!showQueue) { setShowLyrics(false); setShowMixer(false); } } }
                  ].map(({ label, active, icon, action }) => (
                    <button key={label} onClick={action} title={label} style={{ background: active ? COLORS.spotifyGreen : "rgba(255, 255, 255, 0.12)", color: "#FFFFFF", border: "1px solid rgba(255, 255, 255, 0.18)", borderRadius: "20px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", fontSize: "12px", fontWeight: "bold", backdropFilter: "blur(4px)" }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* PRIMARY CONTROLS & PROGRESS */}
              <div style={{ marginTop: "auto", paddingBottom: "0px", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.9)", minWidth: "36px", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{formatTime(currentTime)}</span>
                  <input type="range" min={0} max={(isFinite(duration) && duration > 0) ? duration : (currentTrack?.duration || (currentTrack?.id && STATIC_SONG_DURATIONS[currentTrack.id]) || 100)} defaultValue={0} ref={desktopProgressRef} onChange={handleSeek} className="glow-slider" style={{ flex: 1 }} />
                  {renderCrossfadingDuration(duration, { fontSize: "12px", color: "rgba(255, 255, 255, 0.9)", minWidth: "36px", textAlign: "right", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" })}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "4px", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect">{renderModeIcon("#FFFFFF")}</button>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><SkipBack size={24} fill="currentColor" /></button>
                    <button onClick={handlePlayPause} className="hover-effect" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", borderRadius: "50%", border: "none", backgroundColor: "#FFFFFF", color: "#1A2B4C", cursor: "pointer", boxShadow: "0 8px 16px rgba(0,0,0,0.3)", touchAction: "manipulation" }}>
                      {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: "4px" }} />}
                    </button>
                    <button onClick={handleNext} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><SkipForward size={24} fill="currentColor" /></button>
                  </div>
                  <button
                    onClick={() => setShowCrossfadeModal(true)}
                    title={crossfadeEnabled ? `Crossfade: ${crossfadeDuration}s (Active)` : "Crossfade (Off)"}
                    style={{
                      background: crossfadeEnabled ? COLORS.spotifyGreen : "rgba(255, 255, 255, 0.16)",
                      border: crossfadeEnabled ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#FFFFFF",
                      borderRadius: "20px",
                      padding: "5px 11px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      boxShadow: crossfadeEnabled ? "0 2px 10px rgba(29, 185, 84, 0.45)" : "none",
                      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
                      transition: "all 0.2s ease"
                    }}
                    className="hover-effect"
                  >
                    <CrossfadeIcon size={16} color="#FFFFFF" />
                    {crossfadeEnabled && (
                      <span style={{ fontSize: "11px", fontWeight: "800", lineHeight: 1, color: "#FFFFFF" }}>{crossfadeDuration}s</span>
                    )}
                  </button>
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
              <div style={{ width: "44px", height: "44px", borderRadius: "6px", backgroundColor: "#EAE2CF", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                {renderCrossfadingCover(currentTrack?.poster_url, 20, "6px")}
              </div>
              <div style={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
                {renderCrossfadingTrackInfo(currentTrack, {
                  titleTag: "div",
                  titleStyle: { fontSize: "15px", fontWeight: "bold", color: COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                  artistTag: "div",
                  artistStyle: { fontSize: "13px", color: COLORS.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500" }
                })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
              <button onClick={e => { e.stopPropagation(); handlePrev(e); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px", display: "flex" }} className="hover-effect"><SkipBack size={22} fill="currentColor" /></button>
              <button onClick={e => { e.stopPropagation(); handlePlayPause(e); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px", display: "flex", touchAction: "manipulation" }} className="hover-effect">
                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
              </button>
              <button onClick={e => { e.stopPropagation(); handleNext(e); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px", display: "flex" }} className="hover-effect"><SkipForward size={22} fill="currentColor" /></button>
            </div>
          </div>
          <div style={{ width: "100%", height: "3px", background: "rgba(26,43,76,0.1)" }}>
            <div ref={mobileMiniProgressRef} style={{ width: "0%", height: "100%", background: COLORS.primary }} />
          </div>
        </div>
      )}

      {/* FULL-SCREEN MOBILE PLAYER */}
      {renderMobilePlayer && (
        <div className={mobilePlayerClosing ? "slide-down-exit" : "slide-up-enter"} style={{ 
          position: "fixed", 
          inset: 0, 
          zIndex: 4000, 
          backgroundColor: isDarkMode ? (dominantRgb ? `rgb(${Math.round(dominantRgb.r * 0.08 + 6)}, ${Math.round(dominantRgb.g * 0.08 + 8)}, ${Math.round(dominantRgb.b * 0.08 + 12)})` : "#070A11") : "#F4EFE6",
          display: "flex", 
          flexDirection: "column", 
          overflow: "hidden" 
        }}>
          {/* Guaranteed 100% Opaque Solid Base */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: isDarkMode ? (dominantRgb ? `rgb(${Math.round(dominantRgb.r * 0.08 + 6)}, ${Math.round(dominantRgb.g * 0.08 + 8)}, ${Math.round(dominantRgb.b * 0.08 + 12)})` : "#070A11") : "#F4EFE6",
              zIndex: 0
            }}
          />

          {/* Dynamic Ambient Blurred Cover Art Backdrop & Theme Shade */}
          {renderCrossfadingBackdrop(
            currentTrack?.poster_url,
            isDarkMode ? "blur(80px) brightness(0.82) saturate(160%)" : "blur(80px) brightness(0.98) saturate(155%)",
            isDarkMode ? 0.58 : 0.42,
            { top: "-20%", left: "-20%", width: "140%", height: "140%" },
            songTheme.mobilePlayerBg,
            outgoingSongTheme?.mobilePlayerBg
          )}
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "calc(env(safe-area-inset-top, 0px) + 12px) 24px calc(env(safe-area-inset-bottom, 0px) + 24px) 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", paddingTop: "4px" }}>
              <button onClick={() => setIsMobilePlayerOpen(false)} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><ChevronDown size={32} /></button>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px", color: "#FFFFFF", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>
                  {showMixer ? "Stem Mixer" : showQueue ? "Current Queue" : showLyrics ? "Lyrics" : "Now Playing"}
                </span>
                {jamRoomId && (
                  <button
                    onClick={() => setShowJamModal(true)}
                    className="hover-effect"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 8px",
                      borderRadius: "12px",
                      background: "rgba(34, 197, 94, 0.25)",
                      border: "1px solid rgba(34, 197, 94, 0.5)",
                      color: "#4ade80",
                      fontSize: "10px",
                      fontWeight: "800",
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#4ade80" }} />
                    Jam
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {currentTrack && (
                  <button onClick={(e) => handleShareSong(currentTrack, e)} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect" title="Share song"><Share2 size={24} /></button>
                )}
                <button onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackOptionsModal(true); }} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><MoreVertical size={32} /></button>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", marginBottom: "32px", width: "100%" }}>
              <div style={{ width: "100%", height: "100%", maxHeight: "400px", borderRadius: "16px", overflow: "hidden", backgroundColor: isDarkMode ? "rgba(26,43,76,0.05)" : "rgba(26,43,76,0.04)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: (showLyrics || showQueue || showMixer) ? "none" : (isDarkMode ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(26,43,76,0.18)"), transition: "box-shadow 0.3s ease" }}>
                <div key={showMixer ? 'mixer' : showQueue ? 'queue' : showLyrics ? 'lyrics' : 'art'} className="fade-enter" style={{ width: "100%", height: "100%" }}>
                  {showMixer ? renderMixerBlock(true) : showQueue ? renderQueueBlock(true) : showLyrics ? renderLyricsBlock(true) : renderCrossfadingCover(currentTrack?.poster_url, 100, "16px")}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                {renderCrossfadingTrackInfo(currentTrack, {
                  titleTag: "h2",
                  titleStyle: { margin: "0 0 6px 0", fontSize: "24px", fontWeight: "800", color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: "0 2px 8px rgba(0,0,0,0.7)" },
                  artistTag: "p",
                  artistStyle: { margin: 0, fontSize: "16px", color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }
                })}
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
                <button onClick={toggleStemMixer} style={{ background: showMixer ? COLORS.spotifyGreen : "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "10px 14px", cursor: "pointer", display: "flex", backdropFilter: "blur(4px)" }}><SlidersHorizontal size={17} /></button>
                <button
                  onClick={e => { e.stopPropagation(); setShowCrossfadeModal(true); }}
                  title={crossfadeEnabled ? `Crossfade: ${crossfadeDuration}s (Active)` : "Crossfade (Off)"}
                  style={{
                    background: crossfadeEnabled ? COLORS.spotifyGreen : "rgba(255,255,255,0.15)",
                    color: "#FFFFFF",
                    border: crossfadeEnabled ? `1px solid ${COLORS.spotifyGreen}` : "1px solid rgba(255,255,255,0.2)",
                    borderRadius: "20px",
                    padding: "10px 14px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    backdropFilter: "blur(4px)",
                    transition: "all 0.2s ease"
                  }}
                  className="hover-effect"
                >
                  <CrossfadeIcon size={17} color="#FFFFFF" />
                  {crossfadeEnabled && (
                    <span style={{ fontSize: "12px", fontWeight: "800", lineHeight: 1 }}>{crossfadeDuration}s</span>
                  )}
                </button>
                <button onClick={() => { setShowLyrics(v => !v); if (!showLyrics) { setShowQueue(false); setShowMixer(false); } }} style={{ background: showLyrics ? COLORS.spotifyGreen : "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "10px 14px", cursor: "pointer", display: "flex", backdropFilter: "blur(4px)" }}><Mic2 size={17} /></button>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <input type="range" min={0} max={(isFinite(duration) && duration > 0) ? duration : (currentTrack?.duration || (currentTrack?.id && STATIC_SONG_DURATIONS[currentTrack.id]) || 100)} defaultValue={0} ref={mobileProgressRef} onChange={handleSeek} className="glow-slider" style={{ width: "100%", marginBottom: "8px", borderRadius: "6px" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{formatTime(currentTime)}</span>
                {renderCrossfadingDuration(duration, { fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
              <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "8px", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect">{renderModeIcon("#FFFFFF")}</button>
              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><SkipBack size={36} fill="currentColor" /></button>
                <button onClick={handlePlayPause} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "72px", height: "72px", borderRadius: "50%", border: "none", backgroundColor: "#FFFFFF", color: "#1A2B4C", cursor: "pointer", boxShadow: "0 12px 24px rgba(0,0,0,0.3)", transition: "transform 0.2s ease", touchAction: "manipulation" }} className="hover-effect">
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

      {/* DESKTOP FULLSCREEN PLAYER OVERLAY (Desktop Only) */}
      {renderDesktopFullscreen && currentTrack && (
        <div
          className={desktopFullscreenClosing ? "fade-exit" : "fade-enter"}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            flexDirection: "column",
            backgroundColor: isDarkMode ? (dominantRgb ? `rgb(${Math.round(dominantRgb.r * 0.08 + 6)}, ${Math.round(dominantRgb.g * 0.08 + 8)}, ${Math.round(dominantRgb.b * 0.08 + 12)})` : "#070A11") : "#F4EFE6",
            overflow: "hidden",
            color: isDarkMode ? "#FFFFFF" : "#1A2B4C",
            fontFamily: "inherit"
          }}
        >
          {/* Guaranteed 100% Opaque Solid Base to prevent underlying home page bleed */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: isDarkMode ? (dominantRgb ? `rgb(${Math.round(dominantRgb.r * 0.08 + 6)}, ${Math.round(dominantRgb.g * 0.08 + 8)}, ${Math.round(dominantRgb.b * 0.08 + 12)})` : "#070A11") : "#F4EFE6",
              zIndex: 0
            }}
          />

          {/* Dynamic Ambient Blurred Cover Art Backdrop & Theme Shade */}
          {renderCrossfadingBackdrop(
            currentTrack.poster_url,
            isDarkMode ? "blur(90px) brightness(0.80) saturate(165%)" : "blur(90px) brightness(1.05) saturate(135%)",
            isDarkMode ? 0.60 : 0.40,
            { top: "-20%", left: "-20%", width: "140%", height: "140%" },
            songTheme.playerBg,
            outgoingSongTheme?.playerBg
          )}

          {/* FULLSCREEN TOP BAR */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: "20px 36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0
            }}
          >
            {/* Left: Source badge */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: "220px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "10px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.2px", color: isDarkMode ? "rgba(255,255,255,0.5)" : "#64748B" }}>
                  Playing From
                </span>
                <span style={{ fontSize: "13px", fontWeight: "600", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "260px" }}>
                  {playbackSourceName}
                </span>
              </div>
            </div>

            {/* Center: Segmented Pill Switcher (Cover Art vs Full Screen Lyrics) */}
            <div
              style={{
                background: isDarkMode ? "rgba(0, 0, 0, 0.45)" : "rgba(255, 255, 255, 0.75)",
                backdropFilter: "blur(16px)",
                border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(26, 43, 76, 0.12)",
                borderRadius: "30px",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: isDarkMode ? "0 8px 24px rgba(0,0,0,0.3)" : "0 8px 24px rgba(26, 43, 76, 0.08)"
              }}
            >
              <button
                onClick={() => setFullscreenView("art")}
                style={{
                  background: fullscreenView === "art" ? (isDarkMode ? "rgba(255, 255, 255, 0.22)" : "rgba(26, 43, 76, 0.12)") : "transparent",
                  color: fullscreenView === "art" ? (isDarkMode ? "#FFFFFF" : "#1A2B4C") : (isDarkMode ? "rgba(255, 255, 255, 0.65)" : "rgba(26, 43, 76, 0.65)"),
                  border: fullscreenView === "art" ? (isDarkMode ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(26, 43, 76, 0.15)") : "1px solid transparent",
                  borderRadius: "24px",
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)"
                }}
                className="hover-effect"
              >
                <ImageIcon size={15} />
                <span>Cover Art</span>
              </button>

              <button
                onClick={() => setFullscreenView("lyrics")}
                style={{
                  background: fullscreenView === "lyrics" ? (isDarkMode ? "rgba(255, 255, 255, 0.22)" : "rgba(26, 43, 76, 0.12)") : "transparent",
                  color: fullscreenView === "lyrics" ? (isDarkMode ? "#FFFFFF" : "#1A2B4C") : (isDarkMode ? "rgba(255, 255, 255, 0.65)" : "rgba(26, 43, 76, 0.65)"),
                  border: fullscreenView === "lyrics" ? (isDarkMode ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(26, 43, 76, 0.15)") : "1px solid transparent",
                  borderRadius: "24px",
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)"
                }}
                className="hover-effect"
              >
                <Mic2 size={15} />
                <span>Lyrics</span>
              </button>

              <button
                onClick={() => setFullscreenView("mixer")}
                style={{
                  background: fullscreenView === "mixer" ? (isDarkMode ? "rgba(255, 255, 255, 0.22)" : "rgba(26, 43, 76, 0.12)") : "transparent",
                  color: fullscreenView === "mixer" ? (isDarkMode ? "#FFFFFF" : "#1A2B4C") : (isDarkMode ? "rgba(255, 255, 255, 0.65)" : "rgba(26, 43, 76, 0.65)"),
                  border: fullscreenView === "mixer" ? (isDarkMode ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(26, 43, 76, 0.15)") : "1px solid transparent",
                  borderRadius: "24px",
                  padding: "8px 18px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s cubic-bezier(0.25, 1, 0.5, 1)"
                }}
                className="hover-effect"
              >
                <SlidersHorizontal size={15} />
                <span>Mixer</span>
              </button>
            </div>

            {/* Right: Actions & Exit Fullscreen */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-end", minWidth: "220px" }}>
              {currentTrack && (
                <button
                  onClick={(e) => handleShareSong(currentTrack, e)}
                  title="Share song"
                  style={{
                    background: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255, 255, 255, 0.75)",
                    border: isDarkMode ? "none" : "1px solid rgba(26, 43, 76, 0.12)",
                    color: isDarkMode ? "#FFFFFF" : "#1A2B4C",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    backdropFilter: "blur(6px)",
                    boxShadow: isDarkMode ? "none" : "0 2px 8px rgba(26, 43, 76, 0.06)",
                    transition: "all 0.2s"
                  }}
                  className="hover-effect"
                >
                  <Share2 size={16} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); openedFromTrackOptionsRef.current = false; setShowTrackOptionsModal(true); }}
                title="Options"
                style={{
                  background: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255, 255, 255, 0.75)",
                  border: isDarkMode ? "none" : "1px solid rgba(26, 43, 76, 0.12)",
                  color: isDarkMode ? "#FFFFFF" : "#1A2B4C",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(6px)",
                  boxShadow: isDarkMode ? "none" : "0 2px 8px rgba(26, 43, 76, 0.06)",
                  transition: "all 0.2s"
                }}
                className="hover-effect"
              >
                <MoreVertical size={16} />
              </button>
              <button
                onClick={() => setIsDesktopFullscreen(false)}
                title="Exit full screen (Esc)"
                style={{
                  background: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255, 255, 255, 0.75)",
                  border: isDarkMode ? "none" : "1px solid rgba(26, 43, 76, 0.12)",
                  color: isDarkMode ? "#FFFFFF" : "#1A2B4C",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  backdropFilter: "blur(6px)",
                  boxShadow: isDarkMode ? "none" : "0 2px 8px rgba(26, 43, 76, 0.06)",
                  transition: "all 0.2s"
                }}
                className="hover-effect"
              >
                <Minimize2 size={17} />
              </button>
            </div>
          </div>

          {/* FULLSCREEN MAIN CONTENT AREA */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden"
            }}
          >
            {fullscreenView === "art" ? (
              /* COVER ART VIEW (IMAGE 2) */
              <div
                className="fade-enter custom-scrollbar"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px 32px 30px 32px"
                }}
              >
                {/* Centered Large Album Art */}
                <div
                  style={{
                    width: "min(380px, 38vh)",
                    height: "min(380px, 38vh)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: isDarkMode ? "0 24px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)" : "0 24px 60px rgba(26,43,76,0.18), 0 4px 16px rgba(26,43,76,0.1)",
                    backgroundColor: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(26,43,76,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  {renderCrossfadingCover(currentTrack?.poster_url, 100, "16px")}
                </div>

                {/* Dual Cards: Credits & Next in queue */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "18px",
                    width: "100%",
                    maxWidth: "680px",
                    marginTop: "28px",
                    flexShrink: 0
                  }}
                >
                  {/* Card 1: Credits */}
                  <div
                    style={{
                      background: isDarkMode ? "rgba(18, 22, 32, 0.7)" : "rgba(255, 255, 255, 0.82)",
                      backdropFilter: "blur(20px)",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      border: isDarkMode ? (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.22)` : "1px solid rgba(255,255,255,0.08)") : (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.18)` : "1px solid rgba(26, 43, 76, 0.1)"),
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: "92px",
                      boxShadow: isDarkMode ? (dominantRgb ? `0 8px 24px rgba(0,0,0,0.35), 0 0 20px rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.08)` : "0 8px 24px rgba(0,0,0,0.3)") : "0 8px 24px rgba(26, 43, 76, 0.08)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "16px", fontWeight: "800", color: isDarkMode ? "#FFFFFF" : "#1A2B4C" }}>Credits</span>
                      <button
                        onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackArtistsModal(true); }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: isDarkMode ? "rgba(255,255,255,0.65)" : "#64748B",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          padding: 0
                        }}
                        className="hover-effect"
                      >
                        Show all
                      </button>
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      {renderCrossfadingTrackInfo(currentTrack, {
                        titleTag: "div",
                        titleStyle: { fontSize: "15px", fontWeight: "700", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                        artistTag: "div",
                        artistStyle: { fontSize: "12px", color: isDarkMode ? "rgba(255,255,255,0.55)" : "#64748B", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                        customTitleText: (track) => track?.artist || "Unknown Artist",
                        customArtistText: (track) => `Main Artist ${track?.album ? `• ${track.album}` : ""}`
                      })}
                    </div>
                  </div>

                  {/* Card 2: Next in queue */}
                  <div
                    style={{
                      background: isDarkMode ? "rgba(18, 22, 32, 0.7)" : "rgba(255, 255, 255, 0.82)",
                      backdropFilter: "blur(20px)",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      border: isDarkMode ? (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.22)` : "1px solid rgba(255,255,255,0.08)") : (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.18)` : "1px solid rgba(26, 43, 76, 0.1)"),
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: "92px",
                      boxShadow: isDarkMode ? (dominantRgb ? `0 8px 24px rgba(0,0,0,0.35), 0 0 20px rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.08)` : "0 8px 24px rgba(0,0,0,0.3)") : "0 8px 24px rgba(26, 43, 76, 0.08)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "16px", fontWeight: "800", color: isDarkMode ? "#FFFFFF" : "#1A2B4C" }}>Next in queue</span>
                      <button
                        onClick={() => { openedFromTrackOptionsRef.current = false; setShowFullscreenQueueModal(true); }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: isDarkMode ? "rgba(255,255,255,0.65)" : "#64748B",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          padding: 0
                        }}
                        className="hover-effect"
                      >
                        Open queue
                      </button>
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      {nextTrackInLine ? (
                        <div
                          onClick={() => {
                            if (userQueue.length > 0) playFromQueue(0);
                            else handleNext();
                          }}
                          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                          className="hover-effect"
                          title="Play next track now"
                        >
                          <div style={{ width: "36px", height: "36px", borderRadius: "6px", overflow: "hidden", backgroundColor: isDarkMode ? "#222" : "rgba(26,43,76,0.08)", flexShrink: 0 }}>
                            {nextTrackInLine.poster_url ? (
                              <img src={nextTrackInLine.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={16} color={isDarkMode ? "#888" : "#64748B"} /></div>
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {nextTrackInLine.title}
                            </div>
                            <div style={{ fontSize: "12px", color: isDarkMode ? "rgba(255,255,255,0.55)" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {nextTrackInLine.artist}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: "13px", color: isDarkMode ? "rgba(255,255,255,0.45)" : "#64748B", fontStyle: "italic" }}>
                          Queue is empty
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : fullscreenView === "mixer" ? (
              /* STEM MIXER VIEW (IMAGE 2 IN FULLSCREEN) */
              <div
                className="fade-enter custom-scrollbar"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "20px 32px 30px 32px"
                }}
              >
                {/* Centered Stem Mixer Card */}
                <div
                  style={{
                    width: "min(380px, 38vh)",
                    height: "min(380px, 38vh)",
                    borderRadius: "16px",
                    overflow: "hidden",
                    boxShadow: isDarkMode ? "0 24px 60px rgba(0,0,0,0.7), 0 4px 16px rgba(0,0,0,0.5)" : "0 24px 60px rgba(26,43,76,0.18), 0 4px 16px rgba(26,43,76,0.1)",
                    backgroundColor: isDarkMode ? "rgba(18, 22, 32, 0.75)" : "rgba(255, 255, 255, 0.85)",
                    backdropFilter: "blur(20px)",
                    border: isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(26, 43, 76, 0.12)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "16px 12px",
                    boxSizing: "border-box",
                    flexShrink: 0
                  }}
                >
                  {renderMixerBlock(false, 150, "transparent")}
                </div>

                {/* Dual Cards: Credits & Next in queue */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "18px",
                    width: "100%",
                    maxWidth: "680px",
                    marginTop: "28px",
                    flexShrink: 0
                  }}
                >
                  {/* Card 1: Credits */}
                  <div
                    style={{
                      background: isDarkMode ? "rgba(18, 22, 32, 0.7)" : "rgba(255, 255, 255, 0.82)",
                      backdropFilter: "blur(20px)",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      border: isDarkMode ? (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.22)` : "1px solid rgba(255,255,255,0.08)") : (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.18)` : "1px solid rgba(26, 43, 76, 0.1)"),
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: "92px",
                      boxShadow: isDarkMode ? (dominantRgb ? `0 8px 24px rgba(0,0,0,0.35), 0 0 20px rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.08)` : "0 8px 24px rgba(0,0,0,0.3)") : "0 8px 24px rgba(26, 43, 76, 0.08)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "16px", fontWeight: "800", color: isDarkMode ? "#FFFFFF" : "#1A2B4C" }}>Credits</span>
                      <button
                        onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackArtistsModal(true); }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: isDarkMode ? "rgba(255,255,255,0.65)" : "#64748B",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          padding: 0
                        }}
                        className="hover-effect"
                      >
                        Show all
                      </button>
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      <div style={{ fontSize: "15px", fontWeight: "700", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {currentTrack.artist}
                      </div>
                      <div style={{ fontSize: "12px", color: isDarkMode ? "rgba(255,255,255,0.55)" : "#64748B", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        Main Artist {currentTrack.album ? `• ${currentTrack.album}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Next in queue */}
                  <div
                    style={{
                      background: isDarkMode ? "rgba(18, 22, 32, 0.7)" : "rgba(255, 255, 255, 0.82)",
                      backdropFilter: "blur(20px)",
                      borderRadius: "14px",
                      padding: "16px 20px",
                      border: isDarkMode ? (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.22)` : "1px solid rgba(255,255,255,0.08)") : (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.18)` : "1px solid rgba(26, 43, 76, 0.1)"),
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: "92px",
                      boxShadow: isDarkMode ? (dominantRgb ? `0 8px 24px rgba(0,0,0,0.35), 0 0 20px rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.08)` : "0 8px 24px rgba(0,0,0,0.3)") : "0 8px 24px rgba(26, 43, 76, 0.08)"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "16px", fontWeight: "800", color: isDarkMode ? "#FFFFFF" : "#1A2B4C" }}>Next in queue</span>
                      <button
                        onClick={() => { openedFromTrackOptionsRef.current = false; setShowFullscreenQueueModal(true); }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: isDarkMode ? "rgba(255,255,255,0.65)" : "#64748B",
                          fontSize: "12px",
                          fontWeight: "700",
                          cursor: "pointer",
                          padding: 0
                        }}
                        className="hover-effect"
                      >
                        Open queue
                      </button>
                    </div>
                    <div style={{ marginTop: "10px" }}>
                      {nextTrackInLine ? (
                        <div
                          onClick={() => {
                            if (userQueue.length > 0) playFromQueue(0);
                            else handleNext();
                          }}
                          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                          className="hover-effect"
                          title="Play next track now"
                        >
                          <div style={{ width: "36px", height: "36px", borderRadius: "6px", overflow: "hidden", backgroundColor: isDarkMode ? "#222" : "rgba(26,43,76,0.08)", flexShrink: 0 }}>
                            {nextTrackInLine.poster_url ? (
                              <img src={nextTrackInLine.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={16} color={isDarkMode ? "#888" : "#64748B"} /></div>
                            )}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: "14px", fontWeight: "700", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {nextTrackInLine.title}
                            </div>
                            <div style={{ fontSize: "12px", color: isDarkMode ? "rgba(255,255,255,0.55)" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {nextTrackInLine.artist}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: "13px", color: isDarkMode ? "rgba(255,255,255,0.45)" : "#64748B", fontStyle: "italic" }}>
                          Queue is empty
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* FULL SCREEN LYRICS VIEW (IMAGE 3) */
              <div
                ref={fullscreenLyricsContainerRef}
                className="fade-enter custom-scrollbar"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: "200px 60px 260px 60px",
                  scrollBehavior: "auto"
                }}
              >
                <div style={{ maxWidth: "860px", margin: "0 auto", textAlign: "left" }}>
                  {parsedLyrics.length > 0 ? (
                    parsedLyrics.map((lyric, index) => {
                      const isActiveLine = index === activeLyricIndex;
                      return (
                        <div
                          key={index}
                          ref={el => fullscreenLyricRefs.current[index] = el}
                          onClick={(e) => handleLyricClick(lyric.time, e)}
                          style={{
                            fontSize: "34px",
                            fontWeight: "800",
                            lineHeight: "1.55",
                            letterSpacing: "-0.5px",
                            color: isActiveLine ? "#FFFFFF" : "rgba(255, 255, 255, 0.45)",
                            opacity: isActiveLine ? 1 : 0.45,
                            textShadow: isActiveLine && !lyric.words ? "0 0 16px rgba(255,255,255,0.8)" : "none",
                            padding: "12px 0",
                            cursor: "pointer",
                            transition: "transform 0.7s cubic-bezier(0.25, 1, 0.5, 1), color 0.7s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.7s cubic-bezier(0.25, 1, 0.5, 1), text-shadow 0.7s cubic-bezier(0.25, 1, 0.5, 1)",
                            transform: isActiveLine ? "scale(1.03)" : "scale(1)",
                            transformOrigin: "left center",
                            willChange: "transform, color, opacity, text-shadow"
                          }}
                        >
                          {lyric.words ? lyric.words.map((wordObj, wIndex) => {
                            const isActiveWord = isActiveLine && wIndex === activeWordIndex;
                            const isPastWord = isActiveLine && wIndex < activeWordIndex;
                            return (
                              <span
                                key={wIndex}
                                onClick={(e) => handleLyricClick(wordObj.time, e)}
                                style={{
                                  color: (isActiveWord || isPastWord)
                                    ? "#FFFFFF"
                                    : (isActiveLine
                                        ? "rgba(255, 255, 255, 0.65)"
                                        : "rgba(255, 255, 255, 0.45)"),
                                  textShadow: isActiveWord ? "0 0 16px rgba(255,255,255,0.8)" : "none",
                                  transition: "all 0.25s ease",
                                  marginRight: "6px",
                                  cursor: "pointer"
                                }}
                              >
                                {wordObj.text}
                              </span>
                            );
                          }) : lyric.text}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ color: "rgba(255, 255, 255, 0.65)", fontSize: "20px", fontWeight: "600", lineHeight: "1.8", whiteSpace: "pre-line", padding: "60px 0" }}>
                      {((currentTrack?.lyrics || playlist.find(s => s.id === currentTrack?.id)?.lyrics)?.replace(/\[mood:\s*[a-zA-Z\s]+\]\r\n?/gi, '').trim()) || "No synchronized lyrics available for this song."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* FULLSCREEN BOTTOM DOCKED PLAYER BAR */}
          <div
            style={{
              position: "relative",
              zIndex: 2,
              padding: "16px 36px 20px 36px",
              overflow: "hidden",
              backdropFilter: "blur(24px)",
              borderTop: isDarkMode
                ? (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.28)` : "1px solid rgba(255, 255, 255, 0.10)")
                : (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.28)` : "1px solid rgba(26, 43, 76, 0.14)"),
              boxShadow: isDarkMode
                ? (dominantRgb ? `0 -8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.15)` : "0 -8px 24px rgba(0,0,0,0.4)")
                : (dominantRgb ? `0 -6px 20px rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.18)` : "0 -4px 20px rgba(26, 43, 76, 0.08)"),
              display: "grid",
              gridTemplateColumns: "280px 1fr 280px",
              alignItems: "center",
              flexShrink: 0
            }}
          >
            {/* Base Underlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundColor: isDarkMode ? (dominantRgb ? `rgb(${Math.round(dominantRgb.r * 0.08 + 6)}, ${Math.round(dominantRgb.g * 0.08 + 8)}, ${Math.round(dominantRgb.b * 0.08 + 12)})` : "#070A11") : "#EAE4D6",
                zIndex: 0
              }}
            />

            {/* Dynamic Ambient Blurred Cover Art Backdrop & Theme Shade in Bottom Bar */}
            {renderCrossfadingBackdrop(
              currentTrack.poster_url,
              isDarkMode ? "blur(75px) brightness(0.82) saturate(165%)" : "blur(75px) brightness(0.92) saturate(145%)",
              isDarkMode ? 0.65 : 0.50,
              { top: "-80%", left: "-20%", width: "140%", height: "260%" },
              bottomBarGradient,
              outgoingBottomBarGradient
            )}

            {/* Left: Track Info & Like */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, position: "relative", zIndex: 1 }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "8px", overflow: "hidden", backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(26, 43, 76, 0.08)", flexShrink: 0, boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(26, 43, 76, 0.1)", position: "relative" }}>
                {renderCrossfadingCover(currentTrack?.poster_url, 22, "8px")}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                {renderCrossfadingTrackInfo(currentTrack, {
                  titleTag: "div",
                  titleStyle: { fontSize: "14px", fontWeight: "700", color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
                  artistTag: "div",
                  artistStyle: { fontSize: "12px", color: "rgba(255,255,255,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }
                })}
              </div>
              <button
                title={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === currentTrack.id) ? "Unlike" : "Like"}
                onClick={(e) => handleToggleLike(currentTrack, e)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: likedPlaylist?.playlist_songs?.some(ps => ps.song_id === currentTrack.id) ? COLORS.spotifyGreen : "rgba(255,255,255,0.7)",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                  alignItems: "center"
                }}
                className="hover-effect"
              >
                <Heart size={18} fill={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === currentTrack.id) ? COLORS.spotifyGreen : "none"} />
              </button>
            </div>

            {/* Center: Playback Controls & Scrubber */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", maxWidth: "600px", margin: "0 auto", position: "relative", zIndex: 1 }}>
              {/* Buttons row */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "8px" }}>
                <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "4px", cursor: "pointer" }} className="hover-effect" title={`Mode: ${playMode}`}>
                  {renderModeIcon("#FFFFFF")}
                </button>
                <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex" }} className="hover-effect" title="Previous">
                  <SkipBack size={20} fill="currentColor" />
                </button>
                <button
                  onClick={handlePlayPause}
                  className="hover-effect"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    border: "none",
                    backgroundColor: "#FFFFFF",
                    color: "#1A2B4C",
                    cursor: "pointer",
                    boxShadow: "0 6px 16px rgba(0,0,0,0.3)",
                    touchAction: "manipulation"
                  }}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: "2px" }} />}
                </button>
                <button onClick={handleNext} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex" }} className="hover-effect" title="Next">
                  <SkipForward size={20} fill="currentColor" />
                </button>
                <button
                  onClick={() => setShowCrossfadeModal(true)}
                  title={crossfadeEnabled ? `Crossfade: ${crossfadeDuration}s (Active)` : "Crossfade (Off)"}
                  style={{
                    background: crossfadeEnabled ? COLORS.spotifyGreen : "rgba(255, 255, 255, 0.12)",
                    border: crossfadeEnabled ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.18)",
                    color: "#FFFFFF",
                    borderRadius: "16px",
                    padding: "4px 9px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    boxShadow: crossfadeEnabled ? "0 2px 8px rgba(29, 185, 84, 0.45)" : "none",
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))",
                    transition: "all 0.2s ease"
                  }}
                  className="hover-effect"
                >
                  <CrossfadeIcon size={16} color="#FFFFFF" />
                  {crossfadeEnabled && (
                    <span style={{ fontSize: "11px", fontWeight: "800", lineHeight: 1, color: "#FFFFFF" }}>{crossfadeDuration}s</span>
                  )}
                </button>
              </div>

              {/* Scrubber row */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", minWidth: "34px", textAlign: "right", fontWeight: "600" }}>
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={(isFinite(duration) && duration > 0) ? duration : (currentTrack?.duration || (currentTrack?.id && STATIC_SONG_DURATIONS[currentTrack.id]) || 100)}
                  defaultValue={0}
                  ref={fullscreenProgressRef}
                  onChange={handleSeek}
                  className="glow-slider"
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", minWidth: "34px", textAlign: "left", fontWeight: "600" }}>
                  {formatTime((isFinite(duration) && duration > 0) ? duration : (currentTrack?.duration || (currentTrack?.id && STATIC_SONG_DURATIONS[currentTrack.id]) || 0))}
                </span>
              </div>
            </div>

            {/* Right: Volume & Minimize */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "flex-end", position: "relative", zIndex: 1 }}>
              {jamRoomId && (
                <button
                  onClick={() => setShowJamModal(true)}
                  className="hover-effect"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 10px",
                    borderRadius: "20px",
                    background: "rgba(34, 197, 94, 0.2)",
                    border: "1px solid rgba(34, 197, 94, 0.5)",
                    color: "#4ade80",
                    fontSize: "12px",
                    fontWeight: "700",
                    cursor: "pointer"
                  }}
                  title="Active Jam Session"
                >
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#4ade80", display: "inline-block", boxShadow: "0 0 6px #4ade80" }} />
                  <span>Jam ({jamListenersCount})</span>
                </button>
              )}
              {/* Volume controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={toggleMute}
                  style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px" }}
                  className="hover-effect"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (isMuted && v > 0) setIsMuted(false);
                  }}
                  className="glow-slider"
                  style={{
                    width: "80px",
                    background: `linear-gradient(to right, rgba(255,255,255,0.8) 0%, #FFFFFF ${(isMuted ? 0 : volume) * 100}%, rgba(255,255,255,0.15) ${(isMuted ? 0 : volume) * 100}%)`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
















































