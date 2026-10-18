// Run the real build, then check every recent TheSportsDB game of the fill leagues against the feed's cards
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const t0 = Date.now();
let log = '';
try { log = execSync('node scripts/fetch.mjs', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { log = 'FAILED ' + e.message + '\n' + (e.stdout || '') + (e.stderr || ''); }
console.log(`fetch.mjs took ${Math.round((Date.now() - t0) / 1000)}s\n${log.trim().split('\n').slice(-4).join('\n')}`);
const f = JSON.parse(readFileSync('data/feed.json', 'utf8'));
console.log('\n== diag');
for (const [k, v] of Object.entries(f.diag)) if (/^tsdb|f1Times|^wikipedia$/.test(k)) console.log(k, '=>', JSON.stringify(v));
const cache = JSON.parse(readFileSync('.cache/tsdb-events.json', 'utf8'));
console.log('\n== fill cache');
for (const [k, v] of Object.entries(cache)) if (/^fill/.test(k)) console.log(k, (v.events || []).map(e => `${e.home} v ${e.away} ${e.startUTC} ${e.status} ${e.score || ''} r${e.tsdbRound}`).join(' | '), JSON.stringify(v.miss || {}));

// same matching rules as fetch.mjs
const DAY = 864e5;
const ALIAS = [[/all blacks|black ferns|kiwi ferns|\bkiwis\b|white ferns|black ?caps/gi, 'new zealand'], [/wallabies|kangaroos|jillaroos|wallaroos/gi, 'australia'], [/springboks/gi, 'south africa'], [/pumas/gi, 'argentina']];
const norm = s => ALIAS.reduce((t, [re, to]) => t.replace(re, to), s || '').toLowerCase().replace(/women|bulls|stags|storm|pride|mako|steamers|heartland|rugby|the /g, '').replace(/[^a-z]/g, '');
function sameMatch(a, b) {
  if (Math.abs(new Date(a.startUTC) - new Date(b.startUTC)) > (a.timeTBC || b.timeTBC ? 2 * DAY : 8 * 36e5)) return false;
  const A = [norm(a.home), norm(a.away)], B = [norm(b.home), norm(b.away)];
  return A.some(x => x && B.some(y => y && (x.includes(y) || y.includes(x))));
}
const WOMEN_KEYS = new Set(['blackferns', 'whiteferns', 'kiwiferns', 'fpc', 'wbbl']);
const isW = e => WOMEN_KEYS.has(e.team) || /women|wheelchair/i.test([e.comp, e.home, e.away].join(' '));
const same = (a, b) => a.team === b.team && isW(a) === isW(b) && sameMatch(a, b);
const side = (x, y) => { const a = norm(x), b = norm(y); return !!a && !!b && (a.includes(b) || b.includes(a)); };

const cfg = JSON.parse(readFileSync('data/wiki-pages.json', 'utf8')).thesportsdb.filter(l => l.fill);
console.log('\n== every TheSportsDB game of the fill leagues from 14 days back to 10 days ahead, against the feed cards');
await new Promise(r => setTimeout(r, 60000)); // let the rate limit recover after the build
const { tsdb, _fromTsdb } = await import('../scripts/sources.mjs'); // loaded now: its call budget starts at load
const plan = { 5806: [1, 2], 5278: [0], 5479: [0], 5852: [3, 4], 5807: [] };
for (const l of cfg) {
  for (const r of plan[l.id] || []) {
    let evs = [];
    try { evs = (await tsdb(`eventsround.php?id=${l.id}&r=${r}&s=2026`)).events || []; } catch (e) { console.log(l.comp, 'round', r, 'error', e.message); continue; }
    for (const ev of evs) {
      const t = _fromTsdb(ev, l);
      if (!t) { if (Math.abs(Date.parse(ev.strTimestamp + 'Z') - Date.now()) < 14 * DAY) console.log(`  [${l.comp}] ${ev.strEvent}: not one of ours (classify)`); continue; }
      if (Date.now() - Date.parse(t.startUTC) > 14 * DAY || Date.parse(t.startUTC) - Date.now() > 10 * DAY) continue;
      const hits = f.events.filter(e => same(e, t));
      const desc = `[${l.comp}] ${t.home} v ${t.away} ${t.startUTC.slice(0, 16)} ${t.status} ${t.score || ''} (team ${t.team})`;
      if (!hits.length) { console.log(`  ${desc}\n      -> NO CARD`); continue; }
      for (const h of hits) {
        const flip = (side(t.home, h.away) && !side(t.home, h.home)) || (side(t.away, h.home) && !side(t.away, h.away));
        const ts = t.score && (flip ? t.score.split('-').reverse().join('-') : t.score);
        const agree = !t.score || !h.score ? '' : ts === h.score ? 'score agrees' : `SCORE DIFFERS (tsdb as card ${ts})`;
        const dt = Math.round((Date.parse(h.startUTC) - Date.parse(t.startUTC)) / 6e4);
        console.log(`  ${desc}\n      -> ${h.id} | ${h.comp} | ${h.home} v ${h.away} ${h.startUTC.slice(0, 16)}${h.timeTBC ? ' TBC' : ''} (${dt ? `${dt} min off` : 'same time'}) ${h.status} ${h.score || ''} ${agree}${flip ? ' [sides swapped]' : ''}`);
      }
      if (hits.length > 1) console.log('      !! matches more than one card');
    }
  }
}
console.log('\n== cards changed vs the live site');
try {
  const live = await (await fetch('https://7n1k7.github.io/sports-feed/data/feed.json?v=' + Date.now())).json();
  const L = new Map(live.events.map(e => [e.id, e]));
  console.log('live generatedAt', live.generatedAt, 'tsdbFilled there:', JSON.stringify(live.diag.tsdbFilled));
  for (const e of f.events) { const o = L.get(e.id); if (!o) { if (/rugby|league/.test(e.sport)) console.log('  new card', e.id, e.home, 'v', e.away); continue; } if (o.score !== e.score || o.startUTC !== e.startUTC) console.log('  ', e.id, `${o.score || '-'} -> ${e.score || '-'}`, `${o.startUTC} -> ${e.startUTC}`); }
  for (const o of live.events) if (!f.events.some(e => e.id === o.id) && /rugby|league/.test(o.sport)) console.log('  card gone', o.id);
} catch (e) { console.log('live feed error', e.message); }
