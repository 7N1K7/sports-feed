// probe 36: are the Cloudflare secrets in place, and can the token do what the stats server needs? Prints only yes/no
// results and non-secret names; never the token or the account id (this file's output is public).
const tok = process.env.CLOUDFLARE_API_TOKEN || '', acct = process.env.CLOUDFLARE_ACCOUNT_ID || '';
console.log('token secret present:', !!tok, '| account id secret present:', !!acct, '| account id looks right (32 hex):', /^[0-9a-f]{32}$/.test(acct.trim()));
if (!tok || !acct) process.exit(0);
const cf = async (path, opts = {}) => { const r = await fetch('https://api.cloudflare.com/client/v4' + path, { ...opts, headers: { authorization: 'Bearer ' + tok.trim(), 'content-type': 'application/json' } }); const j = await r.json().catch(() => ({})); return { status: r.status, ok: !!j.success, j }; };
const v = await cf('/user/tokens/verify');
console.log('token valid:', v.ok, '| status:', v.j.result?.status, v.ok ? '' : JSON.stringify(v.j.errors));
const a = await cf(`/accounts/${acct.trim()}`);
console.log('account reachable:', a.ok, a.ok ? '' : JSON.stringify(a.j.errors));
const w = await cf(`/accounts/${acct.trim()}/workers/scripts`);
console.log('workers access:', w.ok, '| existing workers:', w.ok ? w.j.result.length : JSON.stringify(w.j.errors));
const d = await cf(`/accounts/${acct.trim()}/d1/database`);
console.log('database (D1) access:', d.ok, '| existing databases:', d.ok ? d.j.result.length : JSON.stringify(d.j.errors));
const s = await cf(`/accounts/${acct.trim()}/workers/subdomain`);
console.log('workers.dev address set:', s.ok && !!s.j.result?.subdomain, s.ok && s.j.result?.subdomain ? '(' + s.j.result.subdomain + '.workers.dev)' : '');
