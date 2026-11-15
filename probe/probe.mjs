// is kickoff.kiwi itself behind Cloudflare (so its page loads are in Cloudflare's log)? Prints only yes/no answers
const T = process.env.CLOUDFLARE_API_TOKEN;
const r = await fetch('https://kickoff.kiwi/', { method: 'HEAD' }).catch(e => ({ headers: new Map(), err: e.message }));
console.log('site answered by:', r.err ? 'error' : (r.headers.get('server') || '?'), '| cf-ray header:', r.headers.get?.('cf-ray') ? 'yes' : 'no');
const z = await (await fetch('https://api.cloudflare.com/client/v4/zones?name=kickoff.kiwi', { headers: { authorization: 'Bearer ' + T } })).json();
console.log('kickoff.kiwi zone readable with the token:', z.success && z.result?.length ? 'yes' : 'no', z.success ? '' : '(' + (z.errors || []).map(e => e.code).join(',') + ')');
