import { writeFileSync } from 'fs';
const out = [];
const urls = ['https://fightnews.com/%F0%9F%A5%8A-gallen-v-nelson-sydney-harbour-face-off-today-%F0%9F%9B%A5%EF%B8%8F/199585', 'https://champinon.info/schedule/gallen-vs-asofa-solomona/', 'https://www.tapology.com/fightcenter/events/148916-gallen-vs-solomona', 'https://www.fightnewsaustralia.com/watch-gallen-vs-nas-face-off-turns-ugly/'];
for (const u of urls) {
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36', accept: 'text/html' }, signal: AbortSignal.timeout(20000) });
    const t = (await r.text()).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/\s+/g, ' ');
    out.push(`== ${u.slice(0, 60)} ${r.status} ${t.length}`);
    const re = /(AEDT|AEST|NZT|NZDT|New Zealand|Sky Arena|Sky Sport|Kayo|Main Event|DAZN|ring ?walk|start time|main card|undercard|pm|PPV|pay-per-view|rounds)/gi; let m, last = -400, n = 0;
    while ((m = re.exec(t)) && n < 25) { if (m.index - last < 200) continue; last = m.index; n++; out.push('  … ' + t.slice(Math.max(0, m.index - 150), m.index + 200)); }
  } catch (e) { out.push(`== ${u.slice(0, 60)} FAILED ${e.message}`); }
}
writeFileSync('probe/out.txt', out.join('\n') + '\n');
