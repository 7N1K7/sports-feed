// probe 239: the rest of i.mjh.nz's robots.txt (its rules after the content-signal preamble), and the SkySportNow guide's format
import fs from 'fs';
const L = [];
const rb = await (await fetch('https://i.mjh.nz/robots.txt')).text();
L.push('robots rules: ' + rb.split('\n').filter(l => l.trim() && !l.startsWith('#')).join(' | '));
const x = await (await fetch('https://i.mjh.nz/SkySportNow/epg.xml')).text();
const pr = x.match(/<programme[^>]*>/g) || [];
L.push(`SkySportNow ${pr.length} programmes; first: ${pr[0]}; last: ${pr[pr.length - 1]}`);
const st = pr.map(p => (p.match(/start="(\d{8})/) || [])[1]).filter(Boolean).sort(); L.push(`dates ${st[0]}..${st[st.length - 1]}`);
const sky = await (await fetch('https://i.mjh.nz/SkyGo/epg.xml')).text(); const sp = sky.match(/<programme[^>]*>/g) || [];
const sd = sp.map(p => (p.match(/start="(\d{8})/) || [])[1]).filter(Boolean); L.push(`SkyGo ${sp.length} programmes; dates ${sd.reduce((a, b) => a < b ? a : b)}..${sd.reduce((a, b) => a > b ? a : b)}; tail ${sp.slice(-2).join(' ')}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
