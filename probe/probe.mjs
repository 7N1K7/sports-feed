// field names of Cloudflare's worker request log (no data), and whether the timers show in it: per hour of the last
// 24, '=' when the hour's requests equal its timer runs, '>' more, '<' fewer
const T = process.env.CLOUDFLARE_API_TOKEN, A = process.env.CLOUDFLARE_ACCOUNT_ID;
const gql = async (query, variables) => (await (await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { authorization: 'Bearer ' + T, 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })).json());
const t = await gql(`{ a: __type(name:"AccountWorkersInvocationsAdaptiveDimensions"){fields{name}} b: __type(name:"AccountWorkersInvocationsAdaptiveSum"){fields{name}} c: __type(name:"AccountWorkersInvocationsScheduled"){fields{name}} }`);
console.log(JSON.stringify(t.data || t.errors).slice(0, 1500));
const now = new Date(); now.setUTCMinutes(0, 0, 0);
const v = { a: A, s: new Date(+now - 24 * 3600e3).toISOString(), e: now.toISOString() };
const ad = await gql(`query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsAdaptive(limit:10000,filter:{scriptName:"kickoff-api",datetime_geq:$s,datetime_lt:$e}){sum{requests}dimensions{datetimeHour}}}}}`, v);
const sc = await gql(`query($a:String!,$s:Time!,$e:Time!){viewer{accounts(filter:{accountTag:$a}){workersInvocationsScheduled(limit:10000,filter:{scriptName:"kickoff-api",datetime_geq:$s,datetime_lt:$e}){datetime cron status}}}}`, v);
console.log('scheduled:', sc.errors ? 'error ' + sc.errors.map(e => e.message).join(';').slice(0, 200) : (sc.data.viewer.accounts[0].workersInvocationsScheduled.length ? 'has rows' : 'no rows'));
