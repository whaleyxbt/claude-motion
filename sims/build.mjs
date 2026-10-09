#!/usr/bin/env node
// Bundles every sims/<name>/main.js into one self-contained HTML file:
// sims/dist/<name>.html (three.js, fonts, CSS inlined). Opens from file://,
// works offline, can be published as-is.
//
//   node sims/build.mjs            all sims
//   node sims/build.mjs topology   one sim
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DIST = path.join(HERE, 'dist');
fs.mkdirSync(DIST, {recursive: true});

const font = (weight) => {
  const file = path.join(
    ROOT,
    `node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${weight}-normal.woff2`,
  );
  const b64 = fs.readFileSync(file).toString('base64');
  return `@font-face{font-family:'JetBrains Mono';font-weight:${weight};font-style:normal;font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
};
const inter = fs.readFileSync(path.join(ROOT, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).toString('base64');
const FONTS = [400, 600, 700].map(font).join('\n') +
  `\n@font-face{font-family:'Inter';font-weight:100 900;font-style:normal;font-display:block;src:url(data:font/woff2;base64,${inter}) format('woff2');}`;
const KIT_CSS = fs.readFileSync(path.join(HERE, 'kit/style.css'), 'utf8');

const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs
      .readdirSync(HERE)
      .filter((d) => fs.existsSync(path.join(HERE, d, 'main.js')));

for (const name of names) {
  const dir = path.join(HERE, name);
  const t0 = Date.now();
  const res = await esbuild.build({
    entryPoints: [path.join(dir, 'main.js')],
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    target: 'es2022',
    legalComments: 'none',
    logLevel: 'warning',
  });
  const js = res.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
  const css = fs.existsSync(path.join(dir, 'style.css')) ? fs.readFileSync(path.join(dir, 'style.css'), 'utf8') : '';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${name}</title>
<style>
${FONTS}
${KIT_CSS}
${css}
</style>
</head>
<body>
<div id="app"></div>
<script type="module">
${js}
</script>
</body>
</html>
`;
  const out = path.join(DIST, `${name}.html`);
  fs.writeFileSync(out, html);
  console.log(`${path.relative(ROOT, out)}  ${(html.length / 1024).toFixed(0)} KB  ${Date.now() - t0} ms`);
}
