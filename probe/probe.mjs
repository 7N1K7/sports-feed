// 14 Nov: which sides in the live feed have no image, by sport and competition (live feed only; nothing counted)
const f = await fetch(`https://kickoff.kiwi/data/feed.json?t=${Date.now()}`).then(r => r.json());
const now = Date.now(), solo = e => ['motor', 'tennis', 'sailing', 'golf', 'cycling'].includes(e.sport);
const miss = {}, have = {}, names = {};
for (const e of f.events || []) {
  const t = Date.parse(e.startUTC); if (t < now - 14 * 864e5 || t > now + 60 * 864e5 || solo(e)) continue;
  for (const s of ['home', 'away']) { const n = e[s]; if (!n || /TBC|winner|\bor\b/i.test(n)) continue;
    const k = `${e.sport} | ${e.team || ''}`; const src = e[s + 'Logo'] ? (/thesportsdb/.test(e[s + 'Logo']) ? 'tsdb' : /wikimedia|wikipedia/.test(e[s + 'Logo']) ? 'commons' : /flagcdn|flag/.test(e[s + 'Logo']) ? 'flag' : 'other') : null;
    if (src) { (have[k] ||= {})[src] = ((have[k] ||= {})[src] || 0) + 1; } else { miss[k] = (miss[k] || 0) + 1; (names[k] ||= new Set()).add(n); } }
}
console.log('GAPS (next 60 days and last 14), sides with no image');
for (const [k, n] of Object.entries(miss).sort((a, b) => b[1] - a[1])) console.log(`${k}: ${n} missing; have ${JSON.stringify(have[k] || {})}; e.g. ${[...names[k]].slice(0, 12).join(', ')}`);
console.log('\nfully covered:', Object.keys(have).filter(k => !miss[k]).join('; '));
