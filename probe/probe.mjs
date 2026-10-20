// probe 53: free-to-use logos for the state cricket sides: the team pages' infobox files (Commons or local non-free?)
// and a Commons search
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const api = async (host, q) => { await new Promise(r => setTimeout(r, 900)); return (await fetch(`https://${host}/w/api.php?format=json&formatversion=2&` + q, { headers: UA })).json(); };
const pages = ['Queensland cricket team', 'South Australia cricket team', 'Western Australia cricket team', 'New South Wales cricket team', 'Victoria cricket team', 'Tasmania cricket team'];
const r = await api('en.wikipedia.org', 'action=query&prop=revisions&rvprop=content&rvslots=main&titles=' + encodeURIComponent(pages.join('|')));
const files = new Set();
for (const pg of r.query.pages) {
  const t = pg.revisions?.[0]?.slots?.main?.content || '';
  const box = (t.match(/\{\{\s*Infobox cricket team[\s\S]*?\n\}\}/i) || [''])[0];
  const fs = [...box.matchAll(/^\s*\|\s*(logo|image|crest|badge)\s*=\s*(?:\[\[(?:File|Image):)?([^|\]\n]+\.(?:svg|png|jpg|jpeg|gif))/gim)].map(m => [m[1], m[2].trim()]);
  console.log(pg.title, '| infobox files:', JSON.stringify(fs));
  for (const [, f] of fs) files.add(f);
}
if (files.size) {
  const ii = await api('en.wikipedia.org', 'action=query&prop=imageinfo&iiprop=url|extmetadata&titles=' + encodeURIComponent([...files].map(f => 'File:' + f).join('|')));
  for (const pg of ii.query.pages) { const m = pg.imageinfo?.[0]?.extmetadata || {}; console.log(' ', pg.title, '| repository:', pg.imagerepository, '| licence:', m.LicenseShortName?.value, '| non-free:', m.NonFree?.value || '', '| url:', pg.imageinfo?.[0]?.url); }
}
for (const q of ['Queensland Bulls logo', 'Queensland cricket logo', 'South Australia Redbacks', 'West End Redbacks logo', 'Western Warriors cricket', 'Western Australia cricket logo', 'WACA logo']) {
  const s = await api('commons.wikimedia.org', 'action=query&list=search&srnamespace=6&srlimit=6&srsearch=' + encodeURIComponent(q));
  console.log(`commons "${q}":`, (s.query?.search || []).map(x => x.title).join(' | ') || 'none');
}
