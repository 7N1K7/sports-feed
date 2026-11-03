// Before a build goes live: open the new site (the built index.html and its new feed) in Chrome, on a desktop and a
// phone-sized screen, and check its games get drawn. Exits 1 when they don't, so the deploy is skipped and the site
// that's live stays up. A problem with the check itself (no browser to hand) only warns, so it never holds back a good
// build. Writes what it saw to $CHECK_OUT (for the alert the workflow raises), and page errors as warnings
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { extname, join, resolve } from 'path';

const ROOT = resolve('.'), OUT = process.env.CHECK_OUT || '', HOST = 'http://localhost:8799';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.ics': 'text/calendar' };
const warn = m => console.log(`::warning::${m}`);

let chromium;
{ const req = createRequire(join(process.env.CHECK_DEPS || ROOT, 'x.js'));
  for (const m of ['playwright-core', 'playwright']) try { ({ chromium } = req(m)); break; } catch {} }
if (!chromium) { warn('Site check skipped: playwright-core is not installed'); process.exit(0); }
let browser;
try { browser = await chromium.launch(process.env.CHECK_CHROME ? { executablePath: process.env.CHECK_CHROME } : { channel: 'chrome' }); }
catch (e) { warn(`Site check skipped: Chrome would not start (${String(e.message).split('\n')[0]})`); process.exit(0); }

// one look at the site at one screen size: did the games get drawn, and what did the page say if not
async function look(width, height) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height } }), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e.message).split('\n')[0]));
  // the site's own files from this build; nothing from other sites (pictures, fonts, the stats server) is asked for
  await ctx.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.origin !== HOST) return route.abort();
    const f = join(ROOT, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
    if (!f.startsWith(ROOT + '/') || !existsSync(f)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ body: readFileSync(f), contentType: TYPES[extname(f)] || 'application/octet-stream' });
  });
  await ctx.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch {} });
  let drawn = false, note = '';
  try {
    await page.goto(HOST + '/', { timeout: 30000 });
    // the games drawn, or the page saying it couldn't (no need to wait out the time then)
    const shown = () => document.querySelector('#mockBar')?.hidden && document.querySelectorAll('.ev').length > 0;
    await page.waitForFunction(s => eval(s)() || /Could not|went wrong/.test(document.querySelector('#mockNote')?.textContent || ''), `(${shown})`, { timeout: 30000 });
    drawn = await page.evaluate(s => eval(s)(), `(${shown})`);
    if (!drawn) throw new Error('not drawn');
  } catch (e) {
    note = await page.evaluate(() => document.querySelector('#mockBar')?.hidden ? 'no games on the page' : `the page says "${document.querySelector('#mockNote')?.textContent || ''}"`).catch(() => String(e.message).split('\n')[0]);
  }
  const rows = await page.evaluate(() => document.querySelectorAll('.ev').length).catch(() => 0);
  await ctx.close();
  return { drawn, note, rows, errors: [...new Set(errors)] };
}

const failed = [];
for (const [name, w, h] of [['desktop', 1280, 900], ['phone', 412, 860]]) {
  // a second look before calling it broken, in case the first was a hiccup of the check's own
  let r = await look(w, h);
  if (!r.drawn) r = await look(w, h);
  for (const e of r.errors) warn(`Site check (${name}): page error: ${e}`);
  if (r.drawn) console.log(`Site check (${name}, ${w}px): ${r.rows} games drawn`);
  else failed.push(`On a ${name} screen (${w}px) the games weren't drawn: ${r.note}${r.errors.length ? `. Page errors: ${r.errors.join('; ')}` : ''}`);
}
await browser.close();
if (OUT) writeFileSync(OUT, failed.join('\n'));
if (failed.length) { for (const f of failed) console.log(`::error::${f}`); process.exit(1); }
