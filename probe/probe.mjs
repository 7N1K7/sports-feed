// 14 Nov: Flickr's API terms and key rules, Openverse's terms (public pages only)
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; kickoff-probe)' };
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/p>|<\/li>|<\/h\d>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n');
console.log('TERMS CHECK');
for (const u of ['https://www.flickr.com/services/api/tos/', 'https://www.flickrhelp.com/hc/en-us/articles/4404070036884-Flickr-API', 'https://www.flickr.com/services/apps/create/apply/', 'https://docs.openverse.org/api/reference/terms_of_service.html', 'https://api.openverse.org/v1/']) {
  try { const r = await fetch(u, { headers: UA }); const t = text(await r.text());
    const lines = t.split('\n').map(x => x.trim()).filter(x => x.length > 30 && x.length < 900 && /commercial|key|pro\b|free|rate|limit|attribut|display|store|cache|licen|photo|request|thumbnail|link/i.test(x));
    console.log(`\n==== ${u} | ${r.status} | ${t.length}`); for (const l of [...new Set(lines)].slice(0, 30)) console.log(' - ' + l);
  } catch (e) { console.log(`\n==== ${u} | ERR ${e.message}`); }
}
