// probe 11: during a rain delay, does ESPN carry an inspection or restart time anywhere?
const H = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', accept: 'application/json' };
const get = async u => { try { const r = await fetch(u, { headers: H }); return await r.json(); } catch (e) { return { err: e.message }; } };
const hd = await get('https://site.web.api.espn.com/apis/v2/scoreboard/header?sport=cricket&lang=en&region=nz');
for (const s of hd.sports || []) for (const l of s.leagues || []) for (const ev of l.events || []) if (/South Africa/.test(ev.name) && /Australia/.test(ev.name)) {
  console.log('HEADER status', ev.status, '|', ev.summary, '|', JSON.stringify(ev.fullStatus));
  console.log('NOTES', JSON.stringify((ev.notes || []).filter(n => n.type === 'matchnote' || /inspect|resum|restart|start/i.test(n.text || ''))));
  const sum = await get(`https://site.web.api.espn.com/apis/site/v2/sports/cricket/${l.id}/summary?event=${ev.id}&lang=en&region=nz`);
  const t = JSON.stringify(sum);
  console.log('SUMMARY keys', Object.keys(sum).join(','), t.length);
  for (const m of t.matchAll(/inspect\w*|resum\w*|restart\w*|play (?:will|to|is expected to) (?:start|resume|begin)|covers|lunch will|early lunch|early tea/gi)) console.log('CTX', t.slice(Math.max(0, m.index - 220), m.index + 220).replace(/\\n/g, ' '));
}
const bbc = await (await fetch('https://feeds.bbci.co.uk/sport/cricket/rss.xml')).text();
for (const m of bbc.matchAll(/<title><!\[CDATA\[([^\]]*)\]\]><\/title>\s*<description><!\[CDATA\[([^\]]*)\]\]>/g)) if (/south africa|australia/i.test(m[1])) console.log('BBC', m[1], '|', m[2]);
