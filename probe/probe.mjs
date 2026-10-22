// probe 103: the live feed after v377 (saved whole for local testing): home sides turned, form from last season's tours
import { writeFileSync } from 'node:fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
writeFileSync('probe/out-feed.json', JSON.stringify(f));
console.log('generated', f.generatedAt, 'version', f.site?.version, 'events', f.events?.length);
console.log('homeSides:', f.diag?.homeSides);
console.log('form:', f.diag?.form);
for (const k of ['cricket|New Zealand', 'cricket|India', 'cricket|New Zealand Women', 'cricket|Australia Women']) console.log(k, JSON.stringify((f.form?.[k] || []).slice(-6).map(x => `${x.d} ${x.r} v ${x.o} ${x.f || ''}`)));
console.log('wikipedia pages:', Object.entries(f.diag?.wikipedia || {}).filter(([t]) => /2025–26/.test(t)).map(([t, n]) => `${t}: ${n}`).join('; '));
console.log('formOnly in feed:', f.events.filter(e => e.formOnly).length);
for (const e of f.events.filter(e => e.comp === 'Sheffield Shield' && Math.abs(Date.parse(e.startUTC) - Date.now()) < 40 * 864e5)) console.log(e.startUTC.slice(0, 10), e.home, 'v', e.away, '|', e.city, e.status);
