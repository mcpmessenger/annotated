import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const supabaseUrl = 'https://dajadbvlldrmgzztdksn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';

const sb = createClient(supabaseUrl, supabaseKey);
const ffmpegBin = path.join(process.cwd(), 'ffmpeg.exe');

const tempDir = path.join(process.cwd(), '.transcode_temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

async function transcodeAll() {
  console.log('Querying webm annotations...');
  const { data: rows, error } = await sb.from('annotations').select('id, quote, media_url').like('media_url', '%webm%');
  if (error || !rows) {
    console.error('Failed to fetch rows:', error);
    return;
  }

  console.log(`Found ${rows.length} webm annotations to transcode to native MP4.`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawUrl = row.media_url.trim();
    const fileName = rawUrl.split('/').pop().split('?')[0];
    const mp4Name = fileName.replace(/\.webm$/, '.mp4');
    const mp4Url = `${supabaseUrl}/storage/v1/object/public/annotation-media/${mp4Name}`;

    console.log(`\n[${i + 1}/${rows.length}] Processing: ${fileName} -> ${mp4Name}`);

    // Check if MP4 already exists in bucket
    try {
      const headCheck = await fetch(mp4Url, { method: 'HEAD' });
      if (headCheck.ok) {
        console.log(`  -> Already exists and accessible at: ${mp4Url}`);
        continue;
      }
    } catch (e) {
      // Proceed with transcode
    }

    const localWebm = path.join(tempDir, fileName);
    const localMp4 = path.join(tempDir, mp4Name);

    console.log(`  -> Downloading ${rawUrl}...`);
    const res = await fetch(rawUrl);
    if (!res.ok) {
      console.error(`  -> Failed to download: HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(localWebm, buf);
    console.log(`  -> Downloaded (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);

    console.log('  -> Transcoding with ffmpeg (H.264/AAC for Roku/AppleTV)...');
    try {
      execFileSync(ffmpegBin, [
        '-y',
        '-i', localWebm,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        localMp4
      ], { stdio: 'inherit' });
    } catch (err) {
      console.error('  -> Transcoding error:', err.message);
      continue;
    }

    const mp4Buf = fs.readFileSync(localMp4);
    console.log(`  -> Transcoded MP4 size: ${(mp4Buf.length / 1024 / 1024).toFixed(2)} MB`);

    console.log(`  -> Uploading ${mp4Name} to Supabase Storage 'annotation-media'...`);
    const { data: uploadData, error: uploadErr } = await sb.storage
      .from('annotation-media')
      .upload(mp4Name, mp4Buf, { contentType: 'video/mp4', upsert: true });

    if (uploadErr) {
      console.error('  -> Upload error:', uploadErr);
      continue;
    }

    console.log(`  -> Uploaded successfully! Public URL: ${mp4Url}`);

    // Clean up local temp files
    try {
      if (fs.existsSync(localWebm)) fs.unlinkSync(localWebm);
      if (fs.existsSync(localMp4)) fs.unlinkSync(localMp4);
    } catch {}
  }

  console.log('\nAll webm files processed and converted to native MP4!');
}

transcodeAll();
