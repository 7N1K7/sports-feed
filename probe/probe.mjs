// probe 69: a freely licensed West Indies cricket flag on Commons (licence and author for each candidate)
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' };
const j = async u => { const r = await fetch(u, { headers: UA }); return r.ok ? r.json() : { err: r.status }; };
const titles = new Set();
for (const q of ['West Indies cricket flag', 'West Indies Cricket Board flag', 'Cricket West Indies flag', 'WestIndiesCricketFlag', 'West Indies cricket team flag palm']) {
  const d = await j('https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srlimit=12&format=json&srsearch=' + encodeURIComponent(q));
  (d.query?.search || []).forEach(x => titles.add(x.title));
}
// and what Wikidata says for the team: flag (P41) and logo (P154)
const wd = await j('https://www.wikidata.org/w/api.php?action=wbsearchentities&language=en&format=json&search=' + encodeURIComponent('West Indies cricket team'));
for (const e of (wd.search || []).slice(0, 3)) {
  const c = await j(`https://www.wikidata.org/wiki/Special:EntityData/${e.id}.json`), cl = c.entities?.[e.id]?.claims || {};
  console.log('wikidata', e.id, e.label, '| P41', (cl.P41 || []).map(x => x.mainsnak.datavalue?.value).join(', ') || '-', '| P154', (cl.P154 || []).map(x => x.mainsnak.datavalue?.value).join(', ') || '-');
  [...(cl.P41 || []), ...(cl.P154 || [])].forEach(x => x.mainsnak.datavalue && titles.add('File:' + x.mainsnak.datavalue.value));
}
const list = [...titles];
for (let i = 0; i < list.length; i += 20) {
  const d = await j('https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url|extmetadata|size&format=json&titles=' + encodeURIComponent(list.slice(i, i + 20).join('|')));
  for (const p of Object.values(d.query?.pages || {})) {
    const ii = p.imageinfo?.[0], m = ii?.extmetadata || {};
    console.log(p.title, '|', m.LicenseShortName?.value || '?', '|', (m.Artist?.value || '').replace(/<[^>]+>/g, '').slice(0, 60), '|', ii ? `${ii.width}x${ii.height}` : 'missing', '|', ii?.url || '');
  }
}
