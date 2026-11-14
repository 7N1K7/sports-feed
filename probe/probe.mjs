// 14 Nov (5): the stats server's live log for 10 minutes while the owner opens the site, to see why their visits aren't
// counted. Printed per message: outcome, the server's own log lines and errors, the message's kind, whether the Origin
// is the site, the browser family, NZ or not, and whether the network is on the cloud list. No addresses, headers,
// networks or stats are printed
import { spawn } from 'node:child_process';
const DC = new Set([8075, 16509, 14618, 15169, 396982, 19527, 14061, 24940, 213230, 16276, 63949, 20473, 31898, 45102, 132203, 9009, 212238, 60068, 51167, 12876, 60781, 28753, 30633, 36352, 8100, 8560, 47583, 40676, 21859]);
const t = spawn('npx', ['--yes', 'wrangler@4.147.0', 'tail', 'kickoff-api', '--format', 'json'], { cwd: '/tmp', env: process.env, detached: true });
let out = '';
t.stdout.on('data', d => { out += d; }); t.stderr.on('data', () => {});
await new Promise(r => setTimeout(r, 25 * 60000));
try { process.kill(-t.pid, 'SIGKILL'); } catch {}
const evs = []; let depth = 0, start = -1, str = false, esc = false;
for (let i = 0; i < out.length; i++) { const c = out[i];
  if (str) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') str = false; continue; }
  if (c === '"') str = true; else if (c === '{') { if (!depth++) start = i; } else if (c === '}') { if (!--depth && start >= 0) { try { evs.push(JSON.parse(out.slice(start, i + 1))); } catch {} } } }
console.log('TAIL6 events seen:', evs.length);
const fam = ua => /SamsungBrowser/.test(ua) ? 'Samsung' : /Edg/.test(ua) ? 'Edge' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /CriOS|Chrome\//.test(ua) ? 'Chrome' : /iPhone|iPad/.test(ua) ? 'iOS Safari/app' : /Safari\//.test(ua) ? 'Safari' : 'other';
const tally = {};
const add = k => { tally[k] = (tally[k] || 0) + 1; };
for (const e of evs) {
  const q = e.event?.request || {}, h = q.headers || {}, cf = q.cf || {};
  let path = '?'; try { path = new URL(q.url).pathname; } catch { continue; }
  if (q.method !== 'POST') continue;
  const kind = path === '/hit' ? 'old-way beacon /hit' : path === '/in' ? 'new-way /in' : path;
  add(`${kind} | outcome ${e.outcome} | ${cf.country === 'NZ' ? 'NZ' : 'not NZ'} | ${DC.has(cf.asn) ? 'cloud' : 'not cloud'} | ${fam(h['user-agent'] || '')}${(e.exceptions || []).length || (e.logs || []).length ? ' | HAD ERRORS/LOGS' : ''}`);
}
for (const [k, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(n, k);
process.exit(0);
