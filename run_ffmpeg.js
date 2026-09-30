const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const { execSync } = require('child_process');

// We don't even need Supabase. We can fetch the JSON feed directly!
const s3Client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

async function run() {
  if (!fs.existsSync('media_cache')) fs.mkdirSync('media_cache');

  const feedRes = await fetch('https://annotated-repo.vercel.app/api/feed?client=roku&video_only=false&limit=50', {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
  });
  const data = await feedRes.json();
  
  const videos = data.items.filter(i => i.media && i.media.raw_url && i.media.raw_url.includes('.webm'));
  console.log('Found ' + videos.length + ' legacy WebM videos in the feed to repair with FFmpeg.');
  
  for (let i=0; i<videos.length; i++) {
    const v = videos[i];
    console.log('[' + (i+1) + '/' + videos.length + '] FFmpeg Processing ' + v.id);
    
    try {
      const res = await fetch(v.media.raw_url);
      const buffer = await res.arrayBuffer();
      const rawPath = 'media_cache/raw_' + v.id + '.webm';
      const outPath = 'media_cache/out_' + v.id + '.mp4';
      
      fs.writeFileSync(rawPath, Buffer.from(buffer));
      
      // Transcode with FFmpeg!
      execSync('ffmpeg.exe -y -i ' + rawPath + ' -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 128k -movflags +faststart ' + outPath, {stdio: 'ignore'});
      
      const outBuffer = fs.readFileSync(outPath);
      const baseName = 'legacy_' + v.id;
      
      // Upload directly to processed bucket
      await s3Client.send(new PutObjectCommand({
        Bucket: 'annotated-processed-videos',
        Key: 'processed/' + baseName + '.mp4',
        Body: outBuffer,
        ContentType: 'video/mp4'
      }));
      
      console.log('   -> Success! Uploaded to S3 processed bucket.');
      
      // Cleanup
      fs.unlinkSync(rawPath);
      fs.unlinkSync(outPath);
    } catch(e) {
      console.log('Error:', e.message);
    }
  }
}

run();

