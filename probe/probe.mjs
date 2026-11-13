// 14 Nov daily check: what the feed's Wikipedia reader makes of the Ford Trophy page (no scores printed)
import { wikiEvents } from './sources.mjs';
const diag = {};
const cfg = [{ title: '{S} Ford Trophy', sport: 'cricket', comp: 'Ford Trophy', team: 'nzdomestic', tz: 'Pacific/Auckland', format: 'List A', formOnly: true }];
const ev = await wikiEvents(cfg, () => 'Pacific/Auckland', diag, { prevDue: () => false });
console.log('FT', ev.length, 'events', JSON.stringify(diag).slice(0, 400));
for (const e of ev.filter(e => e.startUTC < '2026-11-14')) console.log(e.startUTC, '|', e.team, '|', e.home, 'v', e.away, '|', e.status, '| score?', !!e.score, '| formOnly', !!e.formOnly, '| src', (e.source || '').slice(0, 50));
