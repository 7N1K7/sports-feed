// probe 201: the men's World Cup page on Wikipedia: the lines around each New Zealand game (date, time, teams)
import fs from 'fs';
const L = [];
const j = await (await fetch('https://en.wikipedia.org/w/api.php?action=parse&page=2026_Rugby_League_World_Cup&prop=wikitext&format=json&formatversion=2&redirects=1', { headers: { 'user-agent': 'KickoffKiwi probe (https://kickoff.kiwi)' } })).json();
const w = j.parse?.wikitext || '', lines = w.split('\n');
L.push('templates: ' + [...new Set((w.match(/\{\{\s*[A-Za-z][\w ]{3,30}\s*\n?\|/g) || []).map(x => x.replace(/\s+/g, ' ').trim()))].slice(0, 30).join(', '));
lines.forEach((l, i) => { if (/\b(NZL|New Zealand)\b/.test(l) && /team|rl-|rlw|NZL/.test(l)) L.push(`${i}: ` + lines.slice(Math.max(0, i - 4), i + 3).map(x => x.trim()).join(' ').slice(0, 400)); });
// any sub-page for the group stage or Group A
const links = [...new Set((w.match(/\[\[(2026 Rugby League World Cup[^\]|]*)/g) || []).map(x => x.slice(2)))];
L.push('links: ' + links.join(' | '));
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
