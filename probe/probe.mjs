import { writeFileSync } from 'fs';
const out = [];
const r = await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now());
out.push('feed status ' + r.status + ' ' + r.headers.get('content-length') + ' ' + r.headers.get('last-modified'));
const t = await r.text(); out.push('bytes ' + t.length);
try { const f = JSON.parse(t); out.push('generated ' + f.generatedAt + ' events ' + f.events.length); writeFileSync('probe/out-feed.json', t); } catch (e) { out.push('PARSE ERROR ' + e.message + ' head ' + t.slice(0, 200)); }
const h = await fetch('https://kickoff.kiwi/?x=' + Date.now()); const ht = await h.text();
out.push('index status ' + h.status + ' bytes ' + ht.length + ' last-modified ' + h.headers.get('last-modified'));
writeFileSync('probe/out-index.html', ht);
writeFileSync('probe/out.txt', out.join('\n') + '\n');
