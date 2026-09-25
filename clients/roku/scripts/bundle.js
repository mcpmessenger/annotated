import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = path.resolve();
const psScript = path.join(rootDir, 'scripts', 'package.ps1');

console.log('Packaging Annotated Roku Channel with forward-slash paths...');
execSync(`powershell -ExecutionPolicy Bypass -File "${psScript}"`, { stdio: 'inherit' });
