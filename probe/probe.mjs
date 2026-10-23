import fs from 'fs';
// a failed job's log (public repo; GitHub masks secrets). Only the chain step's lines are kept.
const r = await fetch('https://api.github.com/repos/7N1K7/sports-feed/actions/jobs/120309750741/logs', { headers: { authorization: 'Bearer ' + process.env.GH_TOKEN, 'user-agent': 'probe' } });
const t = await r.text();
fs.writeFileSync(new URL('./out.txt', import.meta.url), r.status + '\n' + t.split('\n').filter(l => !/token|secret|key/i.test(l)).slice(-40).join('\n'));
