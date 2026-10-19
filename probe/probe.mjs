// probe 17: is kickoff.kiwi registered? Registry RDAP (via IANA's bootstrap), WHOIS on port 43, and DNS
import { promises as dns } from 'node:dns';
import net from 'node:net';
const names = ['kickoff.kiwi', 'kickoffkiwi.kiwi', 'kickoffkiwi.nz', 'kickoff.kiwi.nz', 'kickoffkiwi.co.nz'];
const boot = await (await fetch('https://data.iana.org/rdap/dns.json')).json();
const rdapBase = tld => (boot.services.find(([tlds]) => tlds.includes(tld)) || [[], []])[1][0];
const whois = (server, q) => new Promise(res => { let out = ''; const s = net.connect(43, server, () => s.write(q + '\r\n')); s.setTimeout(10000, () => { s.destroy(); res(out || 'timeout'); }); s.on('data', d => out += d); s.on('end', () => res(out)); s.on('error', e => res('error ' + e.message)); });
for (const n of names) {
  const tld = n.split('.').pop();
  const base = rdapBase(tld);
  let rdap = 'no RDAP server listed';
  if (base) { try { const r = await fetch(`${base.replace(/\/$/, '')}/domain/${n}`, { headers: { accept: 'application/rdap+json' } }); const j = await r.json().catch(() => ({})); rdap = `${r.status} ${r.status === 404 ? '(not registered)' : (j.status || []).join(',') + ' | events ' + (j.events || []).map(e => `${e.eventAction} ${e.eventDate?.slice(0, 10)}`).join(', ') + ' | registrar ' + ((j.entities || []).find(e => (e.roles || []).includes('registrar'))?.vcardArray?.[1]?.find(v => v[0] === 'fn')?.[3] || '?')}`; } catch (e) { rdap = 'error ' + e.message; } }
  let ns = '';
  try { ns = (await dns.resolveNs(n)).join(', '); } catch (e) { ns = e.code; }
  const w = await whois(tld === 'nz' ? 'whois.irs.net.nz' : `whois.nic.${tld}`, n);
  console.log(`${n}\n  RDAP (${base || '-'}): ${rdap}\n  NS: ${ns}\n  WHOIS: ${w.replace(/\s+/g, ' ').slice(0, 300)}\n`);
}
