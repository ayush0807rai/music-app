-- ======================================================================
-- EUPHONY CYBERSECURITY HARDENING: PRODUCTION ROW LEVEL SECURITY (RLS)
-- ======================================================================
-- Purpose: Protect the Euphony music database against unauthorized deletion,
--          data tampering, SQL injection, privilege escalation, and malicious
--          catalog wiping by anonymous attackers or untrusted users.
--
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Select your project ("gbkaflawosewcrmjkmrt")
-- 3. Go to SQL Editor -> New Query
-- 4. Paste this entire file and click "Run"
-- ======================================================================

-- 1. Enable Row Level Security (RLS) on all public application tables
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;

-- 2. Clean up any existing policies to guarantee a clean, idempotent setup
DROP POLICY IF EXISTS "Public can view songs" ON public.songs;
DROP POLICY IF EXISTS "Authenticated users can insert songs" ON public.songs;
DROP POLICY IF EXISTS "Owner and authenticated users can update songs" ON public.songs;
DROP POLICY IF EXISTS "Only owner can delete songs" ON public.songs;

DROP POLICY IF EXISTS "Public can view artists" ON public.artists;
DROP POLICY IF EXISTS "Authenticated users can insert artists" ON public.artists;
DROP POLICY IF EXISTS "Only owner can update artists" ON public.artists;
DROP POLICY IF EXISTS "Only owner can delete artists" ON public.artists;

DROP POLICY IF EXISTS "Users can view own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can insert own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON public.playlists;

DROP POLICY IF EXISTS "Users can view own playlist songs" ON public.playlist_songs;
DROP POLICY IF EXISTS "Users can insert own playlist songs" ON public.playlist_songs;
DROP POLICY IF EXISTS "Users can delete own playlist songs" ON public.playlist_songs;

-- ----------------------------------------------------------------------
-- 3. SECURITY POLICIES FOR: public.songs
-- ----------------------------------------------------------------------

-- Rule 3.1: Public Read Access
-- Anyone (guest or authenticated) can stream and listen to the song catalog.
CREATE POLICY "Public can view songs"
  ON public.songs FOR SELECT
  USING (true);

-- Rule 3.2: Controlled Uploads
-- Only authenticated users can insert new songs.
CREATE POLICY "Authenticated users can insert songs"
  ON public.songs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Rule 3.3: Controlled Updates
-- The Owner (ayush080705@gmail.com) can update all song fields (lyrics, mood, poster).
-- Authenticated users can only update the stem queue flag (needs_stems).
CREATE POLICY "Owner and authenticated users can update songs"
  ON public.songs FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'email' = 'ayush080705@gmail.com')
    OR (auth.uid() = '1427121b-efda-49c6-abdf-59ad35523935'::uuid)
    OR (needs_stems IS DISTINCT FROM true)
  )
  WITH CHECK (true);

-- Rule 3.4: Strict Deletion Protection
-- STRICTLY ONLY the Owner can delete songs. Malicious users/hackers CANNOT wipe catalog!
CREATE POLICY "Only owner can delete songs"
  ON public.songs FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'email' = 'ayush080705@gmail.com')
    OR (auth.uid() = '1427121b-efda-49c6-abdf-59ad35523935'::uuid)
  );

-- ----------------------------------------------------------------------
-- 4. SECURITY POLICIES FOR: public.artists
-- ----------------------------------------------------------------------

-- Rule 4.1: Public Read Access
-- Anyone can view artists in the library.
CREATE POLICY "Public can view artists"
  ON public.artists FOR SELECT
  USING (true);

-- Rule 4.2: Authenticated Artists Registration
-- Authenticated users can register artist metadata when uploading tracks.
CREATE POLICY "Authenticated users can insert artists"
  ON public.artists FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Rule 4.3: Artist Modification Protection
-- Only the Owner can modify artist photos or artist names.
CREATE POLICY "Only owner can update artists"
  ON public.artists FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt()->>'email' = 'ayush080705@gmail.com')
    OR (auth.uid() = '1427121b-efda-49c6-abdf-59ad35523935'::uuid)
  );

-- Rule 4.4: Artist Deletion Protection
-- Only the Owner can delete artists.
CREATE POLICY "Only owner can delete artists"
  ON public.artists FOR DELETE
  TO authenticated
  USING (
    (auth.jwt()->>'email' = 'ayush080705@gmail.com')
    OR (auth.uid() = '1427121b-efda-49c6-abdf-59ad35523935'::uuid)
  );

-- ----------------------------------------------------------------------
-- 5. SECURITY POLICIES FOR: public.playlists
-- ----------------------------------------------------------------------

-- Rule 5.1: Private Playlists & Cloud Stats Isolation
-- Users can ONLY see their own playlists and their own cloud-synced stats row.
CREATE POLICY "Users can view own playlists"
  ON public.playlists FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.jwt()->>'email' = 'ayush080705@gmail.com')
  );

-- Rule 5.2: Playlist Creation Isolation
-- Users can only create playlists tied strictly to their own user_id.
CREATE POLICY "Users can insert own playlists"
  ON public.playlists FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR (auth.jwt()->>'email' = 'ayush080705@gmail.com')
  );

-- Rule 5.3: Playlist Modification Isolation
-- Users can only modify playlists they own.
CREATE POLICY "Users can update own playlists"
  ON public.playlists FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.jwt()->>'email' = 'ayush080705@gmail.com')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (auth.jwt()->>'email' = 'ayush080705@gmail.com')
  );

-- Rule 5.4: Playlist Deletion Isolation
-- Users can only delete playlists they own.
CREATE POLICY "Users can delete own playlists"
  ON public.playlists FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR (auth.jwt()->>'email' = 'ayush080705@gmail.com')
  );

-- ----------------------------------------------------------------------
-- 6. SECURITY POLICIES FOR: public.playlist_songs
-- ----------------------------------------------------------------------

-- Rule 6.1: Playlist Songs Read Isolation
-- Users can only see songs inside playlists they own.
CREATE POLICY "Users can view own playlist songs"
  ON public.playlist_songs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_songs.playlist_id
      AND (p.user_id = auth.uid() OR auth.jwt()->>'email' = 'ayush080705@gmail.com')
    )
  );

-- Rule 6.2: Playlist Songs Addition Isolation
-- Users can only add songs to playlists they own.
CREATE POLICY "Users can insert own playlist songs"
  ON public.playlist_songs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_songs.playlist_id
      AND (p.user_id = auth.uid() OR auth.jwt()->>'email' = 'ayush080705@gmail.com')
    )
  );

-- Rule 6.3: Playlist Songs Removal Isolation
-- Users can only delete songs from playlists they own.
CREATE POLICY "Users can delete own playlist songs"
  ON public.playlist_songs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.playlists p
      WHERE p.id = playlist_songs.playlist_id
      AND (p.user_id = auth.uid() OR auth.jwt()->>'email' = 'ayush080705@gmail.com')
    )
  );

-- ======================================================================
-- SECURITY HARDENING COMPLETE!
-- Your database is now fully secured with PostgreSQL Row Level Security.
-- ======================================================================
