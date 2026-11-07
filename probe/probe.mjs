// one3: ONE Championship cards whose year-page section only points to their own article ({{Main|ONE 173}}): read from
// that article. Prints names, dates, bout counts and yes/no only (no fighters, no results)
import { execSync } from 'child_process'; import { writeFileSync } from 'fs';
import { _oneFromYear, oneArticles, _oneCard, _templates, _params, _clean } from './one-src.mjs';
const out = ['one4 ' + new Date().toISOString()];
const UA = { 'User-Agent': 'kickoff.kiwi probe (https://kickoff.kiwi)' };
const CITY = { Bangkok: 'Asia/Bangkok', Tokyo: 'Asia/Tokyo', Yokohama: 'Asia/Tokyo', Japan: 'Asia/Tokyo', Thailand: 'Asia/Bangkok', Doha: 'Asia/Qatar', Lusail: 'Asia/Qatar', Qatar: 'Asia/Qatar', Singapore: 'Asia/Singapore', Denver: 'America/Denver', Kallang: 'Asia/Singapore' };
const get = async titles => {
  const res = {};
  for (let cont = {}, n = 0; cont && n < 6; n++) {
    const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.join('|')) + Object.entries(cont).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join(''), { headers: UA, signal: AbortSignal.timeout(30000) });
    const j = await r.json();
    const back = Object.fromEntries([...(j.query?.redirects || []), ...(j.query?.normalized || [])].map(x => [x.to, x.from]));
    for (const pg of j.query?.pages || []) { const text = pg.revisions?.[0]?.slots?.main?.content; if (!pg.missing && text) res[back[back[pg.title]] || back[pg.title] || pg.title] = { title: pg.title, text }; }
    cont = j.continue?.rvcontinue ? j.continue : null;
  }
  return res;
};
try {
  const arts = await get(['ONE 173', 'ONE Fight Night 37', 'ONE Fight Night 39']);
  for (const [t, a] of Object.entries(arts)) {
    const boxes = _templates(a.text, /^Infobox MMA event$/i), p = boxes[0] ? _params(boxes[0].body).named : {};
    const nm = String(p.name ?? '(none)'), cl = _clean(nm);
    out.push(`# ${t} (title ${a.title}): infoboxes ${boxes.length}; keys ${Object.keys(p).join(',')}; name raw starts ${JSON.stringify(nm.slice(0, t.length + 3))}; clean starts ${JSON.stringify(cl.slice(0, t.length + 3))}; date ${JSON.stringify(String(p.date || '').slice(0, 40))}; tables ${(a.text.match(/\n\{\|/g) || []).length}; card ${_oneCard(a.text).length}; headings ${[...a.text.matchAll(/^==+\s*([^=\n]+?)\s*==+\s*$/gm)].map(m => m[1]).join('/')}`);
  }
  const years = await get(['2025 in ONE Championship', '2026 in ONE Championship']);
  for (const [y, at] of [['2025', '2025-11-20T00:00:00Z'], ['2025', '2025-10-01T00:00:00Z'], ['2026', '2026-01-20T00:00:00Z'], ['2026', null]]) {
    const pg = years[`${y} in ONE Championship`];
    if (!pg) { out.push(`${y}: no page`); continue; }
    const real = Date.now; if (at) Date.now = () => Date.parse(at);
    const want = oneArticles(pg.text);
    Date.now = real;
    const arts = want.length ? await get(want) : {};
    if (at) Date.now = () => Date.parse(at);
    const evs = _oneFromYear(pg.text, n => CITY[n] || null, pg.title, arts);
    Date.now = real;
    out.push(`-- ${y} as at ${at || 'now'}: articles wanted ${want.length}, read ${Object.keys(arts).length}: ${want.map(t => `${t}${arts[t] ? (arts[t].title !== t ? ' (as ' + arts[t].title + ')' : '') + (/Infobox MMA event/i.test(arts[t].text) ? ' +infobox' : ' no infobox') : ' missing'}`).join('; ')}`);
    for (const e of evs) {
      const secs = [...new Set((e.card || []).map(b => b.section))].join('/');
      out.push(`  ${e.comp} | ${e.startUTC}${e.usual ? ' usual' : ''} | ${e.city} | bouts ${(e.card || []).length}${secs ? ' (' + secs + ')' : ''} | weights ${(e.card || []).filter(b => b.weight).length} | kiwi ${e.nzEvent ? 'yes' : 'no'} | own article ${/#/.test(e.source) ? 'no' : 'yes'}`);
    }
  }
} catch (e) { out.push('error ' + String(e.message).slice(0, 120)); }
writeFileSync('probe/out-one.txt', out.join('\n') + '\n');
try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-one.txt && git -c user.name=bot -c user.email=bot@x commit -q -m out', { stdio: 'pipe' }); } catch {}
for (let i = 0; i < 4; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch {} }
console.log(out.join('\n'));
