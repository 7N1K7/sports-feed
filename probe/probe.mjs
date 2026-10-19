// probe 40: the stats server now has its password: /stats without one should say wrong-password, not not-set-up
const r = await fetch('https://kickoff-api.kickoffkiwi.workers.dev/stats', { headers: { origin: 'https://kickoff.kiwi' } });
console.log('stats without a password:', r.status, await r.text(), '| allowed origin:', r.headers.get('access-control-allow-origin'));
