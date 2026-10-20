// probe 44: Sheffield Shield and Dean Jones Trophy through the site's own parser
import { readFileSync } from 'node:fs';
import { wikiEvents } from './src/sources.mjs';
const cfg = JSON.parse(readFileSync(new URL('./src/wiki-pages.json', import.meta.url))).pages.filter(p => p.team === 'audomestic');
const TZ = { Queensland: 'Australia/Brisbane', 'New South Wales': 'Australia/Sydney', Victoria: 'Australia/Melbourne', 'South Australia': 'Australia/Adelaide', 'Western Australia': 'Australia/Perth', Tasmania: 'Australia/Hobart',
  Brisbane: 'Australia/Brisbane', Sydney: 'Australia/Sydney', Melbourne: 'Australia/Melbourne', Adelaide: 'Australia/Adelaide', Perth: 'Australia/Perth', Hobart: 'Australia/Hobart' };
const diag = {};
const evs = (await wikiEvents(cfg, c => TZ[c] || null, diag)).sort((a, b) => a.startUTC.localeCompare(b.startUTC));
console.log('pages:', JSON.stringify(diag.wikipedia).match(/[^,{]*(Shield|Dean)[^,}]*/g));
console.log('events', evs.length);
for (const e of evs.filter(e => e.startUTC > '2026-10-10').slice(0, 14)) console.log(e.startUTC, new Date(e.startUTC).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }), e.timeTBC ? '(TBC)' : '', '|', e.comp, e.format, '|', e.home, 'v', e.away, '|', e.status, e.score || '', '|', e.venue, '/', e.city, '/', e.tz);
const noTz = evs.filter(e => !e.tz); console.log('without a time zone:', noTz.length, noTz.slice(0, 3).map(e => `${e.home} v ${e.away} @ ${e.venue}`).join('; '));
