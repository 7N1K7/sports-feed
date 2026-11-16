const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&', H = { 'user-agent': 'kickoff-feed-probe/1.0' };
const wt = async t => (await (await fetch(W + 'action=parse&prop=wikitext&page=' + encodeURIComponent(t), { headers: H })).json()).parse?.wikitext || '';
for (const t of ['India national football team results (2020–present)', '2026 in New Zealand association football', '2026–27 in Indian football']) {
  const x = await wt(t); const i = x.search(/15 November 2026|November 15, 2026/);
  console.log('==', t, x.length, i < 0 ? 'no 15 Nov' : x.slice(Math.max(0, i - 100), i + 500).replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '<ref/>'));
}
