// probe 20: kickoff.kiwi DNS after adding the records
import { promises as dns } from 'node:dns';
const r = new dns.Resolver(); r.setServers(['1.1.1.1', '8.8.8.8']);
for (const [t, f] of [['NS', 'resolveNs'], ['A', 'resolve4'], ['AAAA', 'resolve6'], ['CNAME', 'resolveCname'], ['TXT', 'resolveTxt']])
  for (const n of ['kickoff.kiwi', 'www.kickoff.kiwi']) { try { console.log(n, t, JSON.stringify(await r[f](n))); } catch (e) { console.log(n, t, e.code); } }
const boot = await (await fetch('https://data.iana.org/rdap/dns.json')).json();
const base = boot.services.find(([t]) => t.includes('kiwi'))[1][0];
const j = await (await fetch(base + 'domain/kickoff.kiwi')).json().catch(() => ({}));
console.log('RDAP status', (j.status || []).join(','), '| events', (j.events || []).map(e => `${e.eventAction} ${e.eventDate}`).join(', '), '| nameservers', (j.nameservers || []).map(n => n.ldhName).join(', '));
// straight from Crazy Domains' own name servers, skipping any cached answers
const ns = new dns.Resolver();
try { ns.setServers((await Promise.all(['ns1.crazydomains.com', 'ns2.crazydomains.com'].map(h => dns.resolve4(h).catch(() => [])))).flat()); for (const n of ['kickoff.kiwi', 'www.kickoff.kiwi']) { try { console.log('AUTH', n, 'A', JSON.stringify(await ns.resolve4(n))); } catch (e) { console.log('AUTH', n, 'A', e.code); } try { console.log('AUTH', n, 'CNAME', JSON.stringify(await ns.resolveCname(n))); } catch (e) { console.log('AUTH', n, 'CNAME', e.code); } } } catch (e) { console.log('AUTH error', e.message); }
try { const r = await fetch('http://kickoff.kiwi/', { redirect: 'manual' }); console.log('HTTP kickoff.kiwi', r.status, r.headers.get('server'), r.headers.get('location')); } catch (e) { console.log('HTTP', e.cause?.code || e.message); }
