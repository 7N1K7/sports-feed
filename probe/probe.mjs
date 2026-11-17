// TV listings (titles, times) and Wikipedia page names only: no scores printed
const seen = new Set();
for (const url of ['https://i.mjh.nz/SkySportNow/epg.xml', 'https://i.mjh.nz/nz/epg.xml']) {
  try {
    const x = await (await fetch(url)).text();
    const ch = Object.fromEntries([...x.matchAll(/<channel id="([^"]+)"[^>]*>\s*<display-name[^>]*>([^<]*)/g)].map(m => [m[1], m[2]]));
    for (const p of x.matchAll(/<programme ([^>]*)>([\s\S]*?)<\/programme>/g)) {
      const a = k => (p[1].match(new RegExp(`\\b${k}="([^"]+)"`)) || [])[1] || '', st = a('start');
      if (!/^202611(18|19|20)/.test(st)) continue;
      const title = (p[2].match(/<title[^>]*>([^<]*)/) || [])[1] || '', sub = (p[2].match(/<sub-title[^>]*>([^<]*)/) || [])[1] || '', desc = (p[2].match(/<desc[^>]*>([^<]*)/) || [])[1] || '';
      const t = `${title} | ${sub} | ${desc}`;
      if (!(/india/i.test(t) && /new zealand|black ?caps|black sticks|nz\b/i.test(t)) && !/strikers.*renegades|renegades.*strikers/i.test(t)) continue;
      const k = `${ch[a('channel')]}|${st}`; if (seen.has(k)) continue; seen.add(k);
      console.log(ch[a('channel')], '|', st.slice(0, 12), st.slice(15), '-', a('stop').slice(8, 12), '|', title, '|', sub, '|', desc.replace(/\d+\s*[-–\/]\s*\d+/g, '#').slice(0, 170));
    }
  } catch (e) { console.log(url, 'error', e.message); }
}
const UA = { headers: { 'user-agent': 'kickoff-kiwi-probe/1.0' } };
for (const q of ['Net Blacks Silver Ferns 2026 netball series', 'New Zealand men\'s national netball team']) {
  const j = await (await fetch('https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=6&srsearch=' + encodeURIComponent(q), UA)).json();
  console.log('WIKI', q, '=>', (j.query?.search || []).map(s => s.title).join(' ; '));
}
