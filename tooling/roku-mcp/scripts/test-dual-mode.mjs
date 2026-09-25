import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { installChannelZip, captureScreenshot } from '../dist/dev-portal.js';
import { pressKey } from '../dist/ecp.js';
import { readConsoleLogs } from '../dist/telnet.js';
import { defaultConfig } from '../dist/config.js';

async function testVideoSelection() {
  const ip = defaultConfig.ip;
  const password = defaultConfig.devPassword;
  const channelDir = 'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\annotated-repo\\clients\\roku';
  const zipPath = path.join(channelDir, 'dist', 'channel.zip');
  const brainDir = 'C:\\Users\\senti\\.gemini\\antigravity\\brain\\00ede6ab-ff54-4322-b6dc-4dc85a5e08b9';

  console.log('=== [VIDEO SELECTION & PLAYBACK VERIFICATION] ===');

  // 1. Package & Deploy
  console.log('1. Packaging & Sideloading...');
  execSync(`powershell -ExecutionPolicy Bypass -File "${path.join(channelDir, 'scripts', 'package.ps1')}"`, { stdio: 'inherit' });
  const deploy = await installChannelZip(zipPath, ip, password);
  console.log('Deploy result:', deploy.success ? 'SUCCESS' : deploy);

  console.log('Waiting 3.5s for initial video stream to begin playing...');
  await new Promise(r => setTimeout(r, 3500));

  // 2. Capture Initial Playback (Card 1: Jason's $5k Bounty)
  console.log('2. Capturing Initial Video Playback (Card 1: Jason $5k Bounty)...');
  const shot1 = await captureScreenshot(ip, password);
  const shot1Path = path.join(brainDir, 'roku_play_video_1.jpg');
  fs.writeFileSync(shot1Path, Buffer.from(shot1.base64, 'base64'));
  console.log('Card 1 captured ->', shot1Path);

  // 3. Enter State B (Active Rail)
  console.log('3. Entering State B (Active Browsing)...');
  await pressKey('Info', ip);
  await new Promise(r => setTimeout(r, 800));

  // 4. Focus Card 2 (NBC Nightly News) and press OK to select and play!
  console.log('4. Navigating Down to Card 2 (NBC Nightly News)...');
  await pressKey('Down', ip);
  await new Promise(r => setTimeout(r, 800));

  console.log('5. Pressing OK to SELECT AND PLAY Card 2 (NBC Nightly News)...');
  await pressKey('Select', ip);
  await new Promise(r => setTimeout(r, 2000));

  // 6. Capture Screen Playing Card 2
  console.log('6. Capturing Card 2 Playback...');
  const shot2 = await captureScreenshot(ip, password);
  const shot2Path = path.join(brainDir, 'roku_play_video_2.jpg');
  fs.writeFileSync(shot2Path, Buffer.from(shot2.base64, 'base64'));
  console.log('Card 2 captured ->', shot2Path);

  // 7. Focus Card 3 (ver 2.1.22) and press OK to select and play!
  console.log('7. Navigating Down to Card 3 (ver 2.1.22)...');
  await pressKey('Down', ip);
  await new Promise(r => setTimeout(r, 800));

  console.log('8. Pressing OK to SELECT AND PLAY Card 3 (ver 2.1.22)...');
  await pressKey('Select', ip);
  await new Promise(r => setTimeout(r, 2000));

  // 9. Capture Screen Playing Card 3
  console.log('9. Capturing Card 3 Playback...');
  const shot3 = await captureScreenshot(ip, password);
  const shot3Path = path.join(brainDir, 'roku_play_video_3.jpg');
  fs.writeFileSync(shot3Path, Buffer.from(shot3.base64, 'base64'));
  console.log('Card 3 captured ->', shot3Path);

  // 10. Exit back to State A
  console.log('10. Pressing Back to return to State A with selected video continuing...');
  await pressKey('Back', ip);
  await new Promise(r => setTimeout(r, 1000));

  const shotFinal = await captureScreenshot(ip, password);
  const shotFinalPath = path.join(brainDir, 'roku_play_video_final_state_a.jpg');
  fs.writeFileSync(shotFinalPath, Buffer.from(shotFinal.base64, 'base64'));

  // 11. Read BrightScript debug logs
  console.log('11. Reading BrightScript debug log stream...');
  const logs = await readConsoleLogs(2500, ip);
  console.log('--- Telnet Logs ---');
  console.log(logs.slice(-2500));

  console.log('=== [VIDEO SELECTION VERIFICATION COMPLETE] ===');
}

testVideoSelection().catch(console.error);
