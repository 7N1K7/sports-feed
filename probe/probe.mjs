// rain1: does any source the feed reads (BBC Sport and Herald cricket headlines, Wikipedia) have the ODI's weather delay
// yet, and what does the live feed show? Titles only when they name India; no scores printed
const out = ['rain1 ' + new Date().toISOString()];
const WET = /\b(rain\w*|showers?|wet outfield|washed out|wash-?out|delay(ed|s)?|bad light|abandon\w*|no play|covers|weather)\b/i;
const items = x => [...x.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => ({ t: (m[1].match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '', d: (m[1].match(/<pubDate>([^<]+)/) || [])[1] || '', l: (m[1].match(/<link>([^<]+)/) || [])[1] || '' }));
for (const [n, u] of [['BBC cricket', 'https://feeds.bbci.co.uk/sport/cricket/rss.xml'], ['Herald cricket', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/cricket/?outputType=xml&_website=nzh'], ['Herald sport', 'https://www.nzherald.co.nz/arc/outboundfeeds/rss/section/sport/?outputType=xml&_website=nzh']]) {
  try { const it = items(await (await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 kickoff.kiwi probe' } })).text());
    out.push(`${n}: ${it.length} items; naming India: ${it.filter(i => /india/i.test(i.t)).length}; wet ones naming India: ${it.filter(i => /india/i.test(i.t) && WET.test(i.t)).length}`);
    for (const i of it.filter(i => /india/i.test(i.t)).slice(0, 6)) out.push(`   ${i.d} | ${WET.test(i.t) ? 'WET ' : ''}${i.t.replace(/\d+\/\d+|\d+ runs?|\d+-\d+/g, '#').slice(0, 140)}`);
  } catch (e) { out.push(n + ' error ' + e.message); }
}
try { const w = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&page=Indian_cricket_team_in_New_Zealand_in_2026%E2%80%9327', { headers: { 'user-agent': 'kickoff.kiwi probe' } })).json();
  const t = w.parse?.wikitext?.['*'] || ''; out.push(`Wikipedia tour page: ${t.length} chars; ${w.error ? w.error.info : ''}`);
  const i = t.search(/2nd ODI/i); out.push('  2nd ODI section mentions rain/delay: ' + WET.test(t.slice(i, i + 2500)) + ' | ' + (t.slice(i, i + 2500).match(/\|\s*(rain|notes?)\s*=[^\n|]*/gi) || []).map(s => s.replace(/\d+/g, '#')).join(' ; ').slice(0, 300));
} catch (e) { out.push('wiki error ' + e.message); }
for (let k = 0; k < 1; k++) { const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); const o = (f.events || []).find(e => e.id === 'bc-ind-odi2-2026');
  out.push(`feed ${f.generatedAt}: status=${o?.status} progress=${JSON.stringify(o?.progress ?? null)} wxNews=${o?.wxNews ? 'yes: ' + o.wxNews.credit : 'none'} | ${String(f.diag?.rainHeadlines || '').replace(/;.*/, '')} | sportmonks ${f.diag?.sportmonks}`); }
console.log(out.join('\n'));
