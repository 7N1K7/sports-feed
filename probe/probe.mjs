// probe 82: (1) is the YouTube key reachable, which channels and streams can we see (key never printed);
// (2) the league "Current squad" wikitext from a few national team pages, to write a reader for them
const K = process.env.YOUTUBE_API_KEY || '';
console.log('youtube key present:', K ? `yes (${K.length} chars)` : 'NO');
const yt = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${K}`); const j = await r.json(); if (j.error) console.log('  api error:', j.error.code, j.error.message); return j; };
if (K) {
  for (const h of ['@BLACKCAPS', '@WhiteFerns', '@NZCricket', '@cricketcomau', '@CricketAustralia', '@SuperSmashNZ', '@nzrugbyleague', '@SkySportNZ']) {
    const c = await yt('channels', `part=snippet,contentDetails&forHandle=${encodeURIComponent(h)}`);
    const ch = c.items?.[0]; if (!ch) { console.log(h, 'not found'); continue; }
    const up = ch.contentDetails.relatedPlaylists.uploads;
    const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=${up}`);
    const ids = (pl.items || []).map(x => x.contentDetails.videoId);
    const v = ids.length ? await yt('videos', `part=snippet,liveStreamingDetails&id=${ids.join(',')}`) : {};
    const live = (v.items || []).filter(x => x.liveStreamingDetails);
    console.log(`${h} = ${ch.id} "${ch.snippet.title}" | of the last ${ids.length} uploads, ${live.length} were/are streams`);
    for (const x of live.slice(0, 6)) console.log(`   ${x.snippet.liveBroadcastContent.padEnd(8)} ${x.liveStreamingDetails.scheduledStartTime || x.liveStreamingDetails.actualStartTime || ''} | ${x.snippet.title.slice(0, 90)}`);
  }
}
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
const r = await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(['New Zealand national rugby league team', "New Zealand women's national rugby league team", 'Tonga national rugby league team'].join('|')), { headers: UA });
for (const pg of (await r.json()).query.pages) { const t = pg.revisions[0].slots.main.content; const i = t.search(/^==+\s*current (squad|roster)\s*==+\s*$/im); console.log(`\n######## ${pg.title}\n${t.slice(i, i + 2200)}`); }
