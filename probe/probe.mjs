// 13 Nov: did the fighter photos from TheSportsDB drop (live feed only; nothing counted)
const f = await fetch(`https://kickoff.kiwi/data/feed.json?t=${Date.now()}`).then(r => r.json());
const d = f.diag || f.diagnostics || {};
console.log('FACES generated', f.generated || f.updated || '', '| sportsdb:', d.facesSportsDB);
const by = {}; for (const e of f.events || []) for (const s of ['home', 'away']) if (/^(mma|boxing)$/.test(e.sport) && e[s + 'Credit']) { const k = /TheSportsDB/.test(e[s + 'Credit']) ? e[s + 'Credit'] : 'other source'; by[k] = (by[k] || 0) + 1; }
console.log('fighter photo credits:', JSON.stringify(by));
const v = await fetch(`https://kickoff.kiwi/data/version.json?t=${Date.now()}`).then(r => r.json()).catch(() => ({})); console.log('version', JSON.stringify(v));
