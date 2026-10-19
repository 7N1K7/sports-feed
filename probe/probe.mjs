// probe 19: kickoff.kiwi DNS right after purchase
import { promises as dns } from 'node:dns';
const r = new dns.Resolver(); r.setServers(['1.1.1.1', '8.8.8.8']);
for (const [t, f] of [['NS', 'resolveNs'], ['A', 'resolve4'], ['AAAA', 'resolve6'], ['CNAME', 'resolveCname'], ['TXT', 'resolveTxt']])
  for (const n of ['kickoff.kiwi', 'www.kickoff.kiwi']) { try { console.log(n, t, JSON.stringify(await r[f](n))); } catch (e) { console.log(n, t, e.code); } }
const boot = await (await fetch('https://data.iana.org/rdap/dns.json')).json();
const base = boot.services.find(([t]) => t.includes('kiwi'))[1][0];
const j = await (await fetch(base + 'domain/kickoff.kiwi')).json().catch(() => ({}));
console.log('RDAP status', (j.status || []).join(','), '| events', (j.events || []).map(e => `${e.eventAction} ${e.eventDate}`).join(', '), '| nameservers', (j.nameservers || []).map(n => n.ldhName).join(', '));
