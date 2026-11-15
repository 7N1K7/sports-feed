// the live feed's state for tonight's RLWC finals: status and whether a result is in (never the result itself)
const j = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
console.log('feed built', j.generatedAt);
for (const e of j.events.filter(e => /rlwc-(w|m)-final/.test(e.id))) console.log(e.id, '| status', e.status, '| result in:', !!(e.score || e.summary), '| keys', Object.keys(e).filter(k => !/score|summary|winner|result|leaders/i.test(k)).join(','));
