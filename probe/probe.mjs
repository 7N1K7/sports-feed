const W = 'https://en.wikipedia.org/w/api.php?format=json&formatversion=2&', H = { 'user-agent': 'kickoff-feed-probe/1.0' };
const x = (await (await fetch(W + 'action=parse&prop=wikitext&page=' + encodeURIComponent('India national football team results (2020–present)'), { headers: H })).json()).parse?.wikitext || '';
const all = [...x.matchAll(/Te Kaha|Christchurch|Mount Smart|Go Media/g)].map(m => m.index);
for (const i of all.slice(-3)) console.log('---\n' + x.slice(Math.max(0, i - 500), i + 400).replace(/<ref[\s\S]*?(<\/ref>|\/>)/g, '<ref/>'));
