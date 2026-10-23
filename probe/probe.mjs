// probe 112: v389 live: the report route answers (a too-short note, so nothing is stored), the page has the button
const api = 'https://kickoff-api.kickoffkiwi.workers.dev';
const r = await fetch(api + '/report', { method: 'POST', headers: { origin: 'https://kickoff.kiwi', 'content-type': 'text/plain', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130' }, body: JSON.stringify({ note: 'x' }) });
console.log('report (short note):', r.status, r.headers.get('access-control-allow-origin'));
const o = await fetch(api + '/report', { method: 'POST', headers: { origin: 'https://evil.example', 'content-type': 'text/plain', 'user-agent': 'Mozilla/5.0 Chrome/130' }, body: JSON.stringify({ note: 'not from the site' }) });
console.log('report (other site):', o.status);
const h = await (await fetch('https://kickoff.kiwi/?' + Date.now())).text();
console.log('page: version', (h.match(/v(\d{3})/) || [])[1], '| report dialog:', h.includes('id="reportDlg"'), '| Const. Cup:', h.includes("'Const. Cup'"));
const s = await (await fetch('https://kickoff.kiwi/stats.html?' + Date.now())).text();
console.log('stats page reports list:', s.includes('id="reports"'));
