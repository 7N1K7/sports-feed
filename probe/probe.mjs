// 14 Nov: how the Ford Trophy page writes its teams (Wikipedia, read only; no scores printed)
const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const r = await fetch('https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&page=' + encodeURIComponent('2026–27 Ford Trophy'), UA);
const t = (await r.json()).parse.wikitext;
console.log('TEAMS'); console.log(t.split('\n').filter(l => /^\s*\|\s*(team1|team2|date)\s*=/.test(l)).slice(0, 12).join('\n'));
console.log('results lines:', t.split('\n').filter(l => /^\s*\|\s*result\s*=/.test(l)).length);
