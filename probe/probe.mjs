// probe 248: TheSportsDB's Rugby League World Cup games (rounds 1-3): which have a final score yet (yes/no only)
import fs from 'fs';
const L = [], j = async u => { try { return await (await fetch(`https://www.thesportsdb.com/api/v1/json/123/${u}`)).json(); } catch (e) { return { err: e.message }; } };
for (const [id, nm] of [[5806, 'RLWC']]) {
  const past = await j(`eventspastleague.php?id=${id}`);
  L.push(`${nm} past: ${(past.events || []).map(e => `${e.dateEvent} ${e.strEvent} r${e.intRound} s${e.strSeason} score:${e.intHomeScore != null ? 'yes' : 'no'}`).join(' | ') || JSON.stringify(past).slice(0, 200)}`);
  for (const r of [1, 2, 3]) for (const s of ['2026']) {
    const x = await j(`eventsround.php?id=${id}&r=${r}&s=${s}`);
    L.push(`${nm} r${r} s${s}: ${(x.events || []).map(e => `${e.dateEvent} ${e.strTime} ${e.strEvent} [${e.strStatus || ''}] score:${e.intHomeScore != null ? 'yes' : 'no'}`).join(' | ') || JSON.stringify(x).slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 2500));
  }
}
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
