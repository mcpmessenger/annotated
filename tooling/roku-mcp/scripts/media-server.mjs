import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { execSync } from 'node:child_process';

const PORT = 8090;
const CACHE_DIR = 'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\media_cache';
const DEMO_MP4 = 'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\Annotated Demo.mp4';
const FFMPEG = 'C:\\Users\\senti\\AppData\\Roaming\\Python\\Python314\\site-packages\\imageio_ffmpeg\\binaries\\ffmpeg-win-x86_64-v7.1.exe';

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function streamFileWithRange(filePath, req, res) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer((req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  console.log(`[MediaServer] ${req.method} ${pathname} (Range: ${req.headers.range || 'none'})`);

  if (pathname === '/' || pathname === '/demo.mp4') {
    if (fs.existsSync(DEMO_MP4)) {
      return streamFileWithRange(DEMO_MP4, req, res);
    }
  }

  if (pathname.startsWith('/clip/')) {
    const filename = path.basename(pathname);
    const filePath = path.join(CACHE_DIR, filename);

    if (fs.existsSync(filePath)) {
      return streamFileWithRange(filePath, req, res);
    }

    // Dynamic on-demand transcoding if filename is video_*.mp4
    const baseName = path.basename(filename, '.mp4');
    const supabaseWebm = `https://dajadbvlldrmgzztdksn.supabase.co/storage/v1/object/public/annotation-media/${baseName}.webm`;
    const tempWebm = path.join(CACHE_DIR, `${baseName}.webm`);

    console.log(`[MediaServer] Cache miss for ${filename}. Fetching ${supabaseWebm}...`);
    const file = fs.createWriteStream(tempWebm);
    https.get(supabaseWebm, dlRes => {
      if (dlRes.statusCode !== 200) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Clip not found in Supabase');
        return;
      }
      dlRes.pipe(file);
      file.on('finish', () => {
        file.close();
        try {
          console.log(`[MediaServer] Transcoding ${baseName}.webm -> ${filename}...`);
          execSync(`"${FFMPEG}" -y -i "${tempWebm}" -c:v libx264 -preset veryfast -crf 22 -c:a aac -b:a 128k -movflags +faststart "${filePath}"`, { stdio: 'pipe' });
          try { fs.unlinkSync(tempWebm); } catch {}
          return streamFileWithRange(filePath, req, res);
        } catch (err) {
          console.error('[MediaServer] Transcode error:', err.message);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Transcode failed');
        }
      });
    }).on('error', err => {
      console.error('[MediaServer] Download error:', err.message);
      res.writeHead(502, { 'Content-Type': 'text/plain' });
      res.end('Failed to download source clip');
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[MediaServer] Transcoding media server running on http://0.0.0.0:${PORT}`);
});
