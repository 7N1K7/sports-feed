// probe 215: where full Supercars race results could come from: each finished 2026 round's report page on Wikipedia
// (its headings, and each table's heading, header row and row count), and TheSportsDB's round (strResult lines)
import fs from 'fs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const rounds = f.events.filter(e => e.team === 'supercars' && /^supercars-2026-\d+$/.test(e.id)).sort((a, b) => a.startUTC.localeCompare(b.startUTC));
L.push(`${rounds.length} rounds: ` + rounds.map(e => `${e.round} ${e.home} ${e.status} link=${e.link ? decodeURIComponent(e.link.split('/wiki/')[1]) : '-'}`).join(' | '));
for (const e of rounds.filter(e => e.status === 'final').slice(-4)) {
  if (!e.link) continue;
  const title = decodeURIComponent(e.link.split('/wiki/')[1]).replace(/_/g, ' ');
  const r = await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent(title)}`, { headers: ua })).json();
  const w = String(r.parse?.wikitext || '').replace(/<!--[\s\S]*?-->/g, '');
  L.push(`\n== ${title}: ${w.length} chars; headings: ${[...w.matchAll(/^(={2,4})\s*(.+?)\s*\1\s*$/gm)].map(m => m[1].length + ':' + m[2]).join(' / ')}`);
  for (const m of w.matchAll(/\{\|[\s\S]*?\n\|\}/g)) {
    const before = w.slice(0, m.index), h = [...before.matchAll(/^(={2,4})\s*(.+?)\s*\1\s*$/gm)].pop()?.[2] || '-';
    const rows = m[0].split(/\n\|-/).length - 1, head = (m[0].match(/\n!([^\n]*(\n![^\n]*)*)/) || [''])[0].replace(/\s+/g, ' ').slice(0, 220);
    L.push(`  table under "${h}": ${rows} rows | ${head}`);
  }
}
for (const r of rounds.filter(e => e.status === 'final').slice(-2)) {
  const n = r.id.split('-')[2];
  const d = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4489&r=${n}&s=2026`, { headers: ua })).json();
  for (const ev of d.events || []) L.push(`tsdb r${n}: ${ev.strEvent} | ${ev.strTimestamp} | result lines ${String(ev.strResult || '').split('\n').filter(x => /^\s*\d+\.?\s/.test(x)).length} ${JSON.stringify(String(ev.strResult || '').slice(0, 120))}`);
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
