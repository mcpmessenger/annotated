import { pressKey, launchApp } from './dist/ecp.js';
import { captureScreenshot } from './dist/dev-portal.js';
import fs from 'node:fs';

async function coldStartIntro() {
  console.log('Sending Home key to exit to dashboard...');
  await pressKey('Home', '192.168.4.32');
  await new Promise(r => setTimeout(r, 2000));

  console.log('Launching Annotated channel from cold start...');
  await launchApp('dev', {}, '192.168.4.32');

  // Catch the intro animation at 1000ms
  await new Promise(r => setTimeout(r, 1200));

  console.log('Snapping frame...');
  const shot = await captureScreenshot('192.168.4.32', 'qqqqaaaa');
  const buf = Buffer.from(shot.base64, 'base64');
  const outPath = 'C:\\Users\\senti\\.gemini\\antigravity\\brain\\00ede6ab-ff54-4322-b6dc-4dc85a5e08b9\\roku_intro_screen.jpg';
  fs.writeFileSync(outPath, buf);
  console.log(`Saved cold-start intro frame (${buf.length} bytes) to ${outPath}`);
}

coldStartIntro().catch(console.error);
