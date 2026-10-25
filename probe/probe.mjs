// probe 207: the live site after v486: the version, the script-driven-browser check on the page, the network lists on the stats page
import fs from 'fs';
const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text();
const s = await (await fetch('https://kickoff.kiwi/stats.html?x=' + Date.now())).text();
const L = [`page version: ${(h.match(/\bv(\d{3})\b/) || [])[1]}`, `page skips script-driven browsers: ${h.includes('navigator.webdriver) return')}`,
  `stats page has the network lists: ${s.includes('id="network"') && s.includes('id="datacentre"')}`];
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
