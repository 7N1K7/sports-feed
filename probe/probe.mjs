import { writeFileSync } from 'fs';
const get = async t => (await fetch('https://en.wikipedia.org/w/index.php?action=raw&title=' + encodeURIComponent(t), { headers: { 'user-agent': 'kickoff.kiwi probe' } })).text();
writeFileSync('probe/out-w.txt', await get("2026 Women's Rugby League World Cup"));
writeFileSync('probe/out-m.txt', await get("2026 Men's Rugby League World Cup Pools B & C"));
writeFileSync('probe/out.txt', 'ok\n');
