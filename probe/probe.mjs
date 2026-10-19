// probe 6: full ESPN cricket header events (live, finished, upcoming) so the parser matches the real shape
const BROWSER = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', accept: 'application/json' };
const get = async url => { try { const r = await fetch(url, { headers: BROWSER, signal: AbortSignal.timeout(20000) }); return { s: r.status, j: await r.json().catch(() => null) }; } catch (e) { return { s: 'ERR ' + e.message, j: null }; } };
const hd = await get('https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket&lang=en&region=nz');
console.log('header', hd.s);
const all = (hd.j?.sports || []).flatMap(s => (s.leagues || []).flatMap(l => (l.events || []).map(ev => ({ l, ev }))));
console.log('events', all.length, 'leagues', (hd.j?.sports || []).flatMap(s => s.leagues || []).length);
const kinds = {};
for (const { l, ev } of all) {
  const t = ev.fullStatus?.type || {};
  (kinds[`${ev.status}|${t.id}|${t.description}`] ||= []).push(`${ev.name} [${ev.fullStatus?.session || ''}] ${ev.summary || ''} / ${ev.fullStatus?.longSummary || ''}`);
}
for (const [k, v] of Object.entries(kinds)) console.log('KIND', k, v.length, '|', v.slice(0, 3).join(' || '));
const show = (tag, x) => console.log(`\n###### ${tag} ${x.l.id} ${x.l.name}\n${JSON.stringify(x.ev, null, 0)}`);
const sa = all.find(x => /South Africa/.test(x.ev.name) && /Australia/.test(x.ev.name)); if (sa) show('LIVE TEST', sa);
const post = all.find(x => x.ev.status === 'post' && /Women/.test(x.ev.name)) || all.find(x => x.ev.status === 'post'); if (post) show('FINISHED', post);
const pre = all.find(x => x.ev.status === 'pre'); if (pre) show('UPCOMING', pre);
const t20 = all.find(x => x.ev.status === 'in' && /T20/.test(x.ev.class?.eventType || x.ev.class?.generalClassCard || '')); if (t20) show('LIVE T20', t20);
console.log('\nleague list:', (hd.j?.sports || []).flatMap(s => s.leagues || []).map(l => `${l.id}:${l.name}`).join(' ; '));
const sp = await get('https://site.web.api.espn.com/apis/site/v2/sports/cricket/scorepanel?lang=en&region=nz');
console.log('\nscorepanel retry', sp.s, (sp.j?.scores || []).length);
console.log('\ndone', new Date().toISOString());
