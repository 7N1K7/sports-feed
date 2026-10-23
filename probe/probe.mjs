import fs from 'fs';
const out = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
out.push('generatedAt ' + f.generatedAt + ' events ' + f.events.length + ' tables ' + f.tables.length);
for (const e of f.events.filter(e => /Tri-(Series|Nation)/i.test(e.comp || ''))) out.push([e.startUTC.slice(0, 10), e.comp, e.home, 'v', e.away, e.minor ? 'MINOR' : '', e.watchNote || ''].join(' | '));
for (const t of f.tables.filter(t => /Tri/.test(t.comp))) out.push('TABLE ' + t.comp + ': ' + t.rows.map(r => r.name).join(', '));
const sc = f.events.filter(e => /Scotland Women/.test(e.home + e.away));
for (const e of sc) out.push(['SCOT', e.home, e.away, e.homeLogo || '-', e.awayLogo || '-'].join(' | '));
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
