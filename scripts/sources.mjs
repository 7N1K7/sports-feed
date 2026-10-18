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
      .replace(/\{\{\s*(?:nbsp|snd|ndash|mdash|·|dot|efn|refn|notetag|cite[^|}]*|flagicon|flagdeco|flag decoration|colou?r box|vanchor|anchor)[^{}]*\}\}/gi, m => /ndash|snd/.test(m) ? '–' : /mdash/.test(m) ? '—' : /nbsp/.test(m) ? ' ' : '');
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
  const tpl = templates(raw, /^[A-Za-z][\w\- ]{0,14}$/).find(t => !/^(colou?r ?box|flag ?deco(ration)?|flagicon|nowrap|small|abbr|sort)$/i.test(t.name));
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
    case 'aucricket': return /\bAustralia\b/.test(names) && !women ? { team: 'aucricket', tags: [] } : null;
    case 'nzcricket': return nz ? { team: women ? 'whiteferns' : 'blackcaps', tags: [] } : null;
    case 'nrl': return { team: /Warriors/.test(names) ? 'warriors' : 'nrl', tags: ['nrl'] };
    case 'epl': return { team: 'epl', tags: ['epl'] };
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
    let score, summary, status = 'upcoming', progress, liveScore;
    if (isCricket) {
      const sc = n => clean(p[`score${n}`]) || (p[`runs${n}`] ? `${clean(p[`runs${n}`])}${p[`wickets${n}`] && clean(p[`wickets${n}`]) !== '10' ? '/' + clean(p[`wickets${n}`]) : ''}` : '');
      const result = clean(p.result || '');
      // editors often write the state of play into the result line while a match is on ("Lunch, day 1", "Stumps, day 2")
      const playing = result && /\b(lunch|tea|stumps|day \d|in progress|live|innings break|drinks|rain|bad light|delayed|play (?:to )?(?:start|resume))\b/i.test(result)
        && !/\b(won|win|drawn|draw|tied|tie|abandoned|no result)\b/i.test(result);
      if (playing) {
        progress = result;
        const a = sc(1), b = sc(2);
        if (a || b) liveScore = [a, b].filter(Boolean).join(' v ');
      } else if (result) {
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
    // nearest heading above the box, e.g. "1st T20I" on a tour page
    const heads = cfg.seriesTitle ? [...text.slice(0, tpl.at).matchAll(/^={2,5}\s*([^=\n]+?)\s*={2,5}\s*$/gm)] : [];
    const stage = heads.length ? clean(heads[heads.length - 1][1]) : '';
    out.push({
      id: `wiki-${cls.team}-${new Date(t).toISOString().slice(0, 10)}-${(home + away).toLowerCase().replace(/[^a-z]/g, '').slice(0, 40)}`,
      team: cls.team, tags: cls.tags, sport: cfg.sport, comp: cfg.comp + (round && cfg.showRound ? ` · ${round}` : ''),
      home, away, startUTC: new Date(t).toISOString(), timeTBC: tbc, ...(stage ? { stage } : {}),
      venue: parts[0] || '', city, tz, status, score, summary,
      source: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`, link: report, ...(/cricinfo\.com/.test(report || '') ? { cricinfo: report } : {}),
      // cricket boxes carry a "rain" note that editors fill in during the game ("Rain delayed the start of play")
      ...(isCricket && clean(stripRefs(p.rain || '')) ? { weather: clean(stripRefs(p.rain)) } : {}),
      ...(progress ? { progress } : {}), ...(liveScore ? { liveScore } : {}),
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
  // Australian men's tours, home and away (NZ ones are already in)
  for (const q of [...seasons, ...years.map(String)].flatMap(s => [`intitle:"cricket team in Australia in ${s}"`, `intitle:"Australian cricket team in" "${s}"`])) {
    try {
      const r = await api('action=query&list=search&srlimit=20&srnamespace=0&srsearch=' + encodeURIComponent(q));
      for (const { title } of r.query?.search || []) {
        if (!/^[A-Z][\w ]+ cricket team in [\w ]+ in 20\d\d/.test(title) || /New Zealand|women|under-19|\bA cricket/i.test(title) || !/Australia/.test(title)) continue;
        if (![...seasons, ...years.map(String)].some(s => title.endsWith(s)) || want.has(title)) continue;
        want.set(title, { sport: 'cricket', comp: 'Australia', classify: 'aucricket', seriesTitle: true });
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
  const out = [], per = {}, tableSrc = [];
  for (const [want_t, c] of want) {
    const pg = texts[want_t];
    if (!pg) continue;
    const evs = c.ufc ? ufcFromList(pg.text, cityTz) : eventsFromPage(pg.title, pg.text, c.seriesTitle ? { ...c, comp: seriesComp(pg.title, c) } : c, cityTz);
    if (c.seriesTitle) for (const e of evs) hostFirst(e, pg.title);
    per[pg.title] = evs.length;
    if (c.seriesTitle) {
      const sq = squadsFromPage(pg.text);
      if (sq.length) for (const e of evs) { const s = squadsFor(sq, e); if (s.length) e.squads = s; }
    }
    out.push(...evs);
    if (!c.seriesTitle && !c.ufc) tableSrc.push({ c, title: pg.title, text: pg.text });
  }
  diag.wikipedia = per;
  // standings: Sports table blocks on the page, or in a transcluded "... table" / "... standings" template
  const tables = [];
  try {
    const tplNames = new Map();
    for (const src of tableSrc) for (const m of src.text.matchAll(/\{\{\s*([^{}|#\n]{4,90}?(?:table|standings|ladder))\s*\}\}/gi))
      if (!/^(wide table|table alignment)/i.test(m[1])) tplNames.set('Template:' + m[1].trim(), src);
    const tplTexts = {};
    const tn = [...tplNames.keys()].slice(0, 40);
    for (let i = 0; i < tn.length; i += 20) {
      const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(tn.slice(i, i + 20).join('|')));
      const back = Object.fromEntries([...(r.query?.redirects || []), ...(r.query?.normalized || [])].map(x => [x.to, x.from]));
      for (const pg of r.query?.pages || []) if (!pg.missing) tplTexts[back[back[pg.title]] || back[pg.title] || pg.title] = pg.revisions?.[0]?.slots?.main?.content || '';
    }
    for (const src of tableSrc) {
      let text = src.text;
      // inline the transcluded table templates where they sit, so headings still apply
      text = text.replace(/\{\{\s*([^{}|#\n]{4,90}?(?:table|standings|ladder))\s*\}\}/gi, (m, n) => tplTexts['Template:' + n.trim()] || m);
      tables.push(...sportsTables(text, src.title, src.c));
    }
  } catch (e) { diag.tables = 'error: ' + e.message; }
  if (!diag.tables) diag.tables = tables.map(t => `${t.page} / ${t.title}: ${t.rows.length}`);
  // Formula 1: calendar and winners from the season page, standings from its two templates
  if (F1_ON) try {
    const y = Y;
    const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent([`${y} Formula One World Championship`, 'Template:F1 Drivers Standings', 'Template:F1 Constructors Standings'].join('|')));
    const pg = Object.fromEntries((r.query?.pages || []).filter(p => !p.missing).map(p => [p.title, p.revisions?.[0]?.slots?.main?.content || '']));
    const season = pg[`${y} Formula One World Championship`] || '';
    const f1 = f1Season(season, y, cityTz);
    out.push(...f1);
    for (const [t, title] of [['Template:F1 Drivers Standings', "Drivers' championship"], ['Template:F1 Constructors Standings', "Constructors' championship"]]) {
      const all = f1Standings(pg[t] || '');
      // constructors' points are sums of their drivers' ({{Sum|{{F1R2026|RUS|points}}|...}}): let Wikipedia work them out
      const sums = all.filter(r => r.expr);
      if (sums.length) {
        const x = await api('action=expandtemplates&prop=wikitext&title=' + encodeURIComponent(t) + '&text=' + encodeURIComponent(sums.map(r => r.expr).join('§§')));
        const vals = (x.expandtemplates?.wikitext || '').split('§§');
        sums.forEach((r, i) => { r.pts = parseFloat(clean(vals[i] || '')); });
      }
      const rows = all.filter(r => !isNaN(r.pts)).map(({ expr, ...r }) => r).sort((a, b) => b.pts - a.pts);
      if (rows.length) tables.push({ comp: 'Formula 1', sport: 'motor', team: 'f1', page: `${y} Formula One World Championship`, title, style: 'points', rows });
    }
    diag.f1 = `${f1.length} races, ${f1.filter(e => e.status === 'final').length} with results; standings: ${tables.filter(t => t.team === 'f1').map(t => `${t.title} ${t.rows.length} (top ${t.rows[0]?.name} ${t.rows[0]?.pts})`).join(', ') || 'none'}`;
  } catch (e) { diag.f1 = 'error: ' + e.message; }
  out.tables = tables;
  // UFC: read each nearby event's own article for the full fight card
  const ufcSoon = out.filter(e => e.team === 'ufc' && /\/wiki\/UFC/.test(e.source) && Math.abs(new Date(e.startUTC) - Date.now()) < 30 * DAY);
  try {
    const names = ufcSoon.map(e => decodeURIComponent(e.source.split('/wiki/')[1]).replace(/_/g, ' '));
    if (names.length) {
      const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(names.slice(0, 20).join('|')));
      const byTitle = {};
      const redir = Object.fromEntries([...(r.query?.redirects || []), ...(r.query?.normalized || [])].map(x => [x.to, x.from]));
      for (const pg of r.query?.pages || []) if (!pg.missing) byTitle[redir[pg.title] || pg.title] = pg.revisions?.[0]?.slots?.main?.content || '';
      ufcSoon.forEach((e, i) => {
        const card = fightCard(byTitle[names[i]] || '');
        if (!card.length) return;
        e.card = card;
        const main = card[0];
        if (e.away === 'TBC') Object.assign(e, { home: main.a.replace(/\s*\(c\)$/, ''), away: main.b.replace(/\s*\(c\)$/, '') });
        if (main.res === 'def.') Object.assign(e, { status: 'final', score: `${main.a} won`, summary: `${main.a} def. ${main.b}${main.method ? ` by ${main.method}` : ''}${main.round ? `, round ${main.round}` : ''}` });
      });
      // the article's opening paragraph, shown as "About" in the fight's details (credited to Wikipedia)
      const x = await api('action=query&prop=extracts&exintro=1&explaintext=1&exlimit=20&redirects=1&titles=' + encodeURIComponent(names.slice(0, 20).join('|')));
      const redir2 = Object.fromEntries([...(x.query?.redirects || []), ...(x.query?.normalized || [])].map(y => [y.to, y.from]));
      const intro = {};
      for (const pg of x.query?.pages || []) if (pg.extract) intro[redir2[pg.title] || pg.title] = pg.extract.replace(/\s+/g, ' ').trim();
      ufcSoon.forEach((e, i) => {
        const t = intro[names[i]];
        if (!t || t.length < 60) return;
        // first three sentences at most; "vs.", "U.S." and "Jr." don't end one
        const ends = [...t.matchAll(/(\S+)[.!?] (?=[A-Z])/g)].filter(m => !/^(vs|Jr|Sr|St|Mt|No|Dr|Mr|[A-Z]|(?:[A-Z]\.)+[A-Z])$/.test(m[1]));
        e.about = (ends[2] ? t.slice(0, ends[2].index + ends[2][0].length) : t).trim().slice(0, 600);
      });
      diag.ufcCards = ufcSoon.map(e => `${e.comp}: ${(e.card || []).length} bouts${e.about ? ', intro' : ''}`);
    }
  } catch (e) { diag.ufcCards = 'error: ' + e.message; }
  return out;
}

// {{#invoke:Sports table|main|style=WDL|Rugby|CricketRR ...}} -> { title, style, rows: [{ name, p, w, d, l, f, a, bp, nr, nrr, pts, q }] }
function sportsTables(text, page, c) {
  const out = [];
  for (const tpl of templates(text, /^#invoke:\s*sports table/i)) {
    const { named: p } = params(tpl.body.replace(/<!--[\s\S]*?-->/g, ''));
    const style = (p.style || 'WDL').toLowerCase();
    let order = (p.team_order || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!order.length) order = Object.keys(p).filter(k => /^team\d+$/.test(k)).sort((a, b) => +a.slice(4) - +b.slice(4)).map(k => p[k].trim());
    if (!order.length) order = Object.keys(p).filter(k => k.startsWith('name_')).map(k => k.slice(5).toUpperCase());
    const g = (k, code) => { const v = p[`${k}_${code.toLowerCase()}`] ?? p[`${k}_${code}`]; const n = parseFloat(clean(v || '').replace('−', '-')); return isNaN(n) ? 0 : n; };
    const has = (k, code) => (p[`${k}_${code.toLowerCase()}`] ?? p[`${k}_${code}`]) != null;
    const cricket = /cricket/.test(style), rugby = /rugby/.test(style);
    const winPts = +(p.winpoints || p.win_points || (rugby ? 4 : cricket ? 2 : c.sport === 'league' ? 2 : 3));
    const drawPts = +(p.drawpoints || p.draw_points || (rugby ? 2 : 1));
    const lossPts = +(p.losspoints || 0), goalPts = p.goalpoints != null ? +p.goalpoints || 1 : 0;
    // |auto_generate_standings=y (Premier League and others): no |win_TTT= etc., only |match_HOME_AWAY=score cells
    const auto = /^(y|yes|true|on|1)$/i.test(p.auto_generate_standings || '') ? autoStandings(p) : null;
    if (auto) order = auto.order;
    let rows = order.map(code => {
      const w = g('win', code), d = g('draw', code), l = g('loss', code), nr = g('nr', code);
      const f = has('pf', code) ? g('pf', code) : g('gf', code), a = has('pa', code) ? g('pa', code) : g('ga', code);
      const bp = rugby ? g('tb', code) + g('lb', code) + g('bonus', code) : g('bonus', code);
      const pts = w * winPts + d * drawPts + l * lossPts + f * goalPts + nr * (cricket ? winPts / 2 : 0) + bp + g('rw', code) * +(p.rwpoints || 0) + g('adjust_points', code) + g('startpoints', code);
      const nameRaw = p[`name_${code.toLowerCase()}`] ?? p[`name_${code}`] ?? code;
      const status = (p[`status_${code.toLowerCase()}`] ?? p[`status_${code}`] ?? '').trim();
      return { name: teamOf(nameRaw).replace(/\s*\((RS|RU|C|H|Q)\)\s*$/g, '').trim() || code, p: w + d + l + nr + g('tie', code), w, d, l, f, a, bp, nr,
        nrr: has('nrr', code) ? clean(p[`nrr_${code.toLowerCase()}`] ?? p[`nrr_${code}`]) : '', pts, q: '', champ: /^C$/.test(status) };
    });
    if (auto) rows = rankAuto(rows, auto, p, { winPts, drawPts, lossPts });
    // |resultN= colours table position N
    rows.forEach((r, i) => { r.q = p[`result${i + 1}`] || ''; });
    if (!rows.length) continue;
    const before = text.slice(0, tpl.at);
    const heads = [...before.matchAll(/^={2,4}\s*([^=\n]+?)\s*={2,4}\s*$/gm)];
    const head = heads.length ? clean(heads[heads.length - 1][1]) : '';
    out.push({ comp: c.comp, sport: c.sport, team: c.team || '', page, title: clean(p.title || '') || (/standings|table|ladder|log/i.test(head) || !head ? '' : head), style: cricket ? 'cricket' : rugby ? 'rugby' : 'wdl', rows });
  }
  return out;
}

// Module:Sports table/auto, in brief: tally the |match_HOME_AWAY=2–1 cells into |win_TTT=, |draw_TTT=, |loss_TTT=,
// |gf_TTT=, |ga_TTT= (written into p), and give the base order (|default_order=, then by name). Codes are lower case
// here because params() lower-cases keys. rankAuto then sorts by |ranking_criteria=.
function autoStandings(p) {
  const list = v => String(v || '').split(/\s*[;,]\s*/).map(x => x.trim().toLowerCase()).filter(Boolean);
  const ext = new Set(list(p.external_teams)), withdrawn = list(p.withdrawn_teams);
  const codes = new Set();
  for (const k of Object.keys(p)) { const m = k.match(/^(?:name|schedule)_(.+)$/); if (m) codes.add(m[1]); }
  // "ars_che" -> ["ars", "che"]; prefer splits into known codes, as codes may hold underscores
  const split = rest => {
    const cands = [];
    for (let i = rest.indexOf('_'); i > 0 && i < rest.length - 1; i = rest.indexOf('_', i + 1)) cands.push([rest.slice(0, i), rest.slice(i + 1)]);
    return cands.find(([h, a]) => codes.has(h) && codes.has(a)) || cands.find(([h]) => codes.has(h)) || cands.find(([, a]) => codes.has(a)) || cands[cands.length - 1];
  };
  const keys = Object.keys(p).sort().map(k => k.match(/^match(n?)(\d*)_(.+)$/)).filter(m => m && !/_note$/.test(m[3]));
  for (const m of keys) for (const x of split(m[3]) || []) codes.add(x);
  const legs = +p.legs || 1, seen = new Set(), matches = [];
  for (const [key, n, num, rest] of keys) {
    const [h, a] = split(rest) || [];
    if (!h || h === a || ext.has(h) || ext.has(a)) continue;
    if (!n && !((legs === 1 && !num) || (num && +num <= legs))) continue; // only the cells the results grid shows
    const id = n ? `n${num || 1}|${[h, a].sort().join('|')}` : `${num || 1}|${h}|${a}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const s = clean(String(p[key]).replace(/&[nm]dash;|&minus;/gi, '-')).replace(/[–—−‒―‐‑]/g, '-').match(/^(\d+(?:\.\d+)?)\s*-+\s*(\d+(?:\.\d+)?)/);
    if (s) matches.push({ h, a, hs: +s[1], as: +s[2] }); // blank, "a" or a link to a rivalry article = not played yet
  }
  const teams = [...codes].filter(x => !ext.has(x));
  const st = tally(teams, matches);
  for (const x of teams) {
    Object.assign(p, { [`win_${x}`]: String(st[x].w), [`draw_${x}`]: String(st[x].d), [`loss_${x}`]: String(st[x].l), [`gf_${x}`]: String(st[x].gf), [`ga_${x}`]: String(st[x].ga) });
    delete p[`pf_${x}`]; delete p[`pa_${x}`];
  }
  const nameKey = x => clean(p[`name_${x}`] || x).toLowerCase();
  const alpha = teams.slice().sort((x, y) => nameKey(x) < nameKey(y) ? -1 : nameKey(x) > nameKey(y) ? 1 : x < y ? -1 : 1);
  const base = [...new Set([...list(p.default_order).filter(x => codes.has(x) && !ext.has(x)), ...alpha])];
  const ranked = base.filter(x => !withdrawn.includes(x));
  return { order: [...ranked, ...withdrawn.filter(x => codes.has(x) && !ext.has(x))], ranked: ranked.length, matches };
}
function tally(teams, matches) {
  const st = Object.fromEntries(teams.map(x => [x, { w: 0, d: 0, l: 0, gf: 0, ga: 0 }]));
  const add = (t, f, a) => { t.gf += f; t.ga += a; t[f > a ? 'w' : f < a ? 'l' : 'd']++; };
  for (const m of matches) if (st[m.h] && st[m.a]) { add(st[m.h], m.hs, m.as); add(st[m.a], m.as, m.hs); }
  return st;
}
// Sort auto-generated rows by |ranking_criteria= (default "pts, gd, gf"): overall and head-to-head pts, gd, gf, ga,
// w, d, l, ppg and wp. Criteria after a "." apply only once |update=complete. Ties keep the base order.
function rankAuto(rows, auto, p, { winPts, drawPts, lossPts }) {
  const complete = /^complete$/i.test(String(p.update || '').trim());
  const crits = [];
  let buf = '', final = false;
  const flush = () => {
    let id = buf.trim().toLowerCase().replace(/\s+/g, '_'), desc = true;
    buf = '';
    if (id.startsWith('-')) { desc = false; id = id.slice(1); }
    const m = id.match(/^(h2h_)?(pts|gd|gf|ga|w|d|l|ppg|wp)$/);
    if (!m || (final && !complete) || (m[1] && p.h2h_after_complete && !complete)) return;
    crits.push({ h2h: !!m[1], base: m[2], desc });
  };
  for (const ch of String(p.ranking_criteria || 'pts, gd, gf').replace(/−|&minus;/g, '-')) {
    if (/[,;()]/.test(ch)) flush();
    else if (ch === '.') { flush(); final = true; }
    else buf += ch;
  }
  flush();
  const n = auto.ranked, idx = new Map(auto.order.map((x, i) => [x, i]));
  const val = (base, s) => {
    const pld = s.w + s.d + s.l;
    return { pts: s.pts, gd: s.f - s.a, gf: s.f, ga: s.a, w: s.w, d: s.d, l: s.l, ppg: pld ? s.pts / pld : null, wp: pld ? 100 * s.w / pld : null }[base];
  };
  let buckets = [auto.order.slice(0, n)];
  for (const cr of crits) {
    buckets = buckets.flatMap(b => {
      if (b.length < 2) return [b];
      let stats;
      if (cr.h2h) {
        const t = tally(b, auto.matches);
        stats = Object.fromEntries(b.map(x => [x, { ...t[x], f: t[x].gf, a: t[x].ga, pts: t[x].w * winPts + t[x].d * drawPts + t[x].l * lossPts }]));
      } else stats = Object.fromEntries(b.map(x => [x, rows[idx.get(x)]]));
      const v = Object.fromEntries(b.map(x => [x, val(cr.base, stats[x])]));
      const key = x => v[x] == null ? -Infinity : cr.desc ? v[x] : -v[x]; // undefined values go last
      const sorted = b.slice().sort((x, y) => key(y) - key(x) || idx.get(x) - idx.get(y));
      const out = [];
      for (const x of sorted) if (out.length && key(out[out.length - 1][0]) === key(x)) out[out.length - 1].push(x); else out.push([x]);
      return out;
    });
  }
  return [...buckets.flat(), ...auto.order.slice(n)].map(x => rows[idx.get(x)]);
}

const F1_ON = true;
// F1 season page: "Calendar" table (round, Grand Prix, circuit and city, date) and
// "Grands Prix" results table (round, Grand Prix, pole, fastest lap, winner, constructor, report)
const rowsOf = table => table.split(/\n\|-[^\n]*/).slice(1).map(r => r.split('\n').filter(l => /^[|!]/.test(l)).flatMap(l => l.slice(1).split(/\|\||!!/)).map(c => c.replace(/^[^|[{]*?(?:style|data-sort-value|nowrap|class)[^|]*\|/i, '').replace(/^nowrap\|/, '')));
function f1Season(text, year, cityTz) {
  const sec = (re) => { const i = text.search(re); if (i < 0) return ''; const t = text.slice(i); const m = t.match(/\{\|[\s\S]*?\n\|\}/); return m ? m[0] : ''; };
  const winners = {};
  for (const c of rowsOf(sec(/===\s*Grands Prix\s*===/i))) {
    const round = +clean(c[0]);
    if (!round || c.length < 6) continue;
    const report = (c[6] || '').match(/\[\[([^\]|]+)\|/);
    winners[round] = { pole: clean(c[2]), fl: clean(c[3]), winner: clean(c[4]), team: clean(c[5]), report: report ? 'https://en.wikipedia.org/wiki/' + encodeURIComponent(report[1].replace(/ /g, '_')) : '' };
  }
  const out = [];
  for (const c of rowsOf(sec(/==\s*Calendar\s*==/i))) {
    const round = +clean(c[0]);
    if (!round || c.length < 4) continue;
    const gp = clean(c[1]).replace(/\s+/g, ' ');
    const place = c[2].split(/\]\]\s*,\s*/).map(x => clean(x + (/\[\[/.test(x) && !/\]\]/.test(x) ? ']]' : '')).split(',')[0].trim());
    const d = dateOf(clean(c[3]), year);
    if (!gp || !d || d.m < 0) continue;
    const city = place[place.length - 1] || '', tz = cityTz(city) || null;
    const w = winners[round];
    const t = localToUTC(d.y, d.m, d.d, 15, 0, tz || 'UTC');
    out.push({
      id: `f1-${year}-${round}`, team: 'f1', tags: [], sport: 'motor', comp: `Formula 1 · Round ${round}`, round: `Round ${round}`,
      home: gp, away: '', startUTC: new Date(t).toISOString(), timeTBC: true, venue: place[0] || '', city, tz,
      status: w?.winner ? 'final' : 'upcoming', ...(w?.winner ? { score: w.winner.split(' ').slice(-1)[0] + ' wins', summary: `${w.winner} won for ${w.team}. Pole: ${w.pole}. Fastest lap: ${w.fl}.` } : {}),
      source: `https://en.wikipedia.org/wiki/${encodeURIComponent(`${year} Formula One World Championship`.replace(/ /g, '_'))}`, ...(w?.report ? { link: w.report } : {}),
    });
  }
  return out;
}
// "F1 Drivers Standings" / "F1 Constructors Standings": position, name, a cell per race, points last.
// A constructor takes two rows (one per driver) and its points cell is a {{Sum|...}} of its drivers' points:
// those come back as `expr`, for wikiEvents to have Wikipedia expand. Unsorted.
function f1Standings(text) {
  const m = text.match(/\{\|\s*class="wikitable"[\s\S]*?\n\|\}/);
  if (!m) return [];
  // a cell's content, without its leading | or ! and any style="..." attributes
  const cell = l => stripRefs(l).replace(/^[|!]\s*/, '').replace(/^[^|[{]*?\|(?!\|)/, '').trim();
  const rows = [];
  for (const r of m[0].split(/\n\|-[^\n]*/).slice(1)) {
    const lines = r.split('\n').filter(l => /^[|!]/.test(l));
    const pos = +clean(cell(lines[0] || ''));
    const nameLine = lines.find(l => /\[\[/.test(l));
    const last = cell(lines[lines.length - 1] || '');
    if (!pos || !nameLine || lines.length < 3) continue;
    // link labels first, so "{{nowrap|[[Red Bull Racing]]-[[Red Bull Powertrains|Red Bull Ford]]}}" reads "Red Bull Racing-Red Bull Ford"
    const name = clean(cell(nameLine).replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1'));
    const lit = clean(last).replace('−', '-');
    const pts = /^-?\d+(\.\d+)?$/.test(lit) ? +lit : NaN;
    if (!name || (isNaN(pts) && !/\{\{/.test(last))) continue;
    rows.push({ name, pts, ...(isNaN(pts) ? { expr: last } : {}), ...(/\{\{\s*flagicon\s*\|\s*NZL?\s*[|}]/i.test(nameLine) ? { nz: true } : {}),
      p: 0, w: 0, d: 0, l: 0, f: 0, a: 0, bp: 0, nr: 0, nrr: '', q: '', champ: false });
  }
  return rows;
}

// Wikipedia's calendar has race dates only; TheSportsDB (free key) has start times. At most one call a run:
// the weekend of the next race not looked up in the last 12 hours. Answers are kept in `cache` (fetch.mjs saves it).
export async function f1StartTimes(events, cache, diag) {
  const now = Date.now();
  const races = events.filter(e => e.team === 'f1');
  const due = races.filter(e => e.status !== 'final' && Date.parse(e.startUTC) > now - DAY && Date.parse(e.startUTC) < now + 60 * DAY)
    .find(e => !cache[e.id] || now - cache[e.id].t > 12 * 36e5);
  const notes = [];
  if (due) {
    const [, season, round] = due.id.split('-');
    try {
      const d = await tsdb(`eventsround.php?id=4370&r=${round}&s=${season}`);
      // the race itself, not practice, sprint or qualifying, within two days of Wikipedia's date
      const t = (d.events || []).filter(ev => ev.strTimestamp && !/practice|qualifying|sprint|shootout|testing/i.test(ev.strEvent || ''))
        .map(ev => Date.parse(ev.strTimestamp.replace(/(\+00:00|Z)$/, '') + 'Z')).find(t => Math.abs(t - Date.parse(due.startUTC)) < 2 * DAY);
      cache[due.id] = { t: now, gp: due.home, startUTC: t ? new Date(t).toISOString() : null };
      notes.push(`${due.home}: ${t ? new Date(t).toISOString() : 'no time listed yet'}`);
    } catch (e) { notes.push(`${due.home}: ${e.message}`); }
  }
  let n = 0;
  for (const e of races) {
    const c = cache[e.id];
    if (c?.startUTC && c.gp === e.home && Math.abs(Date.parse(c.startUTC) - Date.parse(e.startUTC)) < 2 * DAY) { Object.assign(e, { startUTC: c.startUTC, timeTBC: false }); n++; }
  }
  diag.f1Times = [...notes, `${n} of ${races.length} races with start times`].join('; ');
}

// Cricket tour "Squads" tables: header rows give each column's team and/or format
// (Tests / ODIs / T20Is), the cell under it lists players. Struck-out players are left out.
const FORMAT = s => /T20/i.test(s) ? 'T20I' : /ODI|One Day/i.test(s) ? 'ODI' : /Test/i.test(s) ? 'Test' : '';
function squadsFromPage(text) {
  const i = text.search(/^==\s*Squads?\s*==/im);
  if (i < 0) return [];
  const rest = text.slice(i + 5), j = rest.search(/^==[^=]/m);
  const sec = j < 0 ? rest : rest.slice(0, j);
  const out = [];
  // footnotes like {{Efn|name=ODI4&5|Only for 4th and 5th ODIs}}, reused later as {{Efn|name=ODI4&5}}
  const notes = {};
  for (const m of sec.matchAll(/\{\{\s*efn\s*\|([^{}]*)\}\}/gi)) { const p = params('x|' + m[1]); if (p.named.name && p.pos[0]) notes[p.named.name] = p.pos[0]; }
  const games = note => {
    if (!/only/i.test(note)) return null;
    const words = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5 };
    return [...note.matchAll(/\b(\d)(?:st|nd|rd|th)\b|\b(first|second|third|fourth|fifth)\b/gi)].map(m => +m[1] || words[m[2].toLowerCase()]);
  };
  for (const tm of sec.matchAll(/\{\|[\s\S]*?\n\|\}/g)) {
    const rows = tm[0].split(/\n\|-[^\n]*/).slice(1);
    const cols = [];
    let data = null;
    for (const row of rows) {
      const lines = row.split('\n').filter(l => l.trim());
      if (lines.length && lines.every(l => l.startsWith('!'))) {
        const cells = lines.flatMap(l => l.slice(1).split('!!'));
        let k = 0;
        for (const cell of cells) {
          const m = cell.match(/^\s*colspan\s*=\s*"?(\d+)"?\s*\|([\s\S]*)$/i) || cell.match(/^\s*[a-z]+\s*=[^|]*\|([\s\S]*)$/i);
          const span = m && m[2] !== undefined ? +m[1] : 1, body = m ? (m[2] ?? m[1]) : cell;
          const txt = stripRefs(body);
          for (let n = 0; n < span; n++, k++) {
            cols[k] = cols[k] || {};
            if (FORMAT(txt) && !/\{\{/.test(txt)) cols[k].format = FORMAT(txt);
            else { const t = teamOf(txt); if (t) cols[k].team = t; }
          }
        }
      } else if (lines.some(l => l.startsWith('*'))) { data = row; break; }
    }
    if (!data) continue;
    const cells = [];
    for (const l of data.split('\n')) {
      if (/^\|(?!\})/.test(l)) cells.push([]);
      else if (l.startsWith('*') && cells.length) cells[cells.length - 1].push(l);
    }
    cells.forEach((lines, k) => {
      const col = cols[k];
      if (!col?.team) return;
      const players = lines.filter(l => !/<s>/.test(l)).map(l => {
        const roles = [...l.matchAll(/\[\[[^\]|]*\|(c|vc|wk)\]\]/gi)].map(m => m[1].toLowerCase());
        const n = clean(l.replace(/^\*\s*/, '').replace(/\{\{\s*efn[\s\S]*?\}\}/gi, '').replace(/\s*\((?:\s*\[\[[^\]]*\]\]\s*,?)+\s*\)/g, '')).trim();
        const efn = l.match(/\{\{\s*efn\s*\|([^{}]*)\}\}/i), ep = efn ? params('x|' + efn[1]) : null;
        const only = ep ? games(ep.pos[0] || notes[ep.named.name] || '') : null;
        // the player's own article, for a profile link (role links like [[Captain (cricket)|c]] aside)
        const w = [...l.matchAll(/\[\[([^\]|#]+)(?:\|[^\]]*)?\]\]/g)].map(m => m[1].trim()).find(t => !/captain|wicket|vice|^(c|vc|wk)$/i.test(t));
        return n ? { n, r: roles.join(', '), ...(w ? { w } : {}), ...(only?.length ? { only } : {}) } : null;
      }).filter(Boolean);
      if (players.length) out.push({ team: col.team, format: col.format || '', players });
    });
  }
  return out;
}
function squadsFor(sq, e) {
  const f = FORMAT(e.stage || '') || FORMAT(e.comp || '');
  const base = t => (t || '').replace(/\s+Women('s)?$/, '');
  return [e.home, e.away].map(side => {
    const mine = sq.filter(s => base(s.team) === base(side));
    const pick = mine.find(s => s.format === f) || mine.find(s => !s.format);
    const no = +(`${e.stage || ''} ${e.comp || ''}`.match(/\b(\d)(?:st|nd|rd|th)\b/) || [])[1];
    return pick ? { team: side, players: pick.players.filter(p => !p.only || !no || p.only.includes(no)).map(({ n, r }) => (r ? { n, r } : { n })) } : null;
  }).filter(Boolean);
}

// {{MMAevent card|Main card}} then {{MMAevent bout|Weight|A|def./vs.|B|Method|Round|Time|Notes}};
// before the card is set, the "Announced bouts" list: * Lightweight bout: A vs. B
function fightCard(text) {
  const bouts = [];
  let section = '';
  for (const tpl of templates(text, /^MMAevent (card|bout)$/i)) {
    const { name, pos } = params(tpl.body);
    if (/card/i.test(name)) { section = clean(pos[0] || ''); continue; }
    const [weight, a, res, b, method, round, time] = pos.map(clean);
    if (a && b) bouts.push({ section, weight, a, b, res: /def/i.test(res) ? 'def.' : /draw/i.test(res) ? 'draw' : /nc|no contest/i.test(res) ? 'NC' : 'vs.', method, round, time });
  }
  if (!bouts.length) {
    const i = text.search(/==\s*Announced bouts\s*==/i);
    if (i >= 0) for (const m of text.slice(i, text.indexOf('\n==', i + 5) > 0 ? text.indexOf('\n==', i + 5) : undefined).matchAll(/^\*\s*([^:\n]*?)\s*(?:bout)?:\s*(.+?)\s+vs\.?\s+(.+)$/gim))
      bouts.push({ section: 'Announced', weight: clean(m[1]).replace(/\s*bout$/i, ''), a: clean(m[2]), b: clean(m[3]).replace(/\s*\(.*$/, ''), res: 'vs.' });
  }
  return bouts.slice(0, 20);
}
// "Indian cricket team in New Zealand in 2026–27" -> "Black Caps v India"
// Wikipedia lists either side first in a tour's match boxes; put the host country first every time,
// so the whole tour reads (and groups) as one series, e.g. "South Africa v Australia"
function hostFirst(e, title) {
  const host = ((title.match(/ cricket team in (?:the )?(.*?) in /) || [])[1] || '').trim();
  const base = n => String(n || '').replace(/\s+(Women|A|XI)$/i, '').trim();
  if (!host || base(e.home) === host || base(e.away) !== host) return;
  [e.home, e.away] = [e.away, e.home];
  const sides = (e.score || '').split(' v ');
  if (sides.length === 2) e.score = `${sides[1]} v ${sides[0]}`;
  if (e.homeLogo || e.awayLogo) [e.homeLogo, e.awayLogo] = [e.awayLogo, e.homeLogo];
}
function seriesComp(title, c) {
  const m = title.match(/^(.*?) (?:women's )?cricket team in (.*?) in /);
  if (!m) return c.comp;
  const other = [m[1], m[2]].find(x => !/^(New Zealand|Australian?)$/.test(x) || (c.comp !== 'Australia' && /^Australian?$/.test(x))) || '';
  const adj = { Indian: 'India', Australian: 'Australia', English: 'England', Pakistani: 'Pakistan', 'Sri Lankan': 'Sri Lanka', 'South African': 'South Africa', Bangladeshi: 'Bangladesh', Afghan: 'Afghanistan', Zimbabwean: 'Zimbabwe', Irish: 'Ireland', 'West Indian': 'West Indies', Scottish: 'Scotland', Dutch: 'Netherlands' };
  return `${c.comp} v ${adj[other] || other}`;
}

// ---------- TheSportsDB ------------------------------------------------------
const TSDB = 'https://www.thesportsdb.com/api/v1/json/123/';
// One shared budget per run: if TheSportsDB rate-limits us twice, or we've spent 90s on it, skip it until next run
let tsdbBlocked = false;
const tsdbStart = Date.now();
export async function tsdb(q) {
  for (let attempt = 0; ; attempt++) {
    if (tsdbBlocked || Date.now() - tsdbStart > 150000) throw new Error('thesportsdb skipped this run');
    const r = await fetch(TSDB + q, { headers: UA, signal: AbortSignal.timeout(10000) });
    await sleep(6000); // the free key allows about 10 calls a minute
    if (r.status === 429) { if (attempt) { tsdbBlocked = true; throw new Error('thesportsdb 429'); } await sleep(15000); continue; }
    if (!r.ok) throw new Error(`thesportsdb ${r.status}`);
    return r.json();
  }
}
const STATUS = s => /^(FT|AET|AP|PEN|Match Finished|After Over Time|Final)$/i.test(s || '') ? 'final' : /^(NS|Not Started|TBD|PST|Postponed|CANC)$/i.test(s || '') || !s ? 'upcoming' : 'live';
// "Crusaders Super Rugby", "Fiji Rugby League", "New Zealand Rugby" -> "Crusaders", "Fiji", "New Zealand"
const tsdbTeam = s => (s || '').replace(/\s+(Super Rugby|Rugby League|Rugby Union|Rugby)$/, '');
function fromTsdb(ev, l) {
  const home = tsdbTeam(ev.strHomeTeam), away = tsdbTeam(ev.strAwayTeam);
  const cls = l.team ? { team: l.team, tags: l.tags || [] } : classify(l.classify, home, away);
  if (!cls || !ev.strTimestamp) return null;
  const status = STATUS(ev.strStatus);
  const t = new Date(ev.strTimestamp.replace(/(\+00:00)?$/, '') + 'Z');
  const hasScore = ev.intHomeScore != null && ev.intHomeScore !== '' && status !== 'upcoming';
  // fill-only leagues: remember the round so the next run can ask for it directly; midnight UTC is a placeholder time
  const fill = l.fill ? { fill: true, tsdbRound: ev.intRound ?? null, tsdbSeason: ev.strSeason || null, ...(/T00:00(:00)?$/.test(ev.strTimestamp.replace(/\+00:00$/, '')) ? { timeTBC: true } : {}) } : {};
  return {
    id: `tsdb-${ev.idEvent}`, team: cls.team, tags: cls.tags, sport: l.sport, comp: l.comp + (ev.intRound && +ev.intRound < 50 ? ` · Round ${ev.intRound}` : ''),
    home, away, startUTC: t.toISOString(), timeTBC: false, venue: ev.strVenue || '', city: [ev.strCity, ev.strCountry].filter(Boolean).join(', '), tz: l.tz || null,
    status: status === 'live' ? 'upcoming' : status, score: hasScore ? `${ev.intHomeScore}-${ev.intAwayScore}` : undefined,
    source: `https://www.thesportsdb.com/event/${ev.idEvent}`,
    // each side's club badge comes with the fixture, so clubs get logos without extra calls
    ...(ev.strHomeTeamBadge ? { homeLogo: ev.strHomeTeamBadge + '/tiny' } : {}), ...(ev.strAwayTeamBadge ? { awayLogo: ev.strAwayTeamBadge + '/tiny' } : {}),
    ...fill,
  };
}

// Fill-only leagues ("fill" in data/wiki-pages.json) never add cards. They give a final score or an exact start time
// to a Wikipedia or curated card that lacks one. gapsFor(l, known) (from fetch.mjs) lists those cards, given the games
// this league already gave: [{ e, need: 'score' | 'time', known }]. No gaps, no calls. Otherwise at most FILL_LEAGUE
// calls: the round of a game seen before (or the league's last game, then its round) for scores, the next game and
// its round for start times. Games found are kept in the cache for 3 days, so a score found once costs nothing after.
// A score for a game the league lists is asked for every run; a start time, or a game it doesn't list, once an hour.
const FILL_LEAGUE = 3, FILL_RUN = 6;
async function fillLeague(l, out, diag, cache, gapsFor, left) {
  const key = `fill ${l.id}`, now = Date.now();
  let got = (cache[key]?.events || []).filter(e => now - Date.parse(e.startUTC) < 3 * DAY);
  const miss = Object.fromEntries(Object.entries(cache[key]?.miss || {}).filter(([, t]) => now - t < DAY));
  const due = g => (g.need === 'score' && g.known) || !(now - (miss[g.e.id] || 0) < 36e5);
  let open = gapsFor ? gapsFor(l, got) : [];
  const before = open.length, asking = open.filter(due);
  const need = n => open.some(g => g.need === n && due(g));
  let calls = 0;
  const max = Math.min(FILL_LEAGUE, left);
  const add = evs => { for (const ev of (evs || []).filter(Boolean)) { const e = fromTsdb(ev, l); if (e) got = [...got.filter(x => x.id !== e.id), e]; } open = gapsFor ? gapsFor(l, got) : []; };
  const call = async q => { calls++; return (await tsdb(q)).events || []; };
  const asked = new Set();
  const round = async (r, s) => {
    if (r == null || r === '' || !s || asked.has(`${r}|${s}`) || calls >= max) return;
    asked.add(`${r}|${s}`);
    add(await call(`eventsround.php?id=${l.id}&r=${r}&s=${encodeURIComponent(s)}`));
  };
  let err = '';
  try {
    if (need('score') && calls < max) {
      const k = open.find(g => g.need === 'score' && g.known?.tsdbSeason)?.known;
      if (k) await round(k.tsdbRound, k.tsdbSeason);
      else { const [last] = await call(`eventspastleague.php?id=${l.id}`); add([last]); if (last && need('score')) await round(last.intRound, last.strSeason); }
    }
    if (need('time') && calls < max) {
      const [next] = await call(`eventsnextleague.php?id=${l.id}`); add([next]);
      if (next && need('time')) await round(next.intRound, next.strSeason);
    }
  } catch (e) { err = `; error: ${e.message}`; }
  if (calls) for (const g of open) if (asking.some(a => a.e === g.e) && !(g.need === 'score' && g.known)) miss[g.e.id] = now;
  out.push(...got);
  cache[key] = { t: now, events: got, miss };
  diag[`tsdb ${l.comp}`] = `fill: ${before ? `${before} cards lacking a score or time, ${open.length} still open` : 'nothing to fill'}; ${calls} calls; ${got.length} games known${err}`;
  return calls;
}
// Rounds around now for a league: last result's round, two back and a few ahead
export async function tsdbEvents(all, diag, cache = {}, gapsFor = null) {
  const out = [];
  // start with a different league each run, so a rate limit part-way through doesn't always starve the same ones
  const slot = Math.floor(Date.now() / 6e5);
  const turn = list => { const k = slot % (list.length || 1); return [...list.slice(k), ...list.slice(0, k)]; };
  // fill-only leagues first: they cost nothing unless a card is waiting on them, and then at most FILL_RUN calls in all
  let fillCalls = 0;
  for (const l of turn(all.filter(l => l.fill))) fillCalls += await fillLeague(l, out, diag, cache, gapsFor, FILL_RUN - fillCalls);
  const leagues = all.filter(l => !l.fill);
  for (const l of turn(leagues)) {
    const start = out.length;
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
        cache[l.comp] = { t: Date.now(), events: out.slice(start) };
        continue;
      }
      const last = (await tsdb(`eventspastleague.php?id=${l.id}`)).events?.[0];
      const next = (await tsdb(`eventsnextleague.php?id=${l.id}`)).events?.[0];
      const ref = next || last;
      if (!ref || (!next && Date.now() - new Date(last.strTimestamp + 'Z') > 30 * DAY)) { diag[`tsdb ${l.comp}`] = 'off season'; continue; }
      const season = ref.strSeason, r0 = +(last?.intRound || next?.intRound || 1);
      const rounds = [...new Set([r0 - 1, r0, r0 + 1, r0 + 2])].filter(r => r >= 1 && r < 40);
      if (!rounds.length) { diag[`tsdb ${l.comp}`] = 'off season'; continue; }
      let n = 0;
      for (const r of rounds) {
        for (const ev of (await tsdb(`eventsround.php?id=${l.id}&r=${r}&s=${encodeURIComponent(season)}`)).events || []) {
          const e = fromTsdb(ev, l);
          if (e && !out.some(o => o.id === e.id)) { out.push(e); n++; }
        }
      }
      diag[`tsdb ${l.comp}`] = `${n} games, season ${season}, rounds ${rounds.join(',')}`;
      cache[l.comp] = { t: Date.now(), events: out.slice(start) };
    } catch (e) {
      out.length = start;
      const c = cache[l.comp];
      if (c && Date.now() - c.t < 3 * DAY) { out.push(...c.events.filter(x => !out.some(o => o.id === x.id))); diag[`tsdb ${l.comp}`] = `error: ${e.message}; using saved copy (${c.events.length} games)`; }
      else diag[`tsdb ${l.comp}`] = 'error: ' + e.message;
    }
  }
  return out;
}
export { fromTsdb as _fromTsdb, hostFirst as _hostFirst, f1Season as _f1Season, f1Standings as _f1Standings, squadsFromPage as _squadsFromPage, eventsFromPage as _eventsFromPage, ufcFromList as _ufcFromList, fightCard as _fightCard, sportsTables as _sportsTables };
