import { writeFileSync } from 'node:fs';
const out = [];
process.on('exit', () => writeFileSync(new URL('./out.txt', import.meta.url), out.join('\n') + '\n'));
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
  out.push('feed ' + f.generatedAt + ' v' + f.site?.version + ' games ' + f.events.length + ' nosport ' + f.events.filter(e => !e.sport).length);
  for (const x of f.events.filter(x => (x.team === 'ufc' && Date.parse(x.startUTC) > Date.now() - 2 * 864e5 && Date.parse(x.startUTC) < Date.now() + 5 * 864e5) || /^ff-phi/.test(x.id)))
    out.push(JSON.stringify({ id: x.id, team: x.team, sport: x.sport, home: x.home, away: x.away, comp: x.comp, s: x.startUTC, tbc: x.timeTBC, status: x.status, tv: x.tv, broadcast: x.broadcast, watchNote: x.watchNote, about: !!x.about, card: (x.card || []).length, logos: [!!x.homeLogo, !!x.awayLogo], tags: x.tags }));
  const c = await (await fetch('https://kickoff.kiwi/data/coverage-detail.json?' + Date.now())).json();
  for (const g of (c.tvGaps?.nz || [])) out.push('gap ' + g.t + ' | ' + g.at + ' | ' + g.ch);
  out.push('diag ' + JSON.stringify(Object.fromEntries(Object.entries(f.diag || c.diag || {}).filter(([k]) => /ufcStart|tvGaps/.test(k)))).slice(0, 900));
} catch (e) { out.push('feed err ' + e.message); }
try {
  const { chromium } = await import('playwright');
  const b = await chromium.launch({ channel: 'chrome' });
  const cx = await b.newContext({ viewport: { width: 412, height: 900 }, timezoneId: 'Pacific/Auckland', locale: 'en-NZ' });
  await cx.addInitScript(() => { try { localStorage.setItem('sf.nocount', 'true'); } catch {} });
  const p = await cx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('https://kickoff.kiwi/?' + Date.now(), { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => [...document.querySelectorAll('*')].filter(n => n.children.length < 12 && /Stirling|Philippines/.test(n.textContent) && n.textContent.length < 260).slice(0, 6).map(n => n.textContent.replace(/\s+/g, ' ').trim()));
  out.push('page errors ' + errs.length + ' ' + errs.slice(0, 2).join(' / '));
  for (const t of [...new Set(txt)]) out.push('card ' + t.slice(0, 240));
  await b.close();
} catch (e) { out.push('browser err ' + e.message.slice(0, 200)); }
