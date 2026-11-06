import { writeFileSync } from 'fs';
const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed)' } };
const j = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=pageimages|description|pageprops&piprop=name&pilicense=free&ppprop=wikibase_item&redirects=1&titles=' + encodeURIComponent('Nelson Asofa-Solomona|Paul Gallen|Masamichi Yabuki'), UA)).json();
const out = j.query.pages.map(p => `${p.title} | ${p.description} | img ${p.pageimage || '-'} | ${p.pageprops?.wikibase_item}`);
const c = await (await fetch('https://commons.wikimedia.org/w/api.php?format=json&formatversion=2&action=query&list=search&srnamespace=6&srlimit=10&srsearch=' + encodeURIComponent('Asofa-Solomona'), UA)).json();
out.push('commons: ' + (c.query?.search || []).map(x => x.title).join(' ; '));
writeFileSync('probe/out.txt', out.join('\n') + '\n');
