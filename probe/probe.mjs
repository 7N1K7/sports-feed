// Cloudflare's own request log for the stats worker, by hour, Thu 12 Nov to now, web requests only (no timers).
// Prints no counts: per hour, of those through a New Zealand Cloudflare site (AKL/CHC): 'V' = some answered 204 (a
// count message, or a preflight), 's' = only other answers (the stats page), '-' = none from NZ
const T = process.env.CLOUDFLARE_API_TOKEN, A = process.env.CLOUDFLARE_ACCOUNT_ID;
const gql = async (query, variables) => (await (await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const now = new Date(); now.setUTCMinutes(0, 0, 0);
const j = await gql(`query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:10000,filter:{scriptName:"kickoff-api",datetime_geq:$s,datetime_lt:$e}){sum{requests}dimensions{datetimeHour eventType coloCode httpResponseStatus}}}}}`, { a: A, s: '2026-11-12T00:00:00Z', e: now.toISOString() });
if (j.errors) { console.log('error', j.errors.map(e => e.message).join(';').slice(0, 300)); process.exit(); }
const rows = j.data.viewer.accounts[0].workersInvocationsAdaptive, h = {}, types = new Set();
for (const x of rows) { types.add(x.dimensions.eventType); if (x.dimensions.eventType !== 'fetch') continue; const k = new Date(x.dimensions.datetimeHour).toISOString().slice(0, 13); if (!/^(AKL|CHC)$/.test(x.dimensions.coloCode)) continue; h[k] ??= { v: 0, s: 0 }; h[k][x.dimensions.httpResponseStatus === 204 ? 'v' : 's'] += x.sum.requests; }
console.log('kinds seen:', [...types].join(', '));
for (let d = new Date('2026-11-12T00:00:00Z'); d < now; d = new Date(+d + 86400e3)) {
  let line = '';
  for (let i = 0; i < 24; i++) { const t = new Date(+d + i * 3600e3); if (t >= now) break; const v = h[t.toISOString().slice(0, 13)]; line += !v ? '-' : v.v ? 'V' : 's'; if (i % 6 === 5) line += ' '; }
  console.log(d.toISOString().slice(0, 10), '(UTC hours 0-23)', line);
}
