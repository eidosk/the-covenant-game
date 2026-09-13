#!/usr/bin/env node
// Dev-only size-check tool: minifies index.html into index_lite.html and reports its zipped
// size against the 13312-byte (13KB) js13k-style budget (see CLAUDE.md). Never referenced by
// index.html itself and not a dependency of the shipped game — run by hand: `node build.js`.
const fs = require('fs');
const { execFileSync } = require('child_process');

const src = fs.readFileSync('index.html', 'utf8');
const styleBody = src.match(/<style>([\s\S]*?)<\/style>/)[1];
const scriptBody = src.match(/<script>([\s\S]*?)<\/script>/)[1];

const minCss = styleBody.replace(/\s+/g, ' ').replace(/;\s*}/g, '}').trim();

const tmpFile = '.tmp_build_body.js';
fs.writeFileSync(tmpFile, scriptBody);
let minJs;
try {
  // toplevel: index.html's script has no module/IIFE wrapper, so almost everything (every
  // top-level function/const) lives in top scope — without `toplevel` on both compress and
  // mangle, terser leaves those names full-length and unshortened (a ~6.6KB miss, measured).
  minJs = execFileSync(
    'npx',
    ['--yes', 'terser', tmpFile, '--compress', 'passes=3,toplevel', '--mangle', 'toplevel'],
    { encoding: 'utf8', shell: true, maxBuffer: 10 * 1024 * 1024 }
  );
} finally {
  fs.unlinkSync(tmpFile);
}

const out = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Unicorn & Rainbow</title><style>${minCss}</style></head><body><canvas id="c" width="1024" height="576"></canvas><script>${minJs}</script></body></html>`;

fs.writeFileSync('index_lite.html', out);

// live PNG assets the minified HTML actually references at runtime (excludes clouds.png, which
// CLAUDE.md notes is unused leftover) — a real js13k-style zip has to ship these too.
const assets = [...scriptBody.matchAll(/\.src\s*=\s*'([^']+\.png)'/g)].map(m => m[1]);

// quantize to an 8-bit palette for the shipped zip only — source PNGs on disk are left full
// quality/RGBA for editing; these copies live in a throwaway build dir, never committed.
const buildDir = '.build_tmp';
if (fs.existsSync(buildDir)) fs.rmSync(buildDir, { recursive: true });
fs.mkdirSync(buildDir);
fs.copyFileSync('index_lite.html', `${buildDir}/index_lite.html`);
for (const asset of assets) {
  execFileSync(
    'npx',
    ['--yes', 'pngquant-bin', '--force', '--quality=80-100', '--output', `${buildDir}/${asset}`, asset],
    { shell: true, stdio: 'inherit' }
  );
}

const zipPath = 'index_lite.zip';
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
execFileSync(
  'powershell',
  ['-NoProfile', '-Command', `Compress-Archive -Path "${buildDir}\\*" -DestinationPath ${zipPath} -Force`],
  { stdio: 'inherit', shell: true }
);
fs.rmSync(buildDir, { recursive: true });

const rawSize = Buffer.byteLength(out);
const zipSize = fs.statSync(zipPath).size;
const BUDGET = 13312; // 13 * 1024

console.log(`index_lite.html: ${rawSize} bytes raw`);
console.log(`assets zipped alongside it: ${assets.join(', ')}`);
console.log(`index_lite.zip:  ${zipSize} bytes zipped (budget ${BUDGET})`);
console.log(
  zipSize > BUDGET
    ? `OVER budget by ${zipSize - BUDGET} bytes`
    : `under budget by ${BUDGET - zipSize} bytes`
);
