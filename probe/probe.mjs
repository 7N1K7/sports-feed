// probe 5: ESPN cricket live data shape, captured while South Africa v Australia is under rain
const BROWSER = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', accept: 'application/json' };
const get = async url => { try { const r = await fetch(url, { headers: BROWSER, signal: AbortSignal.timeout(20000) }); return { s: r.status, j: await r.json().catch(() => null) }; } catch (e) { return { s: 'ERR ' + e.message, j: null }; } };
const WANT = /South Africa|Australia|New Zealand|India|England|Pakistan|Sri Lanka|Bangladesh|West Indies|Zimbabwe|Afghanistan|Canterbury|Otago|Wellington|Auckland|Northern|Central|Hinds|Blaze|Sparks|Magicians|Hearts|Brave/;

const sp = await get('https://site.web.api.espn.com/apis/site/v2/sports/cricket/scorepanel?lang=en&region=nz');
console.log('scorepanel', sp.s);
const states = {};
let picked = null;
for (const sc of sp.j?.scores || []) for (const lg of sc.leagues || []) for (const ev of sc.events || []) {
  const st = ev.status || ev.competitions?.[0]?.status || {};
  const key = `${st.type?.id}|${st.type?.description}|${st.type?.state}`;
  (states[key] ||= []).push(`${ev.name} :: ${st.summary || ''} :: ${st.session || ''}`);
}
for (const sc of sp.j?.scores || []) {
  const lg = sc.leagues?.[0];
  for (const ev of sc.events || []) {
    if (!WANT.test(ev.name || '')) continue;
    console.log('\n######', lg?.id, lg?.name, '|', ev.id, ev.name, ev.date, ev.endDate || '');
    const { competitions, links, ...rest } = ev;
    console.log('EVENT', JSON.stringify(rest).slice(0, 2500));
    const c = competitions?.[0] || {};
    const { competitors, ...crest } = c;
    console.log('COMP', JSON.stringify(crest).slice(0, 3000));
    for (const t of competitors || []) console.log('TEAM', JSON.stringify({ id: t.id, homeAway: t.homeAway, name: t.team?.displayName, short: t.team?.shortDisplayName, abbr: t.team?.abbreviation, logo: t.team?.logo, score: t.score, linescores: t.linescores, winner: t.winner }).slice(0, 1500));
    if (/South Africa/.test(ev.name) && /Australia/.test(ev.name)) picked = { lg: lg?.id, id: ev.id };
  }
}
console.log('\n###### status kinds across all events');
for (const [k, v] of Object.entries(states)) console.log('STATUS', k, '->', v.length, '|', v.slice(0, 4).join(' || '));

if (picked) {
  for (const url of [
    `https://site.web.api.espn.com/apis/site/v2/sports/cricket/${picked.lg}/summary?event=${picked.id}&lang=en&region=nz`,
    `https://site.api.espn.com/apis/site/v2/sports/cricket/${picked.lg}/summary?event=${picked.id}`,
  ]) {
    const r = await get(url);
    console.log('\n###### SUMMARY', r.s, url);
    if (!r.j) continue;
    console.log('KEYS', Object.keys(r.j).join(','));
    const h = r.j.header || {};
    const c = h.competitions?.[0] || {};
    console.log('HEADER status', JSON.stringify(c.status || h.status || {}).slice(0, 2000));
    console.log('HEADER competitors', JSON.stringify((c.competitors || []).map(t => ({ n: t.team?.displayName, score: t.score, ls: t.linescores }))).slice(0, 2000));
    for (const k of ['notes', 'gameInfo', 'matchcards', 'news', 'article']) if (r.j[k]) console.log(k.toUpperCase(), JSON.stringify(r.j[k]).slice(0, 1500));
    const t = JSON.stringify(r.j);
    for (const m of t.matchAll(/rain|delay|wet|covers|inspection|bad light/gi)) { console.log('CTX', t.slice(Math.max(0, m.index - 200), m.index + 200)); if (m.index > 0 && (globalThis.n = (globalThis.n || 0) + 1) > 8) break; }
  }
}

// also the header endpoint used by espn.com's score strip, for the same match
const hd = await get('https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket&lang=en&region=nz');
for (const s of hd.j?.sports || []) for (const lg of s.leagues || []) for (const ev of lg.events || []) if (/South Africa/.test(ev.name) && /Australia/.test(ev.name) || /New Zealand/.test(ev.name)) {
  console.log('\n###### HEADER EVENT', lg.id, lg.name, JSON.stringify(ev).slice(0, 3500));
}
console.log('\ndone', new Date().toISOString());
