// Fixture and result readers for sources that allow automated use:
//   Wikipedia (MediaWiki API, CC BY-SA content, credited in the page footer)
//   TheSportsDB (official free API, key 123)
// Both return events in the feed's shape: { id, team, tags, sport, comp, home, away, startUTC, timeTBC, venue, city, tz, status, score, summary, source, link }
const DAY = 864e5;
const UA = { 'user-agent': 'nz-sports-feed/1.0 (https://kickoff.kiwi/; personal non-commercial site)' };
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
      .replace(/\{\{\s*(?:nbsp|snd|spnd|spaced[ _]e?ndash|e?ndash|mdash|·|dot|efn|refn|notetag|cite[^|}]*|flagicon|flagdeco|flag decoration|colou?r box|vanchor|anchor)[^{}]*\}\}/gi, m => /ndash|snd|spnd/.test(m) ? '–' : /mdash/.test(m) ? '—' : /nbsp/.test(m) ? ' ' : '');
  }
  return t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/\[https?:\S+\s+([^\]]*)\]/g, '$1').replace(/'''?/g, '')
    .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/\{\{[^{}]*\}\}/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

const CODES = {
  PHI: 'Philippines', TPE: 'Chinese Taipei', QAT: 'Qatar', IRI: 'Iran', JOR: 'Jordan', KAZ: 'Kazakhstan', SYR: 'Syria', BRN: 'Bahrain', KSA: 'Saudi Arabia',
  GUM: 'Guam', INA: 'Indonesia', MGL: 'Mongolia', THA: 'Thailand', IRQ: 'Iraq', MAW: 'Malawi', UGA: 'Uganda',
  NZ: 'New Zealand', NZL: 'New Zealand', AUS: 'Australia', FIJ: 'Fiji', FJI: 'Fiji', SAM: 'Samoa', SAMOA: 'Samoa', WSM: 'Samoa', TGA: 'Tonga', TON: 'Tonga', PNG: 'Papua New Guinea',
  COK: 'Cook Islands', CKI: 'Cook Islands', ENG: 'England', FRA: 'France', WAL: 'Wales', SCO: 'Scotland', IRE: 'Ireland', IRL: 'Ireland', ITA: 'Italy', RSA: 'South Africa', SA: 'South Africa',
  ZAF: 'South Africa', ARG: 'Argentina', JPN: 'Japan', JAP: 'Japan', USA: 'USA', CAN: 'Canada', IND: 'India', PAK: 'Pakistan', SL: 'Sri Lanka', SRI: 'Sri Lanka', LKA: 'Sri Lanka',
  BAN: 'Bangladesh', BGD: 'Bangladesh', WI: 'West Indies', WIN: 'West Indies', AFG: 'Afghanistan', ZIM: 'Zimbabwe', LBN: 'Lebanon', LEB: 'Lebanon', JAM: 'Jamaica', GEO: 'Georgia', POR: 'Portugal',
  ESP: 'Spain', URU: 'Uruguay', CHI: 'Chile', NED: 'Netherlands', BRA: 'Brazil', KEN: 'Kenya', CZE: 'Czechia', POL: 'Poland', ROU: 'Romania', ROM: 'Romania', HKG: 'Hong Kong',
  KOR: 'South Korea', CHN: 'China', GER: 'Germany', BEL: 'Belgium', NAM: 'Namibia', UAE: 'United Arab Emirates', SCOT: 'Scotland', IRELAND: 'Ireland', SER: 'Serbia', GRE: 'Greece',
  MLT: 'Malta', ITY: 'Italy', NIR: 'Northern Ireland', IRE: 'Ireland', GBR: 'Great Britain', MAS: 'Malaysia', AUT: 'Austria', BLR: 'Belarus', UKR: 'Ukraine', EGY: 'Egypt',
};
// Team cell: {{Rut|Crusaders}}, {{rl-rt|AUS}}, {{crw|NZ}}, {{RuA-rt|ITA|name=Italy XV}}, [[Melbourne Renegades]] (H)
// Australian domestic cricket's sides, as {{cr-Aus|QLD}} writes them
const AU_STATES = { QLD: 'Queensland', NSW: 'New South Wales', VIC: 'Victoria', SA: 'South Australia', WA: 'Western Australia', TAS: 'Tasmania' };
function teamOf(v) {
  const raw = stripRefs(v);
  const tpl = templates(raw, /^[A-Za-z][\w\- ]{0,14}$/).find(t => !/^(colou?r ?box|flag ?deco(ration)?|flagicon|nowrap|small|abbr|sort)$/i.test(t.name));
  if (tpl) {
    const p = params('x|' + tpl.body.slice(tpl.name.length + 1));
    const nm = tpl.name.toLowerCase();
    // "QLD-h": a code with the page's home-side marker
    let name = (p.named.name || p.pos[0] || '').replace(/-h$/i, '');
    name = (nm.startsWith('cr-aus') && AU_STATES[name.toUpperCase()]) || CODES[name.toUpperCase()] || name.replace(/_/g, ' ');
    const women = /^(ruw|rlw|crw|fbw|fhw|wrl?w|bkw)/.test(nm) || /women/i.test(nm);
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
    case 'intlcricket': return !nz && !women && !/\bAustralia\b/.test(names) ? { team: 'intlcricket', tags: [] } : null;
    case 'nzcricket': return nz ? { team: women ? 'whiteferns' : 'blackcaps', tags: [] } : null;
    case 'nrl': return { team: /Warriors/.test(names) ? 'warriors' : 'nrl', tags: ['nrl'] };
    case 'hockey': return nz ? { team: women ? 'blacksticksw' : 'blacksticks', tags: [] } : null;
    case 'basketball': return nz ? { team: women ? 'tallferns' : 'tallblacks', tags: [] } : null;
    case 'nbl': return { team: /Breakers/.test(names) ? 'breakers' : 'nbl', tags: ['nbl'] };
    case 'netball': return nz ? { team: 'silverferns', tags: [] } : null;
    case 'epl': return { team: 'epl', tags: ['epl'] };
    case 'aleague': return { team: /Wellington Phoenix/.test(names) ? 'phoenix' : /Auckland FC/.test(names) ? 'aucklandfc' : 'aleague', tags: ['aleague'] };
    default: return null;
  }
}

// ---------- Wikipedia -------------------------------------------------------
const BOX = /^(rugby ?box|rugby ?league ?box|rlbox|single-innings cricket match|two-innings cricket match|limited overs international|footballbox|football box(?: collapsible)?|field ?hockey ?box|hockey ?box|basketball ?box(?: collapsible)?|netball ?box)$/i;

function eventsFromPage(title, text, cfg, cityTz) {
  const year = +(title.match(/\b(20\d\d)/) || [])[1] || new Date().getUTCFullYear();
  const out = [];
  for (const tpl of templates(text, BOX)) {
    const { named: p } = params(tpl.body);
    const isCricket = /cricket|overs/i.test(tpl.name);
    // women's tours use plain team templates, so tag names from the page itself
    const fix = n => cfg.women && n && !/Women/.test(n) ? n + ' Women' : n;
    const home = fix(teamOf(p.home || p.team1 || p.teama || '')), away = fix(teamOf(p.away || p.team2 || p.teamb || ''));
    if (!home || !away) continue;
    const d = dateOf(p.date || '', year);
    if (!d || d.m < 0) continue;
    const venueRaw = clean(p.stadium || p.venue || p.arena || p.location || p.place || '');
    const parts = venueRaw.split(',').map(s => s.trim()).filter(Boolean);
    // some boxes give the ground and the town separately ("stadium = Lloyd Elsmore Park", "location = Auckland, New Zealand")
    const loc = (p.stadium || p.venue || p.arena) && (p.location || p.place) ? clean(p.location || p.place).split(',').map(s => s.trim()).filter(Boolean) : [];
    const city = parts.length > 1 ? parts[parts.length - 1] : loc[0] || '';
    const tm = timeOf(p.time || '');
    const tz = (tm && tm.tz) || cityTz(city) || cityTz(parts[0]) || (cfg.homeTz && cityTz(home)) || cfg.tz || null;
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
    } else if (/^\d+$/.test(clean(p.scorea || p.score1 || '')) && /^\d+$/.test(clean(p.scoreb || p.score2 || ''))) {
      // basketball (scoreA / scoreB) and netball (score1 / score2) give each side's score on its own
      status = 'final'; score = `${clean(p.scorea || p.score1)}-${clean(p.scoreb || p.score2)}`;
    } else {
      const s = clean(p.score || '');
      if (/\d+\s*[–—-]\s*\d+/.test(s)) { status = 'final'; score = s.match(/\d+\s*[–—-]\s*\d+/)[0].replace(/\s*[–—]\s*/, '-'); }
      else if (/postponed|cancel|abandon/i.test(s)) { status = 'final'; score = s; }
    }
    const cls = cfg.team ? { team: cfg.team, tags: cfg.tags || [] } : classify(cfg.classify, home, away);
    if (!cls) continue;
    const report = (stripRefs(p.report || '').match(/https?:\/\/[^\s\]|]+/) || [])[0];
    const round = clean(p.round || '').replace(/^Match\s*/i, 'Match ');
    // a national team's page links each game's round to its tournament ("[[2026 Men's FIH Hockey World Cup|Pool A]]"): that
    // tournament is the game's competition and the round its stage; an unlinked round ("Match 1") is a test series
    const linked = cfg.compFromRound && (stripRefs(p.round || '').match(/\[\[([^\]|]+)\|?[^\]]*\]\]/) || [])[1];
    const comp = !cfg.compFromRound ? cfg.comp : linked ? linked.replace(/^\d{4}(?:[–-]\d{2,4})?\s+/, '').replace(/^(Men's|Women's)\s+/, '') : cfg.comp;
    // nearest heading above the box, e.g. "1st T20I" on a tour page
    const heads = cfg.seriesTitle || cfg.headingStage ? [...text.slice(0, tpl.at).matchAll(/^={2,5}\s*([^=\n]+?)\s*={2,5}\s*$/gm)] : [];
    const stage = heads.length ? clean(heads[heads.length - 1][1]) : '';
    // other nations' tours: the internationals only, not warm-ups against local XIs
    if (cfg.classify === 'intlcricket' && /tour match|warm-?up|practice/i.test(stage)) continue;
    out.push({
      id: `wiki-${cls.team}-${new Date(t).toISOString().slice(0, 10)}-${(home + away).toLowerCase().replace(/[^a-z]/g, '').slice(0, 40)}`,
      team: cls.team, tags: cls.tags, sport: cfg.sport, comp: comp + (round && cfg.showRound && !linked && !/^test(?: match)?$/i.test(round) ? ` · ${round}` : ''),
      home, away, startUTC: new Date(t).toISOString(), timeTBC: tbc, ...(stage ? { stage } : linked && round ? { stage: round } : {}), ...(cfg.format ? { format: cfg.format } : {}),
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
  // last season's NZ and Australian tours too, only for the form guide (a T20I series early in the summer otherwise shows
  // "no other T20I results"); their games stay out of the feed itself
  const prev = `${s0 - 1}–${String(s0).slice(2)}`;
  // a lagged or busy Wikipedia answers "maxlag" (with a 200) or a 429/5xx: wait and ask again, so a page's games don't
  // drop out of the feed for a run (F1's races went missing now and then)
  const api = async q => {
    for (let i = 0; ; i++) {
      const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&maxlag=5&' + q, { headers: UA }).catch(e => ({ ok: false, status: e.message }));
      const j = r.ok ? await r.json().catch(() => null) : null;
      if (j && !/maxlag|ratelimit|readonly/i.test(j.error?.code || '')) return j;
      if (i >= 3) { if (j) return j; throw new Error(`wikipedia ${r.status}`); }
      diag.wikiRetries = (diag.wikiRetries || 0) + 1;
      await new Promise(res => setTimeout(res, 2000 * 2 ** i));
    }
  };
  // expand {Y} and {S} into concrete titles
  const want = new Map();
  for (const c of pageCfgs) {
    const ts = c.title.includes('{S}') ? seasons.map(s => c.title.replace('{S}', s)) : c.title.includes('{Y}') ? years.map(y => c.title.replace('{Y}', y)) : [c.title];
    for (const t of ts) want.set(t, c);
  }
  // NZ cricket tours change name every summer, so find them by search
  for (const q of [...seasons, ...years.map(String), prev].flatMap(s => [`intitle:"in New Zealand in ${s}"`, `intitle:"New Zealand" intitle:"cricket team in" "${s}"`])) {
    try {
      const r = await api('action=query&list=search&srlimit=20&srnamespace=0&srsearch=' + encodeURIComponent(q));
      for (const { title } of r.query?.search || []) {
        if (!/cricket team/.test(title) || !/New Zealand/.test(title) || !/\b20\d\d\b/.test(title)) continue;
        const old = title.endsWith(prev);
        if (![...seasons, ...years.map(String)].some(s => title.endsWith(s)) && !old) continue;
        if (old && want.has(title)) continue;
        want.set(title, { sport: 'cricket', comp: /women/i.test(title) ? "White Ferns" : 'Black Caps', classify: 'nzcricket', women: /women's cricket team/i.test(title), seriesTitle: true, ...(old ? { formOnly: true } : {}) });
      }
    } catch (e) { diag.wikiSearch = e.message; }
  }
  // Australian men's tours, home and away (NZ ones are already in)
  for (const q of [...seasons, ...years.map(String), prev].flatMap(s => [`intitle:"cricket team in Australia in ${s}"`, `intitle:"Australian cricket team in" "${s}"`])) {
    try {
      const r = await api('action=query&list=search&srlimit=20&srnamespace=0&srsearch=' + encodeURIComponent(q));
      for (const { title } of r.query?.search || []) {
        if (!/^[A-Z][\w ]+ cricket team in [\w ]+ in 20\d\d/.test(title) || /New Zealand|women|under-19|\bA cricket/i.test(title) || !/Australia/.test(title)) continue;
        const old = title.endsWith(prev);
        if ((![...seasons, ...years.map(String)].some(s => title.endsWith(s)) && !old) || want.has(title)) continue;
        want.set(title, { sport: 'cricket', comp: 'Australia', classify: 'aucricket', seriesTitle: true, ...(old ? { formOnly: true } : {}) });
      }
    } catch (e) { diag.wikiSearch = e.message; }
  }
  // men's tours between the other Test nations ("Pakistani cricket team in South Africa in 2026–27")
  const FULL = /^(Indian|English|Pakistani|Sri Lankan|South African|Bangladeshi|Afghan(?:istan)?|Zimbabwean?|Irish|West Indian) cricket team in (?:the )?(India|England|Pakistan|Sri Lanka|South Africa|Bangladesh|Afghanistan|Zimbabwe|Ireland|West Indies|United Arab Emirates) in /;
  const HOSTS = ['India', 'England', 'Pakistan', 'Sri Lanka', 'South Africa', 'Bangladesh', 'Zimbabwe', 'Ireland', 'the West Indies', 'the United Arab Emirates'];
  for (const q of [...seasons, ...years.map(String)].flatMap(s => HOSTS.map(h => `intitle:"cricket team in ${h}" "${s}"`))) {
    try {
      const r = await api('action=query&list=search&srlimit=50&srnamespace=0&srsearch=' + encodeURIComponent(q));
      for (const { title } of r.query?.search || []) {
        if (!FULL.test(title) || /women|under-19|\bA cricket/i.test(title)) continue;
        if (![...seasons, ...years.map(String)].some(s => title.endsWith(s)) || want.has(title)) continue;
        want.set(title, { sport: 'cricket', comp: '', classify: 'intlcricket', seriesTitle: true });
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
  // labelled-section transclusions, as the NRL finals page shows its Grand Final: {{#section:2026 NRL Grand Final|scoreboard}}
  // reads <section begin=scoreboard /> ... <section end=scoreboard /> from that page, so fetch those pages and put the section in
  const SECT = /\{\{\s*#(?:section|lst)\s*:\s*([^|{}]+?)\s*\|\s*([^|{}]+?)\s*\}\}/gi;
  const sectPages = [...new Set(Object.values(texts).flatMap(t => [...t.text.matchAll(SECT)].map(m => m[1])))].slice(0, 20);
  if (sectPages.length) {
    try {
      const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(sectPages.join('|')));
      const back = Object.fromEntries([...(r.query?.redirects || []), ...(r.query?.normalized || [])].map(x => [x.to, x.from]));
      const src = {};
      for (const pg of r.query?.pages || []) if (!pg.missing) src[back[back[pg.title]] || back[pg.title] || pg.title] = pg.revisions?.[0]?.slots?.main?.content || '';
      const section = (text, name) => {
        const q = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const m = text.match(new RegExp(`<section\\s+begin\\s*=\\s*["']?${q}["']?\\s*/?>([\\s\\S]*?)<section\\s+end\\s*=\\s*["']?${q}["']?\\s*/?>`, 'i'));
        return m ? m[1] : '';
      };
      for (const t of Object.values(texts)) t.text = t.text.replace(SECT, (m, pg, name) => (src[pg] && section(src[pg], name)) || m);
      diag.sections = sectPages.map(pg => `${pg}: ${src[pg] ? 'read' : 'missing'}`).join('; ');
    } catch (e) { diag.sections = 'error: ' + e.message; }
  }
  const out = [], per = {}, tableSrc = [];
  for (const [want_t, c] of want) {
    const pg = texts[want_t];
    if (!pg) continue;
    const evs = c.ufc ? ufcFromList(pg.text, cityTz) : eventsFromPage(pg.title, pg.text, c.seriesTitle ? { ...c, comp: seriesComp(pg.title, c) } : c, cityTz);
    if (c.seriesTitle) for (const e of evs) hostFirst(e, pg.title);
    if (c.formOnly) for (const e of evs) e.formOnly = true;
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
    // the name can end in its season ("NBL Ladder 2026–27")
    for (const src of tableSrc) for (const m of src.text.matchAll(/\{\{\s*([^{}|#\n]{4,90}?(?:table|standings|ladder)(?:\s+\d{4}(?:[–-]\d{2,4})?)?)\s*\}\}/gi))
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
      text = text.replace(/\{\{\s*([^{}|#\n]{4,90}?(?:table|standings|ladder)(?:\s+\d{4}(?:[–-]\d{2,4})?)?)\s*\}\}/gi, (m, n) => tplTexts['Template:' + n.trim()] || m);
      // a basketball league's ladder can be a plain wikitable (the NBL's), ahead of its cup tables (Blitz, Ignite Cup)
      tables.push(...(src.c.classify === 'nbl' ? wikiLadder(text, src.title, src.c) : []), ...sportsTables(text, src.title, src.c));
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
  // Supercars: this year's rounds, and next year's from October (dates there are mostly still to come)
  try {
    const ys = [Y, ...(M >= 9 ? [Y + 1] : [])];
    const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(ys.map(y => `${y} Supercars Championship`).join('|')));
    const pg = Object.fromEntries((r.query?.pages || []).filter(p => !p.missing).map(p => [p.title, p.revisions?.[0]?.slots?.main?.content || '']));
    const sc = ys.flatMap(y => supercarsSeason(pg[`${y} Supercars Championship`] || '', y));
    out.push(...sc);
    // this year's standings: the drivers' and teams' tables read like F1's (position, name, a cell a race, points last)
    const txt = pg[`${Y} Supercars Championship`] || '';
    for (const [re, title] of [[/===\s*Drivers?'?s?'? Championship\s*===/i, "Drivers' championship"], [/===\s*Teams?'?s?'? Championship\s*===/i, "Teams' championship"]]) {
      const i = txt.search(re); if (i < 0) continue;
      const rows = f1Standings(txt.slice(i)).filter(r => !isNaN(r.pts)).map(r => ({ ...r, name: r.name.replace(/\s*\((SC|EC|FS)\)\s*/g, ' ').replace(/\s+(Sprint|Enduro|Finals?) (Cup )?Champions?$/i, '').trim() })).sort((a, b) => b.pts - a.pts);
      if (rows.length) tables.push({ comp: 'Supercars', sport: 'motor', team: 'supercars', page: `${Y} Supercars Championship`, title, style: 'points', rows });
    }
    diag.supercars = `standings: ${tables.filter(t => t.team === 'supercars').map(t => `${t.title} ${t.rows.length} (top ${t.rows[0]?.name} ${t.rows[0]?.pts})`).join(', ') || 'none'}; ${sc.length} rounds, ${sc.filter(e => e.status === 'final').length} with results: ${sc.map(e => `${e.round} ${e.home} ${e.startUTC.slice(0, 10)}`).join('; ')}`;
  } catch (e) { diag.supercars = 'error: ' + e.message; }
  // SailGP and golf: each season page's calendar or schedule table, one card an event on its last day, with the winner
  // once it's in. Next year's SailGP page joins from September; golf seasons by their own naming
  const seasonPages = async names => {
    const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(names.join('|')));
    const back = Object.fromEntries([...(r.query?.redirects || []), ...(r.query?.normalized || [])].map(x => [x.to, x.from]));
    return Object.fromEntries((r.query?.pages || []).filter(p => !p.missing).map(p => [back[back[p.title]] || back[p.title] || p.title, p.revisions?.[0]?.slots?.main?.content || '']));
  };
  try {
    const ys = [Y, ...(M >= 8 ? [Y + 1] : [])], pg = await seasonPages(ys.map(y => `${y} SailGP championship`));
    const sg = ys.flatMap(y => sailgpSeason(pg[`${y} SailGP championship`] || '', y));
    out.push(...sg);
    diag.sailgp = `${sg.length} events, ${sg.filter(e => e.status === 'final').length} with winners`;
  } catch (e) { diag.sailgp = 'error: ' + e.message; }
  try {
    const tours = [
      ...[Y, ...(M >= 10 ? [Y + 1] : [])].flatMap(y => [{ title: `${y} PGA Tour`, team: 'pgatour', comp: 'PGA Tour', y, tz: 'America/New_York' }, { title: `${y} LPGA Tour`, team: 'lpga', comp: 'LPGA Tour', y, tz: 'America/New_York' }]),
      // the Australasian season runs across the New Year ("2026–27"), from about August
      ...[M >= 6 ? Y : Y - 1].map(y => ({ title: `${y}–${String(y + 1).slice(2)} PGA Tour of Australasia`, team: 'golfanz', comp: 'PGA Tour of Australasia', y, y2: y + 1, tz: 'Australia/Sydney' })),
    ];
    const pg = await seasonPages(tours.map(t => t.title));
    const per = {};
    for (const t of tours) { const evs = golfSeason(pg[t.title] || '', t); per[t.title] = evs.length; out.push(...evs); }
    diag.golf = per;
  } catch (e) { diag.golf = 'error: ' + e.message; }
  // Baseball, September to December: this year's MLB playoffs (a page a series) and the Japan Series, with the final
  // standings from the season pages
  if (M >= 8) try {
    const series = [...['World Series', ...['American', 'National'].flatMap(l => ['Championship', 'Division', 'Wild Card'].map(r => `${l} League ${r} Series`))]
      .map(s => ({ title: `${Y} ${s}`, team: 'mlb', comp: 'MLB playoffs', tz: 'America/New_York', y: Y })), { title: `${Y} Japan Series`, team: 'npb', comp: 'Japan Series', tz: 'Asia/Tokyo', y: Y }];
    const divs = ['AL East', 'AL Central', 'AL West', 'NL East', 'NL Central', 'NL West'], npb = `${Y} Nippon Professional Baseball season`;
    const pg = await seasonPages([...series.map(s => s.title), ...divs.map(d => `Template:${Y} ${d} standings`), npb]);
    const per = {};
    for (const s of series) { const evs = baseballSeries(pg[s.title] || '', s); per[s.title.slice(5)] = `${evs.length} (${evs.filter(e => e.status === 'final').length} played)`; out.push(...evs); }
    for (const d of divs) for (const tb of mlbStandings(pg[`Template:${Y} ${d} standings`] || '', d)) tables.push({ comp: 'MLB playoffs', sport: 'baseball', team: 'mlb', page: `${Y} Major League Baseball season`, ...tb });
    for (const tb of npbStandings(pg[npb] || '')) tables.push({ comp: 'Japan Series', sport: 'baseball', team: 'npb', page: npb, ...tb });
    diag.baseball = `${Object.entries(per).map(([k, v]) => `${k}: ${v}`).join('; ')}; standings: ${tables.filter(t => t.sport === 'baseball').map(t => `${t.title} ${t.rows.length} (top ${t.rows[0].name} ${t.rows[0].w}-${t.rows[0].l})`).join(', ') || 'none'}`;
  } catch (e) { diag.baseball = 'error: ' + e.message; }
  // Tennis: the four Grand Slams, the ATP and WTA Finals, Auckland's ASB Classic and the Australian summer's Brisbane,
  // Adelaide and Hobart tournaments, from each tournament's own page.
  // Each gives a women's and a men's singles final (the tournament's last two days), with the champion once it's played.
  try {
    const titles = years.flatMap(y => TENNIS.map(t => ({ ...t, y, title: t.title.replace('{Y}', y) })));
    const got = {};
    for (let i = 0; i < titles.length; i += 20) {
      const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&rvsection=0&redirects=1&titles=' + encodeURIComponent(titles.slice(i, i + 20).map(t => t.title).join('|')));
      const back = Object.fromEntries([...(r.query?.redirects || []), ...(r.query?.normalized || [])].map(x => [x.to, x.from]));
      for (const pg of r.query?.pages || []) if (!pg.missing) got[back[back[pg.title]] || back[pg.title] || pg.title] = { title: pg.title, text: pg.revisions?.[0]?.slots?.main?.content || '' };
      await sleep(300);
    }
    const ten = [], notes = [];
    for (const t of titles) {
      const pg = got[t.title];
      if (!pg) continue;
      if (!pg.title.includes(String(t.y))) continue; // a future year that only redirects to the main article
      const evs = tennisFinals(pg.text, pg.title, t);
      const box = templates(stripRefs(pg.text), /^(Infobox|TennisEventInfo)/i)[0];
      const raw = box ? Object.entries(params(box.body).named).filter(([k]) => /date|champ.?s|single/i.test(k)).map(([k, v]) => `${k}=${v.slice(0, 70)}`).join(' | ') : 'no infobox: ' + pg.text.slice(0, 80);
      notes.push(`${pg.title}: ${evs.map(e => `${e.draw} ${e.startUTC.slice(0, 10)}${e.status === 'final' ? ' ' + e.score : ''}`).join(', ') || 'no dates'} [${box?.name || ''}: ${raw}]`);
      ten.push(...evs.map(({ draw, ...e }) => e));
    }
    out.push(...ten);
    diag.tennis = notes.join('; ') || 'no pages yet';
  } catch (e) { diag.tennis = 'error: ' + e.message; }
  out.tables = tables;
  // UFC: read each event's own article (two months out) for the fight card, and the main event's full names for photos
  const ufcSoon = out.filter(e => e.team === 'ufc' && /\/wiki\/UFC/.test(e.source) && Math.abs(new Date(e.startUTC) - Date.now()) < 60 * DAY);
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

// a ladder set out as a plain wikitable (the NBL's "NBL Ladder 2026–27" template): a header row naming Team, Played, W,
// L, Points for and against; then a row a team, its position first. Rows without a team (spacers) are skipped
function wikiLadder(text, page, c) {
  const out = [];
  for (const m of text.matchAll(/\{\|[^\n]*wikitable[\s\S]*?\n\|\}/g)) {
    const rows = m[0].split(/\n\|-[^\n]*/).slice(1).map(r => r.split('\n').filter(l => /^[|!]/.test(l)).flatMap(l => l.slice(1).split(/\|\||!!/))
      .map(x => ({ link: /\[\[/.test(x), v: clean(x.replace(/^\s*(?:[a-z-]+\s*=\s*(?:"[^"]*"|[^\s|]+)\s*)+\|(?!\|)/i, '')).trim() })));
    const hi = rows.findIndex(r => r.some(x => /^team$/i.test(x.v)));
    if (hi < 0) continue;
    const head = rows[hi].map(x => x.v), at = re => head.findIndex(h => re.test(h));
    const iT = at(/^team$/i), iP = at(/^(pld|played|gp)$/i), iW = at(/^(w|won|games won|wins)$/i), iL = at(/^(l|lost|games lost|losses)$/i);
    const iF = at(/^(pf|points for)$/i), iA = at(/^(pa|points against)$/i), iPct = at(/^(pct|win%|winning percentage)$/i);
    if (iP < 0 || iW < 0 || iL < 0) continue;
    const list = [];
    for (const r of rows.slice(hi + 1)) {
      const dT = r.findIndex(x => x.link);
      if (dT < 0) continue;
      const off = dT - iT, n = i => i < 0 ? 0 : parseFloat(String(r[i + off]?.v || '').replace(/[^\d.]/g, '')) || 0;
      list.push({ name: r[dT].v, p: n(iP), w: n(iW), d: 0, l: n(iL), f: n(iF), a: n(iA), bp: 0, nr: 0, nrr: '', pct: iPct < 0 ? '' : String(r[iPct + off]?.v || '').replace(/%$/, ''), pts: n(iW), q: '', champ: false });
    }
    if (list.length >= 4) out.push({ comp: c.comp, sport: c.sport, team: c.team || '', page, title: 'Ladder', style: 'wl', rows: list });
  }
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

// ---------- tennis ------------------------------------------------------------
// times are the usual start of each final, local; the women's final is the day before the men's
// (a week before at the ASB Classic, where the women play the first week)
const TENNIS = [
  { title: '{Y} Australian Open', name: 'Australian Open', city: 'Melbourne', venue: 'Melbourne Park', tz: 'Australia/Melbourne', w: [-1, 19, 30], m: [0, 19, 30] },
  { title: '{Y} French Open', name: 'French Open', city: 'Paris', venue: 'Roland Garros', tz: 'Europe/Paris', w: [-1, 15, 0], m: [0, 15, 0] },
  { title: '{Y} Wimbledon Championships', name: 'Wimbledon', city: 'London', venue: 'All England Club', tz: 'Europe/London', w: [-1, 16, 0], m: [0, 16, 0] },
  { title: '{Y} US Open (tennis)', name: 'US Open', city: 'New York', venue: 'Flushing Meadows', tz: 'America/New_York', w: [-1, 16, 0], m: [0, 14, 0] },
  { title: '{Y} ATP Finals', name: 'ATP Finals', city: 'Turin', venue: 'Inalpi Arena', tz: 'Europe/Rome', m: [0, 18, 0] },
  { title: '{Y} WTA Finals', name: 'WTA Finals', city: 'Riyadh', venue: '', tz: 'Asia/Riyadh', w: [0, 19, 0] },
  { title: '{Y} ASB Classic', name: 'ASB Classic', city: 'Auckland', venue: 'ASB Tennis Arena', tz: 'Pacific/Auckland', w: [-7, 14, 0], m: [0, 15, 0], nz: true },
  // the Australian summer's lead-ins to the Australian Open: both finals on the last day (Hobart is women only)
  { title: '{Y} Brisbane International', name: 'Brisbane International', city: 'Brisbane', venue: 'Pat Rafter Arena', tz: 'Australia/Brisbane', w: [0, 15, 0], m: [0, 18, 0] },
  { title: '{Y} Adelaide International', name: 'Adelaide International', city: 'Adelaide', venue: 'Memorial Drive', tz: 'Australia/Adelaide', w: [0, 15, 0], m: [0, 18, 0] },
  { title: '{Y} Hobart International', name: 'Hobart International', city: 'Hobart', venue: 'Domain Tennis Centre', tz: 'Australia/Hobart', w: [0, 15, 0] },
];
// "12 January – 1 February 2026", "5–17 January", "January 12 – February 1, 2026", "29 December 2025 – 10 January 2026"
function dateRange(v, year) {
  const t = clean(v).replace(/\s+/g, ' ');
  const mo = x => MONTHS.indexOf(String(x).slice(0, 3).toLowerCase());
  let m = t.match(/(\d{1,2}) ([A-Za-z]{3,})(?: (\d{4}))? ?[–-] ?(\d{1,2}) ([A-Za-z]{3,})(?: (\d{4}))?/);
  if (m && mo(m[2]) >= 0 && mo(m[5]) >= 0) {
    const y2 = +(m[6] || year), y1 = +(m[3] || (mo(m[2]) > mo(m[5]) ? y2 - 1 : y2));
    return { start: [y1, mo(m[2]), +m[1]], end: [y2, mo(m[5]), +m[4]] };
  }
  m = t.match(/(\d{1,2}) ?[–-] ?(\d{1,2}) ([A-Za-z]{3,})(?: (\d{4}))?/);
  if (m && mo(m[3]) >= 0) return { start: [+(m[4] || year), mo(m[3]), +m[1]], end: [+(m[4] || year), mo(m[3]), +m[2]] };
  m = t.match(/([A-Za-z]{3,}) (\d{1,2}) ?[–-] ?(?:([A-Za-z]{3,}) )?(\d{1,2})(?:,? (\d{4}))?/);
  if (m && mo(m[1]) >= 0) { const y = +(m[5] || year), m2 = m[3] && mo(m[3]) >= 0 ? mo(m[3]) : mo(m[1]); return { start: [y, mo(m[1]), +m[2]], end: [y, m2, +m[4]] }; }
  return null;
}
function tennisFinals(text, title, t) {
  const box = templates(stripRefs(text), /^(Infobox tennis|TennisEventInfo)/i)[0];
  if (!box) return [];
  const p = params(box.body).named;
  const dv = p.date || p.dates || '';
  const r = dateRange(dv, t.y);
  if (!r) return [];
  // "5–11 January (women) <br> 12–17 January (men)": each draw's own last day
  const own = {};
  for (const part of dv.split(/<br\s*\/?>|;|\n/i)) { const k = /\bwomen/i.test(part) ? 'w' : /\bmen\b/i.test(part) ? 'm' : ''; const pr = k && dateRange(part, t.y); if (pr) own[k] = pr.end; }
  const champ = keys => { for (const k of keys) { const v = clean(p[k] || ''); if (v && !/^(tba|tbd|\?)$/i.test(v)) return v.replace(/\s*\(.*$/, ''); } return ''; };
  // singles champions; the Finals pages have one draw, so their plain "champs" is that tour's
  const champs = { w: champ(['champws', 'champ_ws', 'womens_singles', 'wsingles', ...(t.w && !t.m ? ['champs', 'champ'] : [])]), m: champ(['champms', 'champ_ms', 'mens_singles', 'msingles', ...(t.m && !t.w ? ['champs', 'champ'] : [])]) };
  const end = r.end, out = [];
  const openAt = localToUTC(r.start[0], r.start[1], r.start[2], 11, 0, t.tz);
  for (const k of ['w', 'm']) {
    if (!t[k]) continue;
    const [dd, h, mi] = t[k];
    const last = own[k] || end, day = new Date(Date.UTC(last[0], last[1], last[2] + (own[k] ? 0 : dd)));
    const at = localToUTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, mi, t.tz);
    const who = champs[k], draw = k === 'w' ? "Women's" : "Men's";
    out.push({
      id: `tennis-${t.name.toLowerCase().replace(/\W+/g, '-')}-${t.y}-${k}`, team: 'tennis', tags: [], sport: 'tennis', comp: t.name, draw,
      home: `${draw} final`, away: '', startUTC: new Date(at).toISOString(), openUTC: new Date(openAt).toISOString(), timeTBC: true, usual: true,
      venue: t.venue, city: t.city, tz: t.tz, ...(t.nz ? { nzEvent: true } : {}),
      status: who ? 'final' : 'upcoming', ...(who ? { score: `${who.split(' ').slice(-1)[0]} won`, summary: `${who} won the ${draw.toLowerCase()} singles.` } : {}),
      source: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
    });
  }
  return out;
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
// Supercars: one event a round, on its last day (the Sunday race), from the season page's calendar table; each race's
// winner from the season summary. A round's row: ! round | ! race | event | circuit | location | dates; the round's
// other races follow as rows of just "! race"
const SC_TZ = [[/New South Wales|\bNSW\b/i, 'Australia/Sydney'], [/\bVIC\b|Victoria/i, 'Australia/Melbourne'], [/\bQLD\b|Queensland/i, 'Australia/Brisbane'],
  [/South Australia|\bSA\b/i, 'Australia/Adelaide'], [/Western Australia|\bWA\b/i, 'Australia/Perth'], [/Northern Territory|\bNT\b/i, 'Australia/Darwin'],
  [/Tasmania|\bTAS\b/i, 'Australia/Hobart'], [/NZL|New Zealand|Waikato|Canterbury|Auckland/i, 'Pacific/Auckland']];
// SailGP "Calendar" table: round, host ("Perth, Australia"), title (sponsors and all: "ITM New Zealand Sail Grand
// Prix"), dates ("28 February – 1 March 2026"), winning team. A card for the last day, racing about 3pm local
const SAIL_TZ = { Perth: 'Australia/Perth', Auckland: 'Pacific/Auckland', Christchurch: 'Pacific/Auckland', Lyttelton: 'Pacific/Auckland', Sydney: 'Australia/Sydney', 'Rio de Janeiro': 'America/Sao_Paulo',
  Bermuda: 'Atlantic/Bermuda', 'New York': 'America/New_York', Halifax: 'America/Halifax', Portsmouth: 'Europe/London', Plymouth: 'Europe/London', Sassnitz: 'Europe/Berlin', Valencia: 'Europe/Madrid',
  Cádiz: 'Europe/Madrid', Geneva: 'Europe/Zurich', 'Saint-Tropez': 'Europe/Paris', Taranto: 'Europe/Rome', Dubai: 'Asia/Dubai', 'Abu Dhabi': 'Asia/Dubai', 'Los Angeles': 'America/Los_Angeles',
  'San Francisco': 'America/Los_Angeles', Chicago: 'America/Chicago', Copenhagen: 'Europe/Copenhagen', Singapore: 'Asia/Singapore', Aarhus: 'Europe/Copenhagen', Hamilton: 'Atlantic/Bermuda' };
function sailgpSeason(text, year) {
  const i = text.search(/==\s*Calendar\s*==/i);
  if (i < 0) return [];
  const out = [], src = `https://en.wikipedia.org/wiki/${encodeURIComponent(`${year} SailGP championship`.replace(/ /g, '_'))}`;
  for (const r of rowsOf((text.slice(i).match(/\{\|[\s\S]*?\n\|\}/) || [''])[0])) {
    const rnd = +clean(r[0] || '').match(/^\d+/)?.[0];
    const host = clean(r[1] || '').trim(), d = dateRange(r[3] || '', year);
    if (!rnd || !host || !d) continue;
    const city = host.split(',')[0].trim(), tz = Object.entries(SAIL_TZ).find(([k]) => host.includes(k))?.[1] || 'UTC';
    // the place before "Sail Grand Prix", without the sponsors in front: the longest ending of up to three words the
    // host names ("Mubadala New York" -> New York, "Apex Group Bermuda" -> Bermuda)
    const words = clean(r[2] || '').split(/Sail Grand Prix/i)[0].trim().split(/\s+/).filter(Boolean);
    const place = [3, 2, 1].map(k => words.slice(-k).join(' ')).find(w => w && host.toLowerCase().includes(w.toLowerCase())) || city;
    const win = (r[4] || '').match(/\[\[([^\]|]+?) SailGP Team(?:\|([^\]]+))?\]\]/);
    const [ey, em, ed] = d.end, [sy, sm, sd] = d.start;
    out.push({
      id: `sailgp-${year}-${rnd}`, team: 'sailgp', tags: [], sport: 'sailing', comp: `SailGP · Round ${rnd}`, round: `Round ${rnd}`,
      home: `${place} Sail Grand Prix`, away: '', startUTC: new Date(localToUTC(ey, em, ed, 15, 0, tz)).toISOString(), openUTC: new Date(localToUTC(sy, sm, sd, 15, 0, tz)).toISOString(),
      timeTBC: true, usual: true, venue: '', city, tz, ...(/New Zealand/.test(host) ? { nzEvent: true } : {}),
      status: win ? 'final' : 'upcoming', ...(win ? { score: `${win[1]} wins`, summary: `${win[1]}${win[2] ? ` (${clean(win[2])})` : ''} won the ${place} Sail Grand Prix.` } : {}),
      source: src,
    });
  }
  return out;
}

// golf season pages' "Schedule" table: date (the last day: "Jan 11", "30 Aug", or a range), tournament, location (a US
// state, an Australian state or a country), purse, winner. A card for the final round, leaders out about 2pm local;
// play starts three days before. Cancelled events (date struck through) are left out
const GOLF_TZ = [
  [/Western Australia/, 'Australia/Perth'], [/South Australia/, 'Australia/Adelaide'], [/Northern Territory/, 'Australia/Darwin'], [/Queensland/, 'Australia/Brisbane'], [/Victoria/, 'Australia/Melbourne'], [/Tasmania/, 'Australia/Hobart'],
  [/New South Wales|Capital Territory/, 'Australia/Sydney'], [/New Zealand/, 'Pacific/Auckland'], [/Papua New Guinea/, 'Pacific/Port_Moresby'], [/Fiji/, 'Pacific/Fiji'], [/British Columbia/, 'America/Vancouver'],
  [/Hawaii/, 'Pacific/Honolulu'], [/California|Nevada|Oregon|Washington(?! D)/, 'America/Los_Angeles'], [/Arizona/, 'America/Phoenix'], [/Colorado|Utah|New Mexico|Idaho|Montana|Wyoming/, 'America/Denver'],
  [/Texas|Louisiana|Oklahoma|Minnesota|Illinois|Tennessee|Alabama|Mississippi|Missouri|Wisconsin|Iowa|Kansas|Arkansas|Nebraska/, 'America/Chicago'],
  [/Florida|Georgia|Carolina|Ohio|Michigan|Pennsylvania|New York|New Jersey|Virginia|Kentucky|Massachusetts|Maryland|Connecticut|Indiana|Delaware|Rhode Island|Maine|New Hampshire|Vermont|District of Columbia/, 'America/New_York'],
  [/Mexico/, 'America/Mexico_City'], [/Puerto Rico/, 'America/Puerto_Rico'], [/Dominican/, 'America/Santo_Domingo'], [/Bermuda/, 'Atlantic/Bermuda'], [/Bahamas/, 'America/Nassau'], [/Canada|Ontario|Quebec/, 'America/Toronto'],
  [/Scotland|England|Northern Ireland|Wales/, 'Europe/London'], [/Ireland/, 'Europe/Dublin'], [/France/, 'Europe/Paris'], [/Spain/, 'Europe/Madrid'], [/Japan/, 'Asia/Tokyo'], [/Korea/, 'Asia/Seoul'],
  [/China/, 'Asia/Shanghai'], [/Taiwan/, 'Asia/Taipei'], [/Thailand/, 'Asia/Bangkok'], [/Singapore/, 'Asia/Singapore'], [/Malaysia/, 'Asia/Kuala_Lumpur'], [/India/, 'Asia/Kolkata'], [/Emirates|Dubai|Abu Dhabi/, 'Asia/Dubai'], [/Saudi/, 'Asia/Riyadh'], [/South Africa/, 'Africa/Johannesburg'],
];
function golfSeason(text, t) {
  const i = text.search(/==\s*Schedule(?: and results)?\s*==/i);
  if (i < 0) return [];
  const out = [], seen = new Set(), src = `https://en.wikipedia.org/wiki/${encodeURIComponent(t.title.replace(/ /g, '_'))}`;
  // the first table headed Tournament (the LPGA's page has a colour key before it); columns found by their headings, as
  // the tours order them differently (the LPGA's winner comes before the purse)
  const tbl = [...text.slice(i).matchAll(/\{\|[\s\S]*?\n\|\}/g)].map(m => m[0]).find(x => /\n!\s*Tournament/i.test(x)) || '';
  const head = tbl.split(/\n\|-[^\n]*/)[0].split('\n').filter(l => /^!/.test(l)).flatMap(l => l.slice(1).split('!!')).map(h => clean(h.replace(/<br\s*\/?>/gi, ' ')).trim());
  const at = re => head.findIndex(h => re.test(h));
  const iD = at(/^date/i), iT = at(/^tournament/i), iL = at(/^location/i), iW = at(/^winner/i);
  if (iD < 0 || iT < 0) return [];
  let prev = null, rolled = false;
  for (const row of rowsOf(tbl)) {
    const r = [row[iD], row[iT], row[iL] ?? '', '', row[iW] ?? ''];
    if (!r[0] || !r[1] || /<s>/i.test(r[0])) continue;
    const dv = clean(r[0]).replace(/\s+/g, ' ').trim();
    // the last day: "Jan 11", "30 Aug", or the end of a range ("Jan 8–11", "29 Jan – 1 Feb")
    const m = dv.match(/(?:^|[–-]\s*)(?:([A-Za-z]{3,})\.? (\d{1,2})|(\d{1,2}) ([A-Za-z]{3,}))\s*$/) || dv.match(/^([A-Za-z]{3,})\.? (\d{1,2})\s*[–-]\s*(\d{1,2})$/);
    let mon, day;
    if (m && m[3] && !m[4]) { mon = MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()); day = +m[3]; }
    else if (m) { mon = MONTHS.indexOf((m[1] || m[4]).slice(0, 3).toLowerCase()); day = +(m[2] || m[3]); }
    if (!m || mon < 0 || !day) continue;
    // a season across the New Year: once the months go back (December to January), dates are the second year's
    if (t.y2 && (prev == null ? mon < 6 : mon < prev - 6)) rolled = true;
    const y = rolled ? t.y2 : t.y;
    prev = mon;
    const name = clean(r[1] || '').replace(/\s*\(.*?\)\s*$/, '').trim(), where = clean(r[2] || '').trim();
    if (!name || /^tba$/i.test(name)) continue;
    const tz = GOLF_TZ.find(([re]) => re.test(where))?.[1] || t.tz;
    // the first day from a range ("Jan 8–11", "29 Jan – 1 Feb", "8–11 Jan"): most events are four rounds, some three
    const f = dv.match(/^(?:([A-Za-z]{3,})\.? (\d{1,2})|(\d{1,2})(?: ([A-Za-z]{3,}))?)\s*[–-]/);
    const fm = f ? (f[1] || f[4] ? MONTHS.indexOf((f[1] || f[4]).slice(0, 3).toLowerCase()) : mon) : -1, fd = f ? +(f[2] || f[3]) : 0;
    const span = fm >= 0 && fd ? Math.round((Date.UTC(y, mon, day) - Date.UTC(fm > mon ? y - 1 : y, fm, fd)) / 864e5) + 1 : 4;
    const end = localToUTC(y, mon, day, 14, 0, tz), open = new Date(end - ((span >= 2 && span <= 5 ? span : 4) - 1) * 864e5).toISOString();
    const id = `golf-${t.team}-${y}-${name.toLowerCase().replace(/\W+/g, '-')}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const winner = clean(r[4] || '').replace(/\s*\(\d+\)/g, '').replace(/\s+/g, ' ').trim();
    const won = winner && !/^(tba|tbd|cancel+ed|postponed)$/i.test(winner) && end < Date.now();
    out.push({
      id, team: t.team, tags: [], sport: 'golf', comp: t.comp, home: name, away: '', startUTC: new Date(end).toISOString(), openUTC: new Date(open).toISOString(),
      timeTBC: true, usual: true, venue: '', city: where, tz, ...(/New Zealand/.test(where) ? { nzEvent: true } : {}),
      status: won ? 'final' : 'upcoming', ...(won ? { score: `${winner} won`, summary: `${winner} won the ${name}.` } : {}),
      source: src,
    });
  }
  return out;
}

function supercarsSeason(text, year) {
  const tableAfter = re => { const i = text.search(re); return i < 0 ? '' : (text.slice(i).match(/\{\|[\s\S]*?\n\|\}/) || [''])[0]; };
  const rowsIn = tbl => tbl.split(/\n\|-[^\n]*/).slice(1).map(r => r.split('\n').map(l => l.trim()).filter(l => /^[|!]/.test(l) && !l.startsWith('|}')));
  // a cell's own text (after any rowspan="3" |), links read as their labels so a {{nowrap|...}} round them comes apart cleanly
  const cellOf = l => l.replace(/^[|!]\s*/, '').replace(/^[^[{|]*?\|(?!\|)/, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').trim();
  const num = l => /^!/.test(l) && /^\d+$/.test(clean(cellOf(l))) ? +clean(cellOf(l)) : 0;
  // winners: round -> [{ race, winner }], plus the round's report page
  const wins = {}, reports = {};
  let cur = 0;
  for (const r of rowsIn(tableAfter(/===\s*Season summary\s*===/i))) {
    const nums = r.filter(l => num(l)).map(num), cells = r.filter(l => l.startsWith('|')).map(cellOf);
    if (!nums.length) continue;
    let race = nums[nums.length - 1], who;
    if (nums.length >= 2) { cur = nums[0]; who = cells[3]; const rep = (r.filter(l => l.startsWith('|'))[5] || '').match(/\[\[([^\]|]+)\|/); if (rep) reports[cur] = 'https://en.wikipedia.org/wiki/' + encodeURIComponent(rep[1].replace(/ /g, '_')); }
    else who = cells[2];
    const w = clean(who || '').trim();
    if (cur && w) (wins[cur] ||= []).push({ race, w });
  }
  const out = [];
  for (const r of rowsIn(tableAfter(/^==\s*Calendar\s*==/im))) {
    const nums = r.filter(l => num(l)).map(num), raw = r.filter(l => l.startsWith('|')).map(cellOf);
    if (nums.length < 2 || raw.length < 4) continue;
    const round = nums[0];
    const span = +((r[0].match(/rowspan="?(\d+)/) || [])[1] || 1);
    const ev = clean(raw[0]).replace(/\s+/g, ' '), circuit = clean(raw[1]), place = clean(raw[2]).split(',')[0].trim();
    const dr = dateRange(raw[3], year);
    if (!ev || !dr) continue;
    const tz = (SC_TZ.find(([re]) => re.test(raw[1] + ' ' + raw[2])) || [, 'Australia/Sydney'])[1];
    const [y, m, d] = dr.end, at = localToUTC(y, m, d, 14, 0, tz), w = wins[round] || [];
    const done = w.length >= span && at < Date.now();
    out.push({
      id: `supercars-${year}-${round}`, team: 'supercars', tags: [], sport: 'motor', comp: `Supercars · Round ${round}`, round: `Round ${round}`,
      home: ev, away: '', startUTC: new Date(at).toISOString(), openUTC: new Date(localToUTC(...dr.start, 9, 0, tz)).toISOString(), timeTBC: true,
      venue: circuit, city: place, tz, status: done ? 'final' : 'upcoming',
      ...(done ? { score: w.length === 1 ? `${w[0].w.split(' ').slice(-1)[0]} wins` : `${w.length} races`, summary: w.map(x => `Race ${x.race}: ${x.w}`).join('. ') + '.' } : {}),
      source: `https://en.wikipedia.org/wiki/${encodeURIComponent(`${year} Supercars Championship`.replace(/ /g, '_'))}`, ...(reports[round] ? { link: reports[round] } : {}),
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

// Baseball's playoffs, one page a series. Its summary ({{MLB Playoff Summary}}, {{Baseball playoff summary}}) lists the
// games: dateN, scoreN ("Tampa Bay Rays at Milwaukee Brewers" ahead; "'''Cleveland Guardians''' – 7, Tampa Bay Rays – 3"
// once played, the road side first either way), locN, and timeN (the start, until it's played and becomes the game's
// length). Start times come from the page's {{linescore}} boxes when there are any, matched by date and ground. A date
// marked {{dagger}} is only played if the series needs it; those drop out once a side has won it
const SERIES = [[/World Series/, 'World Series', 4], [/American League Championship/, 'ALCS', 4], [/National League Championship/, 'NLCS', 4], [/American League Division/, 'ALDS', 3],
  [/National League Division/, 'NLDS', 3], [/American League Wild Card/, 'AL Wild Card', 2], [/National League Wild Card/, 'NL Wild Card', 2], [/Japan Series/, 'Japan Series', 4]];
function baseballSeries(text, t) {
  const [, name, need] = SERIES.find(([re]) => re.test(t.title)) || [, t.title, 4];
  const src = `https://en.wikipedia.org/wiki/${encodeURIComponent(t.title.replace(/ /g, '_'))}`;
  const tx = stripRefs(text);
  const boxes = templates(tx, /^linescore$/i).map(x => params(x.body).named);
  const out = [];
  templates(tx, /^(MLB Playoff Summary|Baseball playoff summary)$/i).forEach((tpl, si) => {
    const p = params(tpl.body).named, wins = {}, games = [];
    for (let n = 1; p[`date${n}`] != null; n++) {
      const d = dateOf(p[`date${n}`], t.y), s = clean(p[`score${n}`] || '');
      if (!d || !s) continue;
      const played = s.match(/^(.+?)\s*[–—-]\s*(\d+)\s*,\s*(.+?)\s*[–—-]\s*(\d+)\s*(?:\((\d+)(?: innings)?\))?/), ahead = s.match(/^(.+?)\s+(?:at|@)\s+(.+)$/);
      if (!played && !ahead) continue;
      const away = (played ? played[1] : ahead[1]).trim(), home = (played ? played[3] : ahead[2]).trim();
      const venue = clean(p[`loc${n}`] || '');
      const box = boxes.find(b => { const bd = dateOf(b.date || '', t.y); return bd && bd.m === d.m && bd.d === d.d && (!venue || clean(b.location || '').startsWith(venue)); });
      const where = clean(box?.location || ''), city = (where.split(/\s+in\s+/)[1] || '').split(',')[0].trim();
      // a start with its zone or am/pm; a bare "3:13" is how long the game took
      const ok = v => { const c = clean(v || ''); return /[ap]\.?m\b/i.test(c) || /\b[A-Z]{3,4}\b/.test(c) ? timeOf(v) : null; };
      const tm = ok(box?.time) || ok(p[`time${n}`]);
      const tz = tm?.tz || GOLF_TZ.find(([re]) => re.test(where))?.[1] || t.tz;
      const startUTC = new Date(localToUTC(d.y, d.m, d.d, tm ? tm.h : 19, tm ? tm.mi : 0, tz)).toISOString();
      games.push({ n, d, away, home, venue, city, tz, startUTC, timed: !!tm, ifNeeded: /\{\{\s*dagger/i.test(p[`date${n}`]),
        runs: played ? [+played[2], +played[4]] : null, inn: played?.[5] || '', link: (box?.boxurl || '').trim() });
    }
    // a ground's town from another game there with a box score
    for (const g of games) if (!g.city) g.city = games.find(x => x.venue === g.venue && x.city)?.city || '';
    let over = false;
    for (const g of games) {
      if (over && !g.runs) continue;
      const e = { id: `${t.team}-${t.y}-${name.toLowerCase().replace(/[^a-z]+/g, '')}${si ? si + 1 : ''}-${g.n}`, team: t.team, tags: [], sport: 'baseball', comp: t.comp,
        stage: `${t.comp === name ? 'Game' : name + ', game'} ${g.n}${g.ifNeeded && !g.runs ? ' (if needed)' : ''}`, home: g.home, away: g.away,
        startUTC: g.startUTC, timeTBC: !g.timed, ...(g.timed ? {} : { usual: true }), venue: g.venue, city: g.city, tz: g.tz, status: 'upcoming', source: src, ...(/^https?:/.test(g.link) ? { link: g.link } : {}) };
      if (g.runs) {
        const [ar, hr] = g.runs, win = hr > ar ? g.home : ar > hr ? g.away : '';
        if (win) wins[win] = (wins[win] || 0) + 1;
        const [a, b] = [g.home, g.away].map(x => wins[x] || 0), lead = a === b ? `Series level ${a}–${b}` : `${a > b ? g.home : g.away} ${Math.max(a, b) >= need ? 'win' : 'lead'} the series ${Math.max(a, b)}–${Math.min(a, b)}`;
        over = Math.max(a, b) >= need;
        Object.assign(e, { status: 'final', score: `${hr}-${ar}`, summary: `${win ? `${win} won ${Math.max(hr, ar)}–${Math.min(hr, ar)}` : `Tied ${hr}–${ar}`}${g.inn ? ` in ${g.inn} innings` : ''}. ${lead}.` });
      } else if (g.ifNeeded) e.note = 'Only played if the series needs it';
      out.push(e);
    }
  });
  return out;
}
// Final standings. MLB's six divisions, each a {{MLB standings}} template: a team, then its home wins and losses, then its
// road ones. Ranked by wins less losses, games behind the leader worked out
function mlbStandings(text, title) {
  const tpl = templates(stripRefs(text), /^MLB standings$/i)[0];
  if (!tpl) return [];
  const pos = params(tpl.body).pos.map(x => clean(x));
  const rows = [];
  for (let i = 0; i + 4 < pos.length; i += 5) {
    const [nm, hw, hl, rw, rl] = pos.slice(i, i + 5);
    if (!nm || [hw, hl, rw, rl].some(x => !/^\d+$/.test(x))) break;
    const w = +hw + +rw, l = +hl + +rl;
    rows.push({ name: nm, p: w + l, w, d: 0, l, f: 0, a: 0, bp: 0, nr: 0, nrr: '', q: '', champ: false });
  }
  return baseballRows(rows, title);
}
// Nippon Professional Baseball's two leagues: wikitables captioned "... Central League regular season standings", a row a
// team with games, wins, losses and ties
function npbStandings(text) {
  const out = [];
  for (const m of stripRefs(text).matchAll(/\{\|[^\n]*wikitable[\s\S]*?\n\|\}/g)) {
    const cap = clean((m[0].match(/\n\|\+([^\n]*)/) || [])[1] || '');
    const lg = (cap.match(/(Central|Pacific) League/) || [])[0];
    if (!lg || !/standings/i.test(cap)) continue;
    const rows = [];
    for (const c of rowsOf(m[0])) {
      const name = clean(c[1] || '').replace(/^[a-z]+\s*[–-]\s*/i, '').trim(), n = c.slice(2, 6).map(x => +clean(x));
      if (!+clean(c[0] || '') || !name || n.some(isNaN)) continue;
      rows.push({ name, p: n[0], w: n[1], d: n[3], l: n[2], f: 0, a: 0, bp: 0, nr: 0, nrr: '', q: '', champ: false });
    }
    out.push(...baseballRows(rows, lg));
  }
  return out;
}
// winning percentage (".605", ties left out) and games behind ("2½", "—" for the leader)
function baseballRows(rows, title) {
  if (rows.length < 4) return [];
  const pct = r => r.w + r.l ? r.w / (r.w + r.l) : 0;
  rows.sort((a, b) => pct(b) - pct(a));
  const top = rows[0];
  for (const r of rows) {
    r.wpct = pct(r).toFixed(3).replace(/^0/, '');
    const gb = ((top.w - r.w) + (r.l - top.l)) / 2;
    r.gb = r === top || gb <= 0 ? '—' : `${Math.floor(gb) || ''}${gb % 1 ? '½' : ''}`;
  }
  return [{ title, style: 'baseball', rows }];
}

// Wikipedia's calendar has race dates only; TheSportsDB (free key) has start times. At most one call a run:
// the weekend of the next race not looked up in the last 12 hours (or not since sessions were kept too). Answers are kept
// in `cache` (fetch.mjs saves it), with the weekend's practice, qualifying and sprint times.
export async function f1StartTimes(events, cache, diag) {
  const now = Date.now();
  const races = events.filter(e => e.team === 'f1');
  const due = races.filter(e => e.status !== 'final' && Date.parse(e.startUTC) > now - DAY && Date.parse(e.startUTC) < now + 60 * DAY)
    .find(e => !cache[e.id]?.sessions || now - cache[e.id].t > 12 * 36e5);
  const notes = [];
  if (due) {
    const [, season, round] = due.id.split('-');
    try {
      const d = await tsdb(`eventsround.php?id=4370&r=${round}&s=${season}`);
      // the race itself, not practice, sprint or qualifying, within two days of Wikipedia's date
      const t = (d.events || []).filter(ev => ev.strTimestamp && !/practice|qualifying|sprint|shootout|testing/i.test(ev.strEvent || ''))
        .map(ev => Date.parse(ev.strTimestamp.replace(/(\+00:00|Z)$/, '') + 'Z')).find(t => Math.abs(t - Date.parse(due.startUTC)) < 2 * DAY);
      const main = t ? new Date(t).toISOString() : null, sessions = main ? sessionsOf(d, main, F1_SESSION) : [];
      cache[due.id] = { t: now, gp: due.home, startUTC: main, sessions };
      notes.push(`${due.home}: ${main || 'no time listed yet'}${sessions.length ? ` and ${sessions.length} sessions` : ''}`);
    } catch (e) { notes.push(`${due.home}: ${e.message}`); }
  }
  let n = 0, k = 0;
  for (const e of [...races]) {
    const c = cache[e.id];
    if (c?.startUTC && c.gp === e.home && Math.abs(Date.parse(c.startUTC) - Date.parse(e.startUTC)) < 2 * DAY) {
      Object.assign(e, { startUTC: c.startUTC, timeTBC: false }); n++;
      k += addSessions(events, e, c.sessions, s => /^qualifying$/i.test(s), now);
    }
  }
  diag.f1Times = [...notes, `${n} of ${races.length} races with start times, ${k} sessions coming`].join('; ');
}
// a race weekend's other sessions in the same TheSportsDB round (practice, qualifying, sprints, the round's other races),
// named by `name` (blank for the main race), within four days of the main race: [{ n: 'Qualifying', t: iso }]
const F1_SESSION = ev => ((ev.match(/\b(Practice \d|Sprint Qualifying|Sprint Shootout|Sprint|Qualifying)\b/i) || [])[1] || '').replace(/^sprint shootout$/i, 'Sprint Qualifying');
const SC_SESSION = ev => { const m = ev.match(/\b(Practice \d+|Qualifying Race \d+|Top 10 Shootout Race \d+|Race \d+)\b/i);
  return m ? m[1].replace(/^Qualifying Race (\d+)/i, 'Qualifying (Race $1)').replace(/^Top 10 Shootout Race (\d+)/i, 'Top 10 Shootout (Race $1)') : ''; };
const tsdbISO = ts => new Date(Date.parse(String(ts).replace(/(\+00:00|Z)$/, '') + 'Z')).toISOString();
const sessionsOf = (d, main, name) => (d.events || []).filter(ev => ev.strTimestamp).map(ev => ({ n: name(ev.strEvent || ''), t: tsdbISO(ev.strTimestamp) }))
  .filter(s => s.n && s.t !== main && Math.abs(Date.parse(s.t) - Date.parse(main)) < 4 * DAY).sort((a, b) => a.t < b.t ? -1 : 1);
// the sessions as events of their own, while they're still to come: `isMain` ones (F1 qualifying) get a card in the feed,
// the rest (practice, sprints, Supercars' other races and qualifying) show only on the competition's own page
function addSessions(events, e, sessions, isMain, now) {
  let k = 0;
  for (const s of sessions || []) {
    if (Date.parse(s.t) < now - 3 * 36e5) continue;
    events.push({ id: `${e.id}-${s.n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`, team: e.team, tags: e.tags || [], sport: e.sport,
      comp: `${e.comp} · ${s.n}`, round: e.round, home: e.home, away: '', session: s.n, ...(isMain(s.n) ? {} : { minor: true }),
      startUTC: s.t, timeTBC: false, venue: e.venue, city: e.city, tz: e.tz, status: 'upcoming', source: e.source, ...(e.nzEvent ? { nzEvent: true } : {}) });
    k++;
  }
  return k;
}

// Supercars: the round's last race (the Sunday main race) from TheSportsDB, whose round numbers match Wikipedia's.
// One round a run, refreshed every 12 hours, kept in the same cache as F1's
export async function supercarsStartTimes(events, cache, diag) {
  const now = Date.now();
  const rounds = events.filter(e => e.team === 'supercars');
  const due = rounds.filter(e => e.status !== 'final' && Date.parse(e.startUTC) > now - DAY && Date.parse(e.startUTC) < now + 60 * DAY)
    .find(e => !cache[e.id]?.sessions || now - cache[e.id].t > 12 * 36e5);
  const notes = [];
  if (due) {
    const [, season, round] = due.id.split('-');
    try {
      const d = await tsdb(`eventsround.php?id=4489&r=${round}&s=${season}`);
      const t = (d.events || []).filter(ev => ev.strTimestamp && /\brace\b/i.test(ev.strEvent || '') && !/practice|qualifying|shootout/i.test(ev.strEvent || ''))
        .map(ev => Date.parse(ev.strTimestamp.replace(/(\+00:00|Z)$/, '') + 'Z')).filter(t => Math.abs(t - Date.parse(due.startUTC)) < 3 * DAY).sort((a, b) => b - a)[0];
      const main = t ? new Date(t).toISOString() : null, sessions = main ? sessionsOf(d, main, SC_SESSION) : [];
      cache[due.id] = { t: now, gp: due.home, startUTC: main, sessions };
      notes.push(`${due.home}: ${main || 'no time listed yet'}${sessions.length ? ` and ${sessions.length} sessions` : ''}`);
    } catch (e) { notes.push(`${due.home}: ${e.message}`); }
  }
  let n = 0, k = 0;
  for (const e of rounds) {
    const c = cache[e.id];
    if (c?.startUTC && c.gp === e.home && Math.abs(Date.parse(c.startUTC) - Date.parse(e.startUTC)) < 3 * DAY) {
      Object.assign(e, { startUTC: c.startUTC, timeTBC: false }); n++;
      k += addSessions(events, e, c.sessions, () => false, now);
    }
  }
  diag.supercarsTimes = [...notes, `${n} of ${rounds.length} rounds with start times, ${k} sessions coming`].join('; ');
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
// Australian state sides (Sheffield Shield, One-Day Cup): the contracted squad from the "Squad" or "Current squad"
// table on each state team's page. Its rows sit under group rows (Batters, All-rounders, Wicket-keepers, Bowlers),
// and the captain is named in the notes column.
export const STATE_PAGES = { Queensland: 'Queensland cricket team', 'New South Wales': 'New South Wales cricket team', Victoria: 'Victoria cricket team',
  'South Australia': 'South Australia cricket team', 'Western Australia': 'Western Australia cricket team', Tasmania: 'Tasmania cricket team' };
// a cell's attributes ('style="text-align:center"|17') end at a pipe that comes before any link or template
const cellText = c => c.replace(/^[^[{|]*\|(?!\|)/, '').trim();
function stateSquad(text) {
  const i = text.search(/^==\s*(?:Current )?squad\s*==\s*$/im);
  if (i < 0) return [];
  const sec = text.slice(i).replace(/^[^\n]*\n/, ''), j = sec.search(/^==[^=]/m);
  const tbl = ((j < 0 ? sec : sec.slice(0, j)).match(/\{\|[\s\S]*?\n\|\}/) || [])[0];
  if (!tbl) return [];
  const players = [];
  let nameCol = -1, group = '';
  // the header row may come straight after the table's opening line, with no row marker before it
  for (const row of tbl.replace(/^\{\|[^\n]*\n?/, '').split(/\n?\|-[^\n]*/)) {
    const lines = row.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('|}'));
    if (!lines.length) continue;
    if (lines.every(l => l.startsWith('!'))) {
      const heads = lines.flatMap(l => l.slice(1).split('!!')).map(c => clean(cellText(c)));
      // a second header row (the league tables' Debut, Matches, Tries...) keeps the name column found in the first
      // one header cell is a group row (Batters, Bowlers...), unless it's the table's only column, "Player"
      if (heads.length === 1 && !/^(player|name)s?$/i.test(heads[0])) group = heads[0]; else { const k = heads.findIndex(h => /^(player|name)s?$/i.test(h)); if (k >= 0) nameCol = k; }
      continue;
    }
    if (nameCol < 0 || /<s>/.test(row)) continue;
    const cells = lines.filter(l => l.startsWith('|')).flatMap(l => l.slice(1).split('||')).map(cellText);
    let cell = cells[nameCol] || '';
    // league tables name players with {{sortname|Kalyn|Ponga}} rather than a link
    const sn = sqTemplates(cell, 'sortname')[0];
    if (sn) cell = `[[${sn.dab ? `${sn[1]} ${sn[2]} (${sn.dab})` : sn.link || `${sn[1]} ${sn[2]}`}|${sn[1]} ${sn[2]}]]`;
    const n = clean(cell).replace(/\s*\(.*?\)\s*$/, '');
    // a linked name, or a plain one that reads like a name (two to four words of letters): newer squads often list
    // players without articles of their own
    if (!n || (!/\[\[/.test(cell) && !/^[\p{L}'’.-]+( [\p{L}'’.-]+){1,3}$/u.test(n))) continue;
    const notes = clean(cells[cells.length - 1] || ''), w = (cell.match(/\[\[([^\]|#]+)/) || [])[1]?.trim();
    const role = /keeper/i.test(group) ? 'wk' : /all/i.test(group) ? 'ar' : /bowl/i.test(group) ? 'bowl' : /bat/i.test(group) ? 'bat' : '';
    const capt = /\((c|captain)\)\s*$/i.test(clean(cell));
    const r = [/vice[- ]?captain/i.test(notes) ? 'vc' : /\bcaptain\b/i.test(notes) || capt ? 'c' : '', role === 'wk' ? 'wk' : ''].filter(Boolean).join(', ');
    players.push({ n, ...(r ? { r } : {}), ...(role ? { role } : {}), ...(w && w !== n ? { w } : {}) });
  }
  return players;
}
// Other sides' current squads, from their own Wikipedia pages, however the page sets them out: a table (NZ domestic
// cricket, the Big Bash), a plain list, the football squad template, the basketball roster, a national rugby squad or a
// Super Rugby squad. Each is the side's whole squad for the season, not a match-day team. sport|gender|name -> page
export const TEAM_PAGES = {
  'cricket|m|Auckland Aces': 'Auckland cricket team', 'cricket|m|Canterbury': 'Canterbury cricket team', 'cricket|m|Central Stags': 'Central Districts cricket team',
  'cricket|m|Wellington Firebirds': 'Wellington cricket team', 'cricket|m|Otago Volts': 'Otago cricket team', 'cricket|m|Northern Districts': 'Northern Districts cricket team',
  ...Object.fromEntries(['Adelaide Strikers', 'Brisbane Heat', 'Hobart Hurricanes', 'Melbourne Renegades', 'Melbourne Stars', 'Perth Scorchers', 'Sydney Sixers', 'Sydney Thunder']
    .flatMap(t => [[`cricket|m|${t}`, t], [`cricket|w|${t}`, `${t} (WBBL)`]])),
  ...Object.fromEntries(['New Zealand Breakers', 'Adelaide 36ers', 'Brisbane Bullets', 'Cairns Taipans', 'Illawarra Hawks', 'Melbourne United', 'Perth Wildcats', 'Sydney Kings', 'Tasmania JackJumpers']
    .map(t => [`basketball|m|${t}`, t])), 'basketball|m|S.E. Melbourne Phoenix': 'South East Melbourne Phoenix',
  ...Object.fromEntries(['Wellington Phoenix', 'Auckland FC', 'Brisbane Roar', 'Melbourne City', 'Western Sydney Wanderers', 'Central Coast Mariners', 'Melbourne Victory', 'Newcastle Jets',
    'Sydney FC', 'Adelaide United', 'Perth Glory', 'Macarthur FC'].map(t => [`football|m|${t}`, /FC$/.test(t) ? t : `${t} FC`])),
  'rugby|m|All Blacks': 'New Zealand national rugby union team', 'rugby|w|Black Ferns': "New Zealand women's national rugby union team",
  ...Object.fromEntries(['Scotland', 'Wales', 'England', 'Ireland', 'France', 'South Africa', 'Argentina', 'Italy'].map(t => [`rugby|m|${t}`, `${t} national rugby union team`])),
  'rugby|m|Wallabies': 'Australia national rugby union team', 'rugby|w|France': "France women's national rugby union team",
  'rugby|m|Blues': 'Blues (Super Rugby)', 'rugby|m|Chiefs': 'Chiefs (rugby union)', 'rugby|m|Hurricanes': 'Hurricanes (rugby union)', 'rugby|m|Crusaders': 'Crusaders (rugby union)',
  'rugby|m|Highlanders': 'Highlanders (rugby union)', 'rugby|m|Moana Pasifika': 'Moana Pasifika',
  // Premier League clubs
  ...Object.fromEntries(['Arsenal', 'Aston Villa', 'Brentford', 'Chelsea', 'Coventry City', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich Town', 'Leeds United',
    'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Tottenham Hotspur', 'Burnley', 'West Ham United',
    'Wolverhampton Wanderers', 'Leicester City', 'Southampton'].map(t => [`football|m|${t}`, `${t} F.C.`])),
  'football|m|Bournemouth': 'AFC Bournemouth', 'football|m|Brighton and Hove Albion': 'Brighton & Hove Albion F.C.', 'football|m|Hull City': 'Hull City A.F.C.',
  'football|m|Sunderland': 'Sunderland A.F.C.',
  // the league World Cup sides: men (m), women (w) and wheelchair (wc)
  ...Object.fromEntries(['Australia', 'New Zealand', 'Tonga', 'Samoa', 'England', 'Papua New Guinea', 'Fiji', 'Cook Islands', 'France', 'Lebanon']
    .map(t => [`league|m|${t}`, `${t} national rugby league team`])),
  ...Object.fromEntries(['Australia', 'New Zealand', 'England', 'Papua New Guinea', 'Samoa', 'Cook Islands', 'Fiji', 'France', 'Tonga', 'Wales']
    .map(t => [`league|w|${t}`, `${t} women's national rugby league team`])),
  ...Object.fromEntries(['England', 'France', 'Australia', 'Wales', 'Scotland', 'Ireland', 'USA', 'Spain', 'New Zealand']
    .map(t => [`league|wc|${t}`, `${t === 'USA' ? 'United States' : t} national wheelchair rugby league team`])),
};
const sqTplArgs = t => { const a = {}, pos = []; let depth = 0, cur = '';
  for (const ch of t) { if (ch === '{' || ch === '[') depth++; if (ch === '}' || ch === ']') depth--; if (ch === '|' && depth === 0) { pos.push(cur); cur = ''; } else cur += ch; }
  pos.push(cur);
  pos.slice(1).forEach((x, i) => { const m = x.match(/^\s*([\w ]+?)\s*=([\s\S]*)$/); if (m) a[m[1].toLowerCase()] = m[2].trim(); else a[i + 1] = x.trim(); });
  return a; };
// every {{name ...}} template in a text, with its arguments (nested templates kept whole)
const sqTemplates = (text, name) => { const out = [], re = new RegExp(`\\{\\{\\s*${name}\\s*\\|`, 'gi'); let m;
  while ((m = re.exec(text))) { let i = m.index + 2, depth = 1; while (i < text.length && depth) { if (text.startsWith('{{', i)) { depth++; i += 2; } else if (text.startsWith('}}', i)) { depth--; i += 2; } else i++; }
    out.push(sqTplArgs(text.slice(m.index + 2, i - 2))); }
  return out; };
const sqLink = v => { const m = String(v || '').match(/\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]/); return m ? { n: clean(m[2] || m[1]), w: m[1].trim() } : { n: clean(v) }; };
const sqPlayer = (who, r) => { const { n, w } = who; return n ? { n, ...(r ? { r } : {}), ...(w && w !== n ? { w } : {}) } : null; };
function squadSection(text) {
  // the heading may carry an anchor or a comment first: === <span class="anchor" id="Current squad"></span>First-team squad ===
  const m = text.match(/^(=+)\s*(?:<span[^>]*><\/span>\s*|<!--[\s\S]*?-->\s*)*(current squad|current roster|first[- ]team squad|senior squad|contracted players|squad)\s*\1\s*$/im);
  if (!m) return '';
  const rest = text.slice(m.index + m[0].length), end = rest.search(new RegExp(`^={1,${m[1].length}}[^=]`, 'm'));
  return end < 0 ? rest : rest.slice(0, end);
}
export function readSquad(text) {
  const out = readSquadIn(squadSection(text));
  if (out.length >= 8) return out;
  // some national sides keep their squad under a plain "Players" heading
  const m = text.match(/^(=+)\s*Players\s*\1\s*$/im);
  if (!m) return out;
  const rest = text.slice(m.index + m[0].length), end = rest.search(new RegExp(`^={1,${m[1].length}}[^=]`, 'm'));
  const alt = readSquadIn(end < 0 ? rest : rest.slice(0, end));
  return alt.length > out.length ? alt : out;
}
function readSquadIn(sec) {
  if (!sec) return [];
  let out = [];
  // national rugby: {{nat rs player|pos=HK|name={{sortname|Codie|Taylor|dab=...}}|...}}
  out = sqTemplates(sec, 'nat rs player').map(a => { const sn = sqTemplates(a.name || '', 'sortname')[0];
    const who = sn ? { n: `${sn[1]} ${sn[2]}`.trim(), w: sn.dab ? `${sn[1]} ${sn[2]} (${sn.dab})` : '' } : sqLink(a.name);
    return sqPlayer(who, [a.pos, /captain|\(c\)/i.test(a.other || a.note || '') ? 'c' : ''].filter(Boolean).join(', ')); });
  if (!out.length) { // Super Rugby: '''Props''' then {{RU squad player|NZL|Name|captain=y}}
    let group = '';
    for (const line of sec.split('\n')) {
      const g = line.match(/^'''([^']+)'''\s*$/); if (g) { group = g[1].replace(/s$/, ''); continue; }
      for (const a of sqTemplates(line, 'RU squad player')) out.push(sqPlayer({ n: clean(a[2] || '') }, [group, a.captain ? 'c' : ''].filter(Boolean).join(', ')));
    }
  }
  if (!out.length) out = [...sqTemplates(sec, 'fs player'), ...sqTemplates(sec, 'football squad player')].map(a => sqPlayer(sqLink(a.name), [a.pos, /captain/i.test(a.other || '') ? 'c' : ''].filter(Boolean).join(', ')));
  if (!out.length) out = sqTemplates(sec, 'player3').map(a => sqPlayer({ n: `${a.first || ''} ${a.last || ''}`.trim(), w: a.link || '' }, a.pos || ''));
  if (!out.length) out = stateSquad('==Squad==\n' + sec);
  if (!out.length) out = sec.split('\n').filter(l => /^\*\s*\S/.test(l)).map(l => sqPlayer(sqLink(l.replace(/^\*\s*/, '')), '')); // a plain list
  return out.filter(Boolean).filter(p => p.n && !/^\{\{/.test(p.n));
}
// the pages of the sides given (sport|gender|name keys), in requests of 50
export async function teamSquads(keys, diag) {
  const want = keys.filter(k => TEAM_PAGES[k]), out = [];
  try {
    for (let i = 0; i < want.length; i += 50) {
      const part = want.slice(i, i + 50), titles = [...new Set(part.map(k => TEAM_PAGES[k]))];
      const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&maxlag=5&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(titles.join('|')),
        { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json(), back = {};
      for (const m of [...(j.query?.normalized || []), ...(j.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
      const text = Object.fromEntries((j.query?.pages || []).map(pg => [back[pg.title] || pg.title, pg.revisions?.[0]?.slots?.main?.content || '']));
      for (const k of part) {
        const players = readSquad(text[TEAM_PAGES[k]] || ''), [sport, g, team] = k.split('|');
        // a table read in the wrong column gives the same name over and over (a club, not players): not a squad
        if (players.length >= 8 && new Set(players.map(p => p.n)).size >= players.length * 0.8) out.push({ sport, g, team, players });
      }
    }
    diag.teamSquads = `${out.length} of ${want.length}: ` + want.filter(k => !out.some(s => `${s.sport}|${s.g}|${s.team}` === k)).map(k => k.split('|')[2]).join(', ') + ' missing';
  } catch (e) { diag.teamSquads = 'error ' + e.message; }
  return out;
}
// the six pages in one request; a state whose page has no squad table is left out
export async function stateSquads(diag) {
  try {
    const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&maxlag=5&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(Object.values(STATE_PAGES).join('|')), { headers: UA });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json(), back = Object.fromEntries((j.query?.redirects || []).map(x => [x.to, x.from])), out = {};
    for (const pg of j.query?.pages || []) {
      const state = Object.keys(STATE_PAGES).find(k => STATE_PAGES[k] === (back[pg.title] || pg.title));
      const players = state ? stateSquad(pg.revisions?.[0]?.slots?.main?.content || '') : [];
      if (players.length >= 8) out[state] = players;
    }
    diag.stateSquads = Object.keys(STATE_PAGES).map(k => `${k} ${out[k]?.length || 0}`).join(', ');
    return out;
  } catch (e) { diag.stateSquads = 'error ' + e.message; return {}; }
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
  const m = title.match(/^(.*?) (?:women's )?cricket team in (?:the )?(.*?) in /);
  if (!m) return c.comp;
  const ADJ = { Indian: 'India', English: 'England', Pakistani: 'Pakistan', 'Sri Lankan': 'Sri Lanka', 'South African': 'South Africa', Bangladeshi: 'Bangladesh', Afghan: 'Afghanistan', Zimbabwean: 'Zimbabwe', Irish: 'Ireland', 'West Indian': 'West Indies' };
  // a tour between two other nations: host first, "South Africa v Pakistan"
  if (c.classify === 'intlcricket') return /United Arab Emirates/.test(m[2]) ? `${ADJ[m[1]] || m[1]} in the UAE` : `${m[2]} v ${ADJ[m[1]] || m[1]}`;
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
// "Crusaders Super Rugby", "Fiji Rugby League", "New Zealand Rugby", "Australia Netball" -> "Crusaders", "Fiji", "New Zealand", "Australia"
const tsdbTeam = s => (s || '').replace(/\s+(Super Rugby|Rugby League|Rugby Union|Rugby|Netball)$/, '');
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
export { tennisFinals as _tennisFinals, dateRange as _dateRange, TENNIS as _TENNIS };
export { supercarsSeason as _supercarsSeason, readSquad as _readSquad, stateSquad as _stateSquad, fromTsdb as _fromTsdb, hostFirst as _hostFirst, f1Season as _f1Season, f1Standings as _f1Standings, squadsFromPage as _squadsFromPage, eventsFromPage as _eventsFromPage, ufcFromList as _ufcFromList, fightCard as _fightCard, sportsTables as _sportsTables };
