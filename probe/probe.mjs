// probe 236: for the gap sweep: NZ TV guide listings for the overseas cricket, the WTA Finals and the hockey; NZC's
// Plunket Shield and Hallyburton Johnstone Shield pages for start times; the Sheffield Shield season page for times
import fs from 'fs';
const L = [], UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
const PAT = /pakistan|bangladesh|sri lanka|west indies|oman|netherlands|emirates|uae|wta|tennis|hockey|black sticks|south africa/i;
for (const url of ['https://i.mjh.nz/SkyGo/epg.xml', 'https://i.mjh.nz/nz/epg.xml']) {
  try {
    const xml = await (await fetch(url, UA)).text();
    const ch = Object.fromEntries([...xml.matchAll(/<channel id="([^"]+)"[^>]*>\s*<display-name[^>]*>([^<]+)/g)].map(m => [m[1], m[2]]));
    let n = 0, last = '';
    for (const m of xml.matchAll(/<programme start="([^"]+)" stop="[^"]*" channel="([^"]+)">([\s\S]*?)<\/programme>/g)) {
      const t = (m[3].match(/<title[^>]*>([^<]*)/) || [])[1] || '', s = (m[3].match(/<sub-title[^>]*>([^<]*)/) || [])[1] || '', d = ((m[3].match(/<desc[^>]*>([^<]*)/) || [])[1] || '').slice(0, 110);
      if (m[1] > last) last = m[1];
      if (!PAT.test(`${t} ${s}`) || !/sport|cricket|tennis|hockey/i.test(m[3])) continue;
      if (n++ < 60) L.push(`${url.includes('SkyGo') ? 'sky' : 'fta'} ${m[1].slice(0, 12)} ${ch[m[2]]} | ${t} | ${s} | ${d}`);
    }
    L.push(`${url}: ${n} matching; guide runs to ${last.slice(0, 8)}`);
  } catch (e) { L.push(`${url} error ${e.message}`); }
}
for (const url of ['https://www.nzc.nz/red-ball-fans-rejoice-plunket-shield-schedule-announced/', 'https://www.nzc.nz/cricket-across-aotearoa-ford-trophy-and-hallyburton-johnstone-shield-schedules-announced/']) {
  try {
    const h = await (await fetch(url, UA)).text(), txt = h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#8211;/g, ' ').replace(/\s+/g, ' ');
    const hits = [...txt.matchAll(/[^.]{0,80}\b(\d{1,2}(:\d\d)?\s?(am|pm)|start time|starts? at|10\.30|11am)\b[^.]{0,80}/gi)].map(m => m[0]).slice(0, 8);
    L.push(`${url} ${txt.length} chars; times: ${hits.join(' || ') || 'none'}`);
  } catch (e) { L.push(`${url} error ${e.message}`); }
}
try {
  const r = await (await fetch('https://en.wikipedia.org/w/api.php?format=json&formatversion=2&action=query&prop=revisions&rvprop=content&rvslots=main&titles=' + encodeURIComponent('2026–27 Sheffield Shield season'), UA)).json();
  const w = r.query.pages[0].revisions[0].slots.main.content;
  L.push(`shield page ${w.length} chars; time mentions: ${[...w.matchAll(/.{0,60}(\d{1,2}:\d\d|day-night|day\/night|pink ball).{0,60}/gi)].map(m => m[0]).slice(0, 10).join(' || ') || 'none'}`);
} catch (e) { L.push('shield error ' + e.message); }
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
