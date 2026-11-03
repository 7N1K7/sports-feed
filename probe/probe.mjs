import { execSync } from 'child_process'; import { writeFileSync, mkdirSync } from 'fs';
const out = [], sh = c => execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
// the site as deployed by each run around the time the page was stuck (Pages artifacts, kept a day)
for (const r of ['41541915114', '41543298418', '41544646613', '41545934482', '41547220186', '41548451429', '41549056025']) {
  try {
    const d = `/tmp/a${r}`; mkdirSync(d, { recursive: true });
    sh(`gh run download ${r} -R 7N1K7/sports-feed -n github-pages -D ${d} && cd ${d} && tar xf artifact.tar ./data/feed.json ./index.html ./sw.js`);
    sh(`cp ${d}/data/feed.json probe/out-feed-${r}.json`);
    out.push(r + ' ' + sh(`cd ${d} && wc -c data/feed.json index.html sw.js | tr '\\n' ' '`) + ' ' + sh(`cd ${d} && md5sum index.html sw.js | cut -c1-8 | tr '\\n' ' '`));
  } catch (e) { out.push(r + ' FAILED ' + String(e.stderr || e.message).slice(0, 300)); }
}
writeFileSync('probe/out.txt', out.join('\n') + '\n');
