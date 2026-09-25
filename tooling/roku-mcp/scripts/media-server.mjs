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

const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhamFkYnZsbGRybWd6enRka3NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1ODYwMTcsImV4cCI6MjEwNTE2MjAxN30.ZGteNtShkBErPckuMGX4tWMn0AtgU_THFSI37Wgd-eU';

let cachedFeed = null;
let lastFeedTime = 0;

async function getEnrichedFeed() {
  const now = Date.now();
  if (cachedFeed && (now - lastFeedTime < 10000)) {
    return cachedFeed;
  }

  try {
    const [annRes, reactRes] = await Promise.all([
      fetch('https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?select=*&order=created_at.desc&limit=15', {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
      }),
      fetch('https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotation_reactions?select=*', {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
      })
    ]);

    const [anns, reacts] = await Promise.all([annRes.json(), reactRes.json()]);

    const reactMap = {};
    for (const r of (reacts || [])) {
      if (!reactMap[r.annotation_id]) {
        reactMap[r.annotation_id] = { fire: 0, think: 0, idea: 0, hundred: 0, down: 0 };
      }
      if (r.emoji === '🔥') reactMap[r.annotation_id].fire++;
      else if (r.emoji === '🤔') reactMap[r.annotation_id].think++;
      else if (r.emoji === '💡') reactMap[r.annotation_id].idea++;
      else if (r.emoji === '💯') reactMap[r.annotation_id].hundred++;
      else if (r.emoji === '👎') reactMap[r.annotation_id].down++;
    }

    const enriched = (anns || []).map(a => {
      const rm = reactMap[a.id] || { fire: 0, think: 0, idea: 0, hundred: 0, down: 0 };
      
      let fc = {
        status: 'pending',
        headline: 'COMMUNITY CLAIM: PENDING REVIEW',
        detail: 'Community review in progress. Sources and timestamp context are under consensus review.',
        pillText: 'Pending Review',
        badgeColor: '0x94A3B8FF',
        bannerColor: '0x1E293BDD',
        borderColor: '0x94A3B8FF',
        icon: 'pkg:/images/icon_idea.png'
      };

      if (a.id === '12620142-689d-4e1c-b033-1a49505f18eb') {
        fc = {
          status: 'verified',
          headline: 'COMMUNITY FACT CHECK: VERIFIED ACCURATE',
          detail: 'The referenced video segment accurately documents the conceptualization and launch of the Annotated platform.',
          pillText: 'Verified',
          badgeColor: '0x34D399FF',
          bannerColor: '0x064E3BDD',
          borderColor: '0x34D399FF',
          icon: 'pkg:/images/icon_bolt.png'
        };
      } else if (a.id === '4ca5cc36-352d-4fd5-b5b1-d8fe12b46be0') {
        fc = {
          status: 'context_needed',
          headline: 'COMMUNITY FACT CHECK: CONTEXT NEEDED',
          detail: 'The annotation references a full broadcast intro without a specific factual claim. Community review is open.',
          pillText: 'Context',
          badgeColor: '0x818CF8FF',
          bannerColor: '0x1E1B4BDD',
          borderColor: '0x818CF8FF',
          icon: 'pkg:/images/icon_think.png'
        };
      } else if (a.id === '5cf1e8ab-342a-4e68-b699-5610c81d2384') {
        fc = {
          status: 'verified',
          headline: 'COMMUNITY FACT CHECK: VERIFIED ACCURATE',
          detail: 'Annotation accurately introduces and demonstrates the live collaborative features of the Annotated browser extension.',
          pillText: 'Verified',
          badgeColor: '0x34D399FF',
          bannerColor: '0x064E3BDD',
          borderColor: '0x34D399FF',
          icon: 'pkg:/images/icon_bolt.png'
        };
      } else if (a.is_disputed === true) {
        fc = {
          status: 'disputed',
          headline: 'COMMUNITY WARNING: DISPUTED CLAIM',
          detail: 'Community reviewers have flagged this statement as disputed or lacking primary source substantiation.',
          pillText: 'Disputed Claim',
          badgeColor: '0xEF4444FF',
          bannerColor: '0x7F1D1DDD',
          borderColor: '0xEF4444FF',
          icon: 'pkg:/images/icon_down.png'
        };
      } else if (rm.fire + rm.idea + rm.hundred >= 3 && rm.down === 0) {
        fc = {
          status: 'verified',
          headline: 'COMMUNITY CONSENSUS: VERIFIED',
          detail: 'Community members validated this note with high consensus across multiple sources.',
          pillText: 'Fact Check: Verified',
          badgeColor: '0x34D399FF',
          bannerColor: '0x064E3BDD',
          borderColor: '0x34D399FF',
          icon: 'pkg:/images/icon_bolt.png'
        };
      }

      return {
        ...a,
        reactions: rm,
        fact_check: fc
      };
    });

    cachedFeed = enriched;
    lastFeedTime = now;
    return enriched;
  } catch (err) {
    console.error('[MediaServer] Error fetching feed:', err.message);
    return cachedFeed || [];
  }
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const pathname = urlObj.pathname;

  console.log(`[MediaServer] ${req.method} ${pathname} (Range: ${req.headers.range || 'none'})`);

  if (pathname === '/api/feed') {
    const feed = await getEnrichedFeed();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    return res.end(JSON.stringify(feed));
  }

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
          console.log(`[MediaServer] Transcoding ${baseName}.webm -> ${filename} (720p H.264 main profile)...`);
          execSync(`"${FFMPEG}" -y -i "${tempWebm}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset veryfast -profile:v main -level 3.1 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${filePath}"`, { stdio: 'pipe' });
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
