// wfinal1: the women's and men's RLWC final kick-off times on Wikipedia (time fields only). Pushes probe/out-wf.txt
import { writeFileSync } from 'fs'; import { execSync } from 'child_process';
const out = ['wfinal1 ' + new Date().toISOString()];
for (const page of ["2026_Women's_Rugby_League_World_Cup", "2026_Men's_Rugby_League_World_Cup"]) {
  const w = await (await fetch(`https://en.wikipedia.org/w/api.php?action=parse&format=json&prop=wikitext&page=${encodeURIComponent(page)}`, { headers: { 'user-agent': 'kickoff.kiwi probe' } })).json();
  const t = w.parse?.wikitext?.['*'] || ''; out.push(`${page}: ${t.length} chars ${w.error?.info || ''}`);
  for (const m of t.matchAll(/==+\s*(Final|Semi-finals?)\s*==+([\s\S]*?)(?=\n==[^=]|$)/gi)) {
    const sec = m[2]; out.push(`  section ${m[1]}: ` + (sec.match(/\|\s*(date|time)\s*=[^\n]*/gi) || []).map(s => s.replace(/\s+/g, ' ').slice(0, 120)).join(' ; '));
  }
}
writeFileSync('probe/out-wf.txt', out.join('\n') + '\n');
for (let i = 0; i < 4; i++) try { execSync('git -c user.name=bot -c user.email=bot@x add -f probe/out-wf.txt && (git diff --cached --quiet || git -c user.name=bot -c user.email=bot@x commit -q -m out) && git pull -q --rebase && git push -q', { stdio: 'ignore' }); break; } catch { await new Promise(r => setTimeout(r, 3000)); }
console.log(out.join('\n'));
