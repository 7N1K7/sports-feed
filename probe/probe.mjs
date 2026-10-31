// probe 238: after v521: the Shield, hockey, HJS and Bangladesh cards; and i.mjh.nz's robots.txt and SkySportNow guide
import fs from 'fs';
const L = [];
await new Promise(r => setTimeout(r, 420e3)); // let the v521 deploy publish its feed first
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json(); L.push(`feed ${f.generatedAt}`);
for (const e of f.events.filter(e => /^(ss-|bs-ind|hjs-|ban-wi)/.test(e.id) || (e.team === 'blacksticks' && /India/.test(e.away)) || (e.comp === 'Sheffield Shield' && Date.parse(e.startUTC) < Date.now() + 40 * 864e5)))
  L.push(`${e.id} | ${e.home} v ${e.away} | ${e.startUTC} tbc ${!!e.timeTBC} usual ${!!e.usual} | ${e.broadcast || '-'} | squads ${(e.squads || []).map(s => s.team + ' ' + s.players.length).join(', ') || '-'}`);
L.push(`cricket time gaps: ${JSON.stringify(f.coverage.cricket.gaps.time)}`, `hockey: ${JSON.stringify(f.coverage.hockey)}`);
try { L.push('robots: ' + (await (await fetch('https://i.mjh.nz/robots.txt')).text()).slice(0, 1500)); } catch (e) { L.push('robots error ' + e.message); }
try { const x = await (await fetch('https://i.mjh.nz/SkySportNow/epg.xml')).text(); const ch = [...x.matchAll(/<display-name[^>]*>([^<]+)/g)].map(m => m[1]); const st = [...x.matchAll(/<programme start="(\d{8})/g)].map(m => m[1]).sort();
  L.push(`SkySportNow: ${x.length} bytes; ${ch.length} channels: ${ch.slice(0, 20).join(', ')}; listings ${st[0]}..${st[st.length - 1]}`); } catch (e) { L.push('ssn error ' + e.message); }
try { const x = await (await fetch('https://i.mjh.nz/SkyGo/epg.xml')).text(); const st = [...x.matchAll(/<programme start="(\d{8})/g)].map(m => m[1]).sort(); L.push(`SkyGo: ${x.length} bytes; listings ${st[0]}..${st[st.length - 1]}`); } catch (e) { L.push('skygo error ' + e.message); }
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
