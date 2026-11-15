// the live feed's own checks (no scores), and how many results carry a first-seen time
const j = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
console.log('feed built', j.generatedAt, '| results timed:', j.events.filter(e => e.resultAt).length);
console.log(JSON.stringify(j.checks, null, 1).slice(0, 6000));
