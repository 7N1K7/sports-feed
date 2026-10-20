// probe 65: logo coverage on the live feed: every club/domestic side (countries have flags), with or without a logo
const j = await (await fetch('https://kickoff.kiwi/data/feed.json', { cache: 'no-store' })).json();
const now = Date.now(), DAY = 864e5, sides = new Map();
const PH = /TBC|winner|loser|\bor\b|^[A-Z]\d$|qualifier|Group [A-Z]|\d(st|nd|rd|th) place|TBA|^\?/i;
for (const e of j.events) {
  if (['motor', 'tennis', 'mma', 'boxing'].includes(e.sport) || Math.abs(Date.parse(e.startUTC) - now) > 60 * DAY) continue;
  for (const side of ['home', 'away']) {
    const n = e[side]; if (!n || PH.test(n)) continue;
    const k = `${e.sport}|${n}`, logo = e[side + 'Logo'] || e[side + 'Badge'];
    const s = sides.get(k) || { sport: e.sport, n, logo: false, comps: new Set(), games: 0 };
    s.logo ||= !!logo; s.comps.add(e.comp || ''); s.games++; sides.set(k, s);
  }
}
console.log('version', j.site?.version, '| sides (next/last 60 days, team sports):', sides.size);
// countries show a flag in the page; count them apart
const COUNTRY = /^(New Zealand|Australia|England|India|South Africa|Pakistan|Sri Lanka|Bangladesh|West Indies|Zimbabwe|Ireland|Scotland|Afghanistan|Netherlands|Wales|France|Italy|Argentina|Japan|Fiji|Samoa|Tonga|Georgia|Portugal|Uruguay|Chile|Canada|United States|USA|Namibia|Nepal|Oman|UAE|United Arab Emirates|Papua New Guinea|Cook Islands|Lebanon|Jamaica|Spain|Germany|Belgium|China|Korea|South Korea|Malaysia|Philippines|Chinese Taipei|Qatar|Iran|Jordan|Kazakhstan|Syria|Bahrain|Saudi Arabia|Guam|Indonesia|Mongolia|Thailand|Iraq|Malawi|Uganda|Kenya|Brazil|Mexico|Egypt|Nigeria|Hong Kong|Singapore)( Women| A)?$/;
const nick = /^(All Blacks|Black Ferns|Black Caps|White Ferns|Kiwis|Kiwi Ferns|Wallabies|Wallaroos|Springboks|Proteas|Black Sticks|Tall Blacks|Tall Ferns|Silver Ferns|Kangaroos|Jillaroos|Los Pumas|Red Roses|Hockeyroos|Kookaburras|Boomers|Opals|Diamonds)/;
const rows = [...sides.values()], clubs = rows.filter(s => !COUNTRY.test(s.n) && !nick.test(s.n));
const by = {};
for (const s of clubs) { const b = by[s.sport] ||= { have: 0, all: 0, missing: [] }; b.all++; if (s.logo) b.have++; else b.missing.push(`${s.n} (${[...s.comps].join('/').slice(0, 40)})`); }
const tot = clubs.length, have = clubs.filter(s => s.logo).length;
console.log(`club and domestic sides with a logo: ${have}/${tot} = ${Math.round(100 * have / tot)}%  (national sides show their flag: ${rows.length - clubs.length} more)`);
for (const [sp, b] of Object.entries(by)) console.log(`\n${sp}: ${b.have}/${b.all} (${Math.round(100 * b.have / b.all)}%) — missing: ${b.missing.join('; ') || 'none'}`);
