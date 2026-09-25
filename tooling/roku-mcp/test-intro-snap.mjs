import { launchApp } from './dist/ecp.js';
import { captureScreenshot } from './dist/dev-portal.js';
import fs from 'node:fs';

async function captureIntro() {
  console.log('Relaunching dev channel to capture intro...');
  await launchApp('dev', {}, '192.168.4.32');
  
  // Wait 800ms to catch the middle of the cinematic reveal
  await new Promise(r => setTimeout(r, 800));
  
  console.log('Snapping frame...');
  const shot = await captureScreenshot('192.168.4.32', 'qqqqaaaa');
  const buf = Buffer.from(shot.base64, 'base64');
  const outPath = 'C:\\Users\\senti\\.gemini\\antigravity\\brain\\00ede6ab-ff54-4322-b6dc-4dc85a5e08b9\\roku_intro_screen.jpg';
  fs.writeFileSync(outPath, buf);
  console.log(`Saved intro screenshot (${buf.length} bytes) to ${outPath}`);
}

captureIntro().catch(console.error);
