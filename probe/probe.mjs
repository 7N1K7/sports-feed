// probe 22: wait (up to 40 minutes) for https://kickoff.kiwi to have its certificate, then report
const t0 = Date.now();
let last = '';
while (Date.now() - t0 < 40 * 60e3) {
  try {
    const r = await fetch('https://kickoff.kiwi/', { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    const t = await r.text();
    console.log(new Date().toISOString(), 'HTTPS OK', r.status, (t.match(/<title>([^<]*)/) || [])[1] || '');
    const h = await fetch('http://kickoff.kiwi/', { redirect: 'manual' });
    console.log('http ->', h.status, h.headers.get('location') || '(no redirect: Enforce HTTPS not ticked yet)');
    process.exit(0);
  } catch (e) { const m = e.cause?.code || e.message; if (m !== last) console.log(new Date().toISOString(), 'not yet:', m); last = m; }
  await new Promise(r => setTimeout(r, 30e3));
}
console.log('gave up after 40 minutes');
