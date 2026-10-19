// probe 41: did the first phone alerts go out? ntfy topics' last 3 hours, and the feed's alert log
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)' };
for (const t of ['kickoffkiwi-epl', 'kickoffkiwi-nz', 'kickoffkiwi-whiteferns']) {
  const txt = await (await fetch(`https://ntfy.sh/${t}/json?poll=1&since=3h`, { headers: UA })).text();
  const msgs = txt.trim() ? txt.trim().split('\n').map(l => JSON.parse(l)).filter(m => m.event === 'message') : [];
  console.log(`${t}: ${msgs.length} message(s)`);
  for (const m of msgs) console.log(`  ${new Date(m.time * 1000).toISOString()} | ${m.title} | ${m.message} | priority ${m.priority || 3} | ${m.click}`);
}
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { headers: UA })).json();
console.log('feed generated', f.generatedAt, '| version', f.site?.version);
console.log('alerts diag:', f.diag?.alerts);
const spurs = (f.events || []).find(e => /Tottenham/.test(e.home + e.away) && /Coventry/.test(e.home + e.away));
console.log('Spurs v Coventry in feed:', spurs ? `${spurs.startUTC} ${spurs.status} timeTBC=${spurs.timeTBC}` : 'not found');
