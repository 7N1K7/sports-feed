// after v794: Tauihi cards without the repeats
import { writeFileSync } from 'node:fs';
const out = [], log = s => { out.push(s); };
process.on('exit', () => { try { writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n') + '\n'); } catch {} });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let f = null;
for (let i = 0; i < 44; i++) {
  try { f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); } catch { f = null; }
  if (f && Date.parse(f.generatedAt) > Date.parse('2026-11-18T01:22:00Z') && /kept/.test(f.diag?.tauihi || '') && !/10 kept/.test(f.diag.tauihi)) break;
  await sleep(15000);
}
if (!f) { log('no feed'); process.exit(0); }
const nz = t => new Date(t).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
log(`FEED ${f.generatedAt} events ${f.events.length}`); log('DIAG tauihi: ' + f.diag?.tauihi);
for (const e of f.events.filter(e => e.team === 'tauihi')) log(`  ${e.comp} · ${e.stage} | ${e.home} v ${e.away} | ${nz(e.startUTC)} | ${e.venue}, ${e.city} | tv:${(e.tv || []).map(x => x.ch + '@' + nz(x.at)).join(',') || '-'}`);
log('PHX next: ' + f.events.filter(e => e.team === 'phoenixw' && e.status !== 'final').slice(0, 1).map(e => `${e.home} v ${e.away} | ${nz(e.startUTC)} | ${e.venue}`).join(''));
log('CHECKS noResult: ' + (f.checks?.noResult || []).map(c => `${c.c}: ${c.n} (${String(c.at).slice(0, 10)})${c.noSource ? ' no source' : ''}`).join(' ; ').slice(0, 900));
