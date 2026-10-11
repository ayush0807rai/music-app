const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gbkaflawosewcrmjkmrt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_6XDSsjzOs-pig92lW5wvJQ_BYFEzikN';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CLOUDINARY_UPLOAD_URL = 'https://api.cloudinary.com/v1_1/cpsimhz1/auto/upload';
const CLOUDINARY_PRESET = 'app_songs';

// 1. Direct local file mappings from C:\Users\ayush\Downloads\artist
const LOCAL_MAP = {
  'Sunidhi Chauhan': 'C:\\Users\\ayush\\Downloads\\artist\\20250814081212_sunidhi-six.avif',
  'Tanzeel Khan': 'C:\\Users\\ayush\\Downloads\\artist\\3901-tanzeel-khan.webp',
  'Bombay Rockers': 'C:\\Users\\ayush\\Downloads\\artist\\ab6761610000e5eb7026eddba9d88ad0db0aca0a.jpg',
  'Ajay-Atul': 'C:\\Users\\ayush\\Downloads\\artist\\ajay atul.jpg',
  'Akull': 'C:\\Users\\ayush\\Downloads\\artist\\akull.jpg',
  'Amaal Mallik': 'C:\\Users\\ayush\\Downloads\\artist\\Amaal_Mallik.jpg',
  'Amit Trivedi': 'C:\\Users\\ayush\\Downloads\\artist\\amit.jpg',
  'Amitabh Bhattacharya': 'C:\\Users\\ayush\\Downloads\\artist\\amitabh.jpg',
  'Ankit Tiwari': 'C:\\Users\\ayush\\Downloads\\artist\\ankit.webp',
  'Ariana Grande': 'C:\\Users\\ayush\\Downloads\\artist\\ariana.jpg',
  'Imran Khan': 'C:\\Users\\ayush\\Downloads\\artist\\artworks-000580681439-qv8uw3-t500x500.jpg',
  'Atif Aslam': 'C:\\Users\\ayush\\Downloads\\artist\\atif.jpg',
  'Benny Dayal': 'C:\\Users\\ayush\\Downloads\\artist\\benny.jpg',
  'Britney Spears': 'C:\\Users\\ayush\\Downloads\\artist\\britney.jpg',
  'Doja Cat': 'C:\\Users\\ayush\\Downloads\\artist\\doja.avif',
  'Em Beihold': 'C:\\Users\\ayush\\Downloads\\artist\\em.webp',
  'Guru Randhawa': 'C:\\Users\\ayush\\Downloads\\artist\\guru randhawa.jpg',
  'Halsey': 'C:\\Users\\ayush\\Downloads\\artist\\halsey.jpg',
  'Yo Yo Honey Singh': 'C:\\Users\\ayush\\Downloads\\artist\\honey-singh.png',
  'Irshad Kamil': 'C:\\Users\\ayush\\Downloads\\artist\\irshad.jpg',
  'Javed Ali': 'C:\\Users\\ayush\\Downloads\\artist\\javed.jpg',
  'Jeet Gannguli': 'C:\\Users\\ayush\\Downloads\\artist\\jeet.jpg',
  'JENNIE': 'C:\\Users\\ayush\\Downloads\\artist\\jennie.jpg',
  'Jonita Gandhi': 'C:\\Users\\ayush\\Downloads\\artist\\Jonita-Gandhi-profile-1.jpg',
  'Jubin Nautiyal': 'C:\\Users\\ayush\\Downloads\\artist\\Jubin-Nautiyal6.jpg',
  'Kailash Kher': 'C:\\Users\\ayush\\Downloads\\artist\\kailash.jpg',
  'Katy Perry': 'C:\\Users\\ayush\\Downloads\\artist\\katy.jpg',
  'King': 'C:\\Users\\ayush\\Downloads\\artist\\king.jpeg',
  'Kishore Kumar': 'C:\\Users\\ayush\\Downloads\\artist\\kishore.webp',
  'Mithoon': 'C:\\Users\\ayush\\Downloads\\artist\\Mithoon.webp',
  'Olivia Rodrigo': 'C:\\Users\\ayush\\Downloads\\artist\\olivia.webp',
  'One Direction': 'C:\\Users\\ayush\\Downloads\\artist\\one direction.jpg',
  'Palak Muchhal': 'C:\\Users\\ayush\\Downloads\\artist\\palak.jpg',
  'Phillip Phillips': 'C:\\Users\\ayush\\Downloads\\artist\\phillip.jpg',
  'Sayeed Quadri': 'C:\\Users\\ayush\\Downloads\\artist\\Sayeed_Quadri.jpg',
  'Shankar-Ehsaan-Loy': 'C:\\Users\\ayush\\Downloads\\artist\\SEL.jpg',
  'Selena Gomez': 'C:\\Users\\ayush\\Downloads\\artist\\Selena-Gomez-2010.webp',
  'Shilpa Rao': 'C:\\Users\\ayush\\Downloads\\artist\\shilpa.jpg',
  'Shivam Pathak': 'C:\\Users\\ayush\\Downloads\\artist\\shivam.jpg',
  'Sukhwinder Singh': 'C:\\Users\\ayush\\Downloads\\artist\\sukhwinder.jpg',
  'Vishal Dadlani': 'C:\\Users\\ayush\\Downloads\\artist\\vishal.jpg',
  'The Weeknd': 'C:\\Users\\ayush\\Downloads\\artist\\weeknd.jpg',
  'Udit Narayan': 'C:\\Users\\ayush\\Downloads\\art cover\\1900x1900-000000-80-0-0.jpg'
};

// 2. Direct exact remote sources for artists uploaded via original link
const EXACT_REMOTE_MAP = {
  'Mohit Chauhan': 'https://i.scdn.co/image/ab6761610000e5eb16691117e2ba803946b203ba',
  'Neeti Mohan': 'https://i.scdn.co/image/ab67616100005174212d83a063eaf99fc525040e',
  'Pritam': 'https://m.media-amazon.com/images/M/MV5BZjgyMzUzYWEtNmVhMy00OWQ1LThjY2UtZTM4YzEyNjU1OTIzXkEyXkFqcGc@._V1_.jpg',
  'Shreya Ghoshal': 'https://m.media-amazon.com/images/M/MV5BYzcwMzI4MmQtZDM5Yi00ZmZkLWJlNjktNTc5NDJhNTAyNmUwXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg',
  'Darshan Raval': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/Darshan-Raval-grace-the-12th-radio-mirchi-music-awards-2020.jpg/500px-Darshan-Raval-grace-the-12th-radio-mirchi-music-awards-2020.jpg',
  'Sonu Nigam': 'https://upload.wikimedia.org/wikipedia/commons/7/76/Sonu_Nigam123.jpg',
  'A.R. Rahman': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/AR_Rahman_at_Premier_Futsal_Press_Meet_%28cropped%29.jpg/500px-AR_Rahman_at_Premier_Futsal_Press_Meet_%28cropped%29.jpg',
  'Arijit Singh': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b7/Arijit_Singh_performance_at_Chandigarh_2025.jpg/500px-Arijit_Singh_performance_at_Chandigarh_2025.jpg',
  'Armaan Malik': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Armaan_Malik_2016.jpg/500px-Armaan_Malik_2016.jpg',
  'Taylor Swift': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png/500px-Taylor_Swift_at_the_2023_MTV_Video_Music_Awards_%283%29.png',
  'Shawn Mendes': 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/191125_Shawn_Mendes_at_the_2019_American_Music_Awards.png/500px-191125_Shawn_Mendes_at_the_2019_American_Music_Awards.png',
  'KK': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/KK_Singer.jpg/500px-KK_Singer.jpg',
  'Shaan': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Shaan_performing.jpg/500px-Shaan_performing.jpg',
  'Justin Bieber': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Justin_Bieber_in_2015.jpg/500px-Justin_Bieber_in_2015.jpg',
  'Ed Sheeran': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Ed_Sheeran-6886_%28cropped%29.jpg/500px-Ed_Sheeran-6886_%28cropped%29.jpg',
  'Charlie Puth': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Charlie_Puth_2018.png/500px-Charlie_Puth_2018.png',
  'Alka Yagnik': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Alka_Yagnik.jpg/500px-Alka_Yagnik.jpg',
  'Kumar Sanu': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Kumar_Sanu_in_2015.jpg/500px-Kumar_Sanu_in_2015.jpg',
  'Vishal-Shekhar': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Vishal-Shekhar.jpg/500px-Vishal-Shekhar.jpg'
};

async function uploadLocalFile(filePath, artistName) {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.avif': 'image/avif'
  };
  const mime = mimeMap[ext] || 'image/jpeg';
  const blob = new Blob([buffer], { type: mime });

  const form = new FormData();
  form.append('upload_preset', CLOUDINARY_PRESET);
  const cleanName = artistName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  form.append('file', blob, `artist_${cleanName}${ext}`);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: form
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Cloudinary upload failed: ${res.status}`);
  }

  const data = await res.json();
  return data.secure_url;
}

async function uploadRemoteUrl(remoteUrl, artistName) {
  const res = await fetch(remoteUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching remote: ${remoteUrl}`);
  const blob = await res.blob();

  const form = new FormData();
  form.append('upload_preset', CLOUDINARY_PRESET);
  const cleanName = artistName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  form.append('file', blob, `artist_${cleanName}.jpg`);

  const cloudRes = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: 'POST',
    body: form
  });

  if (!cloudRes.ok) {
    const err = await cloudRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Cloudinary upload failed: ${cloudRes.status}`);
  }

  const data = await cloudRes.json();
  return data.secure_url;
}

async function run() {
  console.log('Fetching all 62 artists from Supabase...');
  const { data: artists } = await supabase.from('artists').select('*').order('name');

  let successCount = 0;
  for (let i = 0; i < artists.length; i++) {
    const a = artists[i];
    const localFile = LOCAL_MAP[a.name];
    const remoteUrl = EXACT_REMOTE_MAP[a.name];

    try {
      let cloudinaryUrl = null;
      if (localFile && fs.existsSync(localFile)) {
        console.log(`[${i+1}/${artists.length}] Uploading exact local file for ${a.name} (${path.basename(localFile)})...`);
        cloudinaryUrl = await uploadLocalFile(localFile, a.name);
      } else if (remoteUrl) {
        console.log(`[${i+1}/${artists.length}] Uploading exact remote original for ${a.name}...`);
        cloudinaryUrl = await uploadRemoteUrl(remoteUrl, a.name);
      } else {
        console.log(`[${i+1}/${artists.length}] Keeping current image for ${a.name}`);
        continue;
      }

      const { error: updErr } = await supabase.from('artists').update({ image_url: cloudinaryUrl }).eq('id', a.id);
      if (updErr) {
        console.error(`❌ DB error for ${a.name}:`, updErr.message);
      } else {
        successCount++;
        console.log(`✅ [${i+1}/${artists.length}] ${a.name} -> ${cloudinaryUrl}`);
      }
    } catch (err) {
      console.error(`❌ Error on ${a.name}:`, err.message);
    }
  }

  console.log(`\n🎉 DONE! Uploaded and restored ${successCount} exact artist images!`);
}

run().catch(console.error);
