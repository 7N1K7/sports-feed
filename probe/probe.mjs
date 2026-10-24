import fs from 'fs';
const titles = ['Centurion, Gauteng', 'East London, Eastern Cape', 'St. Petersburg, Florida', 'Hamilton, Ontario'];
const r = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&redirects=1&prop=description&titles=' + encodeURIComponent(titles.join('|')), { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' } })).json();
fs.writeFileSync(new URL('./out.txt', import.meta.url), JSON.stringify(r.query, null, 1));
