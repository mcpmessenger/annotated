// ─── Build Extension Runner (esbuild) ─────────────────────────────────────────

import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const srcDir = path.join(rootDir, 'extension-src');
const outDir = path.join(rootDir, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'extension', 'manifest.json'), 'utf8'));
const version = manifest.version || '2.2.1';
const desktopDir = `C:\\Users\\senti\\OneDrive\\Desktop\\annotated-v${version}`;

const isWatch = process.argv.includes('--watch');

async function copyStaticAssets(destination) {
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  const staticFiles = [
    'manifest.json',
    'widget.html',
    'widget.css',
    'content.css',
    'fix-webm-duration.js',
    'supabase-client.js',
    'offscreen.html',
    'offscreen.js',
  ];

  for (const file of staticFiles) {
    const src = path.join(rootDir, 'extension', file);
    const dest = path.join(destination, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  // Copy assets folder if present
  const assetsSrc = path.join(rootDir, 'extension', 'assets');
  const assetsDest = path.join(destination, 'assets');
  if (fs.existsSync(assetsSrc)) {
    fs.cpSync(assetsSrc, assetsDest, { recursive: true });
  }
}

async function build() {
  console.log(`🚀 Building Annotated Chrome Extension v${version} with esbuild...`);
  const startTime = Date.now();

  const entryPoints = {
    background: path.join(srcDir, 'background', 'index.ts'),
    content: path.join(srcDir, 'content', 'index.ts'),
    widget: path.join(srcDir, 'widget', 'index.ts'),
  };

  const context = await esbuild.context({
    entryPoints,
    bundle: true,
    outdir: outDir,
    format: 'iife',
    target: ['chrome110'],
    platform: 'browser',
    sourcemap: false,
    minify: false,
    logLevel: 'info',
  });

  if (isWatch) {
    await context.watch();
    console.log('👀 Watching extension-src/ for changes...');
  } else {
    await context.rebuild();
    await context.dispose();

    // Mirror to all unpacked extension locations
    const targetDirs = [
      desktopDir,
      `C:\\Users\\senti\\Desktop\\annotated-v${version}`,
      'C:\\Users\\senti\\OneDrive\\Desktop\\annotated-extension-test',
      'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\annotated-extension-unpacked',
      'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\annotated-extension-w-logos',
    ];

    for (const dir of targetDirs) {
      try {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        copyStaticAssets(dir);
        ['background.js', 'content.js', 'widget.js'].forEach((f) => {
          const src = path.join(outDir, f);
          const dest = path.join(dir, f);
          if (fs.existsSync(src)) fs.copyFileSync(src, dest);
        });
        console.log(`📦 Synced build to: ${dir}`);
      } catch (err) {
        console.warn(`⚠️ Could not sync to ${dir}:`, err.message);
      }
    }

    // Verify package asset integrity before archiving
    function verifyPackageIntegrity(dir) {
      const htmlFiles = ['widget.html', 'offscreen.html'];
      for (const htmlFile of htmlFiles) {
        const filePath = path.join(dir, htmlFile);
        if (!fs.existsSync(filePath)) continue;
        const content = fs.readFileSync(filePath, 'utf8');
        const srcMatches = [...content.matchAll(/<(?:script|img)\s+[^>]*src=["']([^"']+)["']/gi)];
        const linkMatches = [...content.matchAll(/<link\s+[^>]*href=["']([^"']+)["']/gi)];
        for (const match of [...srcMatches, ...linkMatches]) {
          const ref = match[1];
          if (ref.startsWith('http://') || ref.startsWith('https://') || ref.startsWith('//') || ref.startsWith('data:')) continue;
          const resolved = path.join(dir, ref);
          if (!fs.existsSync(resolved)) {
            throw new Error(`Integrity check failed: ${htmlFile} references "${ref}", but it does not exist in ${dir}`);
          }
        }
      }
      console.log(`✅ Asset integrity verified for ${dir}`);
    }

    try {
      verifyPackageIntegrity(desktopDir);
    } catch (checkErr) {
      console.error('❌ Package integrity failure:', checkErr.message);
      process.exit(1);
    }

    // Auto-package into fresh zip files for distribution
    try {
      const { execSync } = await import('node:child_process');
      const zipCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${desktopDir}\\*' -DestinationPath 'C:\\Users\\senti\\OneDrive\\Desktop\\annotated-v${version}.zip' -Force; Copy-Item 'C:\\Users\\senti\\OneDrive\\Desktop\\annotated-v${version}.zip' -Destination 'C:\\Users\\senti\\OneDrive\\Desktop\\annotated-extension.zip' -Force; Copy-Item 'C:\\Users\\senti\\OneDrive\\Desktop\\annotated-v${version}.zip' -Destination 'C:\\Users\\senti\\OneDrive\\Desktop\\annotated.zip' -Force; Copy-Item 'C:\\Users\\senti\\OneDrive\\Desktop\\annotated-v${version}.zip' -Destination 'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\annotated-extension-v${version}.zip' -Force; if (Test-Path 'C:\\Users\\senti\\Desktop') { Copy-Item 'C:\\Users\\senti\\OneDrive\\Desktop\\annotated-v${version}.zip' -Destination 'C:\\Users\\senti\\Desktop\\annotated-v${version}.zip' -Force; Copy-Item 'C:\\Users\\senti\\OneDrive\\Desktop\\annotated-v${version}.zip' -Destination 'C:\\Users\\senti\\Desktop\\annotated.zip' -Force }"`;
      execSync(zipCmd);
      console.log(`🗜️  Generated fresh zip: C:\\Users\\senti\\OneDrive\\Desktop\\annotated-v${version}.zip`);
    } catch (zipErr) {
      console.warn('⚠️ Could not generate zip:', zipErr.message);
    }

    console.log(`✨ Build completed in ${Date.now() - startTime}ms`);
  }
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
