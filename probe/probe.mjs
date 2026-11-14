// 14 Nov: is the stats server answering (no password, nothing counted, no stats read)
const API = 'https://kickoff-api.kickoffkiwi.workers.dev';
const r = await fetch(API + '/stats'); console.log('SERVER /stats, no password:', r.status, (await r.text()).slice(0, 60));
const o = await fetch(API + '/og.png'); console.log('og.png:', o.status, o.headers.get('content-type'));
