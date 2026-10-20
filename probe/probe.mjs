// probe 42: Wikipedia pages for Australian domestic cricket, netball and basketball: do they exist, which match
// templates do they use, and what do upcoming boxes look like
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)' };
const pages = ['2026–27 Sheffield Shield season', '2026–27 One-Day Cup', '2026–27 Marsh One-Day Cup', '2026–27 Australian domestic one-day cricket season',
  'New Zealand national netball team', '2026 Constellation Cup', '2026 ANZ Premiership season', '2027 Netball World Cup', '2026 Netball Nations Cup', '2026 Taini Jamison Trophy Series',
  "New Zealand men's national basketball team", "New Zealand women's national basketball team", '2026–27 NBL season', '2026–27 New Zealand Breakers season', '2027 FIBA Basketball World Cup qualification (Asia)', '2027 FIBA Basketball World Cup Asian qualifiers', '2026 National Basketball League (New Zealand) season'];
for (const t of pages) {
  await new Promise(r => setTimeout(r, 1200));
  const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(t)}&action=raw&redirect=yes`, { headers: UA });
  if (!r.ok) { console.log(`\n##### ${t}: HTTP ${r.status}`); continue; }
  const s = await r.text();
  const redirect = (s.match(/^#REDIRECT\s*\[\[([^\]]+)\]\]/i) || [])[1];
  if (redirect) { console.log(`\n##### ${t}: redirect -> ${redirect}`); continue; }
  const names = {};
  for (const m of s.matchAll(/\{\{\s*([^|}\n]{3,40}?)\s*\|/g)) { const n = m[1].trim(); if (/box|match|cricket|innings|netball|basketball|fixture|result|game/i.test(n)) names[n] = (names[n] || 0) + 1; }
  console.log(`\n##### ${t}: ${s.length} chars | templates: ${JSON.stringify(names)}`);
  // the first box dated October 2026 or later, raw
  const boxes = [...s.matchAll(/\{\{\s*(?:[^|}\n]*(?:box|match|innings)[^|}\n]*)\s*\|/gi)];
  const later = boxes.find(m => /(October|November|December) 2026|2027|\b(1[0-2])\/2026|2026-1[0-2]/.test(s.slice(m.index, m.index + 700)));
  const show = later || boxes[0];
  if (show) console.log(s.slice(show.index, show.index + 900).replace(/\n{2,}/g, '\n'));
}
