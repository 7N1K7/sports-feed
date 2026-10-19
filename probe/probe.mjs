// probe 23b (no waiting): why GitHub's DNS check fails for kickoff.kiwi. SOA (negative-cache time), CAA, DNSSEC DS, answers from
// several public resolvers, then wait up to 30 minutes for the HTTPS certificate
import { promises as dns } from 'node:dns';
const R = s => { const r = new dns.Resolver(); r.setServers([s]); return r; };
for (const [name, srv] of [['cloudflare', '1.1.1.1'], ['google', '8.8.8.8'], ['quad9', '9.9.9.9'], ['opendns', '208.67.222.222']]) {
  const r = R(srv);
  const q = async (n, f) => { try { return JSON.stringify(await r[f](n)); } catch (e) { return e.code; } };
  console.log(name, '| A', await q('kickoff.kiwi', 'resolve4'), '| www CNAME', await q('www.kickoff.kiwi', 'resolveCname'), '| CAA', await q('kickoff.kiwi', 'resolveCaa'), '| SOA', await q('kickoff.kiwi', 'resolveSoa'));
}
const g = R('8.8.8.8');
try { console.log('.kiwi zone SOA (negative-cache minttl):', JSON.stringify(await g.resolveSoa('kiwi'))); } catch (e) { console.log('kiwi SOA', e.code); }
// DNSSEC: DS record for kickoff.kiwi and the AD flag, via Google's JSON API
for (const t of ['DS', 'DNSKEY', 'A', 'CAA']) { try { const j = await (await fetch(`https://dns.google/resolve?name=kickoff.kiwi&type=${t}&do=1`)).json(); console.log('google-json', t, 'Status', j.Status, 'AD', j.AD, JSON.stringify(j.Answer || j.Authority || []).slice(0, 300)); } catch (e) { console.log(t, e.message); } }
try { const r = await fetch('https://kickoff.kiwi/', { redirect: 'manual', signal: AbortSignal.timeout(15000) }); console.log('HTTPS', r.status); } catch (e) { console.log('HTTPS not yet:', e.cause?.code || e.message); }
