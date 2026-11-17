const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
const d = f.diag || {};
console.log('nascar:', d.nascar, '| nascarTimes:', d.nascarTimes);
const n = (f.events || []).filter(e => e.team === 'nascar');
const by = {}; for (const e of n) { const y = e.id.split('-')[1]; by[y] = by[y] || { n: 0, fin: 0, tbc: 0 }; by[y].n++; if (e.status === 'final') by[y].fin++; if (e.timeTBC) by[y].tbc++; }
console.log('events', n.length, JSON.stringify(by));
console.log('odd venues:', [...new Set(n.map(e => e.venue + ' / ' + e.city + ' / ' + e.home))].filter(x => /[\[\]{}|<>]/.test(x) || x.length > 110).join(' ; ') || 'none');
const ics = await (await fetch('https://kickoff.kiwi/data/cal/nascar.ics?' + Date.now())).text(); console.log('nascar.ics events', (ics.match(/BEGIN:VEVENT/g) || []).length);
// the live page: the switch and a NASCAR card (no counting, no results opened)
import('playwright').then(async ({ chromium }) => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem('sf.nocount', 'true')); await p.goto('https://kickoff.kiwi/?' + Date.now()); await p.waitForSelector('.ev'); await p.click('#teamsBtn'); await p.waitForTimeout(400);
  console.log('switch on page:', await p.locator('#teamGroups .chip[data-team="nascar"]').count(), 'pressed', await p.locator('#teamGroups .chip[data-team="nascar"]').getAttribute('aria-pressed'), '| page errors', errs.length, '| version', (await p.locator('body').innerText()).match(/\bv7\d\d\b/)?.[0]);
  await b.close(); }).catch(e => console.log('browser check failed:', e.message));
