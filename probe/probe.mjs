// probe 102: the live feed (saved whole for local testing) and the page errors the stats recorded
import { writeFileSync } from 'node:fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
writeFileSync('probe/out-feed.json', JSON.stringify(f));
console.log('generated', f.generatedAt, 'events', f.events?.length);
const T = process.env.CLOUDFLARE_API_TOKEN, A = process.env.CLOUDFLARE_ACCOUNT_ID;
const cf = async (path, body) => (await fetch(`https://api.cloudflare.com/client/v4/accounts/${A}/${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${T}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body) })).json();
const dbs = await cf('d1/database?name=kickoff-stats'); const id = dbs.result?.[0]?.uuid;
const q = await cf(`d1/database/${id}/query`, { sql: "SELECT day, key, n FROM daily WHERE metric = 'error' ORDER BY day DESC LIMIT 60" });
console.log('\nerrors:'); for (const r of q.result?.[0]?.results || []) console.log(r.day, r.n, '|', r.key);
const m = await cf(`d1/database/${id}/query`, { sql: "SELECT metric, COUNT(*) c, SUM(n) n FROM daily WHERE day >= date('now','-3 day') GROUP BY metric ORDER BY metric" });
console.log('\nmetrics (3 days):'); for (const r of m.result?.[0]?.results || []) console.log(' ', r.metric, r.c, r.n);
