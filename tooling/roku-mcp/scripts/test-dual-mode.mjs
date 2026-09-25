import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { installChannelZip, captureScreenshot } from '../dist/dev-portal.js';
import { pressKey } from '../dist/ecp.js';
import { readConsoleLogs } from '../dist/telnet.js';
import { defaultConfig } from '../dist/config.js';

async function testDualMode() {
  const ip = defaultConfig.ip;
  const password = defaultConfig.devPassword;
  const channelDir = 'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\annotated-repo\\clients\\roku';
  const zipPath = path.join(channelDir, 'dist', 'channel.zip');
  const brainDir = 'C:\\Users\\senti\\.gemini\\antigravity\\brain\\00ede6ab-ff54-4322-b6dc-4dc85a5e08b9';

  console.log('=== [FULL DUAL-MODE & SEEK VERIFICATION] ===');

  // 1. Package & Deploy
  console.log('1. Packaging & Sideloading...');
  execSync(`powershell -ExecutionPolicy Bypass -File "${path.join(channelDir, 'scripts', 'package.ps1')}"`, { stdio: 'inherit' });
  const deploy = await installChannelZip(zipPath, ip, password);
  console.log('Deploy result:', deploy.success ? 'SUCCESS' : deploy);

  console.log('Waiting 3.5s for intro animation and live feed sync...');
  await new Promise(r => setTimeout(r, 3500));

  // 2. Capture State A (Passive Playback)
  console.log('2. Capturing State A (Passive Playback)...');
  const shotA = await captureScreenshot(ip, password);
  const shotAPath = path.join(brainDir, 'roku_state_a_passive.jpg');
  fs.writeFileSync(shotAPath, Buffer.from(shotA.base64, 'base64'));

  // 3. Transition to State B (Active Rail Browsing) via Star (*) key ('Info' in ECP)
  console.log('3. Sending "Info" (Star [*]) key to enter State B (Active Browsing)...');
  await pressKey('Info', ip);
  await new Promise(r => setTimeout(r, 1000));

  // 4. Capture State B (Card 1 Focused)
  console.log('4. Capturing State B (Note Card 1 Focused)...');
  const shotB1 = await captureScreenshot(ip, password);
  const shotB1Path = path.join(brainDir, 'roku_state_b_card1.jpg');
  fs.writeFileSync(shotB1Path, Buffer.from(shotB1.base64, 'base64'));

  // 5. Navigate Down to Card 2
  console.log('5. Sending "Down" key to focus Note Card 2...');
  await pressKey('Down', ip);
  await new Promise(r => setTimeout(r, 1000));

  // 6. Capture State B (Card 2 Focused)
  console.log('6. Capturing State B (Note Card 2 Focused)...');
  const shotB2 = await captureScreenshot(ip, password);
  const shotB2Path = path.join(brainDir, 'roku_state_b_card2.jpg');
  fs.writeFileSync(shotB2Path, Buffer.from(shotB2.base64, 'base64'));

  // 7. Press OK ("Select" in ECP) to seek video to Card 2 timestamp (01:15)
  console.log('7. Sending "Select" (OK) key to seek video to Card 2 timestamp...');
  await pressKey('Select', ip);
  await new Promise(r => setTimeout(r, 1500));

  console.log('8. Capturing post-seek screen...');
  const shotSeek = await captureScreenshot(ip, password);
  const shotSeekPath = path.join(brainDir, 'roku_state_b_seek.jpg');
  fs.writeFileSync(shotSeekPath, Buffer.from(shotSeek.base64, 'base64'));

  // 9. Press "Back" to exit State B and return to State A
  console.log('9. Sending "Back" key to exit State B and return to State A...');
  await pressKey('Back', ip);
  await new Promise(r => setTimeout(r, 1000));

  console.log('10. Capturing restored State A screen...');
  const shotReturn = await captureScreenshot(ip, password);
  const shotReturnPath = path.join(brainDir, 'roku_state_a_returned.jpg');
  fs.writeFileSync(shotReturnPath, Buffer.from(shotReturn.base64, 'base64'));

  // 11. Read Telnet debug logs
  console.log('11. Reading BrightScript debug log stream...');
  const logs = await readConsoleLogs(2000, ip);
  console.log('--- Telnet Logs ---');
  console.log(logs.slice(-2000));

  console.log('=== [FULL VERIFICATION COMPLETE] ===');
}

testDualMode().catch(console.error);
