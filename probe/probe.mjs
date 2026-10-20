// probe 87: Liverpool's squad section; Sky Go guide channel names; how the free-to-air guide marks live vs delayed
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const q = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=Liverpool_F.C.', { headers: UA })).json();
const t = q.query.pages[0].revisions[0].slots.main.content;
const i = t.search(/^=+\s*(players|current squad|first[- ]team squad)\s*=+\s*$/im); console.log(t.slice(i, i + 900));
const sky = await (await fetch('https://i.mjh.nz/SkyGo/epg.xml', { headers: UA })).text();
console.log('\nSky Go channel elements:', sky.slice(sky.indexOf('<channel'), sky.indexOf('<channel') + 600));
const chans = [...sky.matchAll(/<channel id="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/g)].map(m => `${m[1]}=${(m[2].match(/<display-name[^>]*>([^<]+)/) || [])[1]}`);
console.log('channels', chans.length, chans.slice(0, 60).join(', '));
const nz = await (await fetch('https://i.mjh.nz/nz/epg.xml', { headers: UA })).text();
for (const k of ['Blackcaps v India', 'Black Ferns V France', 'Premier League: Arsenal', 'NPC Rugby Grand Final', 'UFC Fight Night']) { const j = nz.indexOf(k); const s = nz.lastIndexOf('<programme', j); console.log('\n', nz.slice(s, nz.indexOf('</programme>', j) + 12).replace(/\s+/g, ' ').slice(0, 700)); }
const sp = [...sky.matchAll(/<programme start="(\S+) [^"]*" stop="[^"]*" channel="([^"]+)">\s*<title[^>]*>([^<]*(?: v |Black Caps|Blackcaps|White Ferns|Warriors|Phoenix|Super Smash|Ford Trophy|Sheffield|NPC|A-League|NBL|Breakers)[^<]*)<\/title>/gi)].filter(m => m[1] > '20261020').slice(0, 40);
console.log('\nSky Go sport titles:'); for (const m of sp) console.log('  ', m[1], m[2], '|', m[3].slice(0, 90));
