// probe 15: when did each ESPN-free source first show today's rain delay in South Africa v Australia (2nd Test, day 2)?
// Play was due at 9:45am in Gqeberha (07:45 UTC, 8:45pm NZT on 19 Oct)
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const TITLE = 'Australian cricket team in South Africa in 2026–27';
const wp = async q => (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&' + q, { headers: UA })).json();
// 1. Wikipedia: every revision from the start of day 1, with the 2nd Test's match box
const revs = [];
let cont = '';
do {
  const r = await wp(`action=query&prop=revisions&titles=${encodeURIComponent(TITLE)}&rvprop=timestamp|ids|content|comment&rvslots=main&rvlimit=50&rvdir=newer&rvstart=2026-10-18T06:00:00Z${cont}`);
  for (const v of r.query?.pages?.[0]?.revisions || []) revs.push(v);
  cont = r.continue?.rvcontinue ? `&rvcontinue=${r.continue.rvcontinue}` : '';
} while (cont && revs.length < 300);
console.log('revisions since day 1:', revs.length);
let last = '';
for (const v of revs) {
  const t = v.slots?.main?.content || '';
  const i = t.search(/==+\s*2nd Test\s*==+/i);
  const box = i < 0 ? '' : t.slice(i, i + 6000).split(/\n==/)[0];
  const rain = (box.match(/\|\s*rain\s*=([^\n|]*)/i) || [])[1]?.trim() || '';
  const result = (box.match(/\|\s*result\s*=([^\n|]*)/i) || [])[1]?.trim() || '';
  const key = `rain=[${rain}] result=[${result}]`;
  if (key !== last) { console.log(v.timestamp, '|', key.slice(0, 300), '|', (v.comment || '').slice(0, 80)); last = key; }
}
// 2. BBC: the scorecard story's own times, and every BBC cricket headline now
const x = await (await fetch('https://feeds.bbci.co.uk/sport/cricket/rss.xml', { headers: UA })).text();
for (const m of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
  const t = (m[1].match(/<title><!\[CDATA\[([\s\S]*?)\]\]>/) || [])[1] || '', link = (m[1].match(/<link>([^<]*)/) || [])[1], d = (m[1].match(/<pubDate>([^<]*)/) || [])[1];
  if (!/south africa|australia/i.test(t)) continue;
  console.log('\nBBC', t, '| pubDate', d, '|', link);
  try {
    const h = await (await fetch(link, { headers: UA })).text();
    console.log('   page times:', [...new Set([...h.matchAll(/"(datePublished|dateModified|lastPublished|firstPublished|lastUpdated)"\s*:\s*"?([^",}]+)/g)].map(m => `${m[1]}=${m[2]}`))].slice(0, 8).join(' ; '));
    console.log('   page title:', (h.match(/<title>([^<]*)/) || [])[1]);
  } catch (e) { console.log('   page error', e.message); }
}
