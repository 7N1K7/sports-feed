// 13 Nov: is the new stats page live (its file only; nothing is counted and no stats are read)
const t = Date.now();
const v = await fetch(`https://kickoff.kiwi/data/version.json?t=${t}`).then(r => r.json()).catch(e => ({ err: e.message }));
const s = await fetch(`https://kickoff.kiwi/stats.html?t=${t}`).then(r => r.text()).catch(e => 'failed: ' + e.message);
console.log('stats page check | version', JSON.stringify(v), '| size', s.length);
for (const w of ['id="feedbuild"', 'id="capped"', 'today left out', 'Too many wrong passwords', 'ran out of time before']) console.log(' has', w, ':', s.includes(w));
