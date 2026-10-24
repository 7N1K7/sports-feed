import fs from 'fs';
const urls = JSON.parse(fs.readFileSync(new URL('./lurls.json', import.meta.url)));
const out = {};
await Promise.all(urls.map(async u => { try { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 KickoffKiwi preview' } }); if (r.ok) out[u] = [r.headers.get('content-type'), Buffer.from(await r.arrayBuffer()).toString('base64')]; } catch {} }));
fs.writeFileSync(new URL('./out.txt', import.meta.url), JSON.stringify(out));
