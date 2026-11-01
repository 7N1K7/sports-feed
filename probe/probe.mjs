// probe 241: the UFC event's date: the live feed, TheSportsDB and Wikipedia
import fs from 'fs';
const L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
fs.writeFileSync(new URL('./out-feed.json', import.meta.url), JSON.stringify(f));
L.push(`feed ${f.generatedAt}`);
const now = Date.now();
for (const e of f.events.filter(e => /mma|boxing/.test(e.sport) && Math.abs(Date.parse(e.startUTC) - now) < 6 * 864e5)) {
  L.push(`${e.id} | ${e.comp} | ${e.home} v ${e.away} | start ${e.startUTC} open ${e.openUTC || '-'} tbc ${e.timeTBC} | ${e.status} | ${e.source}`);
  L.push('  card: ' + [...new Set((e.card || []).map(c => c.section))].join(' / '));
  const m = /^tsdb-(\d+)$/.exec(e.id);
  if (m) { try { const j = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/lookupevent.php?id=${m[1]}`)).json(); const x = j.events?.[0] || {}; L.push(`  tsdb: ${x.strEvent} | dateEvent ${x.dateEvent} time ${x.strTime} | timestamp ${x.strTimestamp} | local ${x.dateEventLocal} ${x.strTimeLocal} | venue ${x.strVenue} ${x.strCity}`); } catch (err) { L.push('  tsdb err ' + err.message); } }
  if (/wikipedia/.test(e.source || '')) { try { const t = decodeURIComponent(e.source.split('/wiki/')[1]); const w = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(t)}&prop=wikitext&format=json&formatversion=2&section=0`, { headers: { 'user-agent': 'kickoff.kiwi probe' } })).json(); const wt = w.parse?.wikitext || ''; L.push('  wiki: ' + (wt.match(/\|\s*(date|venue|city)\s*=[^\n]*/g) || []).join(' ; ')); } catch (err) { L.push('  wiki err ' + err.message); } }
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
