import { writeFileSync } from 'fs';
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const out = [`feed ${f.generatedAt} v${f.site?.version}`];
const scrub = s => String(s).replace(/key=[^&\s"]+/g, 'key=…').replace(/[A-Za-z0-9_-]{30,}/g, '…');
for (const [k, v] of Object.entries(f.diag || {})) { const s = scrub(typeof v === 'string' ? v : JSON.stringify(v)); if (/error|fail|\b4\d\d\b|\b5\d\d\b|timeout|timed out|skipped|missing|not found|no key|unavailable/i.test(s)) out.push(`${k}: ${s.slice(0, 500)}`); }
writeFileSync('probe/out.txt', out.join('\n') + '\n');
