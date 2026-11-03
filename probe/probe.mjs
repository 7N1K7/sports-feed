import { writeFileSync } from 'fs';
const out = [];
const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text(); out.push('live page has the retry: ' + h.includes('async function feedOnce') + ', version ' + (h.match(/const PAGE_V = '(\d+)'/) || [])[1]);
const sw = await (await fetch('https://kickoff.kiwi/sw.js?x=' + Date.now())).text(); out.push('live sw has the 8s fallback: ' + sw.includes('Promise.race'));
const st = await (await fetch('https://kickoff.kiwi/stats.html?x=' + Date.now())).text(); out.push('live stats page has Site checks: ' + st.includes('id="sitechk"'));
writeFileSync('probe/out.txt', out.join('\n') + '\n');
