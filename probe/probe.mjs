// 14 Nov (3): the live site opened in the runner's Chrome, as a person would (not marked as a robot), while the stats
// server's live log runs: does the page send its visit, and does the server get it? The runner is a cloud network, so
// the server keeps it apart from real visits. Was: the stats server's live log for 8 minutes while the owner opens the site, to see why their visits aren't
// counted. Printed per message: outcome, the server's own log lines and errors, the message's kind, whether the Origin
// is the site, the browser family, NZ or not, and whether the network is on the cloud list. No addresses, headers,
// networks or stats are printed
import { spawn } from 'node:child_process';
const DC = new Set([8075, 16509, 14618, 15169, 396982, 19527, 14061, 24940, 213230, 16276, 63949, 20473, 31898, 45102, 132203, 9009, 212238, 60068, 51167, 12876, 60781, 28753, 30633, 36352, 8100, 8560, 47583, 40676, 21859]);
const t = spawn('npx', ['--yes', 'wrangler@4.147.0', 'tail', 'kickoff-api', '--format', 'json'], { cwd: '/tmp', env: process.env, detached: true });
let out = '';
t.stdout.on('data', d => { out += d; }); t.stderr.on('data', () => {});
await new Promise(r => setTimeout(r, 40000));
const { chromium } = await import('playwright');
const b = await chromium.launch({ channel: 'chrome' });
for (const [label, ctxOpts] of [['desktop', {}], ['phone', { viewport: { width: 412, height: 900 }, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', isMobile: true, hasTouch: true }]]) {
  const ctx = await b.newContext(ctxOpts), p = await ctx.newPage();
  await p.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  const seen = [];
  p.on('request', r => { if (/workers\.dev/.test(r.url())) seen.push(`sent ${r.method()} ${new URL(r.url()).pathname} (${(r.postData() || '').length} bytes)`); });
  p.on('requestfinished', async r => { if (/workers\.dev/.test(r.url())) { const res = await r.response(); seen.push(`answered ${res ? res.status() : '?'} ${new URL(r.url()).pathname}`); } });
  p.on('requestfailed', r => { if (/workers\.dev/.test(r.url())) seen.push(`failed ${new URL(r.url()).pathname}: ${r.failure()?.errorText}`); });
  p.on('console', m => { if (m.type() === 'error') seen.push('console error: ' + m.text().slice(0, 200)); });
  p.on('pageerror', e => seen.push('page error: ' + e.message.slice(0, 200)));
  await p.goto('https://kickoff.kiwi/', { waitUntil: 'load' });
  await p.waitForTimeout(8000);
  const st = await p.evaluate(() => ({ v: document.querySelector('.ver, #ver')?.textContent || '', nocount: localStorage.getItem('sf.nocount'), wd: navigator.webdriver, host: location.hostname, beacon: typeof navigator.sendBeacon }));
  console.log(label, JSON.stringify(st)); for (const x of seen) console.log('  ', x);
  await ctx.close();
}
await b.close();
await new Promise(r => setTimeout(r, 25000));
try { process.kill(-t.pid, 'SIGKILL'); } catch {}

const evs = []; let depth = 0, start = -1, str = false, esc = false;
for (let i = 0; i < out.length; i++) { const c = out[i];
  if (str) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') str = false; continue; }
  if (c === '"') str = true; else if (c === '{') { if (!depth++) start = i; } else if (c === '}') { if (!--depth && start >= 0) { try { evs.push(JSON.parse(out.slice(start, i + 1))); } catch {} } } }
console.log('TAIL3 events seen:', evs.length);
const fam = ua => /SamsungBrowser/.test(ua) ? 'Samsung' : /Edg/.test(ua) ? 'Edge' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /iPhone|iPad/.test(ua) ? 'iOS Safari/app' : /Safari\//.test(ua) ? 'Safari' : 'other';
for (const e of evs) {
  const q = e.event?.request || {}, h = q.headers || {}, cf = q.cf || {};
  let path = '?'; try { path = new URL(q.url).pathname; } catch { if (e.event?.cron) path = 'cron'; }
  if (path === 'cron') continue;
  console.log(e.eventTimestamp ? new Date(e.eventTimestamp).toISOString().slice(11, 19) : '', path, q.method || '', '| outcome', e.outcome, '| origin is site:', /^https:\/\/(www\.)?kickoff\.kiwi$/.test(h.origin || ''), h.origin ? '' : '(no origin)', '| length', h['content-length'] || '-', '|', fam(h['user-agent'] || ''), '| NZ:', cf.country === 'NZ', '| cloud list:', DC.has(cf.asn), '| logs', JSON.stringify((e.logs || []).map(l => String(l.message).slice(0, 200))), '| errors', JSON.stringify((e.exceptions || []).map(x => `${x.name}: ${x.message}`)).slice(0, 300));
}
process.exit(0);
