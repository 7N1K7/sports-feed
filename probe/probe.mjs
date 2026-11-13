// 13 Nov: the stats server after its hardening: does the password step still answer (never a crash), with no password and a wrong one
const A = 'https://kickoff-api.kickoffkiwi.workers.dev';
const t = async (name, path, init) => { try { const r = await fetch(A + path, init); const b = await r.text(); console.log(name, '|', r.status, '|', b.slice(0, 80).replace(/\s+/g, ' ')); } catch (e) { console.log(name, '| failed:', e.message); } };
await t('no password', '/stats?days=1');
await t('wrong password', '/stats?days=1', { headers: { authorization: 'Bearer not-the-password-probe' } });
await t('unknown path', '/nothing');
await t('report from no site', '/report', { method: 'POST', body: JSON.stringify({ note: 'probe' }) });
