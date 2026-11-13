// 14 Nov: why fighters have no photo (the live feed's own notes; nothing counted)
const f = await fetch(`https://kickoff.kiwi/data/feed.json?t=${Date.now()}`).then(r => r.json());
const d = f.diag || {};
console.log('WHY', Object.keys(d).filter(k => /face/i.test(k)).join(' '));
for (const k of Object.keys(d).filter(k => /face/i.test(k))) { const v = d[k]; console.log(`\n## ${k}`); console.log(Array.isArray(v) ? v.slice(0, 60).join('\n') : String(v).slice(0, 4000)); }
const now = Date.now();
for (const e of (f.events || []).filter(e => /^(mma|boxing)$/.test(e.sport) && Math.abs(Date.parse(e.startUTC) - now) < 20 * 864e5)) console.log('EV', e.startUTC.slice(0, 10), e.team, '|', e.home, e.homeLogo ? 'Y' : '-', '|', e.away, e.awayLogo ? 'Y' : '-', '| card', (e.card || []).length, JSON.stringify((e.card || []).slice(0, 2)).slice(0, 200));
