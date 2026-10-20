// probe 94: the page errors the stats have recorded (message text only; the token is never printed)
const T = process.env.CLOUDFLARE_API_TOKEN, A = process.env.CLOUDFLARE_ACCOUNT_ID;
const cf = async (path, body) => (await fetch(`https://api.cloudflare.com/client/v4/accounts/${A}/${path}`, { method: body ? 'POST' : 'GET', headers: { authorization: `Bearer ${T}`, 'content-type': 'application/json' }, body: body && JSON.stringify(body) })).json();
const dbs = await cf('d1/database?name=kickoff-stats'); const id = dbs.result?.[0]?.uuid;
const q = await cf(`d1/database/${id}/query`, { sql: "SELECT day, key, n FROM daily WHERE metric = 'error' ORDER BY day DESC LIMIT 40" });
for (const r of q.result?.[0]?.results || []) console.log(r.day, r.n, '|', r.key);
const v = await cf(`d1/database/${id}/query`, { sql: "SELECT day, metric, key, n FROM daily WHERE day >= date('now','-1 day') AND metric IN ('browser','os','device','view','use','event') ORDER BY day DESC, metric" });
console.log('\ncontext (today/yesterday):'); for (const r of v.result?.[0]?.results || []) console.log(' ', r.day, r.metric, r.key, r.n);
