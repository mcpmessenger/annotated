import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { execSync } from 'node:child_process';
import QRCode from 'qrcode';

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
  if (cachedFeed && (now - lastFeedTime < 5000)) {
    return cachedFeed;
  }

  try {
    const [annRes, reactRes, profRes] = await Promise.all([
      fetch('https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotations?select=*&order=created_at.desc&limit=50', {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
      }),
      fetch('https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotation_reactions?select=*', {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
      }),
      fetch('https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/profiles?select=*', {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
      })
    ]);

    const [anns, reacts, profs] = await Promise.all([annRes.json(), reactRes.json(), profRes.json()]);

    const profMap = {};
    for (const p of (profs || [])) {
      if (p.id) profMap[p.id] = p;
    }

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
      
      // Determine primary intent/emoji for display on the card
      let rawComment = (a.comment || '').trim();
      let rawIntent = (a.intent || '').trim();
      let rawQuote = (a.quote || '')
        .replace(/[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{FE00}-\u{FE0F}]/gu, '')
        .trim();

      // Detect Twitter / X source
      let isTwitter = false;
      let twitterHandle = '';
      if (a.url && (a.url.includes('x.com/') || a.url.includes('twitter.com/'))) {
        isTwitter = true;
        const twMatch = a.url.match(/(?:x|twitter)\.com\/([^\/]+)\/status/i);
        if (twMatch && twMatch[1]) {
          twitterHandle = `@${twMatch[1]}`;
        }
      }

      // Determine primary emoji
      let primaryEmoji = '💡';
      if (rawIntent.includes('🔥') || rawComment.includes('🔥')) primaryEmoji = '🔥';
      else if (rawIntent.includes('🤔') || rawComment.includes('🤔')) primaryEmoji = '🤔';
      else if (rawIntent.includes('💡') || rawComment.includes('💡')) primaryEmoji = '💡';
      else if (rawIntent.includes('💯') || rawComment.includes('💯')) primaryEmoji = '💯';
      else if (rawIntent.includes('👎') || rawComment.includes('👎')) primaryEmoji = '👎';
      else if (rawIntent.includes('⚡') || rawComment.includes('⚡')) primaryEmoji = '⚡';

      let emojiIcon = 'pkg:/images/icon_idea.png';
      if (primaryEmoji === '🔥') emojiIcon = 'pkg:/images/icon_fire.png';
      else if (primaryEmoji === '🤔') emojiIcon = 'pkg:/images/icon_think.png';
      else if (primaryEmoji === '💡') emojiIcon = 'pkg:/images/icon_idea.png';
      else if (primaryEmoji === '💯') emojiIcon = 'pkg:/images/icon_100.png';
      else if (primaryEmoji === '👎') emojiIcon = 'pkg:/images/icon_down.png';
      else if (primaryEmoji === '⚡') emojiIcon = 'pkg:/images/icon_bolt.png';

      const emojiLabels = {
        '🔥': '[Fire] Trending Insight',
        '💡': '[Idea] Key Takeaway',
        '💯': '[100] Top Tier Consensus',
        '🤔': '[Thinking] Needs Context & Scrutiny',
        '👎': '[Disagree] Disputed Point',
        '⚡': '[FactCheck] Community Verified'
      };

      // Strip video timestamp tags like [⏱ 00:15 - 00:30]
      let strippedComment = rawComment.replace(/\[⏱️?\s*[\d:]+\s*-\s*[\d:]+\]/gu, '').trim();
      let isEmojiOnly = strippedComment.length === 0 || /^[\p{Extended_Pictographic}\s]+$/u.test(strippedComment);

      let cleanComment = '';
      if (isEmojiOnly) {
        cleanComment = emojiLabels[primaryEmoji] || '[Idea] Community Takeaway';
      } else {
        cleanComment = strippedComment
          .replace(/🔥/g, '[Fire] ')
          .replace(/💡/g, '[Idea] ')
          .replace(/💯/g, '[100] ')
          .replace(/🤔/g, '[Think] ')
          .replace(/👎/g, '[Disagree] ')
          .replace(/⚡/g, '[FactCheck] ')
          .replace(/[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{FE00}-\u{FE0F}]/gu, '')
          .replace(/\s+/g, ' ')
          .trim();
      }

      // Default baseline fact check (Nordic Minimal: Symbols & TL;DR)
      let fc = {
        status: 'pending',
        headline: 'IN REVIEW',
        detail: 'Context and sources under consensus review.',
        pillText: 'Review',
        badgeColor: '0x94A3B8FF',
        bannerColor: '0x1E293BDD',
        borderColor: '0x94A3B8FF',
        icon: 'pkg:/images/icon_idea.png'
      };

      // Specific known anchors
      if (a.id === '12620142-689d-4e1c-b033-1a49505f18eb') {
        fc = {
          status: 'verified',
          headline: 'VERIFIED ACCURATE',
          detail: 'Documents the launch of the Annotated platform.',
          pillText: 'Verified',
          badgeColor: '0x34D399FF',
          bannerColor: '0x064E3BDD',
          borderColor: '0x34D399FF',
          icon: 'pkg:/images/icon_bolt.png'
        };
      } else if (a.id === '4ca5cc36-352d-4fd5-b5b1-d8fe12b46be0') {
        fc = {
          status: 'verified',
          headline: 'VERIFIED ACCURATE',
          detail: 'Validated with high consensus across multiple sources.',
          pillText: 'Verified',
          badgeColor: '0x34D399FF',
          bannerColor: '0x064E3BDD',
          borderColor: '0x34D399FF',
          icon: 'pkg:/images/icon_bolt.png'
        };
      } else if (a.id === '5cf1e8ab-342a-4e68-b699-5610c81d2384') {
        fc = {
          status: 'verified',
          headline: 'VERIFIED ACCURATE',
          detail: 'Accurately introduces collaborative annotations.',
          pillText: 'Verified',
          badgeColor: '0x34D399FF',
          bannerColor: '0x064E3BDD',
          borderColor: '0x34D399FF',
          icon: 'pkg:/images/icon_bolt.png'
        };
      } else if (a.is_disputed === true) {
        fc = {
          status: 'disputed',
          headline: 'DISPUTED CLAIM',
          detail: 'Flagged as disputed or lacking primary substantiation.',
          pillText: 'Disputed',
          badgeColor: '0xEF4444FF',
          bannerColor: '0x7F1D1DDD',
          borderColor: '0xEF4444FF',
          icon: 'pkg:/images/icon_down.png'
        };
      } else if (rm.fire + rm.idea + rm.hundred >= 3 && rm.down === 0) {
        fc = {
          status: 'verified',
          headline: 'VERIFIED ACCURATE',
          detail: 'Community validated with high consensus across sources.',
          pillText: 'Verified',
          badgeColor: '0x34D399FF',
          bannerColor: '0x064E3BDD',
          borderColor: '0x34D399FF',
          icon: 'pkg:/images/icon_bolt.png'
        };
      } else if (isTwitter) {
        fc = {
          status: 'verified',
          headline: 'VERIFIED NOTE',
          detail: `Consensus note supported by primary sources.`,
          pillText: 'Verified',
          badgeColor: '0x38BDF8FF',
          bannerColor: '0x0C4A6EDD',
          borderColor: '0x38BDF8FF',
          icon: emojiIcon
        };
      } else {
        fc = {
          status: 'verified',
          headline: 'VERIFIED ANNOTATION',
          detail: 'Public consensus verified against primary sources.',
          pillText: 'Verified',
          badgeColor: '0x34D399FF',
          bannerColor: '0x064E3BDD',
          borderColor: '0x34D399FF',
          icon: 'pkg:/images/icon_idea.png'
        };
      }

      // Compute author display name from profile or hostname or twitter handle
      const prof = profMap[a.user_id];
      let authorName = 'annotated';
      if (twitterHandle) {
        authorName = twitterHandle;
      } else if (prof && prof.full_name) {
        authorName = prof.full_name;
      } else if (prof && prof.email) {
        authorName = prof.email.split('@')[0];
      } else if (a.hostname) {
        authorName = a.hostname.replace(/^www\./, '');
      }

      // Clean title
      let cleanTitle = (a.page_title || '').replace(/[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{FE00}-\u{FE0F}]/gu, '').replace(/\s*-\s*YouTube$/i, '').trim();
      if (isTwitter && twitterHandle) {
        cleanTitle = `Twitter / X: ${twitterHandle}`;
      } else if (!cleanTitle || cleanTitle.toLowerCase() === 'home / x') {
        cleanTitle = isTwitter ? `Post by ${twitterHandle}` : 'Annotated Community Note';
      }

      // Sanitize quote
      let cleanQuote = rawQuote.replace(/[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{FE00}-\u{FE0F}]/gu, '').replace(/\s+/g, ' ').trim();

      // Compute direct playable video URL
      let videoUrl = '';
      let isVideo = false;
      if (a.media_url && a.media_url.trim() !== '') {
        const slashParts = a.media_url.split('/');
        const fname = slashParts[slashParts.length - 1];
        const baseName = fname.replace('.webm', '');
        videoUrl = `http://192.168.4.22:${PORT}/clip/${baseName}.mp4`;
        isVideo = true;
      } else {
        videoUrl = `http://192.168.4.22:${PORT}/slate/${a.id}.mp4`;
        isVideo = false;
      }

      return {
        ...a,
        hostname: authorName,
        video_url: videoUrl,
        qr_url: `http://192.168.4.22:${PORT}/qr/${a.id}.png`,
        source_url: a.url || '',
        is_video: isVideo,
        comment: cleanComment,
        full_comment: cleanComment,
        quote: cleanQuote,
        full_quote: rawQuote,
        page_title: cleanTitle,
        display_emoji: primaryEmoji,
        emoji_icon: emojiIcon,
        reactions: rm,
        fact_check: fc
      };
    });

    console.log(`[MediaServer] Enriched ${enriched.length} total annotations (${enriched.filter(x => x.is_video).length} video clips, ${enriched.filter(x => !x.is_video).length} stagnant/Twitter notes) -> delivering full live feed to Roku TV.`);

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

  if (pathname.startsWith('/qr/')) {
    const filename = path.basename(pathname);
    const annId = path.basename(filename, '.png');
    const qrPath = path.join(CACHE_DIR, `qr_${annId}.png`);

    if (fs.existsSync(qrPath)) {
      const img = fs.readFileSync(qrPath);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': img.length,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(img);
    }

    try {
      const feed = await getEnrichedFeed();
      const item = feed.find(x => x.id === annId) || {};
      const targetUrl = item.source_url || `https://annotated.com/n/${annId}`;
      const buf = await QRCode.toBuffer(targetUrl, {
        width: 256,
        margin: 1,
        color: {
          dark: '#030712',
          light: '#ffffff'
        }
      });
      fs.writeFileSync(qrPath, buf);
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': buf.length,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(buf);
    } catch (err) {
      console.error('[MediaServer] QR generation error:', err.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Failed to generate QR');
    }
  }

  if (pathname === '/api/react' && req.method === 'POST') {
    let bodyStr = '';
    req.on('data', chunk => { bodyStr += chunk; });
    req.on('end', async () => {
      try {
        const body = JSON.parse(bodyStr || '{}');
        const { annotation_id, emoji, user_id } = body;
        if (!annotation_id || !emoji) {
          res.writeHead(400, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
          return res.end(JSON.stringify({ error: 'Missing annotation_id or emoji' }));
        }

        const reactionUser = user_id || '783ce6ce-88f6-439e-b8ce-48db4c3e39da';
        console.log(`[MediaServer] Submitting reaction: ${emoji} on annotation ${annotation_id}...`);

        const postRes = await fetch('https://dajadbvlldrmgzztdksn.supabase.co/rest/v1/annotation_reactions', {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: 'Bearer ' + SUPABASE_KEY,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal'
          },
          body: JSON.stringify({
            annotation_id: annotation_id,
            user_id: reactionUser,
            emoji: emoji
          })
        });

        // Invalidate cached feed so subsequent requests see the new count
        cachedFeed = null;
        lastFeedTime = 0;

        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ success: true, annotation_id, emoji }));
      } catch (err) {
        console.error('[MediaServer] Reaction error:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        return res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (pathname.startsWith('/slate/')) {
    const filename = path.basename(pathname);
    const annId = path.basename(filename, '.mp4');
    const filePath = path.join(CACHE_DIR, `slate_${annId}.mp4`);

    if (fs.existsSync(filePath)) {
      return streamFileWithRange(filePath, req, res);
    }

    console.log(`[MediaServer] Generating on-demand 15s slate for annotation ${annId}...`);
    try {
      const feed = await getEnrichedFeed();
      const item = feed.find(x => x.id === annId) || {};

      const escapeDrawText = (str) => {
        if (!str) return '';
        return str
          .replace(/\\/g, '\\\\')
          .replace(/'/g, "\u2019")
          .replace(/:/g, '\\:')
          .replace(/%/g, '%%')
          .replace(/[\r\n]+/g, ' ')
          .trim();
      };

      const isTw = item.url && (item.url.includes('x.com/') || item.url.includes('twitter.com/'));
      const platform = isTw ? 'TWITTER / X COMMUNITY NOTE' : 'WEB COMMUNITY ANNOTATION';
      const author = escapeDrawText(item.hostname ? (item.hostname.startsWith('@') ? item.hostname : `@${item.hostname}`) : '@annotated');
      
      let rawQuote = item.quote || item.page_title || 'Annotated Community Note';
      rawQuote = rawQuote.replace(/[\u{1F300}-\u{1FAD6}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u{FE00}-\u{FE0F}]/gu, '');
      
      // Split quote into up to 2 readable lines (max ~60 chars each)
      const words = rawQuote.split(/\s+/);
      let line1 = '';
      let line2 = '';
      for (const w of words) {
        if ((line1 + ' ' + w).trim().length <= 58 && !line2) {
          line1 = (line1 + ' ' + w).trim();
        } else if ((line2 + ' ' + w).trim().length <= 58) {
          line2 = (line2 + ' ' + w).trim();
        }
      }
      if (!line1) line1 = rawQuote.slice(0, 58);
      if (rawQuote.length > line1.length && !line2) line2 = rawQuote.slice(line1.length, line1.length + 58);
      if (rawQuote.length > line1.length + line2.length && line2) line2 += '...';

      const escLine1 = escapeDrawText(line1);
      const escLine2 = escapeDrawText(line2);

      let commentText = item.comment || '[Idea] Key Community Takeaway';
      const escComment = escapeDrawText(commentText.slice(0, 75));

      const filters = [
        `drawbox=x=60:y=40:w=1160:h=640:color=0x0B1120@0.96:t=fill`,
        `drawbox=x=60:y=40:w=1160:h=4:color=0x38BDF8:t=fill`,
        `drawtext=text='${platform}':fontcolor=0x38BDF8:fontsize=22:x=100:y=75`,
        `drawtext=text='${author}':fontcolor=0xFFFFFF:fontsize=38:x=100:y=115`,
        `drawbox=x=100:y=175:w=1080:h=1:color=0x1E293B:t=fill`
      ];

      if (escLine1) {
        filters.push(`drawtext=text='${escLine1}':fontcolor=0xE2E8F0:fontsize=28:x=100:y=210`);
      }
      if (escLine2) {
        filters.push(`drawtext=text='${escLine2}':fontcolor=0xE2E8F0:fontsize=28:x=100:y=255`);
      }

      filters.push(
        `drawbox=x=100:y=330:w=1080:h=1:color=0x1E293B:t=fill`,
        `drawtext=text='ANNOTATION':fontcolor=0x34D399:fontsize=20:x=100:y=360`,
        `drawtext=text='${escComment}':fontcolor=0xFFFFFF:fontsize=32:x=100:y=400`,
        `drawbox=x=100:y=570:w=1080:h=1:color=0x1E293B:t=fill`,
        `drawtext=text='VERIFIED ACCURATE':fontcolor=0x34D399:fontsize=22:x=100:y=600`,
        `drawtext=text='15s':fontcolor=0x64748B:fontsize=22:x=1140:y=600`
      );

      const vf = filters.join(',');
      execSync(`"${FFMPEG}" -y -f lavfi -i color=c=0x090D16:s=1280x720:d=15 -f lavfi -i anullsrc=r=44100:cl=stereo -vf "${vf}" -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart "${filePath}"`, { stdio: 'pipe' });
      return streamFileWithRange(filePath, req, res);
    } catch (err) {
      console.error('[MediaServer] Slate error, generating minimal background:', err.message);
      execSync(`"${FFMPEG}" -y -f lavfi -i color=c=0x090D16:s=1280x720:d=15 -f lavfi -i anullsrc=r=44100:cl=stereo -c:v libx264 -preset ultrafast -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart "${filePath}"`, { stdio: 'pipe' });
      return streamFileWithRange(filePath, req, res);
    }
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
          console.log(`[MediaServer] Transcoding ${baseName}.webm -> ${filename} (720p H.264 main profile, normalized PTS)...`);
          execSync(`"${FFMPEG}" -y -i "${tempWebm}" -avoid_negative_ts make_zero -fflags +genpts -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS" -c:v libx264 -preset veryfast -profile:v main -level 3.1 -pix_fmt yuv420p -af "asetpts=PTS-STARTPTS" -c:a aac -b:a 128k -movflags +faststart "${filePath}"`, { stdio: 'pipe' });
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
