// daily check, 19 Nov: the live feed's age, checks, TV gaps, Tauihi cards, hand-kept games against their TV listings. No results printed.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
const get = async u => { const r = await fetch(u + '?t=' + Date.now(), { headers: { 'user-agent': 'kickoff-probe' } }); out.push(`${u} ${r.status} last-modified ${r.headers.get('last-modified')}`); return r.ok ? r.json() : null; };
try {
  const f = await get('https://kickoff.kiwi/data/feed.json');
  const now = Date.now();
  out.push(`now ${new Date(now).toISOString()} | feed built ${f.generatedAt} (${Math.round((now - Date.parse(f.generatedAt)) / 6e4)} min ago) | site ${f.site?.version} | games ${f.events.length}`);
  const strip = x => JSON.stringify(x, (k, v) => /score|result/i.test(k) && k !== 'noResult' ? undefined : v);
  out.push('checks.noResult: ' + strip(f.checks?.noResult).slice(0, 3000));
  out.push('checks.thinWeeks: ' + strip(f.checks?.thinWeeks).slice(0, 2000));
  out.push('other check keys: ' + Object.keys(f.checks || {}).join(','));
  for (const e of f.events.filter(e => e.team === 'tauihi')) out.push(`tauihi | ${e.id} | ${e.startUTC} | ${e.status} | ${e.stage || ''} | ${e.home} v ${e.away} | ${e.venue || ''}, ${e.city || ''} | has result ${!!e.score}`);
  const ids = ['wbbl-12-m26-hobart-hurricanes-v-perth-scorchers','wbbl-12-m27-brisbane-heat-v-sydney-thunder','wbbl-12-m28-adelaide-strikers-v-melbourne-renegades','wbbl-12-m29-hobart-hurricanes-v-sydney-thunder','wbbl-12-m30-sydney-sixers-v-perth-scorchers','g-fundora-zapotoczna-2026-11-20','ps-r1-1-2026','ps-r1-2-2026','ps-r1-3-2026','bc-ind-test1-2026','bs-ind-centenary-1-2026','bs-ind-centenary-2-2026','wmseries-2026-g2','wmseries-2026-g3','ab-eng-nz-2026-11-21','wbbl-12-m25-adelaide-strikers-v-sydney-sixers'];
  for (const id of ids) { const e = f.events.find(e => e.id === id); if (!e) { out.push(`hand-kept | ${id} | NOT IN FEED`); continue; }
    out.push(`hand-kept | ${id} | ${e.startUTC} | ${e.status} | ${e.venue || ''} | watch: ${e.broadcast || ''} | tv: ${(e.tv || []).map(t => `${t.at} ${t.ch || t.channel || ''} "${String(t.title || '').slice(0, 50)}" ${String(t.desc || t.text || '').replace(/\d+\s*[-–]\s*\d+/g, '#').slice(0, 110)}`).join(' ;; ') || 'none'} | has result ${!!e.score}`); }
  const c = await get('https://kickoff.kiwi/data/coverage-detail.json');
  out.push('tvGaps.nz: ' + JSON.stringify(c?.tvGaps?.nz || null).replace(/\d+\s*[-–]\s*\d+/g, '#').slice(0, 6000));
} catch (e) { out.push('probe error: ' + String(e.stack || e).slice(0, 400)); }
