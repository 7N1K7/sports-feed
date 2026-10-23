import fs from 'fs';
const out = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
out.push('generatedAt ' + f.generatedAt);
for (const e of f.events.filter(e => /Tri-(Series|Nation)/i.test(e.comp || ''))) out.push([e.startUTC.slice(0, 10), e.comp, e.home, 'v', e.away, e.minor ? 'MINOR' : '', 'bc=' + JSON.stringify(e.broadcast), e.watchNote || '', e.watchAU || ''].join(' | '));
for (const e of f.events.filter(e => /Scotland|Wales|Ireland|England|Canada|USA|Italy|Japan|South Africa|France|Australia/.test(e.home + ' ' + e.away) && (e.homeLogo || e.awayLogo) && e.sport !== 'cricket'))
  out.push(['LOGO', e.sport, e.home, e.away, (e.homeLogo || '').slice(0, 70), (e.awayLogo || '').slice(0, 70)].join(' | '));
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
