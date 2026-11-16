import { gzipSync } from 'node:zlib';
for (const u of ['https://kickoff.kiwi/data/feed.json', 'https://kickoff.kiwi/', 'https://kickoff.kiwi/index.html']) {
  const r = await fetch(u + (u.endsWith('json') ? '?x=' + Date.now() : ''), { headers: { 'accept-encoding': 'gzip, br' } });
  const b = Buffer.from(await r.arrayBuffer());
  console.log(u, r.status, 'raw', (b.length / 1024).toFixed(0) + ' KB', 'gzipped', (gzipSync(b).length / 1024).toFixed(0) + ' KB', 'enc', r.headers.get('content-encoding'), 'cache', r.headers.get('cache-control'));
}
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?y=' + Date.now())).json();
const parts = Object.entries(f).map(([k, v]) => [k, JSON.stringify(v).length]).sort((a, b) => b[1] - a[1]);
console.log('parts', parts.map(([k, n]) => `${k} ${(n / 1024).toFixed(0)}KB`).join(', '));
console.log('events', f.events.length, 'past', f.events.filter(e => Date.parse(e.startUTC) < Date.now() - 864e5).length);
const fields = {}; for (const e of f.events) for (const [k, v] of Object.entries(e)) fields[k] = (fields[k] || 0) + JSON.stringify(v).length + k.length + 4;
console.log('event fields', Object.entries(fields).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([k, n]) => `${k} ${(n / 1024).toFixed(0)}KB`).join(', '));
