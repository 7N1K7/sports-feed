// daily check, 20 Nov: why the stopped-league check still names the Plunket Shield. No results printed.
import { writeFileSync } from 'node:fs';
const out = []; process.on('exit', () => writeFileSync('probe/out.txt', out.join('\n') + '\n'));
try {
  const f = await (await fetch('https://kickoff.kiwi/data/feed.json?t=' + Date.now())).json(); const now = Date.now();
  out.push(`feed built ${f.generatedAt} (${Math.round((now - Date.parse(f.generatedAt)) / 6e4)} min ago) | site ${f.site?.version} | diag.checks: ${f.diag?.checks}`);
  out.push('thinWeeks: ' + JSON.stringify(f.checks?.thinWeeks));
  const baseComp = e => String(e.comp || e.team || '').replace(/\s*[,·(].*$/, '').replace(/\s+(Round|Week|Match|Game)\s+\d+.*$/i, '').trim();
  const ps = f.events.filter(e => /Plunket/.test(e.comp + ' ' + (e.stage || '')));
  for (const e of ps.slice(0, 5)) out.push(JSON.stringify({ id: e.id, sport: e.sport, team: e.team, comp: e.comp, stage: e.stage, base: baseComp(e), session: e.session, startUTC: e.startUTC, status: e.status, format: e.format }));
  out.push('by sport|base: ' + JSON.stringify(Object.entries(ps.reduce((m, e) => { const k = `${e.sport}|${baseComp(e)}`; (m[k] ||= []).push(e.startUTC.slice(0, 10)); return m; }, {}))).slice(0, 900));
} catch (e) { out.push('probe error: ' + String(e.stack || e).slice(0, 400)); }
