// probe 28: the new hockey support run on live Wikipedia, with the site's own parser
import { readFileSync } from 'node:fs';
import { wikiEvents } from './src/sources.mjs';
const cfg = JSON.parse(readFileSync(new URL('./src/wiki-pages.json', import.meta.url))).pages.filter(p => p.sport === 'hockey');
const TZ = { Auckland: 'Pacific/Auckland', Hamilton: 'Pacific/Auckland', Tauranga: 'Pacific/Auckland', Christchurch: 'Pacific/Auckland', 'Cape Town': 'Africa/Johannesburg', Amstelveen: 'Europe/Amsterdam', Wavre: 'Europe/Brussels', Changzhou: 'Asia/Shanghai' };
const diag = {};
const evs = await wikiEvents(cfg, c => TZ[c] || null, diag);
console.log('pages:', JSON.stringify(diag.wikipedia || diag).slice(0, 600));
const hockey = evs.filter(e => e.sport === 'hockey').sort((a, b) => a.startUTC.localeCompare(b.startUTC));
console.log('hockey events', hockey.length);
for (const e of hockey) console.log(e.startUTC, new Date(e.startUTC).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }), e.timeTBC ? '(TBC)' : '', '|', e.team, '|', e.comp, e.stage ? '/ ' + e.stage : '', '|', e.home, 'v', e.away, '|', e.status, e.score || '', '|', e.venue, e.city, e.tz);
