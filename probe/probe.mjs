// probe 72: what TVNZ, Three and Sky Open say they show (one-off reading of public pages, for the where-to-watch rules)
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36' };
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();
for (const u of ['https://helptvnz.zendesk.com/hc/en-us/articles/19886850107801-Sport-on-TVNZ-Overview',
  'https://cybernews.com/stream-online/how-to-watch-rugby-league-world-cup-2026-for-free-from-anywhere/',
  'https://www.sky.co.nz/skyopen',
  'https://www.rnz.co.nz/news/sport/571030/a-gamechanger-tvnz-to-screen-2026-fifa-world-cup']) {
  try { const r = await fetch(u, { headers: UA }); const t = text(await r.text()); console.log(`\n==== ${u} (${r.status})\n${t.slice(0, 3500)}`); } catch (e) { console.log(`\n==== ${u} ERR ${e.message}`); }
}
