// after v793: the new teams in the live feed, and what the feed's bytes are made of (sizes only)
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const out = [], log = s => { out.push(s); };
process.on('exit', () => { try { writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n') + '\n'); } catch {} });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let txt = '', f = null;
for (let i = 0; i < 40; i++) {
  try { txt = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).text(); f = JSON.parse(txt); } catch { f = null; }
  if (f && (f.events || []).some(e => e.team === 'phoenixw') && f.diag?.tauihi) break;
  await sleep(15000);
}
if (!f) { log('no feed'); process.exit(0); }
log(`FEED ${f.generatedAt} v${f.version || ''} events ${f.events.length}`);
log('DIAG tauihi: ' + f.diag?.tauihi);
const nz = t => new Date(t).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
for (const e of f.events.filter(e => e.team === 'phoenixw' || e.team === 'tauihi' || (e.comp === 'A-League Women'))) log(`  ${e.team} | ${e.comp}${e.stage ? ' · ' + e.stage : ''} | ${e.home} v ${e.away} | ${nz(e.startUTC)}${e.timeTBC ? ' TBC' : ''} | ${e.venue}, ${e.city} | ${e.status}${e.score ? ' (has result)' : ''} | ${e.broadcast || '-'} | tv:${(e.tv || []).map(x => x.ch + '@' + nz(x.at) + (x.delayed ? ' delayed' : '')).join(',') || '-'} | logos:${e.homeLogo ? 'y' : 'n'}${e.awayLogo ? 'y' : 'n'}`);
log('DIAG tvGaps: ' + String(f.diag?.tvGaps || '').slice(0, 600));
log('DIAG faces: ' + f.diag?.faces);
const box = f.events.filter(e => e.sport === 'boxing' && e.card?.length === 1 && Date.parse(e.startUTC) > Date.now());
log('BOXING one-fight cards: ' + box.map(e => `${e.home} v ${e.away}: night ${e.homeLogo ? 'y' : 'n'}${e.awayLogo ? 'y' : 'n'} fight ${e.card[0].aImg ? 'y' : 'n'}${e.card[0].bImg ? 'y' : 'n'}`).join(' ; '));
// sizes
const gz = s => gzipSync(Buffer.from(s)).length, kb = n => (n / 1024).toFixed(0) + 'kB';
log(`SIZE feed.json ${kb(txt.length)} raw, ${kb(gz(txt))} gzipped`);
log('SIZE top-level: ' + Object.entries(f).map(([k, v]) => [k, JSON.stringify(v).length]).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, n]) => `${k} ${kb(n)}`).join(', '));
const by = {}; for (const e of f.events) for (const [k, v] of Object.entries(e)) by[k] = (by[k] || 0) + JSON.stringify(v).length + k.length + 4;
log('SIZE event fields: ' + Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 22).map(([k, n]) => `${k} ${kb(n)}`).join(', '));
const noBig = JSON.stringify({ ...f, events: f.events.map(({ squads, card, sessions, ...e }) => e) });
log(`SIZE without events' squads, card, sessions: ${kb(noBig.length)} raw, ${kb(gz(noBig))} gzipped`);
const past = f.events.filter(e => Date.parse(e.startUTC) < Date.now() - 2 * 864e5), far = f.events.filter(e => Date.parse(e.startUTC) > Date.now() + 30 * 864e5);
log(`SIZE events older than 2 days: ${past.length} (${kb(JSON.stringify(past).length)}); more than 30 days ahead: ${far.length} (${kb(JSON.stringify(far).length)})`);
for (const k of ['squads', 'card', 'sessions']) { const w = f.events.filter(e => e[k]); log(`SIZE ${k}: on ${w.length} events; past ${w.filter(e => Date.parse(e.startUTC) < Date.now() - 2 * 864e5).length}, within 7 days ${w.filter(e => Math.abs(Date.parse(e.startUTC) - Date.now()) < 7 * 864e5).length}, further ahead ${w.filter(e => Date.parse(e.startUTC) > Date.now() + 7 * 864e5).length}`); }
try { const r = await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { headers: { 'accept-encoding': 'gzip, br' } }); log('HEADERS content-encoding: ' + r.headers.get('content-encoding') + ' | cache-control: ' + r.headers.get('cache-control') + ' | content-length: ' + r.headers.get('content-length')); } catch {}
try { const h = await (await fetch('https://kickoff.kiwi/index.html?x=' + Date.now())).text(); log(`SIZE index.html ${kb(h.length)} raw, ${kb(gz(h))} gzipped`); } catch {}
