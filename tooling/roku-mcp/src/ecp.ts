import dgram from 'node:dgram';
import { parseStringPromise } from 'xml2js';
import { defaultConfig } from './config.js';

export interface DiscoveredRoku {
  ip: string;
  location?: string;
  server?: string;
  deviceInfo?: Record<string, any>;
}

export async function discoverDevices(timeoutMs = 3000): Promise<DiscoveredRoku[]> {
  const devices = new Map<string, DiscoveredRoku>();

  // 1. Try SSDP M-SEARCH broadcast
  await new Promise<void>((resolve) => {
    const socket = dgram.createSocket('udp4');
    let timer: NodeJS.Timeout;

    socket.on('message', (msg, rinfo) => {
      const text = msg.toString('utf-8');
      if (text.includes('roku:ecp')) {
        const lines = text.split('\r\n');
        let location = '';
        let server = '';
        for (const line of lines) {
          if (line.toLowerCase().startsWith('location:')) {
            location = line.substring(9).trim();
          } else if (line.toLowerCase().startsWith('server:')) {
            server = line.substring(7).trim();
          }
        }
        devices.set(rinfo.address, { ip: rinfo.address, location, server });
      }
    });

    socket.on('error', () => {
      try { socket.close(); } catch {}
      clearTimeout(timer);
      resolve();
    });

    const msearch =
      'M-SEARCH * HTTP/1.1\r\n' +
      'HOST: 239.255.255.250:1900\r\n' +
      'MAN: "ssdp:discover"\r\n' +
      'ST: roku:ecp\r\n' +
      'MX: 3\r\n\r\n';

    socket.bind(0, () => {
      try {
        socket.send(msearch, 0, msearch.length, 1900, '239.255.255.250');
      } catch {}
    });

    timer = setTimeout(() => {
      try { socket.close(); } catch {}
      resolve();
    }, timeoutMs);
  });

  // Always check the known default IP if not yet found
  const knownIp = defaultConfig.ip;
  if (!devices.has(knownIp)) {
    try {
      const res = await fetch(`http://${knownIp}:${defaultConfig.ecpPort}/query/device-info`, {
        signal: AbortSignal.timeout(1500),
      });
      if (res.ok) {
        devices.set(knownIp, { ip: knownIp, location: `http://${knownIp}:${defaultConfig.ecpPort}/` });
      }
    } catch {}
  }

  // Populate device-info for found devices
  const results: DiscoveredRoku[] = [];
  for (const [ip, item] of devices.entries()) {
    try {
      const info = await getDeviceInfo(ip);
      results.push({ ...item, deviceInfo: info });
    } catch {
      results.push(item);
    }
  }

  return results;
}

export async function getDeviceInfo(ip = defaultConfig.ip): Promise<Record<string, any>> {
  const url = `http://${ip}:${defaultConfig.ecpPort}/query/device-info`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) {
    throw new Error(`Failed to query device-info: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const parsed = await parseStringPromise(xml, { explicitArray: false, trim: true });
  return parsed?.['device-info'] || parsed;
}

export async function getApps(ip = defaultConfig.ip): Promise<any[]> {
  const url = `http://${ip}:${defaultConfig.ecpPort}/query/apps`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Failed to query apps: ${res.status} ${text || res.statusText}`);
  }
  const xml = await res.text();
  const parsed = await parseStringPromise(xml, { explicitArray: false, trim: true });
  const apps = parsed?.apps?.app;
  if (!apps) return [];
  return Array.isArray(apps) ? apps : [apps];
}

export async function getActiveApp(ip = defaultConfig.ip): Promise<Record<string, any>> {
  const url = `http://${ip}:${defaultConfig.ecpPort}/query/active-app`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) {
    throw new Error(`Failed to query active-app: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const parsed = await parseStringPromise(xml, { explicitArray: false, trim: true });
  return parsed?.['active-app'] || parsed;
}

export async function getMediaPlayer(ip = defaultConfig.ip): Promise<Record<string, any>> {
  const url = `http://${ip}:${defaultConfig.ecpPort}/query/media-player`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) {
    throw new Error(`Failed to query media-player: ${res.status} ${res.statusText}`);
  }
  const xml = await res.text();
  const parsed = await parseStringPromise(xml, { explicitArray: false, trim: true });
  return parsed?.player || parsed;
}

export async function pressKey(key: string, ip = defaultConfig.ip): Promise<void> {
  const url = `http://${ip}:${defaultConfig.ecpPort}/keypress/${encodeURIComponent(key)}`;
  const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(4000) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Keypress '${key}' failed (${res.status}): ${text || res.statusText}`);
  }
}

export async function typeText(text: string, ip = defaultConfig.ip): Promise<void> {
  for (const char of text) {
    await pressKey(`Lit_${char}`, ip);
    await new Promise((r) => setTimeout(r, 60));
  }
}

export async function launchApp(appId: string, params: Record<string, string> = {}, ip = defaultConfig.ip): Promise<void> {
  const qs = new URLSearchParams(params).toString();
  const url = `http://${ip}:${defaultConfig.ecpPort}/launch/${encodeURIComponent(appId)}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { method: 'POST', signal: AbortSignal.timeout(4000) });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Launch app '${appId}' failed (${res.status}): ${text || res.statusText}`);
  }
}
