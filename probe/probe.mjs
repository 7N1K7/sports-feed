import { writeFileSync } from 'fs';
const out = [];
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
  out.push('feed ' + f.generatedAt + ' v' + f.site?.version);
  const g = (f.events || []).find(e => /gallen/.test(e.id)); out.push('gallen yt: ' + JSON.stringify(g?.yt || null));
  out.push('yt diag: ' + String(f.diag?.youtube || '').replace(/^.*?(Fox Sports Australia[^,;]*).*?(matched \d+).*$/, '$1 | $2'));
  const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text(); out.push('site has prelims line: ' + /YouTube prelims/.test(h));
} catch (e) { out.push('feed error ' + e.message); }
writeFileSync('probe/out.txt', 'gal307\n' + out.join('\n').replace(/key=[^&"\s]*/g, 'key=X') + '\n');
