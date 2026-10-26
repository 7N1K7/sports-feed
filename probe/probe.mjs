// probe 225: is kickoff.kiwi up and quick? Timed loads of the page, the feed and the stats server, and GitHub's status
import fs from 'fs';
const L = [];
const time = async (label, url, opts = {}) => { for (let i = 0; i < 3; i++) { const t = Date.now(); try { const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'x=' + Date.now(), { ...opts, signal: AbortSignal.timeout(30000) }); const b = await r.arrayBuffer(); L.push(`${label} try ${i + 1}: ${r.status} ${Math.round(b.byteLength / 1024)} KB in ${Date.now() - t} ms${r.headers.get('age') ? ' age ' + r.headers.get('age') : ''} ${r.headers.get('server') || ''} ${r.headers.get('x-cache') || ''}`); } catch (e) { L.push(`${label} try ${i + 1}: FAILED after ${Date.now() - t} ms: ${e.message}`); } } };
await time('page', 'https://kickoff.kiwi/');
await time('feed', 'https://kickoff.kiwi/data/feed.json');
try { const f = await (await fetch('https://kickoff.kiwi/data/feed.json?y=' + Date.now())).json(); L.push(`feed generatedAt ${f.generatedAt} (${Math.round((Date.now() - Date.parse(f.generatedAt)) / 60000)} min old)`); } catch (e) { L.push('feed parse failed: ' + e.message); }
const h = await (await fetch('https://kickoff.kiwi/?z=' + Date.now())).text(); const api = (h.match(/https:\/\/[a-z0-9.-]+workers\.dev[^'"`\s]*/) || [])[0];
if (api) await time('stats server', api.replace(/\/+$/, '').split('/').slice(0, 3).join('/') + '/', { method: 'GET' });
for (const u of ['https://www.githubstatus.com/api/v2/summary.json']) { try { const s = await (await fetch(u)).json(); L.push(`GitHub status: ${s.status?.description}; Pages: ${(s.components || []).find(c => /pages/i.test(c.name))?.status}; Actions: ${(s.components || []).find(c => /actions/i.test(c.name))?.status}`); } catch (e) { L.push('githubstatus failed: ' + e.message); } }
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
