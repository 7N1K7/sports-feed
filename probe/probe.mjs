// retry: the first run never exited (the tail kept running)
// 14 Nov: why the stats server counts nobody. Its live log (outcome, its own log lines and errors only: no addresses,
// headers or stats are printed), while one test message is sent from this runner (a cloud network, so it lands only in
// the cloud-networks list)
import { spawn } from 'node:child_process';
console.log('TAIL start', new Date().toISOString(), '| token set:', !!process.env.CLOUDFLARE_API_TOKEN);
const t = spawn('npx', ['--yes', 'wrangler@4.147.0', 'tail', 'kickoff-api', '--format', 'json'], { cwd: '/tmp', env: process.env, detached: true });
let out = '', err = '';
t.stdout.on('data', d => { out += d; }); t.stderr.on('data', d => { err += d; });
await new Promise(r => setTimeout(r, 25000));
const r = await fetch('https://kickoff-api.kickoffkiwi.workers.dev/hit', { method: 'POST', headers: { origin: 'https://kickoff.kiwi', 'content-type': 'text/plain', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' }, body: JSON.stringify({ app: 0, e: 'speed', k: 'under 1s' }) });
console.log('test message answered', r.status);
await new Promise(r => setTimeout(r, 25000));
try { process.kill(-t.pid, 'SIGKILL'); } catch (e) { console.log('kill', e.message); }
await new Promise(r => setTimeout(r, 1000));
// wrangler prints one JSON object per event, pretty-printed: split on top-level objects
const evs = []; let depth = 0, start = -1, str = false, esc = false;
for (let i = 0; i < out.length; i++) { const c = out[i];
  if (str) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') str = false; continue; }
  if (c === '"') str = true; else if (c === '{') { if (!depth++) start = i; } else if (c === '}') { if (!--depth && start >= 0) { try { evs.push(JSON.parse(out.slice(start, i + 1))); } catch {} } } }
console.log('events seen:', evs.length);
for (const e of evs) {
  const path = (() => { try { return new URL(e.event?.request?.url || '').pathname; } catch { return e.event?.cron ? 'cron ' + e.event.cron : '?'; } })();
  console.log('-', path, e.event?.request?.method || '', '| outcome', e.outcome, '| logs', JSON.stringify((e.logs || []).map(l => l.message)).slice(0, 400), '| errors', JSON.stringify((e.exceptions || []).map(x => `${x.name}: ${x.message}`)).slice(0, 400));
}
console.log('stderr (cut):', err.replace(/[a-z0-9-]+\.workers\.dev/gi, '(w).workers.dev').replace(/[\w.%+-]+@[\w-]+(\.[\w-]+)+/g, '(email)').replace(/\S+'s Account/g, '(owner)').split('\n').filter(l => /error|fail|connected|tail/i.test(l)).slice(0, 8).join(' / ').slice(0, 600));

process.exit(0);
