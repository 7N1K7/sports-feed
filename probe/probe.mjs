// picture pass 2: other-language Wikipedia lead images for fighters whose English article has no free photo
import { writeFile } from 'node:fs/promises';
const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const out = [], log = s => { out.push(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async (host, q) => { await sleep(1300); let r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&` + q, UA); if (r.status === 429) { await sleep(25000); r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&` + q, UA); } if (!r.ok) throw new Error(`${host} ${r.status}`); return r.json(); };
const NAMES = { boxer: ['Masamichi Yabuki', 'Nelson Hysa', 'Callum Smith', 'Anthony Cacace', 'Nick Ball', 'Joshua Buatsi', 'Willy Hutchinson', 'Emanuel Navarrete', 'Dalton Smith', 'Alberto Puello', 'Sebastian Fundora', 'Tom Nolan'],
  fighter: ['Navajo Stirling', 'Kevin Vallejos', 'Joshua Pacio', 'Keito Yamakita', 'Chihiro Sawada', 'Waldo Cortes-Acosta', 'Joaquin Buckley', 'Yaroslav Amosov', 'Serghei Spivac', 'Mário Pinto', 'Santiago Luna', 'Shamil Gaziev', 'Amir Albazi', 'Tahir Abdullayev', 'Kyler Phillips', 'Junior Tafa', 'Chidi Njokuani', 'Ignacio Bahamondes', 'Ion Cuțelaba', 'Park Jun-yong', 'Ryujin Nasukawa', 'Tatsumitsu Wada', 'Hiromi Wajima', 'Diogo Reis'] };
const FIGHT = /box|fight|martial|mma|kickbox|wrestl|judo|jiu|muay|sambo|karate/i;
const PREF = ['ja', 'es', 'pt', 'ru', 'de', 'fr', 'pl', 'it', 'uk', 'ko', 'zh', 'th', 'nl', 'sv', 'tr', 'ar', 'fa', 'ro', 'cs', 'fi', 'id'];
const qid = {};
try {
  const titles = Object.entries(NAMES).flatMap(([k, l]) => l.flatMap(n => [n, `${n} (${k})`]));
  for (let i = 0; i < titles.length; i += 40) {
    const r = await get('en.wikipedia.org', 'action=query&prop=description|pageprops&ppprop=wikibase_item|disambiguation&redirects=1&titles=' + encodeURIComponent(titles.slice(i, i + 40).join('|')));
    const back = {}; for (const m of [...(r.query?.normalized || []), ...(r.query?.redirects || [])]) back[m.to] = back[m.from] || m.from;
    for (const pg of r.query?.pages || []) { const n = (back[pg.title] || pg.title).replace(/ \((boxer|fighter)\)$/, ''); if (!pg.missing && !pg.pageprops?.disambiguation && FIGHT.test(pg.description || '') && pg.pageprops?.wikibase_item) qid[n] ||= pg.pageprops.wikibase_item; }
  }
  log('QIDS ' + Object.entries(qid).map(([n, q]) => `${n}=${q}`).join(', '));
  const ids = Object.values(qid), ents = {};
  for (let i = 0; i < ids.length; i += 40) Object.assign(ents, (await get('www.wikidata.org', 'action=wbgetentities&props=sitelinks|claims&ids=' + ids.slice(i, i + 40).join('|'))).entities || {});
  for (const [n, q] of Object.entries(qid)) {
    const e = ents[q] || {};
    const links = Object.entries(e.sitelinks || {}).filter(([k]) => /^[a-z_]+wiki$/.test(k) && !/^(en|commons|species|meta|simple)wiki$/.test(k)).map(([k, v]) => [k.replace(/wiki$/, '').replace(/_/g, '-'), v.title]);
    links.sort((a, b) => (PREF.indexOf(a[0]) + 1 || 99) - (PREF.indexOf(b[0]) + 1 || 99));
    log(`== ${n} ${q} P18:${e.claims?.P18?.[0]?.mainsnak?.datavalue?.value || '-'} cat:${e.claims?.P373?.[0]?.mainsnak?.datavalue?.value || '-'} wikis:${links.map(l => l[0]).join(',')}`);
    for (const [lang, title] of links.slice(0, 5)) {
      try { const pg = (await get(`${lang}.wikipedia.org`, 'action=query&prop=pageimages&piprop=name&pilicense=free&titles=' + encodeURIComponent(title))).query?.pages?.[0];
        log(`   ${lang}: ${pg?.pageimage ? 'FREE IMAGE ' + pg.pageimage : 'no free image'}`); } catch (err) { log(`   ${lang}: error ${err.message}`); }
    }
  }
} catch (err) { log('error ' + err.message); }
// what the Commons files that share a fighter's name really are
try {
  const r = await get('commons.wikimedia.org', 'action=query&prop=imageinfo|categories&cllimit=20&iiprop=extmetadata|size&iiextmetadatafilter=ImageDescription|LicenseShortName|Artist|DateTimeOriginal&titles=' + encodeURIComponent(['File:Dalton Smith.jpg', 'File:Tahir Abdullayev.jpg', 'File:Mario Pinto Interview.png', 'File:Santiago Luna.JPG'].join('|')));
  const plain = h => String(h || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
  for (const pg of r.query?.pages || []) { const m = pg.imageinfo?.[0]?.extmetadata || {}; log(`FILE ${pg.title}: ${pg.imageinfo?.[0]?.width}x${pg.imageinfo?.[0]?.height} | ${plain(m.ImageDescription?.value)} | ${plain(m.LicenseShortName?.value)} | by ${plain(m.Artist?.value)} | ${plain(m.DateTimeOriginal?.value)} | cats: ${(pg.categories || []).map(c => c.title.replace('Category:', '')).join('; ').slice(0, 300)}`); }
} catch (err) { log('FILE error ' + err.message); }
// the live netball cards: result entered, never the score itself
try { const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); log('FEED ' + f.generatedAt + ' ' + f.events.filter(e => /^wmseries/.test(e.id)).map(e => `${e.id} ${e.status} ${e.score ? 'has a result' : 'no result'}`).join(' | ')); } catch (err) { log('FEED error ' + err.message); }
await writeFile(new URL('./out.txt', import.meta.url), out.join('\n') + '\n');
