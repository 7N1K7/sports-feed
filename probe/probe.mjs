// three1: Three's and the free channels' line-up tonight (7pm to midnight NZ), and any listing of Kiwis v Tonga or rugby
// league anywhere in the Freeview guide. Programme titles only. Writes and pushes probe/out-three.txt itself
import { writeFileSync } from 'fs'; import { execSync } from 'child_process';
const out = ['three1 ' + new Date().toISOString()];
const x = await (await fetch('https://i.mjh.nz/nz/epg.xml?x=' + Date.now())).text();
const chans = Object.fromEntries([...x.matchAll(/<channel id="([^"]+)">[\s\S]*?<display-name[^>]*>([^<]+)</g)].map(m => [m[1], m[2]]));
const ts = s => { const m = s.match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d) ([+-]\d\d)(\d\d)/); return Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) - (m[7][0] === '-' ? -1 : 1) * ((+m[7].slice(1)) * 60 + +m[8]) * 60e3; };
const progs = [...x.matchAll(/<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g)].map(m => ({ a: ts(m[1]), b: ts(m[2]), ch: chans[m[3]] || m[3], t: (m[4].match(/<title[^>]*>([^<]*)/) || [])[1] || '', d: (m[4].match(/<desc[^>]*>([^<]*)/) || [])[1] || '' }));
const lo = Date.parse('2026-11-07T06:00:00Z'), hi = Date.parse('2026-11-07T11:00:00Z');
const nz = t => new Date(t).toLocaleTimeString('en-NZ', { timeZone: 'Pacific/Auckland', hour: 'numeric', minute: '2-digit' });
out.push('channels named Three: ' + Object.values(chans).filter(n => /three|^3\b/i.test(n)).join(', '));
for (const p of progs.filter(p => /^(Three|3)\b/i.test(p.ch) && p.b > lo && p.a < hi).sort((a, b) => a.a - b.a)) out.push(`  ${p.ch} ${nz(p.a)}-${nz(p.b)} ${p.t}`);
out.push('anything naming Tonga, Kiwis or rugby league, 6 to 8 Nov:');
for (const p of progs.filter(p => /tonga|kiwis|rugby league/i.test(p.t + ' ' + p.d) && p.a > Date.parse('2026-11-06T18:00Z') && p.a < Date.parse('2026-11-08T12:00Z')).sort((a, b) => a.a - b.a)) out.push(`  ${p.ch} ${new Date(p.a).toISOString()} (${nz(p.a)} NZ) ${p.t} | ${p.d.slice(0, 120)}`);
writeFileSync('probe/out-three.txt', out.join('\n') + '\n');
for (let i = 0; i < 4; i++) try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-three.txt && (git diff --cached --quiet || git -c user.name=bot -c user.email=bot@x commit -q -m out) && git pull -q --rebase && git push -q', { stdio: 'ignore' }); break; } catch { await new Promise(r => setTimeout(r, 3000)); }
console.log(out.join('\n'));
