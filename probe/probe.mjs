// probe 249: how the 2026-27 WBBL Wikipedia page writes its first fixtures' dates and times (no results printed)
import fs from 'fs';
const L = [];
const r = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=' + encodeURIComponent('2026–27 Women\'s Big Bash League season') + '&prop=wikitext&format=json&formatversion=2', { headers: { 'user-agent': 'kickoff.kiwi probe' } })).json();
const w = r.parse?.wikitext || JSON.stringify(r).slice(0, 300);
L.push('length ' + w.length);
const i = w.search(/\{\{\s*(Single-innings cricket match|Limited overs matches|cricket match)/i);
L.push('first match template at ' + i);
// the first 14 match boxes, with any score-ish fields dropped
const boxes = w.split(/(?=\{\{\s*Single-innings cricket match)/i).slice(1, 16);
for (const b of boxes) L.push(b.slice(0, 900).split('\n').filter(l => !/score|result|motm|umpires|notes|report|wickets|runs|toss/i.test(l)).join('\n') + '\n----');
L.push(w.match(/[^\n]*(time zone|local time|AEDT|AEST|ACDT|AWST|UTC\+)[^\n]*/gi)?.slice(0, 8).join('\n') || 'no tz note');
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
