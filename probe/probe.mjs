// Cloudflare's own request log for the stats worker, by hour, Thu 12 Nov 00Z to now. Prints no numbers:
// per hour '.' = no more than its timers (7/h), '+' = more than that, '!' = some requests errored.
const T = process.env.CLOUDFLARE_API_TOKEN, A = process.env.CLOUDFLARE_ACCOUNT_ID;
const q = `query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:10000,filter:{scriptName:"kickoff-api",datetime_geq:$s,datetime_lt:$e}){sum{requests errors}dimensions{datetimeHour status}}}}}`;
const now = new Date(); now.setUTCMinutes(0, 0, 0);
const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' },
  body: JSON.stringify({ query: q, variables: { a: A, s: '2026-11-12T00:00:00Z', e: now.toISOString() } }) });
const j = await r.json();
if (j.errors?.length) { console.log('error:', j.errors.map(e => e.message).join('; ').slice(0, 300)); process.exit(); }
const rows = j.data.viewer.accounts[0].workersInvocationsAdaptive, h = {};
const st = new Set();
for (const x of rows) { const k = x.dimensions.datetimeHour; h[k] ??= { n: 0, e: 0 }; h[k].n += x.sum.requests; h[k].e += x.sum.errors; if (x.dimensions.status !== 'success') h[k].e += x.sum.requests; st.add(x.dimensions.status); }
console.log('statuses seen:', [...st].join(', '));
for (let d = new Date('2026-11-12T00:00:00Z'); d < now; d = new Date(+d + 86400e3)) {
  let line = '';
  for (let i = 0; i < 24; i++) { const k = new Date(+d + i * 3600e3).toISOString().replace('.000Z', 'Z'); const v = h[k]; line += !v ? ' ' : v.e ? '!' : v.n > 7 ? '+' : '.'; if (i % 6 === 5) line += ' '; }
  console.log(d.toISOString().slice(0, 10), '(UTC hours 0-23)', line);
}
