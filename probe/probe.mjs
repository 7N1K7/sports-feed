// probe 7: how many missing fighter photos free sources could fill (Wikidata search, other-language Wikipedias), the
// logo lookups that miss (Farah Palmer Cup, Central Hinds), and what ESPN's UFC feed carries
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const BROWSER = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', accept: 'application/json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const wm = async (host, q) => { await sleep(700); const r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&maxlag=5&` + q, { headers: UA }); if (!r.ok) throw new Error(host + ' ' + r.status); return r.json(); };
const now = Date.now();

const feed = await (await fetch('https://7n1k7.github.io/sports-feed/data/feed.json?x=' + now)).json();
const why = Object.fromEntries((feed.diag.facesMissing || []).map(s => { const i = s.lastIndexOf(': '); return [s.slice(0, i), s.slice(i + 2)]; }));
const onCards = new Set();
for (const e of feed.events) { const t = Date.parse(e.startUTC); if (t < now - 3 * 864e5 || t > now + 35 * 864e5) continue; for (const b of e.card || []) for (const k of ['a', 'b']) if (b[k] && !b[k + 'Img']) onCards.add(String(b[k]).replace(/\s*\((c|ic)\)$/i, '').replace(/\s+['"‘“][^'"’”]+['"’”]\s+/, ' ').trim()); for (const k of ['home', 'away']) if (/^(mma|boxing)$/.test(e.sport) && !e[k + 'Logo'] && /\s/.test(e[k] || '')) onCards.add(e[k]); }
const names = [...new Set([...onCards, ...Object.keys(why)])];
console.log('missing names', names.length, '| reasons:', Object.entries(Object.values(why).reduce((m, r) => (m[r.replace(/\(.*/, '')] = (m[r.replace(/\(.*/, '')] || 0) + 1, m), {})).map(([k, v]) => `${k}=${v}`).join(', '));

// --- 1. Wikidata: search each name, keep humans whose occupation is a combat sport (or who have a Sherdog / BoxRec id)
const FIGHT_OCC = new Set(['Q11607585', 'Q11338576', 'Q13382533', 'Q1371925', 'Q2066131', 'Q11124885', 'Q3348300', 'Q4009406', 'Q12039558', 'Q13141064', 'Q18534714']);
const found = {}, viaOther = {}, stats = { searched: 0, matched: 0, p18: 0, other: 0 };
for (const n of names) {
  let s;
  try { s = await wm('www.wikidata.org', 'action=wbsearchentities&language=en&type=item&limit=7&search=' + encodeURIComponent(n)); } catch (e) { console.log('ERR search', n, e.message); continue; }
  stats.searched++;
  const ids = (s.search || []).map(x => x.id);
  if (!ids.length) continue;
  const ents = (await wm('www.wikidata.org', 'action=wbgetentities&props=claims|sitelinks|labels&languages=en&ids=' + ids.join('|'))).entities || {};
  const fold = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, '').trim();
  const pick = Object.values(ents).find(en => {
    const c = en.claims || {};
    const human = (c.P31 || []).some(x => x.mainsnak?.datavalue?.value?.id === 'Q5');
    const occ = (c.P106 || []).some(x => FIGHT_OCC.has(x.mainsnak?.datavalue?.value?.id));
    const ids = c.P2818 || c.P4351 || c.P8665 || c.P2041; // Sherdog, BoxRec, UFC athlete, Tapology... any of these marks a fighter
    return human && (occ || ids) && fold(en.labels?.en?.value) === fold(n);
  });
  if (!pick) continue;
  stats.matched++;
  const f = pick.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
  if (f) { found[n] = 'File:' + f; stats.p18++; continue; }
  // other-language articles' free lead images
  const links = Object.entries(pick.sitelinks || {}).filter(([k]) => /^[a-z_]+wiki$/.test(k) && !/^(en|commons|species)wiki$/.test(k));
  for (const [k, v] of links.slice(0, 6)) {
    const lang = k.replace(/wiki$/, '').replace(/_/g, '-');
    try {
      const r = await wm(`${lang}.wikipedia.org`, 'action=query&prop=pageimages&piprop=name&pilicense=free&titles=' + encodeURIComponent(v.title));
      const img = r.query?.pages?.[0]?.pageimage;
      if (img) { viaOther[n] = `${lang}: File:${img}`; stats.other++; break; }
    } catch { }
  }
  if (!viaOther[n]) found[n] = `(on Wikidata ${pick.id}, no photo; ${links.length} other-language articles)`;
}
console.log('\n#### WIKIDATA', JSON.stringify(stats));
for (const n of names) console.log('FACE', n, '|', why[n] || 'card', '|', viaOther[n] ? 'OTHER-WIKI ' + viaOther[n] : found[n] || '-');

// --- 2. logos TheSportsDB misses
console.log('\n#### LOGOS');
const tsdb = async q => { await sleep(2200); const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/' + q, { headers: UA }); const d = await r.json().catch(() => ({})); return d.teams || []; };
for (const q of ['Wellington Pride', 'Wellington', 'Northland Kauri', 'Northland', 'Canterbury Women', 'Auckland Storm', 'Central Hinds', 'Central Districts', 'Central Stags', 'Governor-General\'s XI', 'Prime Minister\'s XI']) {
  const t = await tsdb('searchteams.php?t=' + encodeURIComponent(q));
  console.log('TSDB', q, '=>', t.slice(0, 8).map(x => `${x.strTeam} [${x.strSport} / ${x.strLeague}] ${x.strBadge ? 'badge' : '-'}`).join(' ; ') || 'none');
}
for (const l of ['Farah Palmer Cup', 'Womens Super Smash', 'Hallyburton Johnstone Shield', 'Bunnings NPC', 'NPC', 'National Provincial Championship']) {
  const t = await tsdb('search_all_teams.php?l=' + encodeURIComponent(l));
  console.log('LEAGUE', l, '=>', t.length, t.slice(0, 14).map(x => x.strTeam).join(', '));
}
// the logos the feed has for FPC, NPC and domestic cricket now
const has = {};
for (const e of feed.events) if (/^(npc|fpc|nzdomestic)$/.test(e.team)) for (const k of ['home', 'away']) has[`${e.team}|${e[k]}`] = e[k + 'Logo'] ? 'logo' : '-';
console.log('FEED LOGOS', Object.entries(has).map(([k, v]) => `${k}=${v}`).join(', '));

// --- 3. what ESPN's UFC feed carries for the next card (for the owner's choice; ESPN photos are not free)
console.log('\n#### ESPN UFC');
try {
  const r = await (await fetch('https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard', { headers: BROWSER })).json();
  const ev = (r.events || [])[0];
  console.log('event', ev?.name, ev?.date, 'fights', ev?.competitions?.length);
  for (const c of (ev?.competitions || []).slice(0, 4)) console.log('BOUT', JSON.stringify((c.competitors || []).map(x => ({ id: x.athlete?.id || x.id, name: x.athlete?.displayName, headshot: x.athlete?.headshot?.href, flag: x.athlete?.flag?.href }))));
} catch (e) { console.log('ERR', e.message); }
console.log('\ndone', new Date().toISOString());
