import { fetchWithDigest } from './dist/dev-portal.js';

async function run() {
  const boundary = '----RokuMcpBoundary' + Date.now();
  const crlf = '\r\n';
  let body = `--${boundary}${crlf}`;
  body += `Content-Disposition: form-data; name="mysubmit"${crlf}${crlf}`;
  body += `Screenshot${crlf}`;
  body += `--${boundary}--${crlf}`;

  const res = await fetchWithDigest('http://192.168.4.32/plugin_inspect', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: Buffer.from(body, 'utf-8'),
  }, 'rokudev', 'qqqqaaaa');

  console.log('Screenshot POST status:', res.status, res.headers.get('content-type'));
  const html = await res.text();
  console.log('Response excerpt around screenshoot:');
  const idx = html.indexOf('screenshoot');
  if (idx !== -1) {
    console.log(html.substring(idx - 50, idx + 400));
  } else {
    console.log(html.substring(0, 500));
  }
}

run().catch(console.error);
