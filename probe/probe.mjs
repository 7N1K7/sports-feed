// probe 16: the calendar files on the published site
const base = 'https://7n1k7.github.io/sports-feed/';
const f = await (await fetch(base + 'data/feed.json?x=' + Date.now())).json();
console.log('version', f.site?.version, '| calendars:', f.diag?.calendars);
for (const k of ['nz', 'allblacks', 'whiteferns', 'blackcaps', 'ufc', 'warriors']) {
  const r = await fetch(base + `data/cal/${k}.ics?x=` + Date.now());
  const t = await r.text();
  const sums = [...t.matchAll(/^SUMMARY:(.*)$/gm)].map(m => m[1].trim());
  console.log(k, r.status, r.headers.get('content-type'), '|', sums.length, 'events | first:', sums.slice(0, 4).join(' ; '));
}
