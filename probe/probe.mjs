// picture pass: other-language Wikipedia lead images and a loose Commons search for fighters without a free photo
import { writeFile } from 'node:fs/promises';
const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const out = [], log = s => { out.push(s); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async (host, q) => { await sleep(1300); let r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&maxlag=5&` + q, UA); if (r.status === 429) { await sleep(20000); r = await fetch(`https://${host}/w/api.php?format=json&formatversion=2&` + q, UA); } if (!r.ok) throw new Error(`${host} ${r.status}`); return r.json(); };
const NAMES = { boxer: ['Masamichi Yabuki', 'Nelson Hysa', 'Callum Smith', 'Anthony Cacace', 'Nick Ball', 'Joshua Buatsi', 'Willy Hutchinson', 'Emanuel Navarrete', 'Dalton Smith', 'Alberto Puello', 'Sebastian Fundora', 'Tom Nolan'],
  fighter: ['Navajo Stirling', 'Kevin Vallejos', 'Joshua Pacio', 'Keito Yamakita', 'Chihiro Sawada', 'Waldo Cortes-Acosta', 'Joaquin Buckley', 'Yaroslav Amosov', 'Serghei Spivac', 'Mário Pinto', 'Santiago Luna', 'Shamil Gaziev', 'Amir Albazi', 'Tahir Abdullayev', 'Kyler Phillips', 'Junior Tafa', 'Chidi Njokuani', 'Ignacio Bahamondes', 'Ion Cuțelaba', 'Park Jun-yong', 'Ryujin Nasukawa', 'Tatsumitsu Wada', 'Hiromi Wajima', 'Diogo Reis'] };
const FIGHT = /box|fight|martial|mma|kickbox|wrestl|judo|jiu|muay|sambo|karate/i;
const PREF = ['ja', 'es', 'pt', 'ru', 'de', 'fr', 'pl', 'it', 'uk', 'ko', 'zh', 'th', 'nl', 'sv', 'tr', 'ar', 'fa', 'ro', 'cs', 'fi', 'id', 'arz'];
for (const [kind, list] of Object.entries(NAMES)) for (const n of list) {
  log(`== ${n} [${kind}]`);
  try {
    const s = await get('www.wikidata.org', 'action=wbsearchentities&language=en&type=item&limit=5&search=' + encodeURIComponent(n));
    const hit = (s.search || []).find(x => FIGHT.test(x.description || ''));
    if (!hit) log('   WIKIDATA none: ' + (s.search || []).map(x => x.description || '-').join(' | ').slice(0, 160));
    else {
      const e = (await get('www.wikidata.org', 'action=wbgetentities&props=sitelinks|claims&ids=' + hit.id)).entities[hit.id];
      const links = Object.entries(e.sitelinks || {}).filter(([k]) => /^[a-z-]+wiki$/.test(k) && !/^(en|commons|species|meta)wiki$/.test(k)).map(([k, v]) => [k.replace(/wiki$/, '').replace(/_/g, '-'), v.title]);
      log(`   WIKIDATA ${hit.id} (${hit.description}) P18:${e.claims?.P18?.[0]?.mainsnak?.datavalue?.value || '-'} cat:${e.claims?.P373?.[0]?.mainsnak?.datavalue?.value || '-'} wikis:${links.map(l => l[0]).join(',')}`);
      links.sort((a, b) => (PREF.indexOf(a[0]) + 1 || 99) - (PREF.indexOf(b[0]) + 1 || 99));
      for (const [lang, title] of links.slice(0, 4)) {
        try {
          const r = await get(`${lang}.wikipedia.org`, 'action=query&prop=pageimages&piprop=name|original&pilicense=free&titles=' + encodeURIComponent(title));
          const pg = r.query?.pages?.[0];
          log(`   ${lang}: ${pg?.pageimage ? 'FREE IMAGE ' + pg.pageimage : 'no free image'}`);
        } catch (err) { log(`   ${lang}: error ${err.message}`); }
      }
    }
    const c = await get('commons.wikimedia.org', 'action=query&list=search&srnamespace=6&srlimit=6&srsearch=' + encodeURIComponent(n));
    const sur = n.split(' ').pop().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const t = (c.query?.search || []).map(x => x.title.replace(/^File:/, ''));
    log('   COMMONS ' + (t.filter(x => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(sur)).join(' ;; ') || `nothing naming them (${t.length} unrelated)`));
  } catch (err) { log('   error ' + err.message); }
}
// TheSportsDB badges for the two Shield sides without one
for (const q of ['Western Australia', 'Western Warriors', 'Western Australia Warriors', 'South Australia', 'Southern Redbacks', 'South Australia Redbacks', 'West End Redbacks']) {
  await sleep(2600);
  try { const r = await fetch('https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=' + encodeURIComponent(q), UA); const d = r.ok ? await r.json() : { err: r.status };
    log(`TSDB ${q}: ` + (d.err ? 'error ' + d.err : (d.teams || []).map(t => `${t.strTeam} [${t.strSport} / ${t.strLeague}] badge:${t.strBadge ? 'yes' : 'no'}`).join(' ;; ') || 'none')); } catch (err) { log(`TSDB ${q}: error ${err.message}`); }
}
// far-off UFC cards billed by surname: do their pages exist yet, and what do they say?
for (const t of ['UFC Fight Night: Bonfim vs. Brady', 'UFC 336', 'UFC Fight Night: Salkilld vs. Saint Denis', 'UFC Fight Night: Pyfer vs. Nickal']) {
  try { const r = await get('en.wikipedia.org', 'action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=' + encodeURIComponent(t)); const pg = r.query?.pages?.[0];
    log(`UFCPAGE ${t}: ${pg?.missing ? 'missing' : (pg.title + ' :: ' + String(pg.extract || '').replace(/\s+/g, ' ').slice(0, 330))}`); } catch (err) { log(`UFCPAGE ${t}: error ${err.message}`); }
}
await writeFile(new URL('./out.txt', import.meta.url), out.join('\n') + '\n');
