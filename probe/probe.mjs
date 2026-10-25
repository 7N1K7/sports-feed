// probe 209: official sports channels on YouTube: which stream whole games live, and are those open in NZ? For each
// handle: the channel, then its latest 50 uploads' live streams (how many, how many shut to NZ, a few titles). The key
// isn't printed
import fs from 'fs';
const key = process.env.YOUTUBE_API_KEY, L = [];
const yt = async (path, q) => { const r = await fetch(`https://www.googleapis.com/youtube/v3/${path}?${q}&key=${key}`); return r.ok ? r.json() : { error: r.status }; };
const H = {
  cricket: ['sportscentralofficial', 'drmsportstvnetwork', 'pakistancricket', 'ptvsportsofficialpk', 'OfficialSLC', 'SriLankaCricket', 'windiescricket', 'CricketWestIndies', 'ZimbabweCricket', 'zimcricketofficial', 'cricketireland', 'CricketScotland', 'ICC', 'BCBtigers', 'ProteasCricket', 'USACricket', 'KNCBcricket', 'CANNepal', 'ACBofficials', 'thepapareofficial', 'cricketcanada'],
  rugby: ['WorldRugby', 'RugbyEurope', 'FijiRugby', 'SuperRugby', 'rugbyeuropetv', 'PacificRugbyPlayers'],
  league: ['RugbyLeagueWorldCup', 'NRL', 'IRLrugbyleague'],
  football: ['OFCMedia', 'OceaniaFootball', 'FIFA', 'ALeagues', 'AFCAsianCup', 'theafcchannel'],
  netball: ['WorldNetball', 'NetballAustralia', 'SuperNetball', 'NetballWorldCup'],
  hockey: ['FIHockey', 'HockeyAustralia', 'watchhockey'],
  basketball: ['FIBA', 'NBL', 'FIBAAsia', 'FIBAWorld'],
};
const now = Date.now();
for (const [sport, hs] of Object.entries(H)) {
  L.push(`\n== ${sport}`);
  for (const h of hs) {
    const c = (await yt('channels', `part=snippet,statistics,contentDetails&forHandle=${encodeURIComponent('@' + h)}`)).items?.[0];
    if (!c) { L.push(`@${h}: no channel`); continue; }
    const pl = await yt('playlistItems', `part=contentDetails&maxResults=50&playlistId=${c.contentDetails.relatedPlaylists.uploads}`);
    const ids = (pl.items || []).map(x => x.contentDetails.videoId);
    const v = ids.length ? await yt('videos', `part=snippet,contentDetails,liveStreamingDetails&id=${ids.join(',')}`) : { items: [] };
    const st = (v.items || []).filter(x => x.liveStreamingDetails && (x.liveStreamingDetails.actualStartTime || x.liveStreamingDetails.scheduledStartTime));
    const recent = st.filter(x => now - Date.parse(x.liveStreamingDetails.actualStartTime || x.liveStreamingDetails.scheduledStartTime) < 60 * 864e5);
    const nzShut = recent.filter(x => { const r = x.contentDetails.regionRestriction; return r && (r.allowed ? !r.allowed.includes('NZ') : r.blocked?.includes('NZ')); }).length;
    const long = recent.filter(x => /PT(\d+)H/.test(x.contentDetails.duration) && +x.contentDetails.duration.match(/PT(\d+)H/)[1] >= 2).length;
    L.push(`@${h}: ${c.snippet.title} ${c.id} subs ${c.statistics.subscriberCount} ${c.snippet.country || '?'} | streams in 60 days ${recent.length} (2h+ long ${long}, shut to NZ ${nzShut}) | ${recent.slice(0, 3).map(x => `[${x.snippet.liveBroadcastContent}] ${x.snippet.title.slice(0, 70)}`).join(' ; ')}`);
  }
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
