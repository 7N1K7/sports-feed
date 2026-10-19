// probe 34: v252 live: alerts and calendars diag, and what the ntfy topic holds
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)' };
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { headers: UA })).json();
console.log('version', f.site?.version, '| generated', f.generatedAt);
console.log('alerts:', f.diag?.alerts);
console.log('calendars:', f.diag?.calendars);
const t = await (await fetch('https://ntfy.sh/kickoffkiwi-nz/json?poll=1&since=12h', { headers: UA })).text();
console.log('ntfy kickoffkiwi-nz last 12h:', t.trim() ? t.trim().split('\n').map(l => { const m = JSON.parse(l); return `${new Date(m.time * 1000).toISOString()} ${m.title} | ${m.message} | ${m.click}`; }).join('\n  ') : '(none)');
const next = (f.events || []).filter(e => Date.parse(e.startUTC) > Date.now()).sort((a, b) => a.startUTC.localeCompare(b.startUTC)).slice(0, 5);
console.log('next games:', next.map(e => `${e.startUTC} ${e.team} ${e.home} v ${e.away}${e.timeTBC ? ' (TBC)' : ''}`).join('\n  '));
