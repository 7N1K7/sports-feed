// 13 Nov: what the new pairing of two sources' cards would do differently (fixture names only, no scores)
for (let i = 0; i < 14; i++) {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?probe=' + Date.now())).json();
  if (f.diag?.pairTrial) { console.log('built', f.generatedAt, 'events', f.events.length, 'liveSourceEvents', f.diag.liveSourceEvents); console.log(String(f.diag.pairTrial).split(' || ').join('\n')); console.log('moved:', f.diag.movedGames || 'none'); process.exit(0); }
  await new Promise(r => setTimeout(r, 45000));
}
console.log('no pairTrial in the live feed after 10 minutes');
