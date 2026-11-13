// 14 Nov daily check: the live feed's own checks and age (nothing counted)
const f = await fetch(`https://kickoff.kiwi/data/feed.json?t=${Date.now()}`).then(r => r.json());
console.log('CHECKS generatedAt', f.generatedAt, 'age min', Math.round((Date.now() - Date.parse(f.generatedAt)) / 6e4));
const c = f.checks || {};
console.log('keys', Object.keys(c).join(' '));
for (const k of ['noResult', 'thinWeeks']) { const v = c[k]; console.log(`\n## ${k}`); console.log(JSON.stringify(v, null, 0).slice(0, 5000)); }
