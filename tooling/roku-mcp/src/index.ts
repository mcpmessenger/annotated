#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { defaultConfig } from './config.js';
import {
  discoverDevices,
  getDeviceInfo,
  getApps,
  getActiveApp,
  getMediaPlayer,
  pressKey,
  typeText,
  launchApp,
} from './ecp.js';
import { installChannelZip, captureScreenshot } from './dev-portal.js';
import { readConsoleLogs } from './telnet.js';

const server = new McpServer({
  name: 'annotated-roku-mcp',
  version: '1.0.0',
});

// Tool: Discover Roku devices
server.tool(
  'roku_discover',
  'Discover Roku devices on the local network using SSDP multicast and local ping',
  {
    timeoutMs: z.number().optional().describe('Timeout in milliseconds for discovery (default 3000)'),
  },
  async ({ timeoutMs }) => {
    try {
      const devices = await discoverDevices(timeoutMs || 3000);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(devices, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Discovery error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Device Info
server.tool(
  'roku_get_device_info',
  'Get hardware, OS, and developer mode status from a Roku device',
  {
    ip: z.string().optional().describe('Roku device IP address (defaults to configured ROKU_IP)'),
  },
  async ({ ip }) => {
    try {
      const targetIp = ip || defaultConfig.ip;
      const info = await getDeviceInfo(targetIp);
      return {
        content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Failed to get device info: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Get Apps
server.tool(
  'roku_get_apps',
  'List all installed channels and applications on the Roku device',
  {
    ip: z.string().optional().describe('Roku device IP address'),
  },
  async ({ ip }) => {
    try {
      const targetIp = ip || defaultConfig.ip;
      const apps = await getApps(targetIp);
      const active = await getActiveApp(targetIp).catch(() => null);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ activeApp: active, installedApps: apps }, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Failed to get apps: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Press Key
server.tool(
  'roku_press_key',
  'Send remote control key press (Home, Rev, Fwd, Play, Select, Left, Right, Down, Up, Back, InstantReplay, Info, Backspace, Enter)',
  {
    key: z.string().describe('Key name to press (e.g. Home, Select, Back, Up, Down, Left, Right, Play, Info)'),
    ip: z.string().optional().describe('Roku device IP address'),
  },
  async ({ key, ip }) => {
    try {
      const targetIp = ip || defaultConfig.ip;
      await pressKey(key, targetIp);
      return {
        content: [{ type: 'text', text: `Successfully pressed key '${key}' on Roku (${targetIp})` }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Keypress error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Type Text
server.tool(
  'roku_type_text',
  'Type an entire string of text sequentially into any active text input on Roku',
  {
    text: z.string().describe('The text string to type into the Roku input field'),
    ip: z.string().optional().describe('Roku device IP address'),
  },
  async ({ text, ip }) => {
    try {
      const targetIp = ip || defaultConfig.ip;
      await typeText(text, targetIp);
      return {
        content: [{ type: 'text', text: `Successfully typed "${text}" on Roku (${targetIp})` }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Type text error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Query Media Player
server.tool(
  'roku_query_media',
  'Query current media player playback status, current timestamp position, duration, and stream state',
  {
    ip: z.string().optional().describe('Roku device IP address'),
  },
  async ({ ip }) => {
    try {
      const targetIp = ip || defaultConfig.ip;
      const player = await getMediaPlayer(targetIp);
      return {
        content: [{ type: 'text', text: JSON.stringify(player, null, 2) }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Media player query error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Launch App
server.tool(
  'roku_launch_app',
  'Launch an app or channel on Roku by App ID (use "dev" for sideloaded dev channel) with optional deep link params',
  {
    appId: z.string().describe('App ID (e.g. "dev" for sideloaded channel, or numerical channel ID)'),
    params: z.record(z.string()).optional().describe('Query parameters (e.g. { contentId: "123", mediaType: "live" })'),
    ip: z.string().optional().describe('Roku device IP address'),
  },
  async ({ appId, params, ip }) => {
    try {
      const targetIp = ip || defaultConfig.ip;
      await launchApp(appId, params || {}, targetIp);
      return {
        content: [{ type: 'text', text: `Successfully launched app '${appId}' on Roku (${targetIp})` }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Launch app error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Install Channel Zip
server.tool(
  'roku_install_channel',
  'Sideload a packaged BrightScript channel zip to the Roku device via Developer Portal port 80',
  {
    zipPath: z.string().describe('Absolute file path to the channel .zip archive'),
    ip: z.string().optional().describe('Roku device IP address'),
    password: z.string().optional().describe('Roku developer password'),
  },
  async ({ zipPath, ip, password }) => {
    try {
      const targetIp = ip || defaultConfig.ip;
      const targetPassword = password || defaultConfig.devPassword;
      const result = await installChannelZip(zipPath, targetIp, targetPassword);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !result.success,
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Install channel error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Capture Screenshot
server.tool(
  'roku_capture_screenshot',
  'Capture the current frame buffer of the physical TV screen as an image for visual inspection',
  {
    ip: z.string().optional().describe('Roku device IP address'),
    password: z.string().optional().describe('Roku developer password'),
  },
  async ({ ip, password }) => {
    try {
      const targetIp = ip || defaultConfig.ip;
      const targetPassword = password || defaultConfig.devPassword;
      const result = await captureScreenshot(targetIp, targetPassword);
      return {
        content: [
          {
            type: 'text',
            text: `Captured TV screenshot (${result.bufferSize} bytes, ${result.mimeType}) from ${targetIp}`,
          },
          {
            type: 'image',
            data: result.base64,
            mimeType: result.mimeType,
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Screenshot error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// Tool: Read Console Logs
server.tool(
  'roku_read_logs',
  'Connect to the BrightScript debug console on port 8085 to capture runtime logs and crash dumps',
  {
    durationMs: z.number().optional().describe('Listening duration in milliseconds (default 3000)'),
    ip: z.string().optional().describe('Roku device IP address'),
  },
  async ({ durationMs, ip }) => {
    try {
      const targetIp = ip || defaultConfig.ip;
      const logs = await readConsoleLogs(durationMs || 3000, targetIp);
      return {
        content: [{ type: 'text', text: logs }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text', text: `Log reading error: ${err.message}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal MCP Server Error:', err);
  process.exit(1);
});
