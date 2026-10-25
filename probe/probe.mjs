// probe 200: the World Cup's New Zealand games on Wikipedia (kick-off times), and the live feed's times for them
import fs from 'fs';
const L = [];
const api = t => `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(t)}&prop=wikitext&format=json&formatversion=2&redirects=1`;
for (const t of ["2026 Women's Rugby League World Cup", '2026 Rugby League World Cup', "2026 Women's Rugby League World Cup group stage", '2026 Rugby League World Cup group stage']) {
  try { const j = await (await fetch(api(t), { headers: { 'user-agent': 'KickoffKiwi probe (https://kickoff.kiwi)' } })).json(); const w = j.parse?.wikitext || '';
    L.push(`== ${t}: ${w.length} chars ${j.error ? j.error.info : ''}`);
    // each match box naming New Zealand (or the Kiwi Ferns / Kiwis): its date, time and teams lines
    const boxes = w.split(/\{\{\s*(?:Rugby league match|rugbyleaguebox|Rugby league box|footballbox)/i).slice(1);
    for (const b of boxes) { const body = b.slice(0, 1500); if (!/New Zealand|NZL|Kiwi/i.test(body.slice(0, 600))) continue;
      L.push('  ' + body.split('\n').filter(l => /^\s*\|\s*(date|time|team1|team2|home|away|stadium|location)\s*=/i.test(l)).map(l => l.trim()).join(' ')); }
  } catch (e) { L.push(`${t} ERR ${e.message}`); }
}
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
for (const e of f.events.filter(e => /^rlwc/.test(e.id) && /New Zealand/.test(e.home + e.away))) L.push(`feed ${e.id} ${e.startUTC} src=${(e.source || '').slice(0, 70)}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
