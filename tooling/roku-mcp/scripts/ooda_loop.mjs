import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { installChannelZip, captureScreenshot } from '../dist/dev-portal.js';
import { readConsoleLogs } from '../dist/telnet.js';
import { defaultConfig } from '../dist/config.js';

async function runOODALoop(options = {}) {
  const ip = options.ip || defaultConfig.ip;
  const password = options.password || defaultConfig.devPassword;
  const channelDir = 'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\annotated-repo\\clients\\roku';
  const zipPath = path.join(channelDir, 'dist', 'channel.zip');
  const artifactScreenshot = 'C:\\Users\\senti\\.gemini\\antigravity\\brain\\00ede6ab-ff54-4322-b6dc-4dc85a5e08b9\\roku_live_tv_screen.jpg';

  console.log(`\n=== [OODA LOOP PASS] Target: ${ip} ===`);

  // 1. ACT: Package Channel
  console.log('1. [ACT] Packaging channel with latest SceneGraph & BrightScript sources...');
  execSync(`powershell -ExecutionPolicy Bypass -File "${path.join(channelDir, 'scripts', 'package.ps1')}"`, { stdio: 'inherit' });

  // 2. ACT: Sideload Build to Physical TV
  console.log(`2. [ACT] Sideloading ${zipPath} to Roku TV (${ip})...`);
  const deployResult = await installChannelZip(zipPath, ip, password);
  if (!deployResult.success) {
    console.error('Sideload failed:', deployResult);
    return { success: false, error: deployResult.message };
  }
  console.log('Deploy status: SUCCESS.');

  // 3. OBSERVE: Read BrightScript Debug Logs
  console.log('3. [OBSERVE] Reading BrightScript runtime debug logs (port 8085)...');
  await new Promise(r => setTimeout(r, 1200));
  const logs = await readConsoleLogs(2500, ip);
  const hasWarnings = logs.includes('Warnings occurred') || logs.includes('error');
  console.log(`Console status: ${hasWarnings ? 'WARNINGS/ERRORS DETECTED' : 'CLEAN (0 errors)'}`);
  if (hasWarnings) {
    console.log('--- Warning excerpt ---');
    console.log(logs.substring(logs.indexOf('Warning'), logs.indexOf('Warning') + 400));
  }

  // 4. OBSERVE: Capture Physical TV Frame Buffer
  console.log('4. [OBSERVE] Capturing live TV screen buffer...');
  const shot = await captureScreenshot(ip, password);
  const buf = Buffer.from(shot.base64, 'base64');
  fs.writeFileSync(artifactScreenshot, buf);
  console.log(`Saved live screen capture (${buf.length} bytes) to ${artifactScreenshot}`);

  console.log('=== [OODA PASS COMPLETE] Ready for Orient & Decision ===\n');
  return {
    success: true,
    screenshotPath: artifactScreenshot,
    logs: logs,
    hasWarnings: hasWarnings
  };
}

runOODALoop().catch(console.error);
