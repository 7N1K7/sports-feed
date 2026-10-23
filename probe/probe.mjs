// probe 135: logos diag, and what TheSportsDB's free key gives for the NBA and MLB team lists
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json();
const d = f.diag || {};
for (const k of Object.keys(d)) if (/logo|tsdb|thesportsdb|links|teamLinks/i.test(k)) console.log(k, ':', JSON.stringify(d[k]).slice(0, 300));
console.log('teamLinks sample:', JSON.stringify(f.teamLinks).slice(0, 600));
for (const l of ['NBA', 'MLB', 'Nippon Baseball League', 'Nippon Professional Baseball']) {
  const r = await fetch(`https://www.thesportsdb.com/api/v1/json/123/search_all_teams.php?l=${encodeURIComponent(l)}`);
  const t = await r.text(); let j = {}; try { j = JSON.parse(t); } catch {}
  console.log(l, r.status, (j.teams || []).length, (j.teams || []).slice(0, 40).map(x => `${x.strTeam}${x.strBadge ? '' : ' (no badge)'}`).join(', ').slice(0, 900));
  await new Promise(r => setTimeout(r, 2500));
}
