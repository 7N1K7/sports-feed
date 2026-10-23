import fs from 'fs';
const out = [];
const j = async u => { try { const r = await fetch(u, { headers: { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi)' } }); return await r.json(); } catch (e) { return { err: e.message }; } };
for (const q of ['South Australian Cricket Association', 'SACA cricket', 'West End Redbacks', 'Cricket WA']) {
  const d = await j('https://commons.wikimedia.org/w/api.php?format=json&action=query&list=search&srnamespace=6&srlimit=10&srsearch=' + encodeURIComponent(q));
  out.push('Q ' + q + ': ' + (d.query?.search || []).map(x => x.title).join(' ; '));
}
const ii = await j('https://commons.wikimedia.org/w/api.php?format=json&action=query&prop=imageinfo&iiprop=extmetadata|url|size&titles=' + encodeURIComponent('File:Cricket WA colour.svg'));
for (const p of Object.values(ii.query?.pages || {})) { const m = p.imageinfo?.[0]?.extmetadata || {}; out.push(JSON.stringify({ url: p.imageinfo?.[0]?.url, w: p.imageinfo?.[0]?.width, h: p.imageinfo?.[0]?.height, lic: m.LicenseShortName?.value, artist: m.Artist?.value?.replace(/<[^>]+>/g, ''), desc: m.ImageDescription?.value?.replace(/<[^>]+>/g, '').slice(0, 200), used: m.UsageTerms?.value })); }
fs.writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n'));
