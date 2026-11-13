// 14 Nov: the NZ domestic pages' sides after the code fix (no scores printed)
import { wikiEvents } from './sources.mjs';
const diag = {};
const cfg = [{ title: '{S} Ford Trophy', sport: 'cricket', comp: 'Ford Trophy', team: 'nzdomestic', tz: 'Pacific/Auckland', format: 'List A', formOnly: true },
  { title: '{S} Hallyburton Johnstone Shield', sport: 'cricket', comp: 'Hallyburton Johnstone Shield', team: 'nzdomestic', tz: 'Pacific/Auckland', women: true, formOnly: true }];
const ev = await wikiEvents(cfg, () => 'Pacific/Auckland', diag, { prevDue: () => false });
console.log('FT2');
for (const e of ev.filter(e => e.team === 'nzdomestic' && e.formOnly && e.startUTC > '2026-10')) console.log(e.startUTC.slice(0, 10), '|', e.comp, '|', e.home, 'v', e.away, '|', e.status);
