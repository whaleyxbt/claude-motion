import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {chromium} from 'playwright';

let browser;
let html;

before(async () => {
  const result = await build({
    stdin: {
      contents: `import {runSim} from './runtime.js';
        runSim({hud: {enabled: false}}, () => ({render() {}}));`,
      resolveDir: fileURLToPath(new URL('.', import.meta.url)),
    },
    bundle: true,
    write: false,
    format: 'iife',
  });
  html = `<div id="app"></div><script>${result.outputFiles[0].text}</script>`;
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
  });
});

after(async () => browser?.close());

async function openSim(t, config = {}, query = '', capture = true) {
  const page = await browser.newPage();
  t.after(() => page.close());
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('http://sim.test/**', (route) =>
    route.request().isNavigationRequest()
      ? route.fulfill({contentType: 'text/html', body: html})
      : route.abort(),
  );
  await page.addInitScript(({cfg, capture}) => {
    window.__CAPTURE = capture;
    window.__SIM_CONFIG = cfg;
  }, {cfg: config, capture});
  await page.goto(`http://sim.test/${query}`);
  await page.waitForFunction(() => window.SIM?.ready);
  assert.deepEqual(errors, []);
  return page;
}

const attack = '<img src=x onerror="window.__captionXss=true">';

test('URL config cannot override trusted config or supply HTML to sims', async (t) => {
  const queryConfig = {
    story: [{at: 0, end: 20, tag: attack}],
    director: {enabled: true},
    pages: [{html: attack}],
    title: attack,
    watermark: attack,
  };
  const encoded = Buffer.from(JSON.stringify(queryConfig)).toString('base64url');
  for (const mode of ['', 'capture&']) {
    const page = await openSim(t, {watermark: 'trusted'}, `?${mode}config=${encoded}`, false);
    assert.deepEqual(await page.evaluate(() => ({
      story: window.SIM.cfg.story,
      watermark: window.SIM.cfg.watermark,
      hasPages: 'pages' in window.SIM.cfg,
      hasTitle: 'title' in window.SIM.cfg,
    })), {story: [], watermark: 'trusted', hasPages: false, hasTitle: false});
  }
});

test('simple URL options still work', async (t) => {
  const page = await openSim(t, {}, '?title=Demo&accent=abcdef&seed=12&theme=light&duration=10&nodirector');
  assert.deepEqual(await page.evaluate(() => {
    const cfg = window.SIM.cfg;
    return [cfg.hud.title, cfg.accent, cfg.seed, cfg.theme, cfg.duration, cfg.director.enabled];
  }), ['Demo', '#abcdef', 12, 'light', 10, false]);
});

for (const field of ['tag', 'text']) {
  test(`story ${field} renders markup literally`, async (t) => {
    const value = `Hello ${attack} & < > " ' &lt; Привет`;
    const page = await openSim(t, {story: [{at: 0, end: 20, [field]: value}]});
    const selector = field === 'tag' ? '.cap-tag' : '.cap-main';
    assert.equal((await page.locator(selector).textContent()).trim(), value);
    assert.equal(await page.locator('.dir-story img, .dir-story script, .dir-story [onerror]').count(), 0);
    assert.equal(await page.evaluate(() => window.__captionXss), undefined);
  });
}

test('invalid caption kinds fall back to hero without adding attributes or elements', async (t) => {
  for (const kind of [`hero">${attack}<div class="`, 'hero extra', 'custom', null]) {
    const page = await openSim(t, {story: [{at: 0, end: 20, kind, text: 'Hello'}]});
    assert.equal(await page.locator('.cap').getAttribute('class'), 'cap hero');
    assert.equal(await page.locator('.dir-story img, .dir-story [onerror]').count(), 0);
    assert.equal(await page.evaluate(() => window.__captionXss), undefined);
  }
});

test('hero captions keep multi-word highlighting and plain text', async (t) => {
  const page = await openSim(t, {story: [{at: 0, end: 20, kind: 'hero', text: 'Hello *bright & bold* world'}]});
  assert.deepEqual(await page.locator('.w.hl').allTextContents(), ['bright', '&', 'bold']);
  assert.equal((await page.locator('.cap-main').textContent()).trim(), 'Hello bright & bold world');
});

test('numeric captions and subtitles still render as text', async (t) => {
  const page = await openSim(t, {story: [{
    at: 0, end: 20, kind: 'num', from: 0, to: 42, roll: 1,
    prefix: attack, suffix: ' & done', sub: attack,
  }]});
  await page.evaluate(() => window.SIM.render(10));
  assert.equal(await page.locator('.cap').getAttribute('class'), 'cap num');
  assert.equal(await page.locator('.n').textContent(), `${attack}42 & done`);
  assert.equal(await page.locator('.cap-sub').textContent(), attack);
  assert.equal(await page.locator('.dir-story img').count(), 0);
});
