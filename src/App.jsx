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
  Shuffle, Repeat, Repeat1, ArrowRight, Loader2, Plus, X, UploadCloud, Image as ImageIcon, Mic2, FolderPlus, Trash2, Clock, Home, ListMusic, LogOut, ChevronDown, RefreshCw, ListPlus, Moon, Sun, SlidersHorizontal, ArrowUpDown, Search, GripVertical, Heart, MoreVertical, User, Disc, Maximize2, Minimize2, Keyboard
} from "lucide-react";
import { supabase } from "./supabase";
import Auth from "./Auth";

const PLAY_MODES = ["order", "repeat-all", "repeat-one", "shuffle"];
const SORT_CYCLE = [null, "title", "created_at", "duration"];
const SORT_LABELS = { default: "Default", title: "Name (A-Z)", created_at: "Date Added", duration: "Duration" };

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

const SwipeableTrack = ({ track, onAddQueue, children, baseColor, actionColor, iconColor }) => {
  const containerRef = useRef(null);
  const trackRef = useRef(null);
  const actionBgRef = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const wasSwiped = useRef(false);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.type !== 'touchstart') return;
    isDragging.current = true;
    wasSwiped.current = false;
    startX.current = e.clientX || (e.touches && e.touches[0].clientX);
    startY.current = e.clientY || (e.touches && e.touches[0].clientY);
    currentX.current = 0;
    
    if (trackRef.current) {
      trackRef.current.style.transition = 'none';
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaX = clientX - startX.current;
    const deltaY = clientY - startY.current;

    if (Math.abs(deltaY) > 20 && Math.abs(deltaX) < 20) {
      isDragging.current = false;
      resetSwipe();
      return;
    }

    if (Math.abs(deltaX) > 10) {
      wasSwiped.current = true;
      if (actionBgRef.current) {
        actionBgRef.current.style.opacity = '1';
      }
    }

    if (deltaX > 0) {
      const maxSwipe = 120;
      let translate = deltaX;
      if (deltaX > maxSwipe) translate = maxSwipe + (deltaX - maxSwipe) * 0.15;
      
      currentX.current = translate;
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(${translate}px)`;
      }
    }
  };

  const resetSwipe = () => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(0px)`;
      trackRef.current.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)';
    }
    currentX.current = 0;
    if (actionBgRef.current) {
      actionBgRef.current.style.opacity = '0';
    }
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    if (currentX.current > 70) {
      onAddQueue(track);
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(50);
      }
    }
    resetSwipe();
    setTimeout(() => {
      wasSwiped.current = false;
    }, 50);
  };

  return (
    <div 
      ref={containerRef}
      style={{ position: 'relative', overflow: 'hidden', touchAction: 'pan-y', borderRadius: '12px' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
      onTouchCancel={handlePointerUp}
      onClickCapture={(e) => {
        if (wasSwiped.current) {
          e.stopPropagation();
          e.preventDefault();
        }
      }}
    >
      <div ref={actionBgRef} style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: '100%',
        backgroundColor: actionColor || '#1DB954',
        display: 'flex', alignItems: 'center', paddingLeft: '24px', zIndex: 0,
        borderRadius: '12px', opacity: 0, transition: 'opacity 0.2s ease'
      }}>
        <ListPlus color={iconColor || "#fff"} size={24} />
      </div>

      <div ref={trackRef} style={{ position: 'relative', zIndex: 1, backgroundColor: 'transparent', borderRadius: '12px' }}>
        {children}
      </div>
    </div>
  );
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
  } catch (e) {}
  return url;
};

const getSongThemeGradients = (rgb, isDark) => {
  if (!rgb) {
    return {
      modalBg: isDark
        ? "radial-gradient(circle at 50% 0%, #1A2844 0%, #07090E 100%)"
        : "radial-gradient(circle at 50% 0%, rgba(26, 43, 76, 0.08) 0%, #FAFAF7 70%, #F3F0E6 100%)",
      modalOverlay: isDark
        ? "rgba(0, 0, 0, 0.72)"
        : "rgba(18, 26, 47, 0.42)",
      modalBorder: isDark
        ? "1px solid rgba(255, 255, 255, 0.15)"
        : "1px solid rgba(26, 43, 76, 0.12)",
      modalShadow: isDark
        ? "0 28px 70px rgba(0,0,0,0.85), 0 4px 18px rgba(0,0,0,0.5)"
        : "0 20px 50px rgba(26, 43, 76, 0.16)",
      playerBg: isDark
        ? "radial-gradient(ellipse 95% 75% at 50% 32%, rgba(28, 45, 75, 0.65) 0%, rgba(7, 10, 17, 0.88) 75%, #070A11 100%)"
        : "radial-gradient(ellipse 95% 75% at 50% 30%, rgba(26, 43, 76, 0.12) 0%, rgba(244, 239, 230, 0.88) 75%, #F4EFE6 100%)",
      mobilePlayerBg: isDark
        ? "radial-gradient(circle at 50% 28%, rgba(28, 45, 75, 0.6) 0%, #070A11 100%)"
        : "radial-gradient(circle at 50% 28%, rgba(26, 43, 76, 0.10) 0%, #F4EFE6 100%)",
      sidebarBg: isDark
        ? "radial-gradient(circle at 50% 0%, rgba(24, 40, 68, 0.4) 0%, #0A0F1A 100%)"
        : "radial-gradient(circle at 50% 0%, rgba(26, 43, 76, 0.06) 0%, #FAFAF7 70%, #F3F0E6 100%)",
      textColor: isDark ? "#FFFFFF" : "#1A2B4C",
      textMuted: isDark ? "rgba(255, 255, 255, 0.65)" : "rgba(26, 43, 76, 0.65)",
      rowBg: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.8)",
      rowBorder: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(26, 43, 76, 0.1)",
      accentGlow: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(26, 43, 76, 0.12)"
    };
  }

  const { r, g, b } = rgb;
  if (isDark) {
    return {
      modalBg: `radial-gradient(circle at 50% -10%, rgba(${r}, ${g}, ${b}, 0.50) 0%, rgba(${r}, ${g}, ${b}, 0.20) 38%, rgba(13, 17, 26, 0.96) 80%, #07090E 100%)`,
      modalOverlay: `radial-gradient(circle at 50% 40%, rgba(${r}, ${g}, ${b}, 0.24) 0%, rgba(0, 0, 0, 0.78) 65%, rgba(0, 0, 0, 0.90) 100%)`,
      modalBorder: `1px solid rgba(${r}, ${g}, ${b}, 0.35)`,
      modalShadow: `0 28px 70px rgba(0,0,0,0.85), 0 0 45px rgba(${r}, ${g}, ${b}, 0.28)`,
      playerBg: `radial-gradient(ellipse 95% 75% at 50% 32%, rgba(${r}, ${g}, ${b}, 0.55) 0%, rgba(${r}, ${g}, ${b}, 0.22) 48%, rgba(7, 10, 17, 0.88) 78%, #070A11 100%)`,
      mobilePlayerBg: `radial-gradient(circle at 50% 28%, rgba(${r}, ${g}, ${b}, 0.52) 0%, rgba(${r}, ${g}, ${b}, 0.20) 45%, rgba(7, 10, 17, 0.88) 75%, #070A11 100%)`,
      sidebarBg: `radial-gradient(circle at 50% 0%, rgba(${r}, ${g}, ${b}, 0.35) 0%, rgba(10, 14, 22, 0.95) 70%, #070A10 100%)`,
      textColor: "#FFFFFF",
      textMuted: "rgba(255, 255, 255, 0.65)",
      rowBg: "rgba(255, 255, 255, 0.08)",
      rowBorder: "1px solid rgba(255, 255, 255, 0.12)",
      accentGlow: `rgba(${r}, ${g}, ${b}, 0.35)`
    };
  } else {
    // Light Mode Variant
    return {
      modalBg: `radial-gradient(circle at 50% -10%, rgba(${r}, ${g}, ${b}, 0.28) 0%, rgba(${r}, ${g}, ${b}, 0.09) 38%, rgba(250, 250, 247, 0.96) 75%, rgba(243, 240, 230, 0.98) 100%)`,
      modalOverlay: `radial-gradient(circle at 50% 40%, rgba(${r}, ${g}, ${b}, 0.16) 0%, rgba(18, 26, 47, 0.42) 70%, rgba(18, 26, 47, 0.55) 100%)`,
      modalBorder: `1px solid rgba(${r}, ${g}, ${b}, 0.28)`,
      modalShadow: `0 24px 60px rgba(26, 43, 76, 0.16), 0 0 35px rgba(${r}, ${g}, ${b}, 0.18)`,
      playerBg: `radial-gradient(ellipse 95% 75% at 50% 30%, rgba(${r}, ${g}, ${b}, 0.32) 0%, rgba(${r}, ${g}, ${b}, 0.12) 48%, rgba(244, 239, 230, 0.88) 78%, #F4EFE6 100%)`,
      mobilePlayerBg: `radial-gradient(circle at 50% 28%, rgba(${r}, ${g}, ${b}, 0.30) 0%, rgba(${r}, ${g}, ${b}, 0.12) 45%, rgba(244, 239, 230, 0.88) 75%, #F4EFE6 100%)`,
      sidebarBg: `radial-gradient(circle at 50% 0%, rgba(${r}, ${g}, ${b}, 0.18) 0%, rgba(250, 250, 247, 0.95) 70%, #F3F0E6 100%)`,
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

  const [songDurations, setSongDurations] = useState({});
  const fetchingDurationsRef = useRef(new Set());

  const [playbackQueue, setPlaybackQueue] = useState(() => {
    try {
      const saved = localStorage.getItem("euphony_playback_queue");
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  const [playbackIndex, setPlaybackIndex] = useState(() => parseInt(localStorage.getItem("euphony_playback_index")) || 0);
  const [playbackSourceName, setPlaybackSourceName] = useState(() => localStorage.getItem("euphony_playback_source") || "Global Library");
    const [preloadSrc, setPreloadSrc] = useState(null);
  const [dominantColor, setDominantColor] = useState(null);
  const [dominantRgb, setDominantRgb] = useState(null);
  const songTheme = getSongThemeGradients(dominantRgb, isDarkMode);

  const CACHE_NAME = 'euphony-media-blobs';
  const [isRefreshing, setIsRefreshing] = useState(false);
  

  const [playlist, setPlaylist] = useState([]);
  const [topArtists, setTopArtists] = useState([]);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistSongs, setPlaylistSongs] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [songForPlaylistModal, setSongForPlaylistModal] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [session, setSession] = useState(null);
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
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.8);
  const [playMode, setPlayMode] = useState(() => {
    return localStorage.getItem("euphony_play_mode") || "repeat-all";
  });

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
  const [showQueue, setShowQueue] = useState(false);
  const [queueToast, setQueueToast] = useState("");
  const toastTimeoutRef = useRef(null);
  const triggerToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setQueueToast(msg);
    toastTimeoutRef.current = setTimeout(() => setQueueToast(""), 1600);
  }, []);
  const [showSleepTimerModal, setShowSleepTimerModal] = useState(false);
  const [showTrackOptionsModal, setShowTrackOptionsModal] = useState(false);
  const [showTrackArtistsModal, setShowTrackArtistsModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [sleepTimerTarget, setSleepTimerTarget] = useState(null);

  const [showMixer, setShowMixer] = useState(false);
  const [isGeneratingStems, setIsGeneratingStems] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [stemVolumes, setStemVolumes] = useState({ vocals: 1, drums: 1, bass: 1, other: 1 });
  const [activeStems, setActiveStems] = useState({});
  const [stemsBroken, setStemsBroken] = useState(false);

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
  }, [isDesktopFullscreen, showFullscreenQueueModal, isMobilePlayerOpen, showQueue, showMixer, showUploadModal, showPlaylistModal, showTrackOptionsModal, showSleepTimerModal, showTrackArtistsModal, songForPlaylistModal, viewedPlaylistId, selectedArtist, selectedAlbum]);
  const stateRefs = useRef({});

  const pendingAutoPlayRef = useRef(false);

  const [draggedQueueIndex, setDraggedQueueIndex] = useState(-1);
  const [dragOverQueueIndex, setDragOverQueueIndex] = useState(-1);
  const queueDragState = useRef({ active: false, startIdx: -1, overIdx: -1 });
  const queueItemEls = useRef([]);

  const silentAudioRef = useRef(null);
  const audioRef = useRef(null);
  const preloadAudioRef = useRef(null);
  const blobCacheRef = useRef(new Map());



  const vocalsRef = useRef(null);
  const drumsRef = useRef(null);
  const bassRef = useRef(null);
  const otherRef = useRef(null);
  const isFirstRender = useRef(true);

  const { render: renderLoader, isClosing: loaderClosing } = useAnimatedPresence(isInitialLoad, null, 300);
  const { render: renderUpload, isClosing: uploadClosing } = useAnimatedPresence(showUploadModal, null, 300);
  const { render: renderPlaylistModal, isClosing: playlistModalClosing } = useAnimatedPresence(showPlaylistModal, null, 300);
  const { render: renderSleepTimer, isClosing: sleepTimerClosing } = useAnimatedPresence(showSleepTimerModal, null, 300);
  const { render: renderTrackOptions, isClosing: trackOptionsClosing } = useAnimatedPresence(showTrackOptionsModal, null, 300);
  const { render: renderTrackArtists, isClosing: trackArtistsClosing } = useAnimatedPresence(showTrackArtistsModal, null, 300);
  const { render: renderSongForPlaylist, isClosing: songForPlaylistClosing, data: safeSongForPlaylist } = useAnimatedPresence(!!songForPlaylistModal, songForPlaylistModal, 300);
  const { render: renderMobilePlayer, isClosing: mobilePlayerClosing } = useAnimatedPresence(isMobilePlayerOpen, null, 400);
  const { render: renderQueueToast, isClosing: queueToastClosing, data: safeQueueToast } = useAnimatedPresence(!!queueToast, queueToast, 300);
  const { render: renderExitToast, isClosing: exitToastClosing } = useAnimatedPresence(showExitToast, null, 300);
  const { render: renderShortcuts, isClosing: shortcutsClosing } = useAnimatedPresence(showShortcutsModal, null, 250);

  const rawViewedSongs = viewedPlaylistId === null ? playlist : playlistSongs;
  const currentSortKey = sortOrders[viewedPlaylistId ?? "global"] ?? null;

  const displayedSongs = [...rawViewedSongs]
    .filter(track => {
      if (selectedArtist) {
        return (track.artist || "").toLowerCase().includes(selectedArtist.toLowerCase());
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
        const durA = a.duration || songDurations[a.id] || Number.MAX_SAFE_INTEGER;
        const durB = b.duration || songDurations[b.id] || Number.MAX_SAFE_INTEGER;
        return durA - durB;
      }
      
      const valA = (a[currentSortKey] || "").toString().trim().toLowerCase();
      const valB = (b[currentSortKey] || "").toString().trim().toLowerCase();
      return valA.localeCompare(valB);
    });



  const activePlaylistObj = userPlaylists.find(p => p.id === viewedPlaylistId);
  const currentTrack = queueCurrentTrack || (playbackQueue.length > 0 ? playbackQueue[playbackIndex] : undefined);

  // Ensure playbackQueue is always hydrated with songs from the library if empty, trapped, or missing lyrics
  useEffect(() => {
    if (playlist.length > 0) {
      const shouldHydrate = playbackQueue.length === 0 || 
        (playbackQueue.length <= 1 && playlist.length > 1 && (!playbackSourceName || playbackSourceName === "Global Library"));
      if (shouldHydrate) {
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
    if (currentTrack?.poster_url) {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 24;
          canvas.height = 24;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0, 24, 24);
          const imgData = ctx.getImageData(0, 0, 24, 24).data;
          
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
          
          setDominantColor(`rgb(${bestR}, ${bestG}, ${bestB})`);
          setDominantRgb({ r: bestR, g: bestG, b: bestB });
        } catch (e) {
          setDominantColor(null);
          setDominantRgb(null);
        }
      };
      img.onerror = () => {
        setDominantColor(null);
        setDominantRgb(null);
      };
      img.src = currentTrack.poster_url;
    } else {
      setDominantColor(null);
      setDominantRgb(null);
    }
  }, [currentTrack?.poster_url]);

  useEffect(() => {
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.name = 'theme-color';
      document.head.appendChild(metaTheme);
    }
    
    if (isMobilePlayerOpen) {
      metaTheme.content = dominantColor || "#121212";
      // The modal just mounted, meaning mobileProgressRef just attached to a new input with defaultValue=0.
      // Force it to sync with actual audio time. Use small timeouts to wait for React to attach the DOM node.
      setTimeout(updateProgressVisuals, 10);
      setTimeout(updateProgressVisuals, 100);
    } else {
      metaTheme.content = COLORS.bgBase;
    }
  }, [isMobilePlayerOpen, dominantColor, COLORS.bgBase]);

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
    const time = audioRef.current.currentTime;
    const dur = audioRef.current.duration || 100;
    const percent = dur > 0 ? (time / dur) * 100 : 0;
    
    const darkGradient = `linear-gradient(to right, rgba(255,255,255,0.8) 0%, #FFFFFF ${percent}%, rgba(255,255,255,0.15) ${percent}%)`;
    const lightGradient = `linear-gradient(to right, #1A2B4C 0%, #1A2B4C ${percent}%, rgba(26, 43, 76, 0.15) ${percent}%)`;
    
    if (desktopProgressRef.current) {
      desktopProgressRef.current.value = time;
      desktopProgressRef.current.style.background = darkGradient;
    }
    if (fullscreenProgressRef.current) {
      fullscreenProgressRef.current.value = time;
      fullscreenProgressRef.current.style.background = darkGradient;
    }
    if (mobileProgressRef.current) {
      mobileProgressRef.current.value = time;
      mobileProgressRef.current.style.background = darkGradient;
    }
    if (mobileMiniProgressRef.current) {
      mobileMiniProgressRef.current.style.width = `${percent}%`;
    }
  };

  useEffect(() => {
    const loop = () => {
      updateProgressVisuals();
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
  }, [isPlaying, isDarkMode]);

  useEffect(() => {
    let queueToUse = (playbackQueue && playbackQueue.length > 0) ? playbackQueue : playlist;
    if (queueToUse.length <= 1 && playlist.length > 1 && (!playbackSourceName || playbackSourceName === "Global Library")) {
      queueToUse = playlist;
    }
    if (!queueToUse || queueToUse.length === 0) {
      setUpcomingSourceList([]);
      return;
    }
    if (playMode === 'repeat-one') {
      const list = [
        ...queueToUse.map((track, i) => ({ track, originalIndex: i, dnd_id: track._play_id || ("fallback-" + i) })).slice(playbackIndex + 1),
        ...queueToUse.map((track, i) => ({ track, originalIndex: i, dnd_id: track._play_id || ("fallback-" + i) })).slice(0, playbackIndex)
      ];
      setUpcomingSourceList(list);
    } else if (playMode === 'order' || playMode === 'repeat-all') {
      const list = [
        ...queueToUse.map((track, i) => ({ track, originalIndex: i, dnd_id: track._play_id || ("fallback-" + i) })).slice(playbackIndex + 1),
        ...queueToUse.map((track, i) => ({ track, originalIndex: i, dnd_id: track._play_id || ("fallback-" + i) })).slice(0, playbackIndex)
      ];
      setUpcomingSourceList(list);
    } else if (playMode === 'shuffle') {
      setUpcomingSourceList(prev => {
        if (prev.length > 0 && prev[0].originalIndex === playbackIndex) {
          const remaining = prev.slice(1);
          if (remaining.length > 0) return remaining;
        }
        
        const others = queueToUse.map((track, i) => ({ track, originalIndex: i, dnd_id: track._play_id || ("fallback-" + i) })).filter(obj => obj.originalIndex !== playbackIndex);
        for (let i = others.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [others[i], others[j]] = [others[j], others[i]];
        }
        return others;
      });
    }
  }, [playbackQueue, playbackIndex, playMode, playlist, playbackSourceName]);

  const handleSwitchPlaylist = (playlistId) => {
    setViewedPlaylistId(playlistId);
    setSearchQuery("");
    setSelectedArtist(null);
    setSelectedAlbum(null);
  };

  const cycleSortKey = () => {
    const key = viewedPlaylistId ?? "global";
    const current = sortOrders[key] ?? null;
    const idx = SORT_CYCLE.indexOf(current);
    setSortOrders(prev => ({ ...prev, [key]: SORT_CYCLE[(idx + 1) % SORT_CYCLE.length] }));
  };

  useEffect(() => {
    let nextUrl = null;
    if (userQueue.length > 0) {
      nextUrl = userQueue[0].url;
    } else if (upcomingSourceList.length > 0) {
      const idx = upcomingSourceList[0].originalIndex;
      if (playbackQueue[idx]) nextUrl = playbackQueue[idx].url;
    } else if (playbackQueue.length > 1) {
      const nextIdx = (playbackIndex + 1) % playbackQueue.length;
      if (playbackQueue[nextIdx]) nextUrl = playbackQueue[nextIdx].url;
    }
    
    if (nextUrl) {
      const cdnUrl = getCdnUrl(nextUrl);
      setPreloadSrc(cdnUrl);
      if (preloadAudioRef.current) {
        preloadAudioRef.current.src = cdnUrl;
        preloadAudioRef.current.load();
      }
    } else {
      setPreloadSrc(null);
    }
  }, [currentTrack, userQueue, upcomingSourceList, playbackQueue, playbackIndex]);

  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Unknown Title',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Euphony',
        artwork: [{ src: currentTrack.poster_url || 'https://via.placeholder.com/512.png', sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
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
    openedFromTrackOptionsRef.current = false;
    setShowSleepTimerModal(false);
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
      if (stateRefs.current?.isPlaying) {
        e.preventDefault();
        e.returnValue = 'Music is playing. Are you sure you want to exit?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

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

      // Tier 1: Sub-modals opened on top (artists, sleep timer, fullscreen queue, add to playlist)
      if (s.showTrackArtistsModal) {
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
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setIsSessionLoaded(true); }).catch((e) => { console.error("Session error:", e); setIsSessionLoaded(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
      } else if (event === 'PASSWORD_RECOVERY') {
        setSession(session);
        setShowPasswordResetModal(true);
      } else if (session) {
        setSession(session);
      }
    });
    return () => { window.removeEventListener("resize", handleResize); subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (viewedPlaylistId) localStorage.setItem("euphony_playlist_id", viewedPlaylistId);
    else localStorage.removeItem("euphony_playlist_id");
  }, [viewedPlaylistId]);

  useEffect(() => {
    let isActive = true;
    
    const fetchDurationsInBatches = async () => {
      // Delay fetching by just 2 seconds to not block initial render
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const tracksToProcess = [...playlist, ...playlistSongs].filter(t => 
        !t.duration && !songDurations[t.id] && !fetchingDurationsRef.current.has(t.id) && t.url
      );
      
      const BATCH_SIZE = 5;
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
            audio.onerror = resolve; // Continue even if one fails
            audio.src = getCdnUrl(track.url);
            
            // Timeout in case metadata gets stuck loading
            setTimeout(resolve, 3000); 
          });
        }));
      }
    };
    
    fetchDurationsInBatches();
    
    return () => { isActive = false; };
  }, [playlist, playlistSongs]);

  const fetchAllData = useCallback(async (showToastNotice = false) => {
    if (!session?.user?.id) return;
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        await caches.delete('euphony-audio-cache').catch(() => {});
      }
      setIsRefreshing(true);
      const pSongs = supabase.from("songs").select("*").order("created_at", { ascending: true }).limit(1000);
      const pArtists = supabase.from("artists").select("*").order("created_at", { ascending: true });
      const pPlaylists = supabase.from("playlists").select("*, playlist_songs(song_id, songs(poster_url))").eq("user_id", session.user.id).order("created_at", { ascending: true });

      const [songsRes, artistsRes, playlistRes] = await Promise.all([pSongs, pArtists, pPlaylists]);
      
      if (songsRes.data) {
        const uniqueSongs = Array.from(new Map(songsRes.data.map(s => [s.id, s])).values());
        setPlaylist(uniqueSongs);

        const songMap = new Map(uniqueSongs.map(s => [s.id, s]));
        setPlaybackQueue(prevQueue => {
          if (!prevQueue || prevQueue.length === 0) return uniqueSongs.map(s => ({ ...s, _play_id: Math.random().toString() }));
          return prevQueue.map(item => {
            const fresh = songMap.get(item.id);
            if (!fresh) return item;
            return {
              ...fresh,
              ...item,
              lyrics: fresh.lyrics || item.lyrics,
              stem_vocals: fresh.stem_vocals || item.stem_vocals,
              stem_drums: fresh.stem_drums || item.stem_drums,
              stem_bass: fresh.stem_bass || item.stem_bass,
              stem_other: fresh.stem_other || item.stem_other,
              duration: fresh.duration || item.duration
            };
          });
        });

        setQueueCurrentTrack(prev => {
          if (!prev) return prev;
          const fresh = songMap.get(prev.id);
          if (!fresh) return prev;
          return {
            ...fresh,
            ...prev,
            lyrics: fresh.lyrics || prev.lyrics,
            stem_vocals: fresh.stem_vocals || prev.stem_vocals,
            stem_drums: fresh.stem_drums || prev.stem_drums,
            stem_bass: fresh.stem_bass || prev.stem_bass,
            stem_other: fresh.stem_other || prev.stem_other
          };
        });
      }
      
      if (!artistsRes.error && artistsRes.data && artistsRes.data.length > 0) {
        const uniqueArtists = Array.from(new Map(artistsRes.data.map(a => [a.name.trim().toLowerCase(), a])).values());
        setTopArtists(uniqueArtists);
      } else {
        setTopArtists([
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
        ]);
      }

      if (playlistRes.data) {
        const uniquePlaylists = Array.from(new Map(playlistRes.data.map(p => [p.id, p])).values());
        let hasLiked = uniquePlaylists.some(p => p.name === "Liked Songs");
        let finalPlaylists = [...uniquePlaylists];
        if (!hasLiked) {
          const { data: newLiked } = await supabase.from("playlists").insert([{ name: "Liked Songs", user_id: session.user.id }]).select("*, playlist_songs(song_id, songs(poster_url))");
          if (newLiked && newLiked.length > 0) {
            finalPlaylists.unshift(newLiked[0]);
          }
        }
        setUserPlaylists(finalPlaylists);
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
    if (!session?.user?.id) return;
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
  const isMixerActive = currentTrack?.stem_vocals && !stemsBroken && areStemsModified;

  useEffect(() => {
    const setVol = (ref, targetVol, targetMuted) => {
      if (!ref.current) return;
      if (Math.abs(ref.current.volume - targetVol) > 0.01) ref.current.volume = targetVol;
      if (ref.current.muted !== targetMuted) ref.current.muted = targetMuted;
    };

    setVol(audioRef, isMixerActive ? 0 : (isMuted ? 0 : volume), isMixerActive || isMuted);
    setVol(vocalsRef, isMixerActive ? (isMuted ? 0 : stemVolumes.vocals * (volume || 1)) : 0, !isMixerActive || isMuted || stemVolumes.vocals === 0);
    setVol(drumsRef, isMixerActive ? (isMuted ? 0 : stemVolumes.drums * (volume || 1)) : 0, !isMixerActive || isMuted || stemVolumes.drums === 0);
    setVol(bassRef, isMixerActive ? (isMuted ? 0 : stemVolumes.bass * (volume || 1)) : 0, !isMixerActive || isMuted || stemVolumes.bass === 0);
    setVol(otherRef, isMixerActive ? (isMuted ? 0 : stemVolumes.other * (volume || 1)) : 0, !isMixerActive || isMuted || stemVolumes.other === 0);
  }, [volume, isMuted, stemVolumes, currentTrack, stemsBroken]);

  useEffect(() => {
    if ((showMixer || (isDesktopFullscreen && fullscreenView === "mixer")) && currentTrack?.stem_vocals && audioRef.current && !stemsBroken) {
      const t = audioRef.current.currentTime;
      if (vocalsRef.current) vocalsRef.current.currentTime = t;
      if (drumsRef.current)  drumsRef.current.currentTime  = t;
      if (bassRef.current)   bassRef.current.currentTime   = t;
      if (otherRef.current)  otherRef.current.currentTime  = t;
    }
  }, [showMixer, isDesktopFullscreen, fullscreenView, currentTrack, stemsBroken]);

  
  const prefetchedSignatureRef = useRef("");
  
  useEffect(() => {
    // Reset signature when track changes so we can prefetch for the new track
    prefetchedSignatureRef.current = "";
  }, [currentTrack?.url]);

  useEffect(() => {
    const checkPrefetch = async () => {
        if (!audioRef.current || !currentTrack?.url) return;
        
        const targetTime = 1;
        
        if (audioRef.current.currentTime >= targetTime) {
          if (prefetchedSignatureRef.current === currentTrack.url) return;
          prefetchedSignatureRef.current = currentTrack.url;
        let nextTracks = [];
        if (userQueue.length > 0) {
          nextTracks = userQueue.slice(0, 2);
        }
        if (nextTracks.length < 2 && upcomingSourceList.length > 0) {
          const needed = 2 - nextTracks.length;
          const upc = upcomingSourceList.slice(0, needed).map(item => playbackQueue[item.originalIndex]).filter(Boolean);
          nextTracks = [...nextTracks, ...upc];
        }
        
        const signature = nextTracks.map(t => t.url).join(",");
        if (prefetchedSignatureRef.current === signature) return;
        prefetchedSignatureRef.current = signature;
        
        for (const track of nextTracks) {
          if (!track.url) continue;
          const cUrl = getCdnUrl(track.url);
          if (!blobCacheRef.current.has(cUrl)) {
            try {
              const cache = await caches.open(CACHE_NAME);
              let match = await cache.match(cUrl);
              if (!match) {
                await cache.add(cUrl);
                match = await cache.match(cUrl);
              }
              if (match) {
                const blob = await match.blob();
                blobCacheRef.current.set(cUrl, URL.createObjectURL(blob));
              }
            } catch(e) {}
          }
        }
      }
    };

    const audioEl = audioRef.current;
    if (audioEl) {
      // Native timeupdate fires even when the screen is locked on mobile devices (unlike setTimeout/setInterval)
      audioEl.addEventListener("timeupdate", checkPrefetch);
    }
    
    return () => {
      if (audioEl) audioEl.removeEventListener("timeupdate", checkPrefetch);
    };
  }, [playbackQueue, userQueue, upcomingSourceList, currentTrack?.url]);

  useEffect(() => {
    const syncPlayState = async () => {
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
        if (isPlaying && currentTrack) {
        if (audioRef.current?.paused && audioRef.current.src && audioRef.current.src !== window.location.href) {
          audioRef.current.play().catch(e => e);
        }
        if (currentTrack?.stem_vocals && !stemsBroken) {
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
  }, [isPlaying, stemsBroken, currentTrack]);

  const handleTimeUpdateRef = useRef();
  const lastSavedTimeRef = useRef(-1);
  
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

        if ('mediaSession' in navigator && audioRef.current && isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audioRef.current.duration,
              playbackRate: audioRef.current.playbackRate,
              position: audioRef.current.currentTime
            });
          } catch(e) {}
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

  useEffect(() => {
    if (isFirstRender.current && audioRef.current && currentTrack) {
      if (!audioRef.current.src || audioRef.current.src === window.location.href) {
        audioRef.current.src = getCdnUrl(currentTrack.url);
      }
      const savedTime = localStorage.getItem("euphony_current_time");
        if (savedTime && !isNaN(parseFloat(savedTime))) {
          const restoreTime = () => {
            if (audioRef.current) {
              audioRef.current.currentTime = parseFloat(savedTime);
              setCurrentTime(parseFloat(savedTime));
              updateProgressVisuals();
            }
            audioRef.current?.removeEventListener('loadedmetadata', restoreTime);
          };
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
      audioRef.current?.play().catch(e => console.log("canplay-play err:", e));
      if (currentTrack?.stem_vocals && !stemsBroken) {
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
      updateProgressVisuals();
      if (vocalsRef.current) vocalsRef.current.currentTime = seekTime;
      if (drumsRef.current)  drumsRef.current.currentTime  = seekTime;
      if (bassRef.current)   bassRef.current.currentTime   = seekTime;
      if (otherRef.current)  otherRef.current.currentTime  = seekTime;
    }
  };

  const handleLyricClick = (time, e) => {
    if (e) e.stopPropagation();
    if (audioRef.current) { 
      audioRef.current.currentTime = time; 
      setCurrentTime(time); 
      updateProgressVisuals();
      if (!isPlaying) setIsPlaying(true); 
    }
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
      const duration = 600; // Ultra smooth 600ms duration

      const easeInOutQuart = (t, b, c, d) => {
        t /= d/2;
        if (t < 1) return c/2*t*t*t*t + b;
        t -= 2;
        return -c/2 * (t*t*t*t - 2) + b;
      };

      const animateScroll = (currentTime) => {
        const timeElapsed = currentTime - startTime;
        const next = easeInOutQuart(timeElapsed, startY, distance, duration);
        container.scrollTop = next;
        if (timeElapsed < duration) {
          requestAnimationFrame(animateScroll);
        } else {
          container.scrollTop = targetY;
        }
      };
      
      requestAnimationFrame(animateScroll);
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
      const duration = 600;

      const easeInOutQuart = (t, b, c, d) => {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t * t * t + b;
        t -= 2;
        return -c / 2 * (t * t * t * t - 2) + b;
      };

      let animationFrame;
      const animateScroll = (currentTime) => {
        const timeElapsed = currentTime - startTime;
        const next = easeInOutQuart(timeElapsed, startY, distance, duration);
        container.scrollTop = next;
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
      console.error("Stem request error:", err); alert("Database Error:\n" + err.message);
      setIsGeneratingStems(false); setGenerationStatus("");
    }
  };

  const addToQueue = (song, e) => {
    if (e) e.stopPropagation();
    const full = playlist.find(s => s.id === song.id);
    const enriched = (full?.lyrics && !song.lyrics) ? { ...song, lyrics: full.lyrics } : song;
    setUserQueue(prev => [...prev, { ...enriched, queue_id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substr(2, 9) }]);
    triggerToast(`Added "${song.title}" to Queue`);
  };
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setUserQueue((items) => {
        const oldIndex = items.findIndex(item => item.queue_id === active.id);
        const newIndex = items.findIndex(item => item.queue_id === over.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
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
    const rawSong = userQueue[index];
    const full = playlist.find(s => s.id === rawSong?.id);
    const song = (full?.lyrics && !rawSong?.lyrics) ? { ...rawSong, lyrics: full.lyrics } : rawSong;
    setUserQueue(prev => prev.filter((_, i) => i !== index));
    setQueueCurrentTrack(song);
    resetPlaybackTime();
    setIsPlaying(true);
    if (audioRef.current && song) {
      audioRef.current.src = getCdnUrl(song.url);
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

  const playTrackWithMetadata = (track, audioEl, cacheMap) => {
    if (!audioEl || !track) return;
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
    audioEl.src = objUrl;
    audioEl.play().catch(e=>console.log(e));
  };
  
  const handlePlaySong = (index, listToSet, sourceName) => {
    let queueToSet = listToSet;
    let actualIndex = index;

    const clickedTrack = listToSet[index];
    if (clickedTrack) {
      if ((sourceName === "Global Library" || !sourceName) && playlist.length > listToSet.length) {
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
    setPlaybackIndex(actualIndex);
    setPlaybackSourceName(sourceName || "Global Library");
    setQueueCurrentTrack(null);
    resetPlaybackTime();
    setIsPlaying(true);
    playTrackWithMetadata(track, audioRef.current, blobCacheRef.current);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle || !uploadArtist || !uploadPoster) return alert("Please fill in all required fields, including the poster image.");
    
    if (uploadFile.size > 50 * 1024 * 1024) return alert("Audio file is too large! Maximum size is 50MB.");
    if (uploadPoster.size > 5 * 1024 * 1024) return alert("Poster image is too large! Maximum size is 5MB.");
    
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

      // 3. Save song metadata and direct Cloudinary URL into Supabase database
      const { data: dbData, error: dbError } = await supabase.from("songs").insert([{ 
        title: uploadTitle, 
        artist: uploadArtist, 
        album: uploadAlbum || null, 
        lyrics: uploadLyrics || null, 
        url: audioUrl, 
        poster_url: posterUrl 
      }]).select();
      if (dbError) throw dbError;

      setPlaylist(prev => prev.some(s => s.id === dbData[0].id) ? prev : [...prev, dbData[0]]);
      setShowUploadModal(false);
      setUploadTitle(""); setUploadArtist(""); setUploadAlbum(""); setUploadLyrics(""); setUploadFile(null); setUploadPoster(null);
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
    if (!newPlaylistName.trim()) return;
    const { data, error } = await supabase.from("playlists").insert([{ name: newPlaylistName, user_id: session.user.id }]).select();
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
    if (e) e.stopPropagation();
    if (!audioRef.current) return;
    if (playbackQueue.length === 0 && playlist.length > 0) {
       handlePlaySong(0, playlist, "Global Library");
       return;
    }
    if (!currentTrack) return;
    
    if (!isPlaying) {
      setIsPlaying(true);
      if (audioRef.current.src && audioRef.current.src !== window.location.href) {
        if (audioRef.current.readyState === 0) audioRef.current.load();
        audioRef.current.play().catch(err => console.log(err));
      } else {
        audioRef.current.src = getCdnUrl(currentTrack.url);
        audioRef.current.load();
        audioRef.current.play().catch(e=>e);
      }
    } else {
      setIsPlaying(false);
      audioRef.current.pause();
    }
  };

  const cyclePlayMode = () => {
    const idx = PLAY_MODES.indexOf(playMode);
    setPlayMode(PLAY_MODES[(idx + 1) % PLAY_MODES.length]);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    
    if (userQueue.length > 0) {
      const rawNextSong = userQueue[0];
      const full = playlist.find(s => s.id === rawNextSong?.id);
      const nextSong = (full?.lyrics && !rawNextSong?.lyrics) ? { ...rawNextSong, lyrics: full.lyrics } : rawNextSong;
      setUserQueue(prev => prev.slice(1));
      setQueueCurrentTrack(nextSong);
      resetPlaybackTime();
      setIsPlaying(true);
      playTrackWithMetadata(nextSong, audioRef.current, blobCacheRef.current);
      return;
    }
    
    let activeQueue = (playbackQueue && playbackQueue.length > 0) ? playbackQueue : playlist;
    if (activeQueue.length <= 1 && playlist.length > 1) {
      const queueWithIds = playlist.map(s => s._play_id ? s : { ...s, _play_id: Math.random().toString() });
      setPlaybackQueue(queueWithIds);
      activeQueue = queueWithIds;
    }

    if (!activeQueue || activeQueue.length === 0) return;

    setPlaybackHistory(prev => [...prev, playbackIndex]);

    let nextIdx = -1;

    if (playMode === 'shuffle') {
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
      nextIdx = (playbackIndex + 1) % activeQueue.length;
    }

    const nextTrack = activeQueue[nextIdx];
    if (!nextTrack) return;

    setQueueCurrentTrack(null);
    setPlaybackIndex(nextIdx);
    resetPlaybackTime();
    setIsPlaying(true);
    playTrackWithMetadata(nextTrack, audioRef.current, blobCacheRef.current);
  };

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    
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
      return; 
    }
    
    let prevIdx = playbackIndex - 1;
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
    setPlaybackIndex(prevIdx);
    resetPlaybackTime();
    setIsPlaying(true);
    
    const prevSong = activeQueue[prevIdx];
    if (prevSong) {
      playTrackWithMetadata(prevSong, audioRef.current, blobCacheRef.current);
    }
  };

  const handleTrackEnded = () => {
    if (playMode === "repeat-one") {
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
    
    if (userQueue.length > 0) {
      const rawNextSong = userQueue[0];
      const full = playlist.find(s => s.id === rawNextSong?.id);
      const nextSong = (full?.lyrics && !rawNextSong?.lyrics) ? { ...rawNextSong, lyrics: full.lyrics } : rawNextSong;
      setUserQueue(prev => prev.slice(1));
      setQueueCurrentTrack(nextSong);
      resetPlaybackTime();
      setIsPlaying(true);
      playTrackWithMetadata(nextSong, audioRef.current, blobCacheRef.current);
      return;
    }
    
    let activeQueue = (playbackQueue && playbackQueue.length > 0) ? playbackQueue : playlist;
    if (activeQueue.length <= 1 && playlist.length > 1) {
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
    if (playMode === 'shuffle') {
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
      nextIdx = (playbackIndex + 1) % activeQueue.length;
    }

    const nextTrack = activeQueue[nextIdx];
    if (nextTrack) {
      setQueueCurrentTrack(null);
      setPlaybackIndex(nextIdx);
      resetPlaybackTime();
      setIsPlaying(true);
      playTrackWithMetadata(nextTrack, audioRef.current, blobCacheRef.current);
    }
  };

    useEffect(() => {
    if (isPlaying && silentAudioRef.current && silentAudioRef.current.paused) {
      silentAudioRef.current.play().catch(() => {});
    }
  }, [isPlaying]);

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Ignore if user is typing in any input field or textarea
      const target = e.target;
      const isTextInput = target && (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable ||
        target.getAttribute?.("role") === "textbox"
      );
      if (isTextInput) return;

      // 2. Ignore Ctrl / Meta / Alt combos to preserve native browser shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // 3. Handle Escape key for closing modals & fullscreen
      if (e.key === "Escape") {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
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

      // 4. Space: Play / Pause
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        handlePlayPause();
        return;
      }

      // 5. Left / Right Arrow: Seek 5s backward / forward (Shift + Arrow: Prev / Next track)
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (e.shiftKey) {
          handleNext();
        } else if (audioRef.current && currentTrack) {
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
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (e.shiftKey) {
          handlePrev();
        } else if (audioRef.current && currentTrack) {
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
        }
        return;
      }

      // 6. Up / Down Arrow: Volume control
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (isMuted) setIsMuted(false);
        setVolume(prev => {
          const next = Math.min(1, Math.round((prev + 0.05) * 100) / 100);
          triggerToast(`Volume: ${Math.round(next * 100)}%`);
          return next;
        });
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setVolume(prev => {
          const next = Math.max(0, Math.round((prev - 0.05) * 100) / 100);
          if (next === 0) setIsMuted(true);
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

      // 10. F / f: Toggle Fullscreen Player
      if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (currentTrack) {
          setIsDesktopFullscreen(prev => !prev);
        }
        return;
      }

      // 11. ? (Shift + /): Toggle Shortcuts Cheat Sheet
      if (e.key === "?") {
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
    showShortcutsModal,
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
    triggerToast
  ]);

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

  const renderMixerBlock = (isMobile, customHeight, customBg) => {
    const sliderHeight = customHeight || (isMobile ? 140 : 160);
    return (
    <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: isMobile ? "16px" : "20px 18px", background: customBg !== undefined ? customBg : (isDarkMode ? "rgba(10, 15, 26, 0.75)" : "rgba(250, 250, 247, 0.85)"), backdropFilter: customBg !== undefined ? "none" : "blur(20px)", borderRadius: customBg !== undefined ? "0" : "12px", textAlign: "center", color: isDarkMode ? "#FFFFFF" : COLORS.primary, display: "flex", flexDirection: "column" }}>
      {!currentTrack?.stem_vocals || stemsBroken ? (
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
                      onChange={(e) => setStemVolumes({ ...stemVolumes, [stemType]: parseFloat(e.target.value) })}
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
                      onTouchStart={() => setActiveStems(prev => ({ ...prev, [stemType]: true }))}
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
                  style={{ fontSize: isMobile ? "20px" : "18px", fontWeight: "700", color: isActiveLine ? activeColor : inactiveColor, textShadow: isActiveLine && !lyric.words ? activeShadow : inactiveShadow, padding: "10px 0", transition: "all 0.6s cubic-bezier(0.25, 1, 0.5, 1)", transform: isActiveLine ? "scale(1.15)" : "scale(1)", transformOrigin: "center", lineHeight: "1.4", cursor: "pointer", willChange: "transform, color, text-shadow", WebkitFontSmoothing: "antialiased", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}>
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
            {trackLyrics ? trackLyrics : "No synchronized lyrics available."}
          </div>
        )}
      </div>
    );
  };

  const renderQueueBlock = (isMobile, customBg) => {
    const isDark = isDarkMode || customBg === "transparent";
    return (
      <div className="custom-scrollbar" style={{ width: "100%", height: "100%", padding: customBg !== undefined ? "4px 0" : (isMobile ? "16px" : "18px"), overflowY: "auto", background: customBg !== undefined ? customBg : (isDarkMode ? "rgba(10, 15, 26, 0.75)" : "rgba(250, 250, 247, 0.85)"), backdropFilter: customBg !== undefined ? "none" : "blur(20px)", borderRadius: "12px", textAlign: "left", color: isDark ? "#FFFFFF" : COLORS.primary }}>
        <div style={{ marginBottom: "22px" }}>
          <h4 style={{ margin: "0 0 10px 0", fontSize: "13px", textTransform: "uppercase", letterSpacing: "1px", color: isDark ? "rgba(255,255,255,0.7)" : COLORS.textMuted }}>Now Playing</h4>
          {currentTrack && (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px 10px", borderRadius: "8px", background: isDark ? "rgba(255,255,255,0.08)" : "rgba(26,43,76,0.06)", border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(26,43,76,0.08)" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "4px", overflow: "hidden", flexShrink: 0, backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(26,43,76,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={18} color={isDark ? "rgba(255,255,255,0.6)" : COLORS.textMuted} />}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: COLORS.spotifyGreen, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.title}</div>
                <div style={{ fontSize: "12px", color: isDark ? "rgba(255,255,255,0.7)" : COLORS.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentTrack.artist}</div>
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
    const validPosters = playlistSongs.map(s => s.poster_url).filter(Boolean);

    if (playlistSongs.length === 0 || validPosters.length === 0) {
      return (
        <div style={{ width: size, height: size, backgroundColor: COLORS.primary, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 12px 24px rgba(26,43,76,0.15)", flexShrink: 0 }}>
          <FolderPlus size={isDesktop ? 72 : 56} color={COLORS.bgPanel} />
        </div>
      );
    }

    if (playlistSongs.length < 4 || validPosters.length < 4) {
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
        
        .fade-enter { animation: fadeIn 0.3s ease-out forwards; }
        .fade-exit { animation: fadeOut 0.3s ease-out forwards; }
        .slide-up-enter { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .slide-down-exit { animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pop-enter { animation: popIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .pop-exit { animation: popOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .toast-enter { animation: toastUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .toast-exit { animation: toastDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
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
        .custom-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
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
          backdrop-filter: blur(24px) saturate(200%);
          -webkit-backdrop-filter: blur(24px) saturate(200%);
          border: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.5)"};
          border-top: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(255, 255, 255, 0.9)"};
          border-radius: 12px;
          box-shadow: ${isDarkMode ? "0 4px 12px rgba(0, 0, 0, 0.2)" : "0 8px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)"};
          transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
          contain: paint;
          isolation: isolate;
        }
        .glass-row:hover {
          background: ${isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.16)"};
          border: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.6)"};
          border-top: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 1)"};
          box-shadow: ${isDarkMode ? "0 6px 16px rgba(0, 0, 0, 0.3)" : "0 10px 28px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6)"};
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
        .glass-btn-primary:hover {
          background: ${isDarkMode ? "rgba(242, 233, 228, 1)" : "rgba(26, 43, 76, 1)"};
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }
        .glass-row.active {
          background: ${isDarkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.22)"};
          border: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.8)"};
          border-top: 1px solid ${isDarkMode ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 1)"};
          box-shadow: ${isDarkMode ? "0 8px 24px rgba(0, 0, 0, 0.4)" : "0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.8)"};
        }
      `}</style>

      {/* ── AUDIO ELEMENTS ── */}
      <audio ref={silentAudioRef} src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA" loop playsInline autoPlay muted style={{ display: 'none' }} />
            <audio
        ref={audioRef}
        onLoadedMetadata={(e) => {
          setDuration(e.target.duration);
          updateProgressVisuals();
        }}
        onTimeUpdate={() => {
          setCurrentTime(audioRef.current?.currentTime || 0);
          handleTimeUpdateRef.current && handleTimeUpdateRef.current();
        }}
        onEnded={() => { handleTrackEnded(); }}
        onCanPlay={handleCanPlay}
        onWaiting={() => {
          if (currentTrack?.stem_vocals && !stemsBroken) {
            vocalsRef.current?.pause(); drumsRef.current?.pause(); bassRef.current?.pause(); otherRef.current?.pause();
          }
        }}
        onPlaying={() => {
          if (isPlaying && currentTrack?.stem_vocals && !stemsBroken) {
            vocalsRef.current?.play().catch(e=>e); drumsRef.current?.play().catch(e=>e); bassRef.current?.play().catch(e=>e); otherRef.current?.play().catch(e=>e);
          }
        }}
        preload="auto"
        playsInline
        muted={isMixerActive || isMuted}
        loop={playMode === 'repeat-one'}
        className="loop-audio-fix"
      />
      <audio ref={vocalsRef} src={getCdnUrl(currentTrack?.stem_vocals) || undefined} preload="auto" playsInline muted={!isMixerActive || isMuted || stemVolumes.vocals === 0} loop={playMode === 'repeat-one'} onError={() => currentTrack?.stem_vocals && setStemsBroken(true)} className="loop-audio-fix" />
      <audio ref={drumsRef}  src={getCdnUrl(currentTrack?.stem_drums)  || undefined} preload="auto" playsInline muted={!isMixerActive || isMuted || stemVolumes.drums === 0} loop={playMode === 'repeat-one'} onError={() => currentTrack?.stem_drums  && setStemsBroken(true)} className="loop-audio-fix" />
      <audio ref={bassRef}   src={getCdnUrl(currentTrack?.stem_bass)   || undefined} preload="auto" playsInline muted={!isMixerActive || isMuted || stemVolumes.bass === 0} loop={playMode === 'repeat-one'} onError={() => currentTrack?.stem_bass   && setStemsBroken(true)} className="loop-audio-fix" />
      <audio ref={otherRef}  src={getCdnUrl(currentTrack?.stem_other)  || undefined} preload="auto" playsInline muted={!isMixerActive || isMuted || stemVolumes.other === 0} loop={playMode === 'repeat-one'} onError={() => currentTrack?.stem_other  && setStemsBroken(true)} className="loop-audio-fix" />

      {/* TOASTS */}
      {renderQueueToast && (
        <div className={queueToastClosing ? "toast-exit" : "toast-enter"} style={{ position: "fixed", top: "80px", left: "50%", background: COLORS.primary, color: COLORS.bgPanel, padding: "10px 20px", borderRadius: "20px", fontSize: "14px", fontWeight: "600", zIndex: 10010, boxShadow: "0 8px 16px rgba(0,0,0,0.25)", pointerEvents: "none", transform: "translateX(-50%)" }}>
          {safeQueueToast}
        </div>
      )}
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
              <input type="text" placeholder="Artist Name *" required value={uploadArtist} onChange={e => setUploadArtist(e.target.value)} className="upload-input glass-row" style={{ color: songTheme.textColor, background: songTheme.rowBg, border: songTheme.rowBorder }} />
              <input type="text" placeholder="Album Name (Optional)" value={uploadAlbum} onChange={e => setUploadAlbum(e.target.value)} className="upload-input glass-row" style={{ color: songTheme.textColor, background: songTheme.rowBg, border: songTheme.rowBorder }} />
              <textarea placeholder="Paste Lyrics Here (Optional)" value={uploadLyrics} onChange={e => setUploadLyrics(e.target.value)} className="upload-input glass-row custom-scrollbar" style={{ minHeight: "100px", resize: "vertical", color: songTheme.textColor, background: songTheme.rowBg, border: songTheme.rowBorder }} />
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

      {/* TRACK OPTIONS MODAL */}
      {renderTrackOptions && currentTrack && (
        <div className={trackOptionsClosing ? "fade-exit" : "fade-enter"} style={{ position: "fixed", inset: 0, background: songTheme.modalOverlay, backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10005, padding: "20px" }} onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackOptionsModal(false); }}>
          <div className={`${trackOptionsClosing ? 'pop-exit' : 'pop-enter'} custom-scrollbar`} style={{ background: songTheme.modalBg, backdropFilter: "blur(24px)", border: songTheme.modalBorder, padding: "32px", borderRadius: "20px", width: "100%", maxWidth: "340px", position: "relative", maxHeight: "80vh", overflowY: "auto", boxShadow: songTheme.modalShadow, color: songTheme.textColor }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackOptionsModal(false); }} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: songTheme.textColor, cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px", textAlign: "center" }}>
              <div style={{ width: "140px", height: "140px", borderRadius: "16px", overflow: "hidden", marginBottom: "16px", boxShadow: isDarkMode ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(26,43,76,0.15)", backgroundColor: COLORS.imageBg }}>
                {currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={32} color={COLORS.textMuted} />}
              </div>
              <h2 style={{ margin: "0", fontSize: "22px", fontWeight: "800", color: songTheme.textColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{currentTrack.title}</h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div onClick={() => { openedFromTrackOptionsRef.current = true; setShowTrackArtistsModal(true); setShowTrackOptionsModal(false); }} className="glass-row hover-effect" style={{ width: "100%", padding: "14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                <User size={18} /> Go to artists
              </div>
              <div onClick={() => { openedFromTrackOptionsRef.current = true; setSongForPlaylistModal(currentTrack); setShowTrackOptionsModal(false); }} className="glass-row hover-effect" style={{ width: "100%", padding: "14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                <FolderPlus size={18} /> Add to playlist
              </div>
              <div onClick={(e) => { openedFromTrackOptionsRef.current = false; addToQueue(currentTrack, e); setShowTrackOptionsModal(false); }} className="glass-row hover-effect" style={{ width: "100%", padding: "14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                <ListPlus size={18} /> Add to Queue
              </div>
              <div onClick={() => { openedFromTrackOptionsRef.current = true; if (isDesktopFullscreen) { setShowFullscreenQueueModal(true); } else { setShowQueue(true); if (isMobilePlayerOpen) setIsMobilePlayerOpen(true); } setShowTrackOptionsModal(false); }} className="glass-row hover-effect" style={{ width: "100%", padding: "14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                <ListMusic size={18} /> Go to Queue
              </div>
              <div onClick={() => { openedFromTrackOptionsRef.current = false; setSelectedAlbum(currentTrack.album || currentTrack.artist); setSearchQuery(''); setViewedPlaylistId(null); setIsMobilePlayerOpen(false); setIsDesktopFullscreen(false); setShowTrackOptionsModal(false); }} className="glass-row hover-effect" style={{ width: "100%", padding: "14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                <Disc size={18} /> Go to album
              </div>
              <div onClick={() => { openedFromTrackOptionsRef.current = true; setShowSleepTimerModal(true); setShowTrackOptionsModal(false); }} className="glass-row hover-effect" style={{ width: "100%", padding: "14px", color: songTheme.textColor, fontWeight: "bold", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: "12px", background: songTheme.rowBg, border: songTheme.rowBorder, borderRadius: "14px" }}>
                <Clock size={18} /> Sleep timer
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TRACK ARTISTS MODAL */}
      {renderTrackArtists && currentTrack && (
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
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: songTheme.textColor, letterSpacing: "-0.3px" }}>Artists</h2>
                <button
                  onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackArtistsModal(false); }}
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
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  className="hover-effect"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {(currentTrack.artist || "").split(/[,&]/).map(a => a.trim()).filter(Boolean).map((artistName, idx) => {
                  const dbArtist = topArtists.find(a => a.name.toLowerCase() === artistName.toLowerCase());
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
              <div style={{ width: "40px", height: "4px", background: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(26,43,76,0.2)", borderRadius: "2px", margin: "0 auto 20px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: songTheme.textColor }}>Artists</h2>
                <button
                  onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackArtistsModal(false); }}
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
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {(currentTrack.artist || "").split(/[,&]/).map(a => a.trim()).filter(Boolean).map((artistName, idx) => {
                  const dbArtist = topArtists.find(a => a.name.toLowerCase() === artistName.toLowerCase());
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
      )}

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
                  <ListMusic size={22} color={songTheme.textColor} />
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: songTheme.textColor, letterSpacing: "-0.3px" }}>Queue</h2>
                  {userQueue.length > 0 && (
                    <span style={{ background: COLORS.spotifyGreen, color: "#FFFFFF", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }}>
                      {userQueue.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { openedFromTrackOptionsRef.current = false; setShowFullscreenQueueModal(false); }}
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
              <div style={{ width: "40px", height: "4px", background: isDarkMode ? "rgba(255,255,255,0.3)" : "rgba(26,43,76,0.2)", borderRadius: "2px", margin: "0 auto 20px" }} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <ListMusic size={22} color={songTheme.textColor} />
                  <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "800", color: songTheme.textColor }}>Queue</h2>
                  {userQueue.length > 0 && (
                    <span style={{ background: COLORS.spotifyGreen, color: "#FFFFFF", borderRadius: "12px", padding: "2px 8px", fontSize: "11px", fontWeight: "700" }}>
                      {userQueue.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { openedFromTrackOptionsRef.current = false; setShowFullscreenQueueModal(false); }}
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
            <button onClick={() => { openedFromTrackOptionsRef.current = false; setSongForPlaylistModal(null); }} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", color: songTheme.textColor, cursor: "pointer" }} className="hover-effect"><X size={24} /></button>
            <h2 style={{ margin: "0 0 8px 0", fontSize: "20px", display: "flex", alignItems: "center", gap: "10px", color: songTheme.textColor, fontWeight: "800" }}><FolderPlus color={songTheme.textColor} size={22} /> Add to Playlist</h2>
            <p style={{ margin: "0 0 20px 0", fontSize: "13px", color: songTheme.textMuted }}>"{safeSongForPlaylist?.title}"</p>
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
        <h1 style={{ margin: 0, fontSize: isDesktop ? "24px" : "20px", color: COLORS.primary, fontWeight: "800", letterSpacing: "-0.5px" }}>Euphony</h1>
        <div style={{ display: "flex", gap: isDesktop ? "12px" : "8px", alignItems: "center" }}>
          <button className="hover-effect" onClick={() => fetchAllData(true)} disabled={isRefreshing} style={{ background: "transparent", border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.primary, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold", opacity: isRefreshing ? 0.7 : 1 }}>
            <RefreshCw size={16} className={isRefreshing ? "spin-animate" : ""} />{isDesktop && (isRefreshing ? " Refreshing..." : " Refresh")}
          </button>
          <button className="hover-effect" onClick={toggleDarkMode} style={{ background: "transparent", border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.primary, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            {isDesktop && (isDarkMode ? " Light" : " Dark")}
          </button>
          {isDesktop && (
            <button className="hover-effect" onClick={() => setShowShortcutsModal(true)} title="Keyboard Shortcuts (?)" style={{ background: "transparent", border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 14px", color: COLORS.primary, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
              <Keyboard size={16} /> Shortcuts
            </button>
          )}
          <button className="hover-effect" onClick={() => setShowUploadModal(true)} style={{ background: COLORS.primary, border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.bgPanel, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <Plus size={16} color={COLORS.bgPanel} />{isDesktop && " Add Globally"}
          </button>
          <button className="hover-effect" onClick={() => setShowPlaylistModal(true)} style={{ background: COLORS.primary, border: "none", borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.bgPanel, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: "bold" }}>
            <FolderPlus size={16} color={COLORS.bgPanel} />{isDesktop && " New Playlist"}
          </button>
          <button className="hover-effect" onClick={() => { localStorage.removeItem("euphony_current_time"); localStorage.removeItem("euphony_playlist_id"); localStorage.removeItem("euphony_user_queue"); localStorage.removeItem("euphony_queue_current_track"); localStorage.removeItem("euphony_playback_history"); localStorage.removeItem("euphony_playback_queue"); localStorage.removeItem("euphony_playback_index"); localStorage.removeItem("euphony_playback_source"); supabase.auth.signOut(); }} style={{ background: "transparent", border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: isDesktop ? "8px 16px" : "8px 12px", color: COLORS.primary, cursor: "pointer", fontSize: "13px", fontWeight: "bold", display: "flex", alignItems: "center" }}>
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
              <div onClick={() => handleSwitchPlaylist(null)} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: viewedPlaylistId === null ? COLORS.primary : COLORS.textMuted, fontWeight: "bold", fontSize: "15px", cursor: "pointer" }}>
                <Home size={24} color={viewedPlaylistId === null ? COLORS.primary : COLORS.textMuted} /> Global Library
              </div>
              {likedPlaylist && (
                <div onClick={() => handleSwitchPlaylist(likedPlaylist.id)} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "16px", color: viewedPlaylistId === likedPlaylist.id ? COLORS.primary : COLORS.textMuted, fontWeight: "bold", fontSize: "15px", cursor: "pointer" }}>
                  <Heart size={24} color={viewedPlaylistId === likedPlaylist.id ? COLORS.primary : COLORS.textMuted} fill={viewedPlaylistId === likedPlaylist.id ? COLORS.primary : "none"} /> Liked Songs
                </div>
              )}
            </div>
            <hr style={{ border: "none", borderTop: `1px solid ${COLORS.border}`, margin: 0 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }} className="custom-scrollbar">
              <span style={{ fontSize: "12px", fontWeight: "bold", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "1px" }}>Playlists</span>
              {userPlaylists.filter(pl => pl.name !== "Liked Songs").map(pl => (
                <div key={pl.id} onClick={() => handleSwitchPlaylist(pl.id)} className="sidebar-item" style={{ display: "flex", alignItems: "center", gap: "12px", color: viewedPlaylistId === pl.id ? COLORS.primary : COLORS.textMuted, fontSize: "15px", padding: "4px 0", fontWeight: viewedPlaylistId === pl.id ? "bold" : "normal", cursor: "pointer" }}>
                  {renderMiniPlaylistCover(pl, 24)}
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pl.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CENTER CONTENT */}
        <div style={{ flex: 1, minWidth: 0, background: COLORS.bgPanel, borderRadius: isDesktop ? "12px" : "0", padding: isDesktop ? "32px" : "16px", overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: !isDesktop && currentTrack ? "100px" : "32px", border: isDesktop ? `1px solid ${COLORS.border}` : "none" }} className="custom-scrollbar">

          {/* MOBILE TABS */}
          {!isDesktop && !selectedArtist && (
            <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "12px", marginBottom: "16px", flexShrink: 0 }} className="custom-scrollbar">
              <button onClick={() => handleSwitchPlaylist(null)} style={{ background: viewedPlaylistId === null ? COLORS.primary : "transparent", color: viewedPlaylistId === null ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease" }}>
                Global Library
              </button>
              {likedPlaylist && (
                <button onClick={() => handleSwitchPlaylist(likedPlaylist.id)} style={{ background: viewedPlaylistId === likedPlaylist.id ? COLORS.primary : "transparent", color: viewedPlaylistId === likedPlaylist.id ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Heart size={14} fill={viewedPlaylistId === likedPlaylist.id ? COLORS.bgPanel : "none"} /> Liked Songs
                </button>
              )}
              {userPlaylists.filter(pl => pl.name !== "Liked Songs").map(pl => (
                <button key={pl.id} onClick={() => handleSwitchPlaylist(pl.id)} style={{ background: viewedPlaylistId === pl.id ? COLORS.primary : "transparent", color: viewedPlaylistId === pl.id ? COLORS.bgPanel : COLORS.primary, border: `1px solid ${COLORS.primary}`, borderRadius: "20px", padding: "8px 16px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease" }}>
                  🔒 {pl.name}
                </button>
              ))}
            </div>
          )}

          <div key={viewedPlaylistId || 'global'} className="fade-enter" style={{ width: "100%" }}>

            {/* PLAYLIST HERO */}
            {viewedPlaylistId !== null && activePlaylistObj && (
              <div style={{ background: `linear-gradient(180deg, ${COLORS.heroTop} 0%, ${COLORS.bgPanel} 100%)`, padding: isDesktop ? "40px 32px" : "24px", borderRadius: "12px", marginBottom: "32px", display: "flex", alignItems: isDesktop ? "flex-end" : "center", flexDirection: isDesktop ? "row" : "column", gap: "24px", border: `1px solid ${COLORS.border}` }}>
                {renderPlaylistCover()}
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
                  <div style={{ display: "flex", flexDirection: isDesktop ? "row" : "column", alignItems: isDesktop ? "center" : "stretch", gap: "12px", marginBottom: "24px", width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between" }}>
                      {displayedSongs.length > 0 && (
                        <button onClick={() => handlePlaySong(0, displayedSongs, activePlaylistObj?.name || "Playlist")} className="hover-effect" style={{ width: "56px", height: "56px", borderRadius: "50%", background: COLORS.primary, color: COLORS.bgPanel, border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 8px 16px rgba(26,43,76,0.2)", flexShrink: 0 }}>
                          <Play size={24} fill="currentColor" style={{ marginLeft: "3px" }} />
                        </button>
                      )}
                      {!isDesktop && renderSortButton(true)}
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
                      {isDesktop && <span>Date added</span>}
                      <span style={{ textAlign: "right" }}><Clock size={16} /></span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" }}>
                      {displayedSongs.map((track, index) => {
                        const isSelected = currentTrack?.id === track.id;
                        return (
                          <SwipeableTrack key={track.id} track={track} onAddQueue={addToQueue} baseColor={COLORS.bgBase} actionColor={COLORS.primary} iconColor={COLORS.bgBase}>
                            <div className={`glass-row ${isSelected ? 'active' : ''}`} onClick={() => handlePlaySong(index, displayedSongs, activePlaylistObj?.name || "Playlist")} style={{ display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 80px" : "30px minmax(0, 1fr) auto", alignItems: "center", padding: "10px 16px", cursor: "pointer" }}>
                              <span style={{ color: isSelected ? COLORS.primary : COLORS.textMuted, fontSize: "15px", fontWeight: isSelected ? "bold" : "normal" }}>{index + 1}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, paddingRight: "8px" }}>
                                <div style={{ width: "44px", height: "44px", borderRadius: "6px", backgroundColor: COLORS.imageBg, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <div style={{ fontSize: "15px", fontWeight: isSelected ? "bold" : "600", color: isSelected ? COLORS.spotifyGreen : COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                                  <div style={{ fontSize: "13px", color: COLORS.textMuted, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
                                </div>
                              </div>
                              {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "16px" }}>{track.album || '-'}</span>}
                              {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", paddingRight: "16px" }}>{formatDate(track.added_at || track.created_at)}</span>}
                              <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: isDesktop ? "8px" : "4px", flexShrink: 0 }}>
                                <button title="Add to Queue" onClick={e => addToQueue(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px" }} className="hover-effect"><ListPlus size={isDesktop ? 18 : 16} /></button>
                                <button title={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === track.id) ? "Unlike" : "Like"} onClick={(e) => handleToggleLike(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px" }} className="hover-effect"><Heart size={isDesktop ? 18 : 16} fill={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === track.id) ? COLORS.primary : "none"} /></button>
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
                          </SwipeableTrack>
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
                {topArtists.length > 0 && !searchQuery && !selectedArtist && !selectedAlbum && (
                  <div style={{ marginBottom: "32px", paddingLeft: isDesktop ? "16px" : "0" }}>
                    <h3 style={{ fontSize: "20px", fontWeight: "bold", color: COLORS.primary, marginBottom: "16px" }}>Top Artists</h3>
                    <div style={{ display: "flex", gap: "16px", overflowX: "auto", paddingBottom: "12px" }} className="custom-scrollbar">
                      {topArtists.map(artist => (
                        <div key={artist.name} onClick={() => setSelectedArtist(artist.name)} style={{ cursor: "pointer", width: isDesktop ? "140px" : "120px", flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }} className="hover-effect">
                          <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "16px", overflow: "hidden", backgroundColor: COLORS.imageBg, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
                            {artist.image_url ? (
                               <img 
                                 src={artist.image_url} 
                                 alt={artist.name} 
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
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px", paddingLeft: isDesktop ? "16px" : "0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                        <button onClick={() => { setSelectedArtist(null); setSelectedAlbum(null); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} className="hover-effect">
                        <X size={20} />
                      </button>
                      <h2 style={{ fontSize: isDesktop ? "28px" : "24px", fontWeight: "800", margin: 0, color: COLORS.primary }}>
                          {selectedArtist || selectedAlbum}
                        </h2>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      {renderSortButton(!isDesktop)}
                      {currentSortKey && (
                        <span style={{ fontSize: "12px", color: COLORS.textMuted, fontStyle: "italic" }}>
                          By {SORT_LABELS[currentSortKey]} &middot; <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => setSortOrders(prev => ({ ...prev, global: null }))}>Clear</span>
                        </span>
                      )}
                    </div>
                  </div>
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

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {displayedSongs.length > 0 ? displayedSongs.map((track, index) => {
                    const isSelected = currentTrack?.id === track.id;
                    return (
                      <SwipeableTrack key={`g-${track.id}`} track={track} onAddQueue={addToQueue} baseColor={COLORS.bgBase} actionColor={COLORS.primary} iconColor={COLORS.bgBase}>
                        <div className={`glass-row ${isSelected ? 'active' : ''}`} onClick={() => handlePlaySong(index, displayedSongs, "Global Library")} style={{ padding: "10px 16px", cursor: "pointer", display: "grid", gridTemplateColumns: isDesktop ? "40px 2fr 1.5fr 1.2fr 80px" : "30px minmax(0, 1fr) auto", alignItems: "center" }}>
                          <span style={{ color: isSelected ? COLORS.primary : COLORS.textMuted, fontSize: "15px", fontWeight: isSelected ? "bold" : "normal" }}>{index + 1}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, paddingRight: "8px" }}>
                            <div style={{ width: "48px", height: "48px", borderRadius: "6px", backgroundColor: COLORS.imageBg, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {track.poster_url ? <img src={track.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ImageIcon size={20} color={COLORS.textMuted} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "16px", fontWeight: isSelected ? "bold" : "600", color: isSelected ? COLORS.spotifyGreen : COLORS.primary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.title}</div>
                              <div style={{ fontSize: "14px", color: COLORS.textMuted, marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track.artist}</div>
                            </div>
                          </div>
                          {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "16px" }}>{track.album || '-'}</span>}
                          {isDesktop && <span style={{ color: COLORS.textMuted, fontSize: "14px", paddingRight: "16px" }}>{formatDate(track.added_at || track.created_at)}</span>}
                          <div style={{ display: "flex", alignItems: "center", gap: isDesktop ? "12px" : "4px", flexShrink: 0, justifyContent: "flex-end" }}>
                            <button title="Add to Queue" onClick={(e) => addToQueue(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px" }} className="hover-effect">
                              <ListPlus size={isDesktop ? 18 : 16} />
                            </button>
                            <button title={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === track.id) ? "Unlike" : "Like"} onClick={(e) => handleToggleLike(track, e)} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px" }} className="hover-effect">
                              <Heart size={isDesktop ? 18 : 16} fill={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === track.id) ? COLORS.primary : "none"} />
                            </button>
                            {userPlaylists.length > 0 && (
                              <button title="Add to Playlist" onClick={(e) => { e.stopPropagation(); openedFromTrackOptionsRef.current = false; setSongForPlaylistModal(track); }} style={{ background: "transparent", border: "none", color: COLORS.primary, cursor: "pointer", padding: "4px" }} className="hover-effect">
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
          <div style={{ width: "320px", flexShrink: 0, background: songTheme.sidebarBg, borderRadius: "12px", padding: "24px", display: "flex", flexDirection: "column", boxSizing: "border-box", position: "relative", overflow: "hidden", border: isDarkMode ? (dominantRgb ? `1px solid rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.25)` : "1px solid rgba(255, 255, 255, 0.1)") : `1px solid ${COLORS.border}`, boxShadow: isDarkMode ? (dominantRgb ? `0 12px 36px rgba(0,0,0,0.4), 0 0 20px rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.12)` : "none") : "0 8px 24px rgba(26,43,76,0.06)" }}>
            {currentTrack.poster_url && (
              <div className="fade-enter" style={{ position: "absolute", top: "-20%", left: "-20%", width: "140%", height: "140%", backgroundImage: `url(${currentTrack.poster_url})`, backgroundSize: "cover", backgroundPosition: "center", filter: isDarkMode ? "blur(50px) brightness(0.65) saturate(120%)" : "blur(50px) brightness(1.1) saturate(95%)", opacity: isDarkMode ? 0.35 : 0.18, zIndex: 0, pointerEvents: "none" }} />
            )}
            
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
              {/* TOP HEADER WITH MAXIMIZE BUTTON (Desktop Only) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexShrink: 0 }}>
                <span style={{ fontSize: "13px", fontWeight: "700", color: "#FFFFFF", letterSpacing: "0.5px", textShadow: "0 1px 4px rgba(0,0,0,0.7)", textTransform: "uppercase" }}>
                  Now Playing
                </span>
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

              {/* ARTWORK / DYNAMIC PLAYER VIEW */}
              <div style={{ width: "100%", flex: 1, minHeight: 0, marginBottom: "20px", display: "flex", flexDirection: "column" }}>
                <div style={{ width: "100%", height: "100%", borderRadius: "12px", overflow: "hidden", backgroundColor: isDarkMode ? "rgba(26,43,76,0.05)" : "rgba(26,43,76,0.04)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isDarkMode ? "0 12px 30px rgba(26,43,76,0.12)" : "0 12px 30px rgba(26,43,76,0.08)", position: "relative" }}>
                  <div key={showMixer ? 'mixer' : showQueue ? 'queue' : showLyrics ? 'lyrics' : 'art'} className="fade-enter" style={{ width: "100%", height: "100%" }}>
                    {showMixer ? renderMixerBlock(false) : showQueue ? renderQueueBlock(false) : showLyrics ? renderLyricsBlock(false) : (currentTrack.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={80} color={COLORS.textMuted} /></div>)}
                  </div>
                </div>
              </div>
              
              {/* TRACK INFO & SECONDARY ACTIONS */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexShrink: 0 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h3 style={{ margin: "0 0 4px 0", fontSize: "19px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#FFFFFF", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{currentTrack.title}</h3>
                  <p style={{ margin: 0, color: "rgba(255, 255, 255, 0.85)", fontSize: "14px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{currentTrack.artist}</p>
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
                  <input type="range" min={0} max={duration || 100} defaultValue={0} ref={desktopProgressRef} onChange={handleSeek} className="glow-slider" style={{ flex: 1 }} />
                  <span style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.9)", minWidth: "36px", textAlign: "right", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{formatTime(duration)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "4px", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect">{renderModeIcon("#FFFFFF")}</button>
                  <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                    <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><SkipBack size={24} fill="currentColor" /></button>
                    <button onClick={handlePlayPause} className="hover-effect" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "56px", height: "56px", borderRadius: "50%", border: "none", backgroundColor: "#FFFFFF", color: "#1A2B4C", cursor: "pointer", boxShadow: "0 8px 16px rgba(0,0,0,0.3)" }}>
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
          backgroundColor: isDarkMode ? "#070A11" : "#F4EFE6",
          display: "flex", 
          flexDirection: "column", 
          overflow: "hidden" 
        }}>
          {/* Guaranteed 100% Opaque Solid Base */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: isDarkMode ? "#070A11" : "#F4EFE6",
              zIndex: 0
            }}
          />

          {/* Dynamic Ambient Blurred Cover Art Backdrop */}
          {currentTrack?.poster_url && (
            <div className="fade-enter" style={{ 
              position: "absolute", 
              top: "-20%", 
              left: "-20%", 
              width: "140%", 
              height: "140%", 
              backgroundImage: `url(${currentTrack?.poster_url})`, 
              backgroundSize: "cover", 
              backgroundPosition: "center", 
              filter: isDarkMode ? "blur(80px) brightness(0.72) saturate(160%)" : "blur(80px) brightness(1.05) saturate(130%)", 
              opacity: isDarkMode ? 0.52 : 0.35, 
              zIndex: 0, 
              pointerEvents: "none" 
            }} />
          )}

          {/* Dynamic Song Theme Radial Gradient Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: songTheme.mobilePlayerBg,
              zIndex: 0,
              pointerEvents: "none"
            }}
          />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100%", padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", paddingTop: "16px" }}>
              <button onClick={() => setIsMobilePlayerOpen(false)} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><ChevronDown size={32} /></button>
              <span style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "2px", color: "#FFFFFF", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>
                {showMixer ? "AI Mixer" : showQueue ? "Current Queue" : showLyrics ? "Lyrics" : "Now Playing"}
              </span>
              <button onClick={() => { openedFromTrackOptionsRef.current = false; setShowTrackOptionsModal(true); }} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><MoreVertical size={32} /></button>
            </div>

            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", marginBottom: "32px", width: "100%" }}>
              <div style={{ width: "100%", height: "100%", maxHeight: "400px", borderRadius: "16px", overflow: "hidden", backgroundColor: isDarkMode ? "rgba(26,43,76,0.05)" : "rgba(26,43,76,0.04)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: (showLyrics || showQueue || showMixer) ? "none" : (isDarkMode ? "0 20px 40px rgba(0,0,0,0.5)" : "0 20px 40px rgba(26,43,76,0.18)"), transition: "box-shadow 0.3s ease" }}>
                <div key={showMixer ? 'mixer' : showQueue ? 'queue' : showLyrics ? 'lyrics' : 'art'} className="fade-enter" style={{ width: "100%", height: "100%" }}>
                  {showMixer ? renderMixerBlock(true) : showQueue ? renderQueueBlock(true) : showLyrics ? renderLyricsBlock(true) : (currentTrack?.poster_url ? <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><ImageIcon size={100} color={COLORS.textMuted} /></div>)}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h2 style={{ margin: "0 0 4px 0", fontSize: "28px", fontWeight: "800", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "#FFFFFF", textShadow: "0 2px 8px rgba(0,0,0,0.7)" }}>{currentTrack?.title}</h2>
                <p style={{ margin: 0, color: "rgba(255,255,255,0.85)", fontSize: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontWeight: "500", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{currentTrack?.artist}</p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0, marginLeft: "12px" }}>
                <button onClick={toggleStemMixer} style={{ background: showMixer ? COLORS.spotifyGreen : "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "10px 14px", cursor: "pointer", display: "flex", backdropFilter: "blur(4px)" }}><SlidersHorizontal size={17} /></button>
                <button onClick={e => { e.stopPropagation(); openedFromTrackOptionsRef.current = false; setShowSleepTimerModal(true); }} style={{ background: sleepTimerTarget ? COLORS.spotifyGreen : "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "10px 14px", cursor: "pointer", display: "flex", backdropFilter: "blur(4px)" }}><Moon size={17} /></button>
                <button onClick={() => { setShowLyrics(v => !v); if (!showLyrics) { setShowQueue(false); setShowMixer(false); } }} style={{ background: showLyrics ? COLORS.spotifyGreen : "rgba(255,255,255,0.15)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "20px", padding: "10px 14px", cursor: "pointer", display: "flex", backdropFilter: "blur(4px)" }}><Mic2 size={17} /></button>
              </div>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <input type="range" min={0} max={duration || 100} defaultValue={0} ref={mobileProgressRef} onChange={handleSeek} className="glow-slider" style={{ width: "100%", marginBottom: "8px", borderRadius: "6px" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{formatTime(currentTime)}</span>
                <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.9)", fontWeight: "600", textShadow: "0 1px 4px rgba(0,0,0,0.7)" }}>{formatTime(duration)}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "32px" }}>
              <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "8px", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect">{renderModeIcon("#FFFFFF")}</button>
              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", display: "flex", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }} className="hover-effect"><SkipBack size={36} fill="currentColor" /></button>
                <button onClick={handlePlayPause} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "72px", height: "72px", borderRadius: "50%", border: "none", backgroundColor: "#FFFFFF", color: "#1A2B4C", cursor: "pointer", boxShadow: "0 12px 24px rgba(0,0,0,0.3)", transition: "transform 0.2s ease" }} className="hover-effect">
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
            backgroundColor: isDarkMode ? "#070A11" : "#F4EFE6",
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
              backgroundColor: isDarkMode ? "#070A11" : "#F4EFE6",
              zIndex: 0
            }}
          />

          {/* Dynamic Ambient Blurred Cover Art Backdrop */}
          {currentTrack.poster_url && (
            <div
              style={{
                position: "absolute",
                top: "-20%",
                left: "-20%",
                width: "140%",
                height: "140%",
                backgroundImage: `url(${currentTrack.poster_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: isDarkMode ? "blur(90px) brightness(0.72) saturate(165%)" : "blur(90px) brightness(1.05) saturate(135%)",
                opacity: isDarkMode ? 0.55 : 0.38,
                zIndex: 0,
                pointerEvents: "none"
              }}
            />
          )}

          {/* Dynamic Song Theme Radial Gradient Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: songTheme.playerBg,
              zIndex: 0,
              pointerEvents: "none"
            }}
          />

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
                  {currentTrack.poster_url ? (
                    <img
                      src={currentTrack.poster_url}
                      alt={currentTrack.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <ImageIcon size={100} color={isDarkMode ? "rgba(255,255,255,0.3)" : "#64748B"} />
                  )}
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
                            color: isActiveLine ? (isDarkMode ? "#FFFFFF" : "#1A2B4C") : (isDarkMode ? "rgba(255, 255, 255, 0.35)" : "rgba(26, 43, 76, 0.35)"),
                            textShadow: isActiveLine ? (isDarkMode ? "0 0 24px rgba(255,255,255,0.6)" : "0 2px 14px rgba(26, 43, 76, 0.25)") : "none",
                            padding: "12px 0",
                            cursor: "pointer",
                            transition: "all 0.4s cubic-bezier(0.25, 1, 0.5, 1)",
                            transform: isActiveLine ? "scale(1.03)" : "scale(1)",
                            transformOrigin: "left center",
                            willChange: "transform, color, text-shadow"
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
                                    ? (isDarkMode ? "#FFFFFF" : "#1A2B4C")
                                    : (isActiveLine
                                        ? (isDarkMode ? "rgba(255,255,255,0.6)" : "rgba(26, 43, 76, 0.6)")
                                        : (isDarkMode ? "rgba(255,255,255,0.35)" : "rgba(26, 43, 76, 0.35)")),
                                  textShadow: isActiveWord ? (isDarkMode ? "0 0 20px rgba(255,255,255,0.8)" : "0 2px 12px rgba(26, 43, 76, 0.3)") : "none",
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
                    <div style={{ color: isDarkMode ? "rgba(255,255,255,0.6)" : "#64748B", fontSize: "20px", fontWeight: "600", lineHeight: "1.8", whiteSpace: "pre-line", padding: "60px 0" }}>
                      {(currentTrack?.lyrics || playlist.find(s => s.id === currentTrack?.id)?.lyrics) || "No synchronized lyrics available for this song."}
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
                backgroundColor: isDarkMode ? "#070A11" : "#EAE4D6",
                zIndex: 0
              }}
            />

            {/* Dynamic Ambient Blurred Cover Art Backdrop in Bottom Bar */}
            {currentTrack.poster_url && (
              <div
                style={{
                  position: "absolute",
                  top: "-80%",
                  left: "-20%",
                  width: "140%",
                  height: "260%",
                  backgroundImage: `url(${currentTrack.poster_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: isDarkMode
                    ? "blur(75px) brightness(0.72) saturate(165%)"
                    : "blur(75px) brightness(0.92) saturate(145%)",
                  opacity: isDarkMode ? 0.65 : 0.50,
                  zIndex: 0,
                  pointerEvents: "none"
                }}
              />
            )}

            {/* Dynamic Song Theme Gradient Overlay in Bottom Bar */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: isDarkMode
                  ? (dominantRgb
                      ? `linear-gradient(180deg, rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.35) 0%, rgba(7, 10, 17, 0.82) 100%)`
                      : "linear-gradient(180deg, rgba(28, 45, 75, 0.45) 0%, rgba(7, 10, 17, 0.88) 100%)")
                  : (dominantRgb
                      ? `linear-gradient(180deg, rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.32) 0%, rgba(${dominantRgb.r}, ${dominantRgb.g}, ${dominantRgb.b}, 0.52) 100%)`
                      : "linear-gradient(180deg, rgba(26, 43, 76, 0.22) 0%, rgba(26, 43, 76, 0.40) 100%)"),
                zIndex: 0,
                pointerEvents: "none"
              }}
            />

            {/* Left: Track Info & Like */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0, position: "relative", zIndex: 1 }}>
              <div style={{ width: "52px", height: "52px", borderRadius: "8px", overflow: "hidden", backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(26, 43, 76, 0.08)", flexShrink: 0, boxShadow: isDarkMode ? "0 4px 12px rgba(0,0,0,0.4)" : "0 4px 12px rgba(26, 43, 76, 0.1)" }}>
                {currentTrack.poster_url ? (
                  <img src={currentTrack.poster_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ImageIcon size={22} color={isDarkMode ? "rgba(255,255,255,0.4)" : "#64748B"} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {currentTrack.title}
                </div>
                <div style={{ fontSize: "12px", color: isDarkMode ? "rgba(255,255,255,0.65)" : "#64748B", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                  {currentTrack.artist}
                </div>
              </div>
              <button
                title={likedPlaylist?.playlist_songs?.some(ps => ps.song_id === currentTrack.id) ? "Unlike" : "Like"}
                onClick={(e) => handleToggleLike(currentTrack, e)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: likedPlaylist?.playlist_songs?.some(ps => ps.song_id === currentTrack.id) ? COLORS.spotifyGreen : (isDarkMode ? "rgba(255,255,255,0.7)" : "#64748B"),
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
              <div style={{ display: "flex", alignItems: "center", gap: "20px", marginBottom: "8px", transform: "translateX(-24px)" }}>
                <button onClick={cyclePlayMode} style={{ background: "transparent", border: "none", padding: "4px", cursor: "pointer" }} className="hover-effect" title={`Mode: ${playMode}`}>
                  {renderModeIcon(isDarkMode ? "#FFFFFF" : "#1A2B4C")}
                </button>
                <button onClick={handlePrev} style={{ background: "transparent", border: "none", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", cursor: "pointer", display: "flex" }} className="hover-effect" title="Previous">
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
                    boxShadow: "0 6px 16px rgba(0,0,0,0.3)"
                  }}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" style={{ marginLeft: "2px" }} />}
                </button>
                <button onClick={handleNext} style={{ background: "transparent", border: "none", color: isDarkMode ? "#FFFFFF" : "#1A2B4C", cursor: "pointer", display: "flex" }} className="hover-effect" title="Next">
                  <SkipForward size={20} fill="currentColor" />
                </button>
              </div>

              {/* Scrubber row */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%" }}>
                <span style={{ fontSize: "11px", color: isDarkMode ? "rgba(255,255,255,0.7)" : "#64748B", minWidth: "34px", textAlign: "right", fontWeight: "600" }}>
                  {formatTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  defaultValue={0}
                  ref={fullscreenProgressRef}
                  onChange={handleSeek}
                  className="glow-slider"
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: "11px", color: isDarkMode ? "rgba(255,255,255,0.7)" : "#64748B", minWidth: "34px", textAlign: "left", fontWeight: "600" }}>
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Right: Volume & Minimize */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "flex-end", position: "relative", zIndex: 1 }}>
              {/* Volume controls */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={toggleMute}
                  style={{ background: "transparent", border: "none", color: isDarkMode ? "rgba(255,255,255,0.8)" : "#1A2B4C", cursor: "pointer", padding: "4px" }}
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
















































