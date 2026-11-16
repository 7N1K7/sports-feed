const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const now = Date.now(), H = 36e5;
// finished-by-time games from Fri 13 Nov 11am UTC (Sat NZ) with no result yet; names only, never a result
const miss = f.events.filter(e => { const t = Date.parse(e.startUTC); return t > Date.parse('2026-11-13T11:00:00Z') && t < now - 10 * H && !(e.status === 'final' && (e.score || e.summary)) && !/golf|motor|cycling|sailing/.test(e.sport) && !e.cancelled; });
console.log('no result yet:', miss.length);
for (const e of miss) console.log(' ', e.startUTC.slice(0, 16), e.sport, '|', e.comp, '|', e.home || '', 'v', e.away || '', '|', e.status, e.curated ? 'hand-kept' : '', '| id', e.id);
const d = f.diag || {};
for (const [k, v] of Object.entries(d)) if (/miss|quiet|dup|gap|fail|error|stale|warn|unmatched/i.test(k + ' ' + String(v).slice(0, 80))) console.log('diag', k, '=', String(v).slice(0, 260));
