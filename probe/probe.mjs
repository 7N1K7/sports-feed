// F1 probe 3: constructor name/points lines, and expanding the points sums through the API
const UA = { 'User-Agent': 'sports-feed probe (https://7n1k7.github.io/sports-feed/)' };
const api = async q => (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA })).json();
const get = async t => (await api('action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(t))).query.pages[0].revisions?.[0].slots.main.content || '';
const c = await get('Template:F1 Constructors Standings');
console.log('#### CONS KEY LINES');
for (const l of c.split('\n')) if (/^!|\[\[|Sum|Red Bull/.test(l) && !/^!\s*style="vertical-align/.test(l)) console.log(l.slice(0, 300));
const sums = [...c.matchAll(/\{\{Sum\|(?:[^{}]|\{\{[^{}]*\}\})*\}\}/g)].map(m => m[0]);
console.log('#### SUMS', sums.length);
const x = await api('action=expandtemplates&prop=wikitext&title=Template:F1_Constructors_Standings&text=' + encodeURIComponent(sums.join('§§')));
console.log(JSON.stringify(x).slice(0, 1500));
const f = await get('Template:F1R2026');
console.log('#### F1R2026', f.length); console.log(f.slice(0, 1500));
