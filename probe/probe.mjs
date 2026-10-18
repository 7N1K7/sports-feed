// dump Module:Sports table source (to mirror auto_generate_standings)
const UA = { 'User-Agent': 'sports-feed probe (https://7n1k7.github.io/sports-feed/)' };
const api = async q => (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA })).json();
for (const t of ['Module:Sports table', 'Module:Sports table/WDL']) {
  const r = await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t));
  console.log('#### ' + t);
  console.log(r.query.pages[0].revisions?.[0].slots.main.content || 'MISSING');
}
