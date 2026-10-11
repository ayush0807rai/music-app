const SUPABASE_URL = 'https://rlojwqncfcbcszgdyjyz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsb2p3cW5jZmNiY3N6Z2R5anl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NzczODksImV4cCI6MjEwNTQ1MzM4OX0.tF04P2BoUycmDmCdnE9Z4vXk7Uunhcxm8MRnaBmKMjY';

async function testList() {
  const buckets = ['songs', 'stems', 'music-files'];
  for (const b of buckets) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${b}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prefix: '', limit: 10 })
    });
    console.log(`Bucket ${b}:`, res.status, await res.json());
  }
}

testList();
