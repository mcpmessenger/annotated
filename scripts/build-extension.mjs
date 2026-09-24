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
const desktopDir = 'C:\\Users\\senti\\OneDrive\\Desktop\\annotated-v2.2.0';

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
  console.log('🚀 Building Annotated Chrome Extension v2.2.0 with esbuild...');
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
      'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\annotated-extension-unpacked',
      'C:\\Users\\senti\\OneDrive\\Desktop\\Extensions\\Annotated\\annotated-extension-w-logos',
    ];

    for (const dir of targetDirs) {
      try {
        if (fs.existsSync(dir)) {
          copyStaticAssets(dir);
          ['background.js', 'content.js', 'widget.js'].forEach((f) => {
            const src = path.join(outDir, f);
            const dest = path.join(dir, f);
            if (fs.existsSync(src)) fs.copyFileSync(src, dest);
          });
          console.log(`📦 Synced build to: ${dir}`);
        }
      } catch (err) {
        console.warn(`⚠️ Could not sync to ${dir}:`, err.message);
      }
    }

    console.log(`✨ Build completed in ${Date.now() - startTime}ms`);
  }
}

build().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
