import { writeFileSync } from 'fs';
const out = [];
const WANT = /^(National Rugby League|NRL|Super Rugby|Bunnings NPC|NPC|National Provincial|Rugby Championship|The Rugby Championship|WXV|Womens Rugby World Cup|A-League|Australian A-League|English Premier League|Australian National Basketball League|NBL|NBA|MLB|UFC|Sheffield Shield|Marsh One-Day Cup|One-Day Cup|Dean Jones|Plunket Shield|Ford Trophy|New Zealand Super Smash|ANZ Premiership|Netball|FIH|Rugby League World Cup|Womens Big Bash|Australian Big Bash|State of Origin|Six Nations|Pacific Nations|Super Netball|Hockey)/i;
const PAIRS = [['Australia', 'Rugby'], ['New Zealand', 'Rugby'], ['World', 'Rugby'], ['Australia', 'Soccer'], ['England', 'Soccer'], ['Australia', 'Basketball'], ['USA', 'Basketball'], ['USA', 'Baseball'], ['USA', 'Fighting'], ['New Zealand', 'Netball'], ['Australia', 'Netball'], ['World', 'Field Hockey'], ['New Zealand', 'Cricket'], ['Australia', 'Cricket'], ['World', 'Cricket']];
for (const [c, s] of PAIRS) {
  try {
    const j = await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/search_all_leagues.php?c=${encodeURIComponent(c)}&s=${encodeURIComponent(s)}`)).json();
    for (const l of (j.countries || j.countrys || [])) {
      out.push(`${c}/${s}: ${l.idLeague} ${l.strLeague} | ${l.strBadge ? 'badge' : '-'} | ${l.strLogo ? 'logo' : '-'}`);
      if (WANT.test(l.strLeague)) for (const [k, u] of [['b', l.strBadge], ['l', l.strLogo]]) if (u) { const r = await fetch(u + '/small'); if (r.ok) writeFileSync(`probe/out-lg-${l.idLeague}-${k}.png`, Buffer.from(await r.arrayBuffer())); }
    }
  } catch (e) { out.push(`${c}/${s}: error ${e.message}`); }
  await new Promise(r => setTimeout(r, 2500));
}
writeFileSync('probe/out.txt', 'lg294\n' + out.join('\n') + '\n');
