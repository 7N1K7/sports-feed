import fs from 'fs';
const out = [];
const j = async u => { try { const r = await fetch(u, { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' } }); return await r.json(); } catch (e) { return { err: e.message }; } };
for (const q of ['South Australia cricket logo', 'Redbacks cricket logo', 'Western Australia cricket logo', 'Western Warriors cricket', 'WACA logo', 'Central Districts cricket logo', 'Central Hinds', 'Central Stags logo', 'Otago Sparks logo', 'Wellington Blaze logo']) {
  const d = await j('https://commons.wikimedia.org/w/api.php?format=json&action=query&list=search&srnamespace=6&srlimit=8&srsearch=' + encodeURIComponent(q));
  const titles = (d.query?.search || []).map(x => x.title);
  let lic = {};
  if (titles.length) {
    const ii = await j('https://commons.wikimedia.org/w/api.php?format=json&action=query&prop=imageinfo&iiprop=extmetadata|url&titles=' + encodeURIComponent(titles.join('|')));
    for (const p of Object.values(ii.query?.pages || {})) lic[p.title] = (p.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value || '?') + ' ' + (p.imageinfo?.[0]?.url || '');
  }
  out.push('Q ' + q + ':\n  ' + titles.map(t => t + ' — ' + lic[t]).join('\n  '));
}
// Wikidata logos (P154) for the two state sides and the Hinds
for (const t of ['South Australia cricket team', 'Western Australia cricket team', 'Central Districts women\'s cricket team', 'Central Districts cricket team']) {
  const d = await j('https://en.wikipedia.org/w/api.php?format=json&action=query&prop=pageprops|pageimages&piprop=original&redirects=1&titles=' + encodeURIComponent(t));
  for (const p of Object.values(d.query?.pages || {})) out.push('WP ' + t + ' -> ' + p.title + ' wikidata ' + p.pageprops?.wikibase_item + ' img ' + (p.original?.source || p.pageprops?.page_image_free || p.pageprops?.page_image || '-'));
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
