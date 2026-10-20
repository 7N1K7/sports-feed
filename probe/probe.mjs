// probe 86: (1) TV guide sources for NZ free-to-air and Sky; (2) Premier League squads from the clubs' Wikipedia pages;
// (3) football-data.org without a key (what it says)
import { readSquad } from './sources.mjs';
const UA = { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' };
for (const u of ['https://i.mjh.nz/nz/epg.xml', 'https://i.mjh.nz/nz/epg.xml.gz', 'https://i.mjh.nz/SkyGo/epg.xml', 'https://i.mjh.nz/Sky/epg.xml', 'https://i.mjh.nz/nz/', 'https://www.freeviewnz.tv/tvguide/', 'https://www.freeviewnz.tv/api/tvguide']) {
  try {
    const r = await fetch(u, { headers: UA }); const buf = Buffer.from(await r.arrayBuffer());
    let t = buf.toString('utf8'); if (u.endsWith('.gz')) { const { gunzipSync } = await import('zlib'); try { t = gunzipSync(buf).toString('utf8'); } catch {} }
    console.log(`\n${u}: ${r.status} ${r.headers.get('content-type')} ${t.length} bytes`);
    if (/<tv/.test(t)) {
      const chans = [...t.matchAll(/<channel id="([^"]+)">\s*<display-name>([^<]+)/g)].map(m => `${m[1]}=${m[2]}`);
      console.log('  channels:', chans.length, chans.slice(0, 40).join(', '));
      const sport = [...t.matchAll(/<programme start="(\S+) [^"]*" stop="[^"]*" channel="([^"]+)">\s*<title[^>]*>([^<]*(?:v |vs |cricket|rugby|league|netball|football|Black Caps|BLACKCAPS|All Blacks|Warriors|Phoenix|Kiwis|Ferns|Super Smash|Ford Trophy|NPC|UFC)[^<]*)<\/title>/gi)].slice(0, 40);
      for (const m of sport) console.log('   ', m[1], m[2], '|', m[3].slice(0, 90));
    } else console.log('  ', t.slice(0, 300).replace(/\s+/g, ' '));
  } catch (e) { console.log(u, 'error', e.message); }
}
const clubs = ['Arsenal F.C.', 'Liverpool F.C.', 'Brighton & Hove Albion F.C.', 'Manchester United F.C.', 'Ipswich Town F.C.'];
const q = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&redirects=1&titles=' + encodeURIComponent(clubs.join('|')), { headers: UA })).json();
for (const pg of q.query.pages) { const ps = readSquad(pg.revisions?.[0]?.slots?.main?.content || ''); console.log(`\n${pg.title}: ${ps.length} — ${ps.slice(0, 5).map(p => p.n + (p.r ? ` (${p.r})` : '')).join(', ')}`); }
for (const u of ['https://api.football-data.org/v4/competitions/PL/teams', 'https://v3.football.api-sports.io/status']) { const r = await fetch(u); console.log(`\n${u}: ${r.status} ${(await r.text()).slice(0, 200)}`); }
