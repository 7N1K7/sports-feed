const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0' } };
const raw = async t => { const r = await fetch('https://en.wikipedia.org/w/index.php?action=raw&redirect=yes&title=' + encodeURIComponent(t), UA); return r.ok ? r.text() : ''; };
// fixture lines only (date, time, venue): score lines are left out
const x = await raw("2026–27 Women's Big Bash League season");
for (const m of x.matchAll(/\{\{\s*(?:Limited overs matches|Single-innings cricket match)[\s\S]*?\n\}\}/gi)) { const b = m[0]; if (!/match(2[4-9]|3[0-2])\}/.test(b)) continue; console.log(b.split('\n').filter(l => /^\s*\|\s*(date|time|daynight|venue|round)\s*=/.test(l)).map(l => l.replace(/\{\{anchor\|[^}]*\}\}|'''|\[\[|\]\]/g, '').trim()).join(' ; ').slice(0, 300)); }
console.log('time note:', (x.match(/[^\n]*(local time|AEDT|UTC[+−-]\d)[^\n]*/i) || ['none'])[0].slice(0, 300));
for (const u of ['searchevents.php?e=Adelaide_Strikers_vs_Melbourne_Renegades', 'searchevents.php?e=Adelaide_Strikers_Women_vs_Melbourne_Renegades_Women']) {
  try { const j = await (await fetch('https://www.thesportsdb.com/api/v1/json/123/' + u)).json(); console.log('TSDB', u, (j.event || []).filter(e => /2026-11/.test(e.dateEvent || '')).map(e => `${e.strLeague} | ${e.strEvent} | ${e.strTimestamp} | ${e.strVenue}`).join(' ;; ') || 'no Nov 2026 event'); } catch (e) { console.log('TSDB error', e.message); }
}
