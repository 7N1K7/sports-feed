// daily check, 19 Nov, after the builds were restarted: the live feed's age and version, games with no result, the boxing card. No results printed.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
try {
  const r = await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now()); const f = await r.json(); const now = Date.now();
  out.push(`now ${new Date(now).toISOString()} | feed built ${f.generatedAt} (${Math.round((now - Date.parse(f.generatedAt)) / 6e4)} min ago) | site ${f.site?.version} | games ${f.events.length}`);
  for (const x of f.checks?.noResult || []) out.push(`noResult | ${x.c} | ${x.n} | ${x.at}${x.noSource ? ' | noSource' : ''}`);
  out.push('thinWeeks: ' + JSON.stringify(f.checks?.thinWeeks));
  for (const e of f.events.filter(e => /Fundora|Zapotoczna/.test(e.home + e.away + JSON.stringify(e.card || e.fights || '')))) out.push(`boxing | ${e.id} | ${e.startUTC} | ${e.status} | ${e.home} v ${e.away}`);
  out.push('boxing upcoming: ' + f.events.filter(e => e.sport === 'boxing' && Date.parse(e.startUTC) > now - 864e5).map(e => `${e.id} ${e.startUTC}`).join(' ; '));
  for (const e of f.events.filter(e => Date.parse(e.startUTC) < now - 4 * 36e5 && Date.parse(e.startUTC) > now - 40 * 36e5 && e.status !== 'final')) out.push(`not final | ${e.comp} | ${e.home} v ${e.away} | ${e.startUTC} | ${e.status}`);
  const h = await (await fetch('https://kickoff.kiwi/?t=' + Date.now())).text();
  out.push('page: new Extras wording ' + /to use the site: <span class="pxlist">phone app/.test(h) + ', saved-feed code ' + /savedFeed/.test(h));
} catch (e) { out.push('probe error: ' + String(e.stack || e).slice(0, 400)); }
