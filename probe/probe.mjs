// probe 38: is the workers.dev address renamed, and does the stats server answer there? Prints yes/no only, never
// the old address, the token or the account id (this output is public).
const tok = (process.env.CLOUDFLARE_API_TOKEN || '').trim(), acct = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/workers/subdomain`, { headers: { authorization: 'Bearer ' + tok } });
const j = await r.json().catch(() => ({}));
const renamed = j.result?.subdomain === 'kickoffkiwi';
console.log('address renamed to kickoffkiwi.workers.dev:', renamed);
if (renamed) {
  const base = 'https://kickoff-api.kickoffkiwi.workers.dev';
  for (const [what, url, opts] of [['home', base + '/', {}], ['stats (no password)', base + '/stats', { headers: { origin: 'https://kickoff.kiwi' } }]]) {
    try { const x = await fetch(url, opts); console.log(what, x.status, (await x.text()).slice(0, 80)); } catch (e) { console.log(what, 'error', e.cause?.code || e.message); }
  }
}
