// Fixture and result readers for sources that allow automated use:
//   Wikipedia (MediaWiki API, CC BY-SA content, credited in the page footer)
//   TheSportsDB (official free API, key 123)
// Both return events in the feed's shape: { id, team, tags, sport, comp, home, away, startUTC, timeTBC, venue, city, tz, status, score, summary, source, link }
const DAY = 864e5;
const UA = { 'user-agent': 'nz-sports-feed/1.0 (https://7n1k7.github.io/sports-feed/; personal non-commercial site)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- time zones -------------------------------------------------------
const ABBR_TZ = {
  NZST: 'Pacific/Auckland', NZDT: 'Pacific/Auckland', AEST: 'Australia/Sydney', AEDT: 'Australia/Sydney', ACST: 'Australia/Adelaide', ACDT: 'Australia/Adelaide',
  AWST: 'Australia/Perth', FJT: 'Pacific/Fiji', FJST: 'Pacific/Fiji', SAST: 'Africa/Johannesburg', GMT: 'Europe/London', BST: 'Europe/London', WET: 'Europe/Lisbon',
  CET: 'Europe/Paris', CEST: 'Europe/Paris', JST: 'Asia/Tokyo', IST: 'Asia/Kolkata', PKT: 'Asia/Karachi', ART: 'America/Argentina/Buenos_Aires', TOT: 'Pacific/Tongatapu',
  WSST: 'Pacific/Apia', WST: 'Pacific/Apia', PGT: 'Pacific/Port_Moresby', EST: 'America/New_York', EDT: 'America/New_York', CST: 'America/Chicago', CDT: 'America/Chicago',
  MST: 'America/Denver', MDT: 'America/Edmonton', PST: 'America/Los_Angeles', PDT: 'America/Los_Angeles', AST: 'Asia/Riyadh', GST: 'Asia/Dubai', SLST: 'Asia/Colombo', BDT: 'Asia/Dhaka',
};
// offset of `tz` at instant `t`, in ms
function tzOffset(tz, t) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
    .formatToParts(new Date(t)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - t;
}
function localToUTC(y, mo, d, h, mi, tz) {
  const guess = Date.UTC(y, mo, d, h, mi);
  let t = guess - tzOffset(tz, guess);
  t = guess - tzOffset(tz, t);
  return t;
}

// ---------- wikitext helpers ------------------------------------------------
// Pull every top-level {{name ...}} block whose name matches `re`
function templates(text, re) {
  const out = [];
  for (let i = text.indexOf('{{'); i >= 0; i = text.indexOf('{{', i + 2)) {
    const name = text.slice(i + 2, i + 60).split(/[|}\n]/)[0].trim();
    if (!re.test(name)) continue;
    let depth = 0, j = i;
    for (; j < text.length - 1; j++) {
      if (text[j] === '{' && text[j + 1] === '{') { depth++; j++; }
      else if (text[j] === '}' && text[j + 1] === '}') { depth--; j++; if (!depth) break; }
    }
    out.push({ name, body: text.slice(i + 2, j - 1), at: i });
    i = j;
  }
  return out;
}
// Split a template body into params at top-level pipes
function params(body) {
  const parts = [];
  let depth = 0, cur = '';
  for (let i = 0; i < body.length; i++) {
    const two = body.slice(i, i + 2);
    if (two === '{{' || two === '[[') { depth++; cur += two; i++; continue; }
    if (two === '}}' || two === ']]') { depth--; cur += two; i++; continue; }
    if (body[i] === '|' && depth === 0) { parts.push(cur); cur = ''; continue; }
    cur += body[i];
  }
  parts.push(cur);
  const named = {}, pos = [];
  for (const p of parts.slice(1)) {
    const m = p.match(/^\s*([\w\- ]+?)\s*=([\s\S]*)$/);
    if (m) named[m[1].toLowerCase()] = m[2].trim(); else pos.push(p.trim());
  }
  return { name: parts[0].trim(), named, pos };
}
const stripRefs = s => String(s || '').replace(/<!--[\s\S]*?-->/g, '').replace(/<ref[^>]*\/>/gi, '').replace(/<ref[\s\S]*?<\/ref>/gi, '');
function clean(s) {
  let t = stripRefs(s);
  for (let k = 0; k < 4; k++) {
    t = t.replace(/\{\{\s*(?:nowrap|nobr|small|abbr|sort|rus|rut|ru stadium|stadium)\s*\|([^{}]*?)\}\}/gi, (_, a) => a.split('|').filter(x => !x.includes('=')).pop() || '')
      .replace(/\{\{\s*(?:nbsp|snd|ndash|mdash|·|dot|efn|refn|notetag|cite[^|}]*|flagicon|flagdeco|vanchor|anchor)[^{}]*\}\}/gi, m => /ndash|snd/.test(m) ? '–' : /mdash/.test(m) ? '—' : /nbsp/.test(m) ? ' ' : '');
  }
  return t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\S+\s+([^\]]*)\]/g, '$1').replace(/'''?/g, '')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\{\{[^{}]*\}\}/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

const CODES = {
  NZ: 'New Zealand', NZL: 'New Zealand', AUS: 'Australia', FIJ: 'Fiji', FJI: 'Fiji', SAM: 'Samoa', SAMOA: 'Samoa', WSM: 'Samoa', TGA: 'Tonga', TON: 'Tonga', PNG: 'Papua New Guinea',
  COK: 'Cook Islands', CKI: 'Cook Islands', ENG: 'England', FRA: 'France', WAL: 'Wales', SCO: 'Scotland', IRE: 'Ireland', IRL: 'Ireland', ITA: 'Italy', RSA: 'South Africa', SA: 'South Africa',
  ZAF: 'South Africa', ARG: 'Argentina', JPN: 'Japan', JAP: 'Japan', USA: 'USA', CAN: 'Canada', IND: 'India', PAK: 'Pakistan', SL: 'Sri Lanka', SRI: 'Sri Lanka', LKA: 'Sri Lanka',
  BAN: 'Bangladesh', BGD: 'Bangladesh', WI: 'West Indies', AFG: 'Afghanistan', ZIM: 'Zimbabwe', LBN: 'Lebanon', LEB: 'Lebanon', JAM: 'Jamaica', GEO: 'Georgia', POR: 'Portugal',
  ESP: 'Spain', URU: 'Uruguay', CHI: 'Chile', NED: 'Netherlands', BRA: 'Brazil', KEN: 'Kenya', CZE: 'Czechia', POL: 'Poland', ROU: 'Romania', ROM: 'Romania', HKG: 'Hong Kong',
  KOR: 'South Korea', CHN: 'China', GER: 'Germany', BEL: 'Belgium', NAM: 'Namibia', UAE: 'United Arab Emirates', SCOT: 'Scotland', IRELAND: 'Ireland', SER: 'Serbia', GRE: 'Greece',
  MLT: 'Malta', ITY: 'Italy', NIR: 'Northern Ireland',
};
// Team cell: {{Rut|Crusaders}}, {{rl-rt|AUS}}, {{crw|NZ}}, {{RuA-rt|ITA|name=Italy XV}}, [[Melbourne Renegades]] (H)
function teamOf(v) {
  const raw = stripRefs(v);
  const tpl = templates(raw, /^[A-Za-z][\w\- ]{0,14}$/)[0];
  if (tpl) {
    const p = params('x|' + tpl.body.slice(tpl.name.length + 1));
    const nm = tpl.name.toLowerCase();
    let name = p.named.name || p.pos[0] || '';
    name = CODES[name.toUpperCase()] || name.replace(/_/g, ' ');
    const women = /^(ruw|rlw|crw|fbw|wrl?w)/.test(nm) || /women/i.test(nm);
    if (name && !/\d{4}/.test(name)) return clean(name) + (women && !/Women/.test(name) ? ' Women' : '');
  }
  return clean(raw).replace(/\s*\((H|A|N)\)\s*$/i, '').trim();
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
// "15 October 2026", "9–13 December 2026", "October 15, 2026", {{dts|2026|Oct|17}}
function dateOf(v, fallbackYear) {
  const dts = String(v).match(/\{\{\s*dts\s*\|\s*(\d{4})\s*\|\s*(\w+)\s*\|\s*(\d{1,2})/i);
  if (dts) return { y: +dts[1], m: MONTHS.indexOf(dts[2].slice(0, 3).toLowerCase()), d: +dts[3] };
  const t = clean(v);
  let m = t.match(/(\d{1,2})(?:\s*[–-]\s*\d{1,2})?\s+([A-Za-z]{3,})(?:\s*[–-]\s*\d{1,2}\s+[A-Za-z]+)?\s*(\d{4})?/);
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase())) return { y: +(m[3] || fallbackYear), m: MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()), d: +m[1] };
  m = t.match(/([A-Za-z]{3,})\s+(\d{1,2}),?\s*(\d{4})?/);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase())) return { y: +(m[3] || fallbackYear), m: MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()), d: +m[2] };
  return null;
}
// "20:05 [[AEDT]] ([[UTC+11:00]])", "19:10 NZST", "7:15pm", "20:00"
function timeOf(v) {
  const raw = stripRefs(v), t = clean(raw);
  const m = t.match(/(\d{1,2})[:.](\d{2})\s*([ap]\.?m\.?)?/i);
  if (!m) return null;
  let h = +m[1];
  if (m[3] && /p/i.test(m[3]) && h < 12) h += 12;
  if (m[3] && /a/i.test(m[3]) && h === 12) h = 0;
  const off = raw.match(/UTC\s*([+−-])\s*(\d{1,2})(?::?(\d{2}))?/);
  const abbr = (t.match(/\b([A-Z]{2,5})\b/g) || []).find(a => ABBR_TZ[a]);
  return { h, mi: +m[2], offsetMin: off ? (off[1] === '+' ? 1 : -1) * (+off[2] * 60 + +(off[3] || 0)) : null, tz: abbr ? ABBR_TZ[abbr] : null };
}

// ---------- classification -------------------------------------------------
const SR_NZ = [['blues', 'Blues'], ['chiefs', 'Chiefs'], ['hurricanes', 'Hurricanes'], ['crusaders', 'Crusaders'], ['highlanders', 'Highlanders'], ['moana', 'Moana Pasifika']];
const SR_AU = /Brumbies|Reds|Waratahs|Western Force|Force/;
export function classify(kind, home, away) {
  const names = [home, away].join(' | ');
  const nz = /\bNew Zealand\b/.test(names), women = /Women/.test(names);
  switch (kind) {
    case 'superrugby': {
      const club = SR_NZ.find(([, n]) => names.includes(n));
      const tags = ['superrugby', ...(SR_AU.test(names) ? ['aurugby'] : [])];
      return { team: club ? club[0] : SR_AU.test(names) ? 'aurugby' : 'superrugby', tags };
    }
    case 'rugbytests': {
      const tags = /\bAustralia\b/.test(names) && !women ? ['wallabies'] : [];
      if (nz) return { team: women ? 'blackferns' : 'allblacks', tags };
      if (tags.length) return { team: 'wallabies', tags };
      return null;
    }
    case 'rlwc': return { team: nz ? (women ? 'kiwiferns' : 'kiwis') : 'rlwc', tags: ['rlwc'] };
    case 'leaguetests': return nz ? { team: women ? 'kiwiferns' : 'kiwis', tags: [] } : null;
    case 'nzcricket': return nz ? { team: women ? 'whiteferns' : 'blackcaps', tags: [] } : null;
    case 'nrl': return { team: /Warriors/.test(names) ? 'warriors' : 'nrl', tags: ['nrl'] };
    case 'aleague': return { team: /Wellington Phoenix/.test(names) ? 'phoenix' : /Auckland FC/.test(names) ? 'aucklandfc' : 'aleague', tags: ['aleague'] };
    default: return null;
  }
}

// ---------- Wikipedia -------------------------------------------------------
const BOX = /^(rugby ?box|rugby ?league ?box|rlbox|single-innings cricket match|two-innings cricket match|limited overs international|footballbox|football box(?: collapsible)?)$/i;

function eventsFromPage(title, text, cfg, cityTz) {
  const year = +(title.match(/\b(20\d\d)/) || [])[1] || new Date().getUTCFullYear();
  const out = [];
  for (const tpl of templates(text, BOX)) {
    const { named: p } = params(tpl.body);
    const isCricket = /cricket|overs/i.test(tpl.name);
    // women's tours use plain team templates, so tag names from the page itself
    const fix = n => cfg.women && n && !/Women/.test(n) ? n + ' Women' : n;
    const home = fix(teamOf(p.home || p.team1 || '')), away = fix(teamOf(p.away || p.team2 || ''));
    if (!home || !away) continue;
    const d = dateOf(p.date || '', year);
    if (!d || d.m < 0) continue;
    const venueRaw = clean(p.stadium || p.venue || p.location || '');
    const parts = venueRaw.split(',').map(s => s.trim()).filter(Boolean);
    const city = parts.length > 1 ? parts[parts.length - 1] : '';
    const tm = timeOf(p.time || '');
    const tz = (tm && tm.tz) || cityTz(city) || cityTz(parts[0]) || cfg.tz || null;
    let t, tbc = false;
    if (tm && tm.offsetMin != null) t = Date.UTC(d.y, d.m, d.d, tm.h, tm.mi) - tm.offsetMin * 6e4;
    else if (tm && tz) t = localToUTC(d.y, d.m, d.d, tm.h, tm.mi, tz);
    else { tbc = true; t = localToUTC(d.y, d.m, d.d, 14, 0, tz || 'Pacific/Auckland'); }
    // score
    let score, summary, status = 'upcoming';
    if (isCricket) {
      const sc = n => clean(p[`score${n}`]) || (p[`runs${n}`] ? `${clean(p[`runs${n}`])}${p[`wickets${n}`] && clean(p[`wickets${n}`]) !== '10' ? '/' + clean(p[`wickets${n}`]) : ''}` : '');
      const result = clean(p.result || '');
      if (result) {
        status = 'final'; summary = result;
        const a = sc(1), b = sc(2);
        score = a && b ? `${a} v ${b}` : result.length < 40 ? result : 'Result in';
      }
    } else {
      const s = clean(p.score || '');
      if (/\d+\s*[–—-]\s*\d+/.test(s)) { status = 'final'; score = s.match(/\d+\s*[–—-]\s*\d+/)[0].replace(/\s*[–—]\s*/, '-'); }
      else if (/postponed|cancel|abandon/i.test(s)) { status = 'final'; score = s; }
    }
    const cls = cfg.team ? { team: cfg.team, tags: cfg.tags || [] } : classify(cfg.classify, home, away);
    if (!cls) continue;
    const report = (stripRefs(p.report || '').match(/https?:\/\/[^\s\]|]+/) || [])[0];
    const round = clean(p.round || '').replace(/^Match\s*/i, 'Match ');
    out.push({
      id: `wiki-${cls.team}-${new Date(t).toISOString().slice(0, 10)}-${(home + away).toLowerCase().replace(/[^a-z]/g, '').slice(0, 40)}`,
      team: cls.team, tags: cls.tags, sport: cfg.sport, comp: cfg.comp + (round && cfg.showRound ? ` · ${round}` : ''),
      home, away, startUTC: new Date(t).toISOString(), timeTBC: tbc,
      venue: parts[0] || '', city, tz, status, score, summary,
      source: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`, link: report,
    });
  }
  return out;
}

// Simple wikitable reader with rowspan support: rows of cell strings
function tableRows(table) {
  const rows = [], carry = [];
  for (const chunk of table.split(/\n\|-[^\n]*/).slice(1)) {
    const cells = chunk.split(/\n\||\|\|/).slice(1).map(c => c.trim());
    const row = [];
    let ci = 0;
    const take = () => { while (carry[row.length]?.left > 0) { row.push(carry[row.length].v); carry[row.length - 1].left--; } };
    for (const c of cells) {
      take();
      const m = c.match(/^((?:\s*[a-z]+="[^"]*"\s*)+)\|(?!\|)([\s\S]*)$/i);
      const attrs = m ? m[1] : '', v = (m ? m[2] : c).trim();
      const rs = +((attrs.match(/rowspan="?(\d+)/i) || [])[1] || 1);
      if (rs > 1) carry[row.length] = { v, left: rs - 1 };
      row.push(v); ci++;
    }
    take();
    if (row.length) rows.push(row);
  }
  return rows;
}

// UFC: the "Scheduled events" and recent "Past events" tables on List of UFC events
function ufcFromList(text, cityTz) {
  const out = [];
  for (const [sec, past] of [['Scheduled events', false], ['Past events', true]]) {
    const i = text.indexOf(`==${sec}==`);
    if (i < 0) continue;
    const end = text.indexOf('\n|}', i);
    const rows = tableRows(text.slice(i, end < 0 ? undefined : end));
    for (const row of rows.slice(0, past ? 5 : 40)) {
      const di = row.findIndex(c => /\{\{\s*dts/i.test(c));
      const evCell = row.find(c => /UFC/.test(c));
      if (di < 0 || !evCell) continue;
      const d = dateOf(row[di]);
      if (!d) continue;
      const name = clean(evCell), venue = clean(row[di + 1] || ''), loc = clean(row[di + 2] || '');
      const bits = loc.split(',').map(x => x.trim());
      const tz = cityTz(bits[0]) || cityTz(bits[bits.length - 1]) || 'America/New_York';
      const [label, bout] = name.includes(':') ? name.split(/:\s*/) : [name, ''];
      const [a, b] = bout.split(/\s+vs\.?\s+/i);
      // cards usually start early evening local time; flagged as TBC on the page
      const t = localToUTC(d.y, d.m, d.d, 18, 0, tz);
      const link = (evCell.match(/\[\[([^\]|]+)/) || [])[1];
      out.push({
        id: `wiki-ufc-${name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60)}`, team: 'ufc', tags: [], sport: 'mma', comp: label,
        home: a || label, away: b || 'TBC', startUTC: new Date(t).toISOString(), timeTBC: true,
        venue: /^(TBA|to be announced)$/i.test(venue) ? '' : venue, city: loc, tz, status: past ? 'final' : 'upcoming',
        score: past ? 'Results on event page' : undefined,
        source: link ? `https://en.wikipedia.org/wiki/${encodeURIComponent(link.replace(/ /g, '_'))}` : 'https://en.wikipedia.org/wiki/List_of_UFC_events',
      });
    }
  }
  return out;
}

export async function wikiEvents(pageCfgs, cityTz, diag) {
  const nowD = new Date();
  const Y = nowD.getUTCFullYear(), M = nowD.getUTCMonth();
  const s0 = M >= 6 ? Y : Y - 1;
  const seasons = [`${s0}–${String(s0 + 1).slice(2)}`, ...(M >= 4 && M < 6 ? [`${s0 + 1}–${String(s0 + 2).slice(2)}`] : [])];
  const years = [...(M === 0 ? [Y - 1] : []), Y, ...(M >= 8 ? [Y + 1] : [])];
  const api = async q => {
    const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&maxlag=5&' + q, { headers: UA });
    if (!r.ok) throw new Error(`wikipedia ${r.status}`);
    return r.json();
  };
  // expand {Y} and {S} into concrete titles
  const want = new Map();
  for (const c of pageCfgs) {
    const ts = c.title.includes('{S}') ? seasons.map(s => c.title.replace('{S}', s)) : c.title.includes('{Y}') ? years.map(y => c.title.replace('{Y}', y)) : [c.title];
    for (const t of ts) want.set(t, c);
  }
  // NZ cricket tours change name every summer, so find them by search
  for (const q of [...seasons, ...years.map(String)].flatMap(s => [`intitle:"in New Zealand in ${s}"`, `intitle:"New Zealand" intitle:"cricket team in" "${s}"`])) {
    try {
      const r = await api('action=query&list=search&srlimit=20&srnamespace=0&srsearch=' + encodeURIComponent(q));
      for (const { title } of r.query?.search || []) {
        if (!/cricket team/.test(title) || !/New Zealand/.test(title) || !/\b20\d\d\b/.test(title)) continue;
        if (![...seasons, ...years.map(String)].some(s => title.endsWith(s))) continue;
        want.set(title, { sport: 'cricket', comp: /women/i.test(title) ? "White Ferns" : 'Black Caps', classify: 'nzcricket', women: /women's cricket team/i.test(title), seriesTitle: true });
      }
    } catch (e) { diag.wikiSearch = e.message; }
  }
  const titles = [...want.keys()];
  const texts = {};
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(batch.join('|')));
    const redir = Object.fromEntries((r.query?.redirects || []).map(x => [x.to, x.from]));
    const normd = Object.fromEntries((r.query?.normalized || []).map(x => [x.to, x.from]));
    for (const pg of r.query?.pages || []) {
      if (pg.missing) continue;
      const key = redir[pg.title] || normd[pg.title] || pg.title;
      texts[normd[key] || key] = { title: pg.title, text: pg.revisions?.[0]?.slots?.main?.content || '' };
    }
    await sleep(300);
  }
  const out = [], per = {};
  for (const [want_t, c] of want) {
    const pg = texts[want_t];
    if (!pg) continue;
    const evs = c.ufc ? ufcFromList(pg.text, cityTz) : eventsFromPage(pg.title, pg.text, c.seriesTitle ? { ...c, comp: seriesComp(pg.title, c) } : c, cityTz);
    per[pg.title] = evs.length;
    out.push(...evs);
  }
  diag.wikipedia = per;
  return out;
}
// "Indian cricket team in New Zealand in 2026–27" -> "Black Caps v India"
function seriesComp(title, c) {
  const m = title.match(/^(.*?) (?:women's )?cricket team in (.*?) in /);
  if (!m) return c.comp;
  const other = [m[1], m[2]].find(x => x !== 'New Zealand') || '';
  const adj = { Indian: 'India', Australian: 'Australia', English: 'England', Pakistani: 'Pakistan', 'Sri Lankan': 'Sri Lanka', 'South African': 'South Africa', Bangladeshi: 'Bangladesh', Afghan: 'Afghanistan', Zimbabwean: 'Zimbabwe', Irish: 'Ireland', 'West Indian': 'West Indies', Scottish: 'Scotland', Dutch: 'Netherlands' };
  return `${c.comp} v ${adj[other] || other}`;
}

// ---------- TheSportsDB ------------------------------------------------------
const TSDB = 'https://www.thesportsdb.com/api/v1/json/123/';
async function tsdb(q) {
  const r = await fetch(TSDB + q, { headers: UA });
  await sleep(2100); // free tier: 30 requests a minute
  if (!r.ok) throw new Error(`thesportsdb ${r.status}`);
  return r.json();
}
const STATUS = s => /^(FT|AET|AP|PEN|Match Finished|After Over Time|Final)$/i.test(s || '') ? 'final' : /^(NS|Not Started|TBD|PST|Postponed|CANC)$/i.test(s || '') || !s ? 'upcoming' : 'live';
function fromTsdb(ev, l) {
  const home = (ev.strHomeTeam || '').replace(/\s+Super Rugby$/, ''), away = (ev.strAwayTeam || '').replace(/\s+Super Rugby$/, '');
  const cls = classify(l.classify, home, away);
  if (!cls || !ev.strTimestamp) return null;
  const status = STATUS(ev.strStatus);
  const t = new Date(ev.strTimestamp.replace(/(\+00:00)?$/, '') + 'Z');
  const hasScore = ev.intHomeScore != null && ev.intHomeScore !== '' && status !== 'upcoming';
  return {
    id: `tsdb-${ev.idEvent}`, team: cls.team, tags: cls.tags, sport: l.sport, comp: l.comp + (ev.intRound && +ev.intRound < 50 ? ` · Round ${ev.intRound}` : ''),
    home, away, startUTC: t.toISOString(), timeTBC: false, venue: ev.strVenue || '', city: [ev.strCity, ev.strCountry].filter(Boolean).join(', '), tz: l.tz || null,
    status: status === 'live' ? 'upcoming' : status, score: hasScore ? `${ev.intHomeScore}-${ev.intAwayScore}` : undefined,
    source: `https://www.thesportsdb.com/event/${ev.idEvent}`,
  };
}
// Rounds around now for a league: last result's round, two back and a few ahead
export async function tsdbEvents(leagues, diag) {
  const out = [];
  for (const l of leagues) {
    try {
      if (l.ufc) {
        for (const q of [`eventsnextleague.php?id=${l.id}`, `eventspastleague.php?id=${l.id}`]) {
          const ev = (await tsdb(q)).events?.[0];
          if (!ev?.strTimestamp) continue;
          const m = (ev.strEvent || '').match(/^(UFC(?: Fight Night)? \d+)\s+(.+?)\s+vs\.?\s+(.+)$/i);
          out.push({ id: `tsdb-${ev.idEvent}`, team: 'ufc', tags: [], sport: 'mma', comp: m ? m[1] : ev.strEvent, home: m ? m[2] : ev.strEvent, away: m ? m[3] : 'TBC',
            startUTC: new Date(ev.strTimestamp.replace(/(\+00:00)?$/, '') + 'Z').toISOString(), timeTBC: false, venue: ev.strVenue || '', city: [ev.strCity, ev.strCountry].filter(Boolean).join(', '),
            status: new Date(ev.strTimestamp + 'Z') < Date.now() - 8 * 36e5 ? 'final' : 'upcoming', source: `https://www.thesportsdb.com/event/${ev.idEvent}` });
        }
        diag[`tsdb ${l.comp}`] = 'next/last event';
        continue;
      }
      const last = (await tsdb(`eventspastleague.php?id=${l.id}`)).events?.[0];
      const next = (await tsdb(`eventsnextleague.php?id=${l.id}`)).events?.[0];
      const ref = next || last;
      if (!ref || (!next && Date.now() - new Date(last.strTimestamp + 'Z') > 30 * DAY)) { diag[`tsdb ${l.comp}`] = 'off season'; continue; }
      const season = ref.strSeason, r0 = +(last?.intRound || next?.intRound || 1);
      const rounds = [...new Set([r0 - 2, r0 - 1, r0, r0 + 1, r0 + 2, r0 + 3])].filter(r => r >= 1 && r < 40);
      let n = 0;
      for (const r of rounds) {
        for (const ev of (await tsdb(`eventsround.php?id=${l.id}&r=${r}&s=${encodeURIComponent(season)}`)).events || []) {
          const e = fromTsdb(ev, l);
          if (e && !out.some(o => o.id === e.id)) { out.push(e); n++; }
        }
      }
      diag[`tsdb ${l.comp}`] = `${n} games, season ${season}, rounds ${rounds.join(',')}`;
    } catch (e) { diag[`tsdb ${l.comp}`] = 'error: ' + e.message; }
  }
  return out;
}
export { eventsFromPage as _eventsFromPage, ufcFromList as _ufcFromList };
