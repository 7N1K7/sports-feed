// probe 216: the raw shapes of Supercars race tables (report pages), the season page's calendar and summary rows,
// and TheSportsDB's strResult (incl. its non-finishers)
import fs from 'fs';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const wt = async t => String((await (await fetch(`https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=parse&prop=wikitext&redirects=1&page=${encodeURIComponent(t)}`, { headers: ua })).json()).parse?.wikitext || '').replace(/<!--[\s\S]*?-->/g, '');
const raceTable = (w, h) => { const i = w.search(new RegExp(`^===\\s*${h}\\s*===\\s*$`, 'm')); if (i < 0) return '(no heading)'; const a = w.indexOf('{|', i), b = w.indexOf('\n|}', a); return w.slice(a, b + 3); };
for (const [t, h] of [['2026 Gold Coast 500', 'Race 1'], ['2026 Bathurst 1000', 'Race']]) {
  const tb = raceTable(await wt(t), h), rows = tb.split(/\n\|-[^\n]*/);
  L.push(`\n== ${t} / ${h}: ${rows.length} chunks\n--- head:\n${rows[0].slice(0, 900)}\n--- rows 1-2:\n${rows.slice(1, 3).join('\n|-\n')}\n--- last 4:\n${rows.slice(-4).join('\n|-\n')}`);
}
const sp = await wt('2026 Supercars Championship');
const sec = re => { const i = sp.search(re); return i < 0 ? '' : (sp.slice(i).match(/\{\|[\s\S]*?\n\|\}/) || [''])[0]; };
const cal = sec(/^==\s*Calendar\s*==/im).split(/\n\|-[^\n]*/), sum = sec(/===\s*Season summary\s*===/i).split(/\n\|-[^\n]*/);
L.push(`\n== calendar head + rows 1-3:\n${cal.slice(0, 4).join('\n|-\n').slice(0, 2500)}`);
L.push(`\n== summary head + rows 1-2 and rows mentioning Bathurst/Gold Coast:\n${sum.slice(0, 3).join('\n|-\n').slice(0, 2000)}\n...\n${sum.filter(r => /Bathurst|Gold Coast/.test(r)).join('\n|-\n').slice(0, 2500)}`);
const i31 = sum.findIndex(r => /Gold Coast/.test(r)); if (i31 >= 0) L.push(`--- row after Gold Coast:\n${sum[i31 + 1]}`);
const d = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/eventsround.php?id=4489&r=12&s=2026', { headers: ua })).json();
for (const ev of (d.events || []).filter(ev => /Race 3\d$/.test(ev.strEvent) && !/Qualifying|Shootout/.test(ev.strEvent))) {
  const lines = String(ev.strResult || '').split(/\r?\n/);
  L.push(`\n== tsdb ${ev.strEvent} (${ev.idEvent}): ${lines.length} lines; dateUpdated? ${ev.strTimestamp}\n${lines.slice(0, 3).map(JSON.stringify).join('\n')}\n...\n${lines.slice(-5).map(JSON.stringify).join('\n')}`);
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
