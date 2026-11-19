// daily check, 20 Nov: the live feed's age, checks, TV gaps, Tauihi cards, hand-kept games against their TV listings. No results printed.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
const get = async u => { const r = await fetch(u + '?t=' + Date.now(), { headers: { 'user-agent': 'kickoff-probe' } }); return r.ok ? r.json() : (out.push(u + ' ' + r.status), null); };
try {
  const f = await get('https://kickoff.kiwi/data/feed.json'); const now = Date.now();
  out.push(`now ${new Date(now).toISOString()} | feed built ${f.generatedAt} (${Math.round((now - Date.parse(f.generatedAt)) / 6e4)} min ago) | site ${f.site?.version} | games ${f.events.length}`);
  for (const x of f.checks?.noResult || []) out.push(`noResult | ${x.c} | ${x.n} | ${x.at}${x.noSource ? ' | noSource' : ''}`);
  out.push('thinWeeks: ' + JSON.stringify(f.checks?.thinWeeks));
  for (const e of f.events.filter(e => e.team === 'tauihi')) out.push(`tauihi | ${e.id} | ${e.startUTC} | ${e.status} | ${e.stage || ''} | ${e.home} v ${e.away} | ${e.venue || ''}, ${e.city || ''} | has result ${!!e.score}`);
  const ids = ["wbbl-12-m26-hobart-hurricanes-v-perth-scorchers","wbbl-12-m27-brisbane-heat-v-sydney-thunder","wbbl-12-m28-adelaide-strikers-v-melbourne-renegades","wbbl-12-m29-hobart-hurricanes-v-sydney-thunder","wbbl-12-m30-sydney-sixers-v-perth-scorchers","wbbl-12-m31-brisbane-heat-v-adelaide-strikers","wbbl-12-m32-melbourne-stars-v-melbourne-renegades","ps-r1-1-2026","ps-r1-2-2026","ps-r1-3-2026","bc-ind-test1-2026","ss-nsw-qld-2026-11","bs-ind-centenary-1-2026","bs-ind-centenary-2-2026","bs-ind-centenary-3-2026","wmseries-2026-g2","wmseries-2026-g3","ab-eng-nz-2026-11-21"];
  for (const id of ids) { const e = f.events.find(e => e.id === id); if (!e) { out.push(`hand-kept | ${id} | NOT IN FEED`); continue; }
    out.push(`hand-kept | ${id} | ${e.startUTC} | ${e.status} | ${e.venue || ''} | tv: ${(e.tv || []).map(t => `${t.at} ${t.ch || ''}`).join(' ;; ') || 'none'} | has result ${!!e.score}`); }
  for (const e of f.events.filter(e => Date.parse(e.startUTC) < now - 5 * 36e5 && Date.parse(e.startUTC) > now - 48 * 36e5 && e.status !== 'final')) out.push(`not final | ${e.comp} | ${e.home} v ${e.away} | ${e.startUTC} | ${e.status} | ${e.id}`);
  const c = await get('https://kickoff.kiwi/data/coverage-detail.json');
  for (const g of c?.tvGaps?.nz || []) out.push(`tvGap | ${g.at} | ${g.ch} | ${String(g.t).slice(0, 90)} | ${String(g.d || '').replace(/\d+\s*[-–]\s*\d+/g, '#').slice(0, 140)}`);
} catch (e) { out.push('probe error: ' + String(e.stack || e).slice(0, 400)); }
