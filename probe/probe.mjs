// probe 43: find where the Silver Ferns' next games are listed, the Dean Jones Trophy's match template, and sample
// boxes: an upcoming Breakers NBL game, a Tall Blacks qualifier, a Sheffield Shield match
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)' };
const raw = async t => { await new Promise(r => setTimeout(r, 1100)); const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`, { headers: UA }); return r.ok ? r.text() : ''; };
for (const q of ['Constellation Cup 2026 netball', 'Silver Ferns 2026 netball series', 'Taini Jamison Trophy 2026', 'Netball Nations Cup 2026', '2027 ANZ Premiership', 'Silver Ferns fixtures 2026']) {
  await new Promise(r => setTimeout(r, 1100));
  const j = await (await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=6&srsearch=${encodeURIComponent(q)}`, { headers: UA })).json();
  console.log(`search "${q}":`, (j.query?.search || []).map(x => x.title).join(' | '));
}
const sample = (s, re, n = 900) => { const m = [...s.matchAll(re)]; return m.length ? s.slice(m[0].index, m[0].index + n).replace(/\n{2,}/g, '\n') : '(none)'; };
const djt = await raw('2026–27 Dean Jones Trophy');
const names = {}; for (const m of djt.matchAll(/\{\{\s*([^|}\n]{3,40}?)\s*\|/g)) { const n = m[1].trim(); if (/box|match|cricket|innings/i.test(n)) names[n] = (names[n] || 0) + 1; }
console.log('\n##### Dean Jones Trophy templates:', JSON.stringify(names), '\n' + sample(djt, /\{\{\s*Single-innings cricket match/gi));
const nbl = await raw('2026–27 NBL season');
const bk = [...nbl.matchAll(/\{\{\s*basketballbox collapsible/gi)].map(m => nbl.slice(m.index, m.index + 1200)).filter(b => /Breakers/.test(b) && /(October|November|December) 2026|2027/.test(b));
console.log('\n##### NBL box with the Breakers, upcoming:\n' + (bk[0] || '(none)').replace(/\n{2,}/g, '\n'));
const fiba = await raw('2027 FIBA Basketball World Cup qualification (Asia)');
const fb = [...fiba.matchAll(/\{\{\s*basketballbox collapsible/gi)].map(m => fiba.slice(m.index, m.index + 1300)).filter(b => /NZL|New Zealand/.test(b));
console.log(`\n##### FIBA qualifier boxes with NZ: ${fb.length}; the last:\n` + (fb[fb.length - 1] || '(none)').replace(/\n{2,}/g, '\n'));
const ss = await raw('2026–27 Sheffield Shield season');
const sb = [...ss.matchAll(/\{\{\s*Two-innings cricket match/gi)].map(m => ss.slice(m.index, m.index + 1100)).filter(b => /(November|December) 2026/.test(b));
console.log('\n##### Sheffield Shield box, upcoming:\n' + (sb[0] || '(none)').replace(/\n{2,}/g, '\n'));
