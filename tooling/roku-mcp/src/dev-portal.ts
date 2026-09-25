import crypto from 'node:crypto';
import fs from 'node:fs';
import { defaultConfig } from './config.js';

interface DigestChallenge {
  realm: string;
  nonce: string;
  qop?: string;
  opaque?: string;
}

function parseDigestHeader(header: string): DigestChallenge {
  const challenge: Record<string, string> = {};
  const cleaned = header.replace(/^Digest\s+/i, '');
  const regex = /(\w+)=(?:"([^"]+)"|([^\s,]+))/g;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    challenge[match[1]] = match[2] || match[3];
  }
  return {
    realm: challenge.realm || 'rokudev',
    nonce: challenge.nonce || '',
    qop: challenge.qop,
    opaque: challenge.opaque,
  };
}

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

export async function fetchWithDigest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {},
  user = defaultConfig.devUser,
  password = defaultConfig.devPassword
): Promise<Response> {
  const method = options.method || 'GET';
  const parsedUrl = new URL(url);
  const uri = parsedUrl.pathname + parsedUrl.search;

  // 1. Send first request to get 401 challenge
  const initialRes = await fetch(url, {
    method,
    headers: options.headers,
    signal: AbortSignal.timeout(10000),
  });

  if (initialRes.status !== 401) {
    return initialRes;
  }

  const authHeader = initialRes.headers.get('www-authenticate');
  if (!authHeader || !authHeader.toLowerCase().includes('digest')) {
    throw new Error('Server did not return a valid WWW-Authenticate Digest header.');
  }

  const challenge = parseDigestHeader(authHeader);
  const ha1 = md5(`${user}:${challenge.realm}:${password}`);
  const ha2 = md5(`${method}:${uri}`);
  const nc = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');

  let responseHash = '';
  let authValue = '';

  if (challenge.qop && challenge.qop.includes('auth')) {
    responseHash = md5(`${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`);
    authValue =
      `Digest username="${user}", realm="${challenge.realm}", nonce="${challenge.nonce}", ` +
      `uri="${uri}", qop=auth, nc=${nc}, cnonce="${cnonce}", response="${responseHash}"` +
      (challenge.opaque ? `, opaque="${challenge.opaque}"` : '');
  } else {
    responseHash = md5(`${ha1}:${challenge.nonce}:${ha2}`);
    authValue =
      `Digest username="${user}", realm="${challenge.realm}", nonce="${challenge.nonce}", ` +
      `uri="${uri}", response="${responseHash}"` +
      (challenge.opaque ? `, opaque="${challenge.opaque}"` : '');
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: authValue,
  };

  return await fetch(url, {
    method,
    headers,
    body: options.body,
    signal: AbortSignal.timeout(20000),
  });
}

export async function installChannelZip(
  zipPathOrBuffer: string | Buffer,
  ip = defaultConfig.ip,
  password = defaultConfig.devPassword
): Promise<{ success: boolean; message: string; details?: string }> {
  const url = `http://${ip}:${defaultConfig.devPort}/plugin_install`;

  let fileBuffer: Buffer;
  if (typeof zipPathOrBuffer === 'string') {
    if (!fs.existsSync(zipPathOrBuffer)) {
      throw new Error(`Channel zip file not found: ${zipPathOrBuffer}`);
    }
    fileBuffer = fs.readFileSync(zipPathOrBuffer);
  } else {
    fileBuffer = zipPathOrBuffer;
  }

  const boundary = `----RokuMcpBoundary${Date.now()}`;
  const crlf = '\r\n';

  let body = '';
  // Field: mysubmit = Install
  body += `--${boundary}${crlf}`;
  body += `Content-Disposition: form-data; name="mysubmit"${crlf}${crlf}`;
  body += `Install${crlf}`;

  // Field: archive (file)
  body += `--${boundary}${crlf}`;
  body += `Content-Disposition: form-data; name="archive"; filename="channel.zip"${crlf}`;
  body += `Content-Type: application/zip${crlf}${crlf}`;

  const headBuffer = Buffer.from(body, 'utf-8');
  const tailBuffer = Buffer.from(`${crlf}--${boundary}--${crlf}`, 'utf-8');
  const fullBody = Buffer.concat([headBuffer, fileBuffer, tailBuffer]) as any;

  const res = await fetchWithDigest(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: fullBody,
    },
    defaultConfig.devUser,
    password
  );

  const html = await res.text();

  if (!res.ok) {
    return {
      success: false,
      message: `HTTP error ${res.status}: ${res.statusText}`,
      details: html.substring(0, 1000),
    };
  }

  const isSuccess = html.includes('Install Success') || html.includes('Identical to previous build') || html.includes('Application Installed');
  return {
    success: isSuccess,
    message: isSuccess ? 'Channel successfully installed on Roku' : 'Install returned unexpected status',
    details: html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 500),
  };
}

export async function captureScreenshot(
  ip = defaultConfig.ip,
  password = defaultConfig.devPassword
): Promise<{ base64: string; mimeType: string; bufferSize: number }> {
  const boundary = `----RokuMcpBoundary${Date.now()}`;
  const crlf = '\r\n';
  let body = `--${boundary}${crlf}`;
  body += `Content-Disposition: form-data; name="mysubmit"${crlf}${crlf}`;
  body += `Screenshot${crlf}`;
  body += `--${boundary}--${crlf}`;

  // 1. Trigger the screenshot on dev portal
  const inspectUrl = `http://${ip}:${defaultConfig.devPort}/plugin_inspect`;
  await fetchWithDigest(
    inspectUrl,
    {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: Buffer.from(body, 'utf-8'),
    },
    defaultConfig.devUser,
    password
  );

  // 2. Download the resulting frame capture
  const imgUrl = `http://${ip}:${defaultConfig.devPort}/pkgs/dev.jpg?time=${Date.now()}`;
  const imgRes = await fetchWithDigest(imgUrl, { method: 'GET' }, defaultConfig.devUser, password);

  if (!imgRes.ok) {
    throw new Error(`Failed to download screenshot (${imgRes.status}): ${imgRes.statusText}`);
  }

  const arrayBuffer = await imgRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    base64: buffer.toString('base64'),
    mimeType: 'image/jpeg',
    bufferSize: buffer.length,
  };
}
