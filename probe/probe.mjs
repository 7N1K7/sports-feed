// 13 Nov: the new pairing's differences from the old rule, and any two cards that look like one game (names only, no scores)
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?probe=' + Date.now())).json();
const ev = f.events, short = s => String(s).replace(/\(wiki-[a-z0-9]+-[0-9-]+-([a-z0-9]+)\)/g, '($1)').replace(/20(\d\d-\d\d-\d\d)T/g, '$1 ');
console.log('built', f.generatedAt, 'events', ev.length, '| wikiFailed:', JSON.stringify(f.diag.wikiFailed || 'none'), '| duplicateIds:', f.diag.duplicateIds);
const lines = String(f.diag.pairTrial).split(' || ');
console.log(lines.length, 'differences listed'); for (const l of lines) console.log(short(l).slice(0, 230));
const n = s => String(s).toLowerCase().replace(/women|[^a-z]/g, ''), hit = (p, q) => n(p) && n(q) && (n(p) === n(q));
const w = e => /women|wheelchair/i.test([e.comp, e.home, e.away].join(' '));
const dbl = []; for (let a = 0; a < ev.length; a++) for (let b = a + 1; b < ev.length; b++) { const x = ev[a], y = ev[b]; if (!x.home || !y.home || x.sport !== y.sport || w(x) !== w(y) || (x.session || '') !== (y.session || '') || Math.abs(Date.parse(x.startUTC) - Date.parse(y.startUTC)) > 3 * 864e5) continue;
  if ((hit(x.home, y.home) && hit(x.away, y.away)) || (hit(x.home, y.away) && hit(x.away, y.home))) dbl.push(`${x.id} ${x.home} v ${x.away} ${x.startUTC.slice(2, 16)}${x.timeTBC ? '?' : ''} [${x.stage || ''}] <> ${y.id} ${y.startUTC.slice(2, 16)}${y.timeTBC ? '?' : ''} [${y.stage || ''}]`); }
console.log('pairs of cards with the same two sides within 3 days:', dbl.length); console.log(dbl.slice(0, 40).join('\n'));
