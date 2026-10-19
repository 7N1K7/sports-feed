// Prints the id of the stats database, creating it the first time (used by .github/workflows/api.yml)
const tok = process.env.CLOUDFLARE_API_TOKEN, acct = process.env.CLOUDFLARE_ACCOUNT_ID, NAME = 'kickoff-stats';
const cf = async (path, opts = {}) => {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/d1/database${path}`, { ...opts, headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' } });
  const j = await r.json();
  if (!j.success) throw new Error(JSON.stringify(j.errors));
  return j.result;
};
const found = (await cf(`?name=${NAME}`)).find(d => d.name === NAME);
const db = found || await cf('', { method: 'POST', body: JSON.stringify({ name: NAME }) });
if (!found) console.error(`made the ${NAME} database`);
process.stdout.write(db.uuid);
