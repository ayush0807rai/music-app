const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

const dualAudioRegex = /<audio\s+ref=\{player1Ref\}[\s\S]*?className=\"loop-audio-fix\"\s*\/>\s*<audio\s+ref=\{player2Ref\}[\s\S]*?className=\"loop-audio-fix\"\s*\/>/;
const singleAudio = `      <audio
        ref={audioRef}
        src={activeAudioSrc || undefined}
        onLoadedMetadata={(e) => {
          setDuration(e.target.duration);
          updateProgressVisuals();
        }}
        onTimeUpdate={() => {
          setCurrentTime(audioRef.current?.currentTime || 0);
          handleTimeUpdateRef.current && handleTimeUpdateRef.current();
        }}
        onEnded={() => {
          const nextIndex = playbackIndex + 1;
          if (nextIndex < playbackQueue.length) {
            const nextTrack = playbackQueue[nextIndex];
            const nextCdnUrl = getCdnUrl(nextTrack.url);
            const objUrl = blobCacheRef.current.get(nextCdnUrl) || nextCdnUrl;
            if (audioRef.current) {
              audioRef.current.src = objUrl;
              audioRef.current.play().catch(e=>e);
            }
          }
          handleTrackEnded();
        }}
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
      />`;
code = code.replace(dualAudioRegex, singleAudio);

fs.writeFileSync('src/App.jsx', code);
console.log('Replaced audio tags');
