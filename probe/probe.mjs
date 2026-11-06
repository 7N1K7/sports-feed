import { writeFileSync } from 'fs';
// daily check: A-League Men's round 6 (a thin week flagged for 23 Nov) in TheSportsDB and on Wikipedia
const out = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const r of [5, 6, 7]) {
  const j = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4356&r=${r}&s=2026-2027`)).json().catch(() => ({}));
  out.push(`TSDB round ${r}: ${(j.events || []).map(e => `${e.dateEvent} ${e.strTime} ${e.strEvent}`).join(' | ') || 'none'}`);
  await sleep(7000);
}
const w = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=2026%E2%80%9327_A-League_Men&prop=wikitext&format=json&formatversion=2', { headers: { 'User-Agent': 'kickoff-kiwi-probe/1.0' } })).json().catch(e => ({ error: String(e) }));
const t = w.parse?.wikitext || '';
out.push(`Wikipedia: ${t.length} chars; mentions of round 6: ${(t.match(/[Rr]ound 6[^\n]{0,200}/g) || []).slice(0, 5).join(' || ')}`);
out.push(`Wikipedia FIFA/break: ${(t.match(/[^\n]{0,160}(FIFA|international break|bye|Unite Round|split)[^\n]{0,160}/g) || []).slice(0, 6).join(' || ')}`);
writeFileSync('probe/out.txt', 'daily1107b\n' + out.join('\n') + '\n');
