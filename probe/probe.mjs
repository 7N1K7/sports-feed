// probe 33: live v251 check: rankings, app files, and the HTTPS / redirect set-up for kickoff.kiwi
const UA = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)' };
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { headers: UA })).json();
console.log('version', f.site?.version, '| generated', f.generatedAt);
console.log('rankings diag:', f.diag?.rankings);
for (const l of f.rankings || []) console.log(' ', l.sport, '|', l.title, '|', l.asOf || '-', '|', l.rows.length, 'rows |', l.rows.slice(0, 2).map(r => r.name).join(', '), '|', l.rows.filter(r => r.nz).map(r => r.rank + '. ' + r.name).join(', '));
for (const u of ['https://kickoff.kiwi/manifest.webmanifest', 'https://kickoff.kiwi/sw.js', 'https://kickoff.kiwi/apple-touch-icon.png', 'https://kickoff.kiwi/icons/app-512.png', 'https://kickoff.kiwi/icons/app-maskable-512.png', 'https://kickoff.kiwi/icons/hockey.svg', 'https://kickoff.kiwi/data/cal/nz.ics', 'https://kickoff.kiwi/data/cal/blacksticks.ics']) {
  const r = await fetch(u, { headers: UA });
  console.log(r.status, (r.headers.get('content-type') || '').padEnd(32), u);
}
// redirects: follow nothing, show where each goes
for (const u of ['http://kickoff.kiwi/', 'http://www.kickoff.kiwi/', 'https://www.kickoff.kiwi/', 'https://7n1k7.github.io/sports-feed/', 'https://7n1k7.github.io/sports-feed/data/feed.json']) {
  try { const r = await fetch(u, { headers: UA, redirect: 'manual' }); console.log(r.status, u, '->', r.headers.get('location') || '(no redirect)'); }
  catch (e) { console.log('ERR', u, e.cause?.code || e.message); }
}
const home = await fetch('https://kickoff.kiwi/', { headers: UA });
const html = await home.text();
console.log('home', home.status, '| hsts:', home.headers.get('strict-transport-security') || 'none', '| manifest link:', html.includes('rel="manifest"'), '| page has hockey:', html.includes("'blacksticks'"));
// the certificate
const tls = await import('node:tls');
await new Promise(res => { const s = tls.connect(443, 'kickoff.kiwi', { servername: 'kickoff.kiwi' }, () => { const c = s.getPeerCertificate(); console.log('cert for', c.subject?.CN, '| alt names', c.subjectaltname, '| issuer', c.issuer?.O, c.issuer?.CN, '| valid to', c.valid_to, '| trusted:', s.authorized); s.end(); res(); }); s.on('error', e => { console.log('tls error', e.message); res(); }); });
await new Promise(res => { const s = tls.connect(443, 'www.kickoff.kiwi', { servername: 'www.kickoff.kiwi' }, () => { const c = s.getPeerCertificate(); console.log('www cert alt names', c.subjectaltname, '| trusted:', s.authorized); s.end(); res(); }); s.on('error', e => { console.log('www tls error', e.message); res(); }); });
