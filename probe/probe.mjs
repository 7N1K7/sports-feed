import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const ft = (f.events || []).filter(e => /Ford Trophy/.test(e.comp || ''));
const out = [`feed ${f.generatedAt} v${f.site?.version}`, `Ford Trophy games: ${ft.length}; next: ` + ft.filter(e => Date.parse(e.startUTC) > Date.now()).slice(0, 3).map(e => `${e.startUTC} ${e.home} v ${e.away}`).join('; '),
  'stopped: ' + JSON.stringify((f.checks?.thinWeeks || []).filter(x => x.stopped)),
  'yt: ' + String(f.diag?.youtube || '').replace(/key=[^&\s]+/g, '').match(/Rabbitholebd[^,;]*|T Sports[^,;]*/g)];
writeFileSync('probe/out.txt', out.join('\n') + '\n');
