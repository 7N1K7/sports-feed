// 15 Nov, the daily check (3): what the feed's own Wikipedia reader makes of the Ford Trophy, Hallyburton Johnstone
// Shield and WBBL pages (main's sources.mjs and wiki-pages.json, copied here): each game since 26 Oct, its sides, its
// state and whether a score was read. No scores printed
import { readFileSync } from 'fs';
import { wikiEvents } from './sources.mjs';
const cfg = JSON.parse(readFileSync(new URL('./wiki-pages.json', import.meta.url), 'utf8'));
const pages = (cfg.pages || cfg).filter(p => /Ford Trophy|Hallyburton|Women's Big Bash/.test(p.title));
const diag = {};
console.log('DAILY15C pages', pages.map(p => p.title).join(' ; '));
const ev = await wikiEvents(pages, () => 'Pacific/Auckland', diag, { prevDue: () => false });
for (const e of ev.filter(e => /Ford Trophy|Hallyburton|Big Bash/.test(e.comp || '') && e.startUTC > '2026-10-26' && e.startUTC < '2026-11-16').sort((a, b) => a.startUTC.localeCompare(b.startUTC)))
  console.log(e.startUTC, '|', (e.comp || '').slice(0, 30), '|', e.home, 'v', e.away, '|', e.status, '| score read:', !!e.score, '| formOnly:', !!e.formOnly, '| team', e.team);
console.log('total', ev.length, JSON.stringify(diag).slice(0, 600));
