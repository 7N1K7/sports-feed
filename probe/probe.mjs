// probe 118: World Series and Japan Series wikitext (game summaries)
for (const t of ['2026 World Series', '2026 Japan Series']) {
  const u = `https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`;
  const r = await fetch(u, { headers: { 'user-agent': 'sports-feed probe (personal site)' } });
  const x = await r.text();
  console.log('=====', t, r.status, x.length);
  const i = x.search(/==\s*(Game summaries|Summary|Matchups)\s*==/i);
  console.log(x.slice(0, 1500));
  console.log('----- from summaries', i);
  console.log(x.slice(i, i + 6000));
}
