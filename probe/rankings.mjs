// World rankings from Wikipedia (CC BY-SA): rugby, cricket, league, football, hockey, basketball and netball team rankings, the ATP and
// WTA singles rankings, and the UFC's pound-for-pound and division rankings. Each page is read once every 12 hours (rankings move weekly at most) and kept in the cache.
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };

// page -> what to take from it. teams: tables with a rank, a team and points/rating; players: a tennis singles table;
// fighters: the UFC page
export const RANK_PAGES = [
  { sport: 'rugby', page: 'World Rugby Rankings', kind: 'teams', titles: ["Men's"] },
  { sport: 'rugby', page: "World Rugby Women's World Rankings", kind: 'teams', titles: ["Women's"] },
  { sport: 'cricket', page: "ICC Men's Test Team Rankings", kind: 'teams', titles: ["Men's Tests"] },
  { sport: 'cricket', page: "ICC Men's ODI Team Rankings", kind: 'teams', titles: ["Men's ODIs"] },
  { sport: 'cricket', page: "ICC Men's T20I Team Rankings", kind: 'teams', titles: ["Men's T20Is"] },
  { sport: 'cricket', page: "ICC Women's ODI Team Rankings", kind: 'teams', titles: ["Women's ODIs"] },
  { sport: 'cricket', page: "ICC Women's T20I Team Rankings", kind: 'teams', titles: ["Women's T20Is"] },
  { sport: 'league', page: "IRL Men's World Rankings", kind: 'teams', titles: ["Men's"] },
  { sport: 'league', page: "IRL Women's World Rankings", kind: 'teams', titles: ["Women's"] },
  { sport: 'league', page: 'IRL Wheelchair World Rankings', kind: 'teams', titles: ['Wheelchair'] },
  { sport: 'football', page: "FIFA Men's World Ranking", kind: 'teams', titles: ["Men's"] },
  { sport: 'football', page: "FIFA Women's World Ranking", kind: 'teams', titles: ["Women's"] },
  { sport: 'hockey', page: "FIH Men's World Ranking", kind: 'teams', titles: ["Men's"] },
  { sport: 'hockey', page: "FIH Women's World Ranking", kind: 'teams', titles: ["Women's"] },
  { sport: 'basketball', page: "FIBA Men's World Ranking", kind: 'teams', titles: ["Men's"] },
  { sport: 'basketball', page: "FIBA Women's World Ranking", kind: 'teams', titles: ["Women's"] },
  { sport: 'netball', page: 'World Netball Rankings', kind: 'teams', titles: ["Women's"] },
  { sport: 'tennis', page: 'ATP rankings', kind: 'players', titles: ["Men's singles", "Men's doubles", "Men's doubles teams"] },
  { sport: 'tennis', page: 'WTA rankings', kind: 'players', titles: ["Women's singles", "Women's doubles", "Women's doubles teams"] },
  { sport: 'mma', page: 'UFC rankings', kind: 'fighters' },
];

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ndash: '–', mdash: '—', minus: '−' };
const text = h => String(h || '')
  .replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, ' ')
  .replace(/<span[^>]*display:\s*none[^>]*>[\s\S]*?<\/span>/gi, '').replace(/<[^>]+>/g, '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m).replace(/\s+/g, ' ').trim();

// a table as a grid of cell texts, rowspans and colspans filled out; header rows are the leading rows of <th> only
export function grid(html) {
  const rows = [], heads = [], spill = [];
  for (const tr of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const r = rows.length, row = [];
    let c = 0, allTh = true;
    for (const cell of tr[1].matchAll(/<(th|td)([^>]*)>([\s\S]*?)<\/\1>/gi)) {
      while (spill[c]?.left > 0) { row[c] = spill[c].v; spill[c].left--; c++; }
      if (cell[1].toLowerCase() === 'td') allTh = false;
      const cs = +(cell[2].match(/colspan="?(\d+)/i) || [0, 1])[1], rs = +(cell[2].match(/rowspan="?(\d+)/i) || [0, 1])[1], v = text(cell[3]);
      for (let k = 0; k < cs; k++) { row[c] = v; if (rs > 1) spill[c] = { v, left: rs - 1 }; c++; }
    }
    while (spill[c]?.left > 0) { row[c] = spill[c].v; spill[c].left--; c++; }
    if (!row.length) continue;
    (allTh && !rows.length ? heads : rows).push(row);
  }
  return { heads, rows };
}

// the page's tables in order, each with the headings and loose text (dates, "Weight limit") that come before it
function tablesOf(html) {
  const out = [];
  let ctx = { heading: '', notes: '' };
  const re = /<h([2-4])[^>]*>([\s\S]*?)<\/h\1>|<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>([\s\S]*?)<\/table>/gi;
  let last = 0;
  for (const m of html.matchAll(re)) {
    const between = text(html.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[2] !== undefined) { ctx = { heading: text(m[2]), notes: '' }; continue; }
    // a caption can carry the date ("Women's Ranking as of 3 October 2026")
    ctx.notes += ' ' + between + ' ' + text((m[3].match(/<caption[^>]*>([\s\S]*?)<\/caption>/i) || [])[1] || '');
    out.push({ heading: ctx.heading, notes: ctx.notes.trim(), ...grid(m[3]) });
    ctx = { heading: ctx.heading, notes: '' };
  }
  return out;
}
const MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
// "6 April 2026" or "April 6, 2026" -> 2026-04-06; "December 2025" alone -> 2025-12
const dateIn = s => {
  const m = String(s).match(new RegExp(`\\b(\\d{1,2} (?:${MONTHS}) \\d{4}|(?:${MONTHS}) \\d{1,2},? \\d{4})`, 'i'));
  const d = m && new Date(m[1].replace(/,/, '') + ' 12:00 UTC');
  if (d && !isNaN(d)) return d.toISOString().slice(0, 10);
  const my = String(s).match(new RegExp(`\\b(${MONTHS}) (\\d{4})\\b`, 'i'));
  return my ? `${my[2]}-${String(MONTHS.split('|').findIndex(x => x.toLowerCase() === my[1].toLowerCase()) + 1).padStart(2, '0')}` : '';
};
const col = (heads, re) => {
  for (const h of heads) { const i = h.findIndex(x => re.test(x)); if (i >= 0) return i; }
  return -1;
};
const NZ = /^New Zealand\b/;

function teamTables(tables, cfg) {
  const out = [];
  for (const t of tables) {
    if (out.length >= cfg.titles.length) break;
    // the header row: the <th> rows, or else the first row naming a Team column (a caption row can come before it)
    const all = [...t.heads, ...t.rows], hi = all.slice(0, 4).findIndex(r => r.some(x => /^(team|nation|country)\b/i.test(x)));
    if (hi < 0) continue;
    const heads = all.slice(0, hi + 1), body = all.slice(hi + 1);
    // the ICC's tables have no rank column: there the order is the rank
    const iRank = col(heads, /^(rank|pos|#)/i), iTeam = col(heads, /^(team|nation|country)\b/i);
    const iVal = col(heads, /^rating/i) >= 0 ? col(heads, /^rating/i) : col(heads, /^(points|pts)/i);
    if (iTeam < 0 || iVal < 0) continue;
    const rows = body.map(r => ({ rank: iRank >= 0 ? (r[iRank] || '').match(/^\d+/)?.[0] || '' : 'n', name: (r[iTeam] || '').replace(/\s*\(.*?\)\s*$/, '').trim(), val: (r[iVal] || '').replace(/^0+(?=\d)/, '') }))
      // a footer row spanning the table ("Source: ICC Men's Test Team Rankings, 13 October 2026") is not a team
      .filter(r => r.rank && r.name && /\d/.test(r.val) && r.name !== r.val && !/^(team|total)$|^source\b/i.test(r.name));
    rows.forEach((r, i) => { if (r.rank === 'n') r.rank = String(i + 1); });
    if (rows.length < 5) continue;
    const top = rows.slice(0, 20), nz = rows.find(r => NZ.test(r.name));
    if (nz && !top.includes(nz)) top.push(nz);
    for (const r of top) if (NZ.test(r.name)) r.nz = true;
    out.push({
      sport: cfg.sport, title: /wheelchair/i.test(t.heading) ? 'Wheelchair' : /women/i.test(t.heading) && cfg.titles.includes("Women's") ? "Women's" : cfg.titles[out.length],
      page: cfg.page, asOf: dateIn(t.notes) || dateIn(t.heading) || dateIn(all.slice(0, hi).flat().join(' ')) || dateIn((body.find(r => /^source\b/i.test(r[0] || '')) || []).join(' ')), valLabel: /rating/i.test(heads.flat()[iVal] || heads[0][iVal]) ? 'Rating' : 'Points', rows: top,
    });
  }
  return out;
}

// tennis: the singles and doubles tables headed "ATP rankings (singles) as of 5 October 2026" (not the races to the
// Finals): number, player with country code ("Jannik Sinner (ITA)"), points. Doubles players are ranked one by one too
function playerTables(tables, cfg) {
  const out = [];
  for (const [i, kind] of ['singles', 'doubles', 'race'].entries()) {
    const list = onePlayerTable(tables, cfg, kind, cfg.titles[i]);
    if (list) out.push(list);
  }
  return out;
}
function onePlayerTable(tables, cfg, kind, title) {
  if (!title) return null;
  for (const t of tables) {
    const head = t.heads.flat().join(' ');
    // the doubles race: the year's pairs, "Harri Heliövaara (FIN) ✓ Henry Patten (GBR) ✓" in one cell
    if (!(kind === 'race' ? /doubles race rankings as of/i : new RegExp(`rankings \\(${kind}\\) as of`, 'i')).test(head)) continue;
    const h = t.heads[t.heads.length - 1];
    const iRank = h.findIndex(x => /^(no|rank)/i.test(x)), iName = h.findIndex(x => /^(player|team)/i.test(x)), iVal = h.findIndex(x => /^points/i.test(x));
    if (kind === 'race' && iRank >= 0 && iName >= 0 && iVal >= 0) {
      const rows = t.rows.map(r => {
        const pair = [...(r[iName] || '').matchAll(/([^()✓]+?)\s*\(([A-Z]{3})\)/g)].map(m => ({ name: m[1].replace(/✓/g, '').trim(), iso: m[2] }));
        return { rank: (r[iRank] || '').match(/^\d+/)?.[0] || '', name: pair.map(x => x.name).join(' / '), pair, iso: '', val: (r[iVal] || '').trim() };
      }).filter(r => r.rank && r.pair.length === 2 && /\d/.test(r.val)).slice(0, 20);
      if (rows.length < 5) continue;
      for (const r of rows) if (r.pair.some(x => x.iso === 'NZL')) r.nz = true;
      return { sport: cfg.sport, kind: 'players', title, page: cfg.page, asOf: dateIn(head), valLabel: 'Points', rows };
    }
    if (iRank < 0 || iName < 0 || iVal < 0) continue;
    // a tie is marked "=" (doubles partners level on points): it shares the rank above
    let last = '';
    const rows = t.rows.map(r => {
      const m = (r[iName] || '').match(/^(.*?)\s*\(([A-Z]{3})\)/), cell = (r[iRank] || '').trim();
      const rank = cell.match(/^\d+/)?.[0] || (/^(=|T)\s*$/i.test(cell) ? last : '');
      if (rank) last = rank;
      return { rank, name: (m ? m[1] : r[iName] || '').replace(/\s*✓\s*$/, '').trim(), iso: m ? m[2] : '', val: (r[iVal] || '').trim() };
    }).filter(r => r.rank && r.name && /\d/.test(r.val)).slice(0, 20);
    if (rows.length < 5) continue;
    for (const r of rows) if (r.iso === 'NZL') r.nz = true;
    return { sport: cfg.sport, kind: 'players', title, page: cfg.page, asOf: dateIn(head), valLabel: 'Points', rows };
  }
  return null;
}

// UFC: the page carries more than one release of the rankings; per list, keep the latest
const DIVS = [[265, 'Heavyweight'], [205, 'Light heavyweight'], [185, 'Middleweight'], [170, 'Welterweight'], [155, 'Lightweight'], [145, 'Featherweight'], [135, 'Bantamweight'], [125, 'Flyweight'], [115, 'Strawweight']];
function fighterTables(tables, cfg) {
  const lists = new Map();
  let women = false, prevMax = 0, p4pSeen = 0, asOf = '';
  for (const t of tables) {
    const heads = t.heads;
    const iRank = col(heads, /^rank/i), iName = col(heads, /^fighter/i);
    if (iRank < 0 || iName < 0) continue;
    asOf = dateIn((t.notes.match(/released on[^.]*/i) || [''])[0]) || asOf;
    const iRec = col(heads, /^record/i), iIso = col(heads, /^ISO$/i), iStatus = col(heads, /^status/i), iClass = col(heads, /^weight class/i);
    const lim = +((t.notes.match(/Weight limit:[^•]*?to (\d{3}) lb/i) || [])[1] || 0);
    let title;
    if (iClass >= 0) { p4pSeen++; women = /women/i.test(t.heading) || p4pSeen % 2 === 0; title = `${women ? "Women's" : "Men's"} pound for pound`; }
    else {
      if (/women/i.test(t.heading + ' ' + t.notes.slice(-200))) women = true;
      else if (lim && prevMax && lim > prevMax && prevMax <= 125) women = !women;
      if (lim === 265) women = false;
      prevMax = lim || prevMax;
      const div = DIVS.find(([max]) => max === lim)?.[1] || t.heading;
      if (!div) continue;
      title = women ? `Women's ${div.toLowerCase()}` : div;
    }
    const rows = t.rows.map(r => ({ rank: (r[iRank] || '').trim(), name: (r[iName] || '').replace(/\s*\(.*?\)\s*$/, '').trim(), iso: iIso >= 0 ? r[iIso] : '', rec: iRec >= 0 ? r[iRec] : '', note: iStatus >= 0 ? r[iStatus] : '' }))
      .filter(r => /^(C|IC|\d+)$/.test(r.rank) && r.name).slice(0, 17);
    if (rows.length < 5) continue;
    const old = lists.get(title);
    if (!old || (asOf || '') >= (old.asOf || '')) lists.set(title, { sport: cfg.sport, title, page: cfg.page, asOf, rows });
  }
  const order = t => (/pound/.test(t) ? 0 : 1) + (/Women/.test(t) ? 20 : 0) + DIVS.findIndex(([, d]) => t.toLowerCase().endsWith(d.toLowerCase())) / 100;
  return [...lists.values()].sort((a, b) => order(a.title) - order(b.title));
}

// bumped when the parser changes, so lists cached by the old one are read again
const CACHE_V = 5;
export async function rankings(cache, diag) {
  const now = Date.now(), out = [], notes = [];
  for (const cfg of RANK_PAGES) {
    const c = cache[cfg.page];
    if (c && c.v === CACHE_V && now - c.t < 12 * 36e5) { out.push(...c.lists); continue; }
    try {
      await new Promise(r => setTimeout(r, 1000));
      const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&maxlag=5&action=parse&prop=text&redirects=1&disableeditsection=1&disablelimitreport=1&page=' + encodeURIComponent(cfg.page), { headers: UA });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      if (j.error) throw new Error(j.error.code);
      // a page merged into another arrives through a redirect to its section ("ICC Women's T20I Team Rankings" is now
      // the T20I section of the ODI and T20I page): keep to that section's tables
      const frag = (j.parse?.redirects || []).map(x => x.tofragment).filter(Boolean).pop()?.replace(/_/g, ' ').toLowerCase();
      const all = tablesOf(j.parse?.text || ''), inFrag = frag ? all.filter(t => t.heading.toLowerCase() === frag) : [];
      const tables = inFrag.length ? inFrag : all;
      const lists = cfg.kind === 'fighters' ? fighterTables(tables, cfg) : cfg.kind === 'players' ? playerTables(tables, cfg) : teamTables(tables, cfg);
      notes.push(`${cfg.page}: ${tables.length} tables, ${lists.map(l => `${l.title} ${l.rows.length}${l.asOf ? ' @' + l.asOf : ''}`).join(', ') || 'nothing usable'}`);
      if (lists.length) cache[cfg.page] = { t: now, v: CACHE_V, lists };
      out.push(...(lists.length ? lists : c?.lists || []));
    } catch (e) { notes.push(`${cfg.page}: error ${e.message}`); out.push(...(c?.lists || [])); }
  }
  diag.rankings = notes.join('; ') || 'all from cache';
  return out;
}
export { tablesOf as _tablesOf, teamTables as _teamTables, fighterTables as _fighterTables, playerTables as _playerTables };
