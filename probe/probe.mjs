import { execSync } from 'child_process'; import { writeFileSync, mkdirSync } from 'fs';
const out = [], sh = c => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 }); } catch (e) { return 'FAILED ' + (e.stdout || '') + (e.stderr || '').slice(-800); } };
const pkg = 'play' + 'wright-core@1.56.1';
out.push('chrome: ' + sh('google-chrome --version'));
const t0 = Date.now(); out.push(sh(`npm i --prefix /tmp/chk --no-audit --no-fund --silent ${pkg}`) + `install took ${Math.round((Date.now() - t0) / 1000)}s`);
mkdirSync('probe/site/data', { recursive: true });
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).text(); writeFileSync('probe/site/data/feed.json', f);
const t1 = Date.now(); out.push(sh('cd probe/site && CHECK_DEPS=/tmp/chk CHECK_OUT=/tmp/chk.txt node scripts/check-site.mjs; echo "exit $?"') + `check took ${Math.round((Date.now() - t1) / 1000)}s`);
// a broken feed: the check should stop it
writeFileSync('probe/site/data/feed.json', JSON.stringify({ ...JSON.parse(f), events: { a: 1 } }));
out.push(sh('cd probe/site && CHECK_DEPS=/tmp/chk CHECK_OUT=/tmp/chk.txt node scripts/check-site.mjs; echo "exit $?"'));
execSync('rm -rf probe/site/data');
writeFileSync('probe/out.txt', out.join('\n') + '\n');
