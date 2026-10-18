// F1 probe 4: full feed build with F1 on, start times, both standings tables
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
console.log('#### FETCH');
try { console.log(execSync('node scripts/fetch.mjs', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); } catch (e) { console.log('fetch failed', e.message, e.stdout, e.stderr); }
const feed = JSON.parse(readFileSync('data/feed.json', 'utf8'));
console.log('#### DIAG'); console.log(JSON.stringify({ f1: feed.diag.f1, f1Times: feed.diag.f1Times, rnz: feed.diag.rnz, tsdb: Object.fromEntries(Object.entries(feed.diag).filter(([k]) => /^tsdb/.test(k))) }, null, 1));
console.log('#### CACHE'); try { console.log(readFileSync('.cache/f1-times.json', 'utf8')); } catch (e) { console.log(e.message); }
console.log('#### F1 EVENTS');
for (const e of feed.events.filter(e => e.team === 'f1')) console.log(JSON.stringify(e));
console.log('#### F1 TABLES');
for (const tb of feed.tables.filter(x => x.team === 'f1')) console.log(tb.title, tb.style, JSON.stringify(tb.rows.map(r => [r.name, r.pts, r.nz])));
console.log('#### F1 NEWS');
for (const n of feed.news.filter(n => n.team === 'f1')) console.log(JSON.stringify(n));
console.log('#### FEEDJSON');
console.log(JSON.stringify(feed));
