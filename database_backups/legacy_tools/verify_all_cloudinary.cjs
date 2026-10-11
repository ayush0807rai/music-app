const SUPABASE_URL = 'https://rlojwqncfcbcszgdyjyz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsb2p3cW5jZmNiY3N6Z2R5anl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzczODksImV4cCI6MjEwNTQ1MzM4OX0.tF04P2BoUycmDmCdnE9Z4vXk7Uunhcxm8MRnaBmKMjY';

async function verifyAllCloudinaryFiles() {
  console.log('🔍 Running comprehensive 100% verification audit on Cloudinary files...');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/songs?select=*&order=created_at.asc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const songs = await res.json();
  console.log(`Auditing all ${songs.length} songs...\n`);

  let totalFilesChecked = 0;
  let totalFilesVerified = 0;
  let failedFiles = [];

  for (let i = 0; i < songs.length; i++) {
    const s = songs[i];
    const checks = [
      { type: 'audio', url: s.url },
      { type: 'poster', url: s.poster_url },
      { type: 'stem_vocals', url: s.stem_vocals },
      { type: 'stem_drums', url: s.stem_drums },
      { type: 'stem_bass', url: s.stem_bass },
      { type: 'stem_other', url: s.stem_other }
    ];

    for (const c of checks) {
      if (!c.url) continue;
      totalFilesChecked++;

      if (!c.url.includes('res.cloudinary.com')) {
        failedFiles.push({ song: s.title, type: c.type, reason: 'Not a Cloudinary URL', url: c.url });
        continue;
      }

      try {
        const headRes = await fetch(c.url, { method: 'HEAD' });
        if (headRes.status === 200) {
          totalFilesVerified++;
        } else {
          failedFiles.push({ song: s.title, type: c.type, reason: `HTTP status ${headRes.status}`, url: c.url });
        }
      } catch (err) {
        failedFiles.push({ song: s.title, type: c.type, reason: err.message, url: c.url });
      }
    }

    if ((i + 1) % 20 === 0 || i === songs.length - 1) {
      console.log(`Audited ${i + 1}/${songs.length} songs... (${totalFilesVerified}/${totalFilesChecked} verified OK)`);
    }
  }

  console.log('\n=====================================================');
  console.log('📊 AUDIT SUMMARY REPORT');
  console.log('=====================================================');
  console.log(`Total songs checked:    ${songs.length}`);
  console.log(`Total media files:      ${totalFilesChecked}`);
  console.log(`Successfully verified:  ${totalFilesVerified}`);
  console.log(`Failures:               ${failedFiles.length}`);

  if (failedFiles.length > 0) {
    console.error('❌ FAILED FILES FOUND:', failedFiles);
  } else {
    console.log('✅ 100% VERIFIED: Every single file is live and responding with HTTP 200 on Cloudinary!');
  }
}

verifyAllCloudinaryFiles().catch(console.error);
