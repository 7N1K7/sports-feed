// free photos of fighters the site has none for: Commons search (loose) and other-language Wikipedia lead images
const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0 (personal non-commercial site)' } };
const nap = ms => new Promise(r => setTimeout(r, ms));
const get = async (host, q) => { await nap(350); const r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&` + q, UA); if (!r.ok) throw new Error(host + ' ' + r.status); return r.json(); };
const NAMES = { boxer: ['Masamichi Yabuki', 'Nelson Hysa', 'Callum Smith', 'Anthony Cacace', 'Nick Ball', 'Joshua Buatsi', 'Willy Hutchinson', 'Emanuel Navarrete', 'Dalton Smith', 'Alberto Puello', 'Sebastian Fundora', 'Tom Nolan'],
  fighter: ['Navajo Stirling', 'Waldo Cortes-Acosta', 'Joaquin Buckley', 'Joshua Pacio', 'Keito Yamakita', 'Chihiro Sawada', 'Kevin Vallejos', 'Shamil Gaziev', 'Amir Albazi', 'Yaroslav Amosov', 'Serghei Spivac', 'Ion Cuțelaba', 'Park Jun-yong', 'Kyler Phillips', 'Junior Tafa', 'Chidi Njokuani', 'Ignacio Bahamondes', 'Mairon Santos', 'Santiago Luna'] };
const FIGHT = /box|fight|martial|mma|kickbox|wrestl|judo|muay|ボクサー|格闘|boxe|kämpfer|luchador|lutador|bokser/i;
for (const [kind, names] of Object.entries(NAMES)) for (const n of names) {
  const out = [];
  try {
    const s = await get('commons.wikimedia.org', 'action=query&list=search&srnamespace=6&srlimit=8&srsearch=' + encodeURIComponent(`${n} ${kind === 'boxer' ? 'boxer OR boxing' : 'UFC OR MMA OR fighter'}`));
    out.push('COMMONS ' + ((s.query?.search || []).map(x => x.title.replace(/^File:/, '').slice(0, 70)).join(' ;; ') || 'nothing'));
    const w = await get('www.wikidata.org', 'action=wbsearchentities&language=en&type=item&limit=4&search=' + encodeURIComponent(n));
    const ents = (w.search || []).filter(x => FIGHT.test(x.description || ''));
    for (const e of ents.slice(0, 1)) {
      const d = await get('www.wikidata.org', `action=wbgetentities&props=sitelinks|claims&ids=${e.id}`), ent = d.entities?.[e.id] || {};
      const p18 = ent.claims?.P18?.[0]?.mainsnak?.datavalue?.value, cat = ent.claims?.P373?.[0]?.mainsnak?.datavalue?.value;
      const links = Object.entries(ent.sitelinks || {}).filter(([k]) => /^(en|ja|de|es|pt|fr|ru|it|pl|th|nl|ko|tl|ar|uk|ro|ka|kk)wiki$/.test(k));
      out.push(`WIKIDATA ${e.id} (${e.description}) P18:${p18 || '-'} cat:${cat || '-'} wikis:${links.map(([k]) => k.replace('wiki', '')).join(',')}`);
      for (const [k, v] of links) {
        if (k === 'enwiki') continue;
        const r = await get(`${k.replace('wiki', '')}.wikipedia.org`, 'action=query&prop=pageimages&piprop=name&pilicense=free&redirects=1&titles=' + encodeURIComponent(v.title));
        const img = r.query?.pages?.[0]?.pageimage; if (img) out.push(`  ${k}: ${img}`);
      }
    }
    if (!ents.length) out.push('WIKIDATA no fighter entity: ' + (w.search || []).map(x => `${x.label} (${x.description || ''})`).join(' | ').slice(0, 200));
  } catch (e) { out.push('error ' + e.message); }
  console.log(`== ${n} [${kind}]\n   ` + out.join('\n   '));
}
