// probe 46: basketball and netball through the site's own parser (this season's NBL and qualifiers; last
// Constellation Cup and this year's finished ANZ Premiership to check the netball layout)
import { wikiEvents } from './src/sources.mjs';
const cfg = [
  { title: '2026–27 NBL season', sport: 'basketball', comp: 'NBL', classify: 'nbl', headingStage: true },
  { title: '2027 FIBA Basketball World Cup qualification (Asia)', sport: 'basketball', comp: 'FIBA World Cup qualifiers', classify: 'basketball', headingStage: true },
  { title: '2025 Constellation Cup', sport: 'netball', comp: 'Constellation Cup', classify: 'netball' },
  { title: '2026 ANZ Premiership season', sport: 'netball', comp: 'ANZ Premiership', team: 'anzprem', tz: 'Pacific/Auckland', headingStage: true },
];
const TZ = { Auckland: 'Pacific/Auckland', Wellington: 'Pacific/Auckland', Christchurch: 'Pacific/Auckland', Adelaide: 'Australia/Adelaide', Brisbane: 'Australia/Brisbane', Cairns: 'Australia/Brisbane', Wollongong: 'Australia/Sydney', Hobart: 'Australia/Hobart', Melbourne: 'Australia/Melbourne', Perth: 'Australia/Perth', Sydney: 'Australia/Sydney',
  Manila: 'Asia/Manila', Tokyo: 'Asia/Tokyo', Seoul: 'Asia/Seoul', Taipei: 'Asia/Taipei', Beirut: 'Asia/Beirut', Doha: 'Asia/Qatar', Zhuji: 'Asia/Shanghai', Jakarta: 'Asia/Jakarta' };
const diag = {};
const evs = (await wikiEvents(cfg, c => TZ[c] || null, diag)).filter(e => /basketball|netball/.test(e.sport)).sort((a, b) => a.startUTC.localeCompare(b.startUTC));
console.log('pages:', JSON.stringify(diag.wikipedia).match(/[^,{]*(NBL|FIBA|Constellation|ANZ)[^,}]*/g));
for (const sp of ['basketball', 'netball']) {
  const xs = evs.filter(e => e.sport === sp);
  console.log(`\n${sp}: ${xs.length} events; teams:`, [...new Set(xs.map(e => e.team))].join(', '), '| no time zone:', xs.filter(e => !e.tz).length, '| TBC:', xs.filter(e => e.timeTBC).length);
  const pick = sp === 'basketball' ? [...xs.filter(e => e.status === 'final').slice(-3), ...xs.filter(e => e.status !== 'final').slice(0, 6)] : xs.slice(0, 4);
  for (const e of pick) console.log(' ', e.startUTC, new Date(e.startUTC).toLocaleString('en-NZ', { timeZone: 'Pacific/Auckland', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }), e.timeTBC ? '(TBC)' : '', '|', e.team, '|', e.comp, e.stage ? '/ ' + e.stage : '', '|', e.home, 'v', e.away, '|', e.status, e.score || '', '|', e.venue, '/', e.city, '/', e.tz);
}
