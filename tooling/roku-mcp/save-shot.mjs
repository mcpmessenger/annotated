import fs from 'node:fs';
import { fetchWithDigest } from './dist/dev-portal.js';

async function getScreenshot() {
  const boundary = '----RokuMcpBoundary' + Date.now();
  const crlf = '\r\n';
  let body = `--${boundary}${crlf}`;
  body += `Content-Disposition: form-data; name="mysubmit"${crlf}${crlf}`;
  body += `Screenshot${crlf}`;
  body += `--${boundary}--${crlf}`;

  // 1. Trigger screenshot capture
  await fetchWithDigest('http://192.168.4.32/plugin_inspect', {
    method: 'POST',
    headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
    body: Buffer.from(body, 'utf-8'),
  }, 'rokudev', 'qqqqaaaa');

  // 2. Fetch the captured jpg
  const imgUrl = `http://192.168.4.32/pkgs/dev.jpg?time=${Date.now()}`;
  const res = await fetchWithDigest(imgUrl, { method: 'GET' }, 'rokudev', 'qqqqaaaa');
  
  const arrayBuf = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const outPath = 'C:\\Users\\senti\\.gemini\\antigravity\\brain\\00ede6ab-ff54-4322-b6dc-4dc85a5e08b9\\roku_live_tv_screen.jpg';
  fs.writeFileSync(outPath, buf);
  console.log(`Saved screenshot image (${buf.length} bytes) to ${outPath}`);
}

getScreenshot().catch(console.error);
