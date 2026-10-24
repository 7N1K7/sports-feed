import fs from 'fs';
const out = [];
for (const u of ['https://www.skyarena.co.nz', 'https://www.sky.co.nz/skyarena', 'https://www.sky.co.nz/sky-arena', 'https://www.sky.co.nz/sport', 'https://www.sky.co.nz/espn', 'https://www.sky.co.nz/channels/espn']) {
  try { const r = await fetch(u, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 KickoffKiwi link check' } }); const t = await r.text(); out.push(`${u} -> ${r.status} ${r.url} title: ${(t.match(/<title[^>]*>([^<]*)/i) || [])[1]?.trim().slice(0, 90)}`); }
  catch (e) { out.push(`${u} -> ERR ${e.message}`); }
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
