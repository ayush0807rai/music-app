// src/artistUtils.js
/**
 * Utility functions for precise artist extraction and matching.
 * Solves substring collision bugs (e.g. "King" matching "Ash King" or "Sean Kingston").
 */

/**
 * Accurately extracts individual, distinct artist names from a song's artist string.
 * Handles comma-separated lists, ampersands, slashes, semicolons, and feature annotations
 * (e.g. "feat.", "ft.", "featuring", "vs.") while properly parsing collaborations.
 */
export function getTrackArtists(artistStr) {
  if (!artistStr || typeof artistStr !== "string") return [];
  // Normalize bracketed/parenthesized collaborations into delimiters e.g. (feat. X) -> , feat. X ,
  const normalized = artistStr.replace(/[\(\)\[\]\{\}]/g, ",");
  
  // First split by commas, semicolons, and pipes
  const primaryTokens = normalized.split(/[,;|]/).map(t => t.trim()).filter(Boolean);
  const allTokens = [];
  
  primaryTokens.forEach(token => {
    allTokens.push(token);
    // Also split by & or feat / ft / vs if present inside the token
    const subTokens = token
      .split(/(?:\s+&\s+|\s+(?:feat\.?|ft\.?|featuring|vs\.?)\s+)/i)
      .map(s => s.replace(/^(?:feat\.?|ft\.?|featuring)\s+/i, "").trim())
      .filter(Boolean);
    if (subTokens.length > 1) {
      subTokens.forEach(st => allTokens.push(st));
    }
  });

  return Array.from(new Set(allTokens));
}

/**
 * Checks if a song contains a specific artist as an exact distinct artist entity.
 * Prevents substring false positives (e.g. clicking "King" will never match "Ash King" or "Sean Kingston").
 * Also handles punctuation/space variance (e.g. "A.R. Rahman" vs "A. R. Rahman").
 */
export function matchesArtist(trackArtist, targetArtist) {
  if (!trackArtist || !targetArtist) return false;
  const targetClean = targetArtist.trim().toLowerCase();
  const trackClean = trackArtist.trim().toLowerCase();
  if (trackClean === targetClean) return true;

  const targetNorm = targetClean.replace(/[\s\._\-]/g, "");
  if (targetNorm && trackClean.replace(/[\s\._\-]/g, "") === targetNorm) return true;

  const trackTokens = getTrackArtists(trackArtist);
  return trackTokens.some(a => {
    const aClean = a.trim().toLowerCase();
    if (aClean === targetClean) return true;
    if (targetNorm && aClean.replace(/[\s\._\-]/g, "") === targetNorm) return true;
    return false;
  });
}
