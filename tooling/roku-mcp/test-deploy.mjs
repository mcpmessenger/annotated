import { installChannelZip } from './dist/dev-portal.js';

async function deploy() {
  console.log('Deploying channel.zip to Picard (192.168.4.32)...');
  const zipPath = 'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\annotated-roku-channel\\dist\\channel.zip';
  const result = await installChannelZip(zipPath, '192.168.4.32', 'qqqqaaaa');
  console.log('Deploy Result:', JSON.stringify(result, null, 2));
}

deploy().catch(console.error);
