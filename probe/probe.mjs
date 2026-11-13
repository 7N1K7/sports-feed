// 13 Nov: TheSportsDB terms in full, and which API fields carry an image's licence (public pages and the free key only)
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; kickoff-probe)' };
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
const t = text(await (await fetch('https://www.thesportsdb.com/docs_terms_of_use.php', { headers: UA })).text());
const i = t.search(/Terms of Use|Terms/); console.log('TERMS\n' + t.slice(Math.max(0, i), i + 7000));
const a = text(await (await fetch('https://www.thesportsdb.com/docs_artwork', { headers: UA })).text()); console.log('\nARTWORK PAGE\n' + a.slice(0, 2100));
const g = text(await (await fetch('https://www.thesportsdb.com/contribute_guide', { headers: UA })).text()); console.log('\nCONTRIBUTE\n' + g.slice(0, 2800));
const api = p => fetch('https://www.thesportsdb.com/api/v1/json/123/' + p, { headers: UA }).then(r => r.json()).catch(e => ({ err: e.message }));
for (const [p, k] of [['searchteams.php?t=Chiefs', 'teams'], ['lookupteam.php?id=133604', 'teams'], ['searchplayers.php?p=Israel_Adesanya', 'player'], ['lookupleague.php?id=4328', 'leagues']]) {
  const d = await api(p); const x = (d[k] || [])[0] || {};
  console.log(`\nAPI ${p}: keys with licence words:`, JSON.stringify(Object.fromEntries(Object.entries(x).filter(([kk]) => /creative|licen|locked|copyright|credit|author|source/i.test(kk)))));
  console.log('  image keys:', Object.keys(x).filter(kk => /badge|logo|banner|fanart|cutout|thumb|render|equipment|jersey|poster|square|map/i.test(kk)).join(' '));
}
