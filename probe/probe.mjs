// probe 111: v388 on the live site: golf round counts and the page's new stage code
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('version', f.site?.version, '| golf', JSON.stringify(f.diag.golf));
const g = f.events.filter(e => e.sport === 'golf');
const span = e => Math.round((Date.parse(e.startUTC) - Date.parse(e.openUTC)) / 864e5) + 1;
console.log('rounds:', JSON.stringify(Object.entries(g.reduce((m, e) => (m[span(e)] = (m[span(e)] || 0) + 1, m), {}))));
console.log('3-round:', g.filter(e => span(e) === 3).map(e => e.home).slice(0, 12).join('; '));
console.log('now:', g.filter(e => Math.abs(Date.parse(e.startUTC) - Date.now()) < 4 * 864e5).map(e => `${e.home} ${span(e)}`).join('; '));
const h = await (await fetch('https://kickoff.kiwi/?' + Date.now())).text();
console.log('page has stageNow:', h.includes('function stageNow'), '| LIVE_TEAM:', h.includes('LIVE_TEAM'), '| theme box 11em:', h.includes('.panel .spoil-row .dbtn { width: 11em }'));
