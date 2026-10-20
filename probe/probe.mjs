// probe 84: league World Cup squads with the new table reader; tennis doubles rankings; youtube streams on the channels found
import { TEAM_PAGES, teamSquads } from './sources.mjs';
import { rankings } from './rankings.mjs';
const diag = {};
const keys = Object.keys(TEAM_PAGES).filter(k => k.startsWith('league|'));
const sq = await teamSquads(keys, diag);
console.log(diag.teamSquads);
for (const s of sq) console.log(`  ${s.g} ${s.team}: ${s.players.length} — ${s.players.slice(0, 4).map(p => p.n + (p.w ? ` [${p.w}]` : '')).join(', ')}`);
const r = await rankings({}, diag);
for (const l of r.filter(l => l.sport === 'tennis')) console.log(`\n${l.title} (${l.asOf}): ${l.rows.slice(0, 5).map(x => `${x.rank} ${x.name} ${x.iso} ${x.val}`).join(' | ')}`);
const K = process.env.YOUTUBE_API_KEY || '';
const yt = async (path, qq) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${qq}&key=${K}`); const j = await r.json(); if (j.error) console.log('  api error:', j.error.code, j.error.message?.slice(0, 80)); return j; };
const CH = { 'New Zealand Cricket': 'UCuKowzPg2-A0FcmyPa3yWug', BLACKCAPS: 'UCSod8uUgEkkmXA7vwj7l1Lw', 'White Ferns': 'UCYlXMztErvJfKkbxThs3Rrw', 'Super Smash': 'UChyV_J-avTCV78G_qonimGw', 'cricket.com.au': 'UCkBY0aHJP9BwjZLDYxAQrKg', 'Cricket Australia': 'UC2naOExy27J5Qz3SO-w6xkQ', 'Netball NZ': 'UCBL_yvdSAenDVDAyfCQNOpQ', 'ANZPremiershipTV': 'UCMlnIn80Yys9aDD-cJnS4NQ', 'Basketball NZ': 'UC4OycSjzkovtoJPLC3YBo2w', 'Hockey NZ': 'UC3xM-N7a2Ad_WZOCcONDPmg', 'Tennis Australia': 'UCgUrLyvzsRqgGSmTBbxL84A', 'NZ Football': 'UCOlVcyI-9J8QiPkxjKhT5zg', 'NZ Rugby League': 'UCEztFfJS3r2MjXiHEdPDo9Q' };
for (const [name, id] of Object.entries(CH)) {
  const up = 'UU' + id.slice(2);
  const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=${up}`);
  const ids = (pl.items || []).map(x => x.contentDetails.videoId);
  const v = ids.length ? await yt('videos', `part=snippet,liveStreamingDetails&id=${ids.join(',')}`) : {};
  const live = (v.items || []).filter(x => x.liveStreamingDetails);
  const last = (v.items || [])[0]?.snippet.publishedAt?.slice(0, 10);
  console.log(`\n${name}: ${ids.length} recent uploads (newest ${last}), ${live.length} streams`);
  for (const x of live.slice(0, 8)) console.log(`   ${x.snippet.liveBroadcastContent.padEnd(8)} ${(x.liveStreamingDetails.scheduledStartTime || x.liveStreamingDetails.actualStartTime || '').slice(0, 16)} | ${x.snippet.title.slice(0, 80)}`);
  // a team list in a description?
  const tl = (v.items || []).find(x => /\bsquad|team list|named\b/i.test(x.snippet.title));
  if (tl) console.log('   squad-ish video:', tl.snippet.title.slice(0, 80), '| desc:', tl.snippet.description.replace(/\s+/g, ' ').slice(0, 200));
}
