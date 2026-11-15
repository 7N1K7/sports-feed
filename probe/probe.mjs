// Cloudflare's own request log for the stats worker, by hour, Thu 12 Nov to now. Prints no counts: per hour
// '0' = no requests from browsers (timers only), '+' = some
const T = process.env.CLOUDFLARE_API_TOKEN, A = process.env.CLOUDFLARE_ACCOUNT_ID;
const gql = async (query, variables) => (await (await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const now = new Date(); now.setUTCMinutes(0, 0, 0);
const v = { a: A, s: '2026-11-12T00:00:00Z', e: now.toISOString() };
const ad = await gql(`query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:10000,filter:{scriptName:"kickoff-api",datetime_geq:$s,datetime_lt:$e}){sum{requests}dimensions{datetimeHour}}}}}`, v);
const sc = await gql(`query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsScheduled(limit:10000,filter:{scriptName:"kickoff-api",datetime_geq:$s,datetime_lt:$e}){datetime cron status}}}}`, v);
for (const [n, j] of [['adaptive', ad], ['scheduled', sc]]) if (j.errors?.length) console.log(n, 'error:', j.errors.map(e => e.message).join('; ').slice(0, 300));
const H = k => new Date(k).toISOString().slice(0, 13);
const req = {}, cron = {};
for (const x of ad.data?.viewer.accounts[0].workersInvocationsAdaptive || []) req[H(x.dimensions.datetimeHour)] = (req[H(x.dimensions.datetimeHour)] || 0) + x.sum.requests;
for (const x of sc.data?.viewer.accounts[0].workersInvocationsScheduled || []) cron[H(x.datetime)] = (cron[H(x.datetime)] || 0) + 1;
const hours = Object.keys(cron);
const incl = hours.length > 0 && hours.every(k => (req[k] || 0) >= cron[k]);
console.log('timer runs found:', hours.length > 0 ? 'yes' : 'no', '| timer runs inside the request totals:', incl ? 'looks like yes' : 'no');
for (let d = new Date('2026-11-12T00:00:00Z'); d < now; d = new Date(+d + 86400e3)) {
  let line = '';
  for (let i = 0; i < 24; i++) { const t = new Date(+d + i * 3600e3); if (t >= now) break; const k = t.toISOString().slice(0, 13); const n = (req[k] || 0) - (incl ? cron[k] || 0 : 0); line += n > 0 ? '+' : '0'; if (i % 6 === 5) line += ' '; }
  console.log(d.toISOString().slice(0, 10), '(UTC hours 0-23)', line);
}
