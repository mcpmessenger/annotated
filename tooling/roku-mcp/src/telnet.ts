import net from 'node:net';
import { defaultConfig } from './config.js';

export async function readConsoleLogs(
  durationMs = 3000,
  ip = defaultConfig.ip,
  port = defaultConfig.logPort
): Promise<string> {
  return new Promise((resolve) => {
    let output = '';
    const socket = new net.Socket();

    const timer = setTimeout(() => {
      try {
        socket.destroy();
      } catch {}
      resolve(output.trim() || 'No logs received within the timeout window.');
    }, durationMs);

    socket.connect(port, ip, () => {
      // Connected to BrightScript debug console
    });

    socket.on('data', (data) => {
      output += data.toString('utf-8');
    });

    socket.on('error', (err) => {
      clearTimeout(timer);
      try {
        socket.destroy();
      } catch {}
      resolve(output ? `${output}\n[Socket closed with error: ${err.message}]` : `Failed to connect to Roku log console (${ip}:${port}): ${err.message}`);
    });

    socket.on('close', () => {
      clearTimeout(timer);
      resolve(output.trim() || 'Log console closed.');
    });
  });
}
