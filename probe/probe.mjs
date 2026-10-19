// probe 37: rename the account's workers.dev address (it was made from the owner's email) to kickoffkiwi.
// Prints only the result; never the token or the account id (this output is public).
const tok = (process.env.CLOUDFLARE_API_TOKEN || '').trim(), acct = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const cf = async (path, opts = {}) => { const r = await fetch('https://api.cloudflare.com/client/v4' + path, { ...opts, headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' } }); const j = await r.json().catch(() => ({})); return { status: r.status, ok: !!j.success, j }; };
const before = await cf(`/accounts/${acct}/workers/subdomain`);
console.log('before:', before.ok ? before.j.result?.subdomain + '.workers.dev' : JSON.stringify(before.j.errors));
for (const name of ['kickoffkiwi', 'kickoff-kiwi', 'kickoffkiwi-nz']) {
  const r = await cf(`/accounts/${acct}/workers/subdomain`, { method: 'PUT', body: JSON.stringify({ subdomain: name }) });
  console.log(`try ${name}:`, r.ok ? 'ok' : JSON.stringify(r.j.errors));
  if (r.ok) break;
}
const after = await cf(`/accounts/${acct}/workers/subdomain`);
console.log('after:', after.ok ? after.j.result?.subdomain + '.workers.dev' : JSON.stringify(after.j.errors));
