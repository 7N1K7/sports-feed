// rainwatch3: every 2 minutes for 45 minutes, which sources show the 2nd ODI's weather delay (BBC Sport and Herald
// cricket headlines, Wikipedia's rain field) and whether the live feed has it. Only yes/no and times: no headline text,
// no scores. Pushes probe/out-rain.txt as it goes
import { writeFileSync } from 'fs'; import { execSync } from 'child_process';
const WET = /\b(rain\w*|showers?|wet outfield|washed out|wash-?out|delay(ed|s)?|bad light|abandon\w*|no play|covers|weather)\b/i;
const items = x => [...x.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => (m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '');
const hdr = () => ({ headers: { 'user-agent': 'Mozilla/5.0 kickoff.kiwi probe' }, signal: AbortSignal.timeout(20000) });
const out = ['rainwatch3 start ' + new Date().toISOString()], first = {};
const push = () => { writeFileSync('probe/out-rain.txt', out.join('\n') + '\n'); try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-rain.txt && (git diff --cached --quiet || git -c user.name=bot -c user.email=bot@x commit -q -m out)', { stdio: 'pipe' }); } catch (e) { out.push('commit failed ' + String(e.stderr || e.message).slice(0, 200)); }
  for (let i = 0; i < 3; i++) try { execSync('git push -q origin HEAD:probe', { stdio: 'pipe' }); break; } catch (e) { try { execSync('git fetch -q origin probe && git -c user.name=bot -c user.email=bot@x rebase -q --autostash origin/probe', { stdio: 'pipe' }); } catch (e2) { out.push('rebase failed ' + String(e2.stderr || e2.message).slice(0, 200)); } } };
const end = Date.now() + 40 * 60e3; out.push('started'); push();
while (Date.now() < end) {
  const r = {}; const t = new Date().toISOString().slice(11, 16) + 'Z';
  try { r.bbc = items(await (await fetch('https://feeds.bbci.co.uk/sport/cricket/rss.xml?x=' + Date.now(), hdr())).text()).some(s => /india/i.test(s) && /new zealand/i.test(s) && WET.test(s)); } catch (e) { r.bbc = 'err ' + e.name; }
  try { r.herald = items(await (await fetch('https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/cricket/?outputType=xml&_website=nzh&x=' + Date.now(), hdr())).text()).some(s => /india/i.test(s) && WET.test(s)); } catch (e) { r.herald = 'err ' + e.name; }
  try { const w = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&page=Indian_cricket_team_in_New_Zealand_in_2026%E2%80%9327', { headers: { 'user-agent': 'kickoff.kiwi probe' }, signal: AbortSignal.timeout(20000) })).json();
    const s = w.parse?.wikitext?.['*'] || '', i = s.search(/2nd ODI/i), sec = s.slice(i, i + 2500); r.wiki = /\|\s*rain\s*=\s*[^\s|}]/i.test(sec); } catch (e) { r.wiki = 'err ' + e.name; }
  try { const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now(), { signal: AbortSignal.timeout(30000) })).json(); const o = (f.events || []).find(e => e.id === 'bc-ind-odi2-2026');
    r.feed = `${f.generatedAt.slice(11, 16)}Z ${o?.status} progress=${o?.progress ? (/\b(rain|wet|bad light|delayed|no play)\b/i.test(o.progress) ? 'wet' : 'set') : 'none'} wxNews=${o?.wxNews ? 'yes' : 'no'}`;
    r.feedHas = !!(o?.wxNews || /\b(rain|wet|bad light|delayed|no play)\b/i.test(o?.progress || '')); } catch (e) { r.feed = 'err ' + e.name; }
  for (const k of ['bbc', 'herald', 'wiki', 'feedHas']) if (r[k] === true && !first[k]) first[k] = t;
  out.push(`${t} bbc=${r.bbc} herald=${r.herald} wiki=${r.wiki} | feed ${r.feed} | first: ${JSON.stringify(first)}`);
  push();
  await new Promise(res => setTimeout(res, 120e3));
}
out.push('rainwatch3 end'); push();
