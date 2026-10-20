// probe 95: how many upcoming games have a free way to watch; TV guide after the free-to-air fix
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?' + Date.now())).json();
console.log('generated', f.generatedAt, '\ntvGuide:', String(f.diag?.tvGuide || '').slice(0, 1500));
const FREE = /TVNZ|\bThree\b|ThreeNow|Sky Open|Whakaata|DUKE|\bfree\b|YouTube|Prime\b/i, TVF = /^(TVNZ 1|TVNZ 2|Three|Sky Open|TVNZ DUKE|Whakaata Māori|Rush|Bravo|eden)$/;
const now = Date.now(), up = f.events.filter(e => e.status !== 'final' && Date.parse(e.startUTC) > now - 6 * 36e5 && Date.parse(e.startUTC) < now + 21 * 864e5);
const why = e => (e.tv || []).filter(x => TVF.test(x.ch)).map(x => x.ch + (x.delayed ? ' (delayed)' : '')).concat(e.yt?.length ? ['YouTube'] : [], FREE.test(`${e.broadcast || ''} ${e.watchAlt || ''}`) ? [`rule: ${(e.broadcast || '')} ${e.watchAlt || ''}`.trim()] : []);
const free = up.filter(e => why(e).length), live = free.filter(e => why(e).some(w => !/delayed|highlights/i.test(w)));
console.log(`\nnext 3 weeks: ${up.length} games, ${free.length} with a free option, ${live.length} free and live`);
const by = {}; for (const e of up) { const k = e.sport; by[k] ||= [0, 0]; by[k][0]++; if (why(e).length) by[k][1]++; }
console.log(Object.entries(by).map(([k, [a, b]]) => `${k} ${b}/${a}`).join(', '));
for (const e of free.slice(0, 60)) console.log(' ', e.startUTC.slice(5, 16), e.sport, '|', e.home, e.away ? 'v ' + e.away : '', '|', why(e).join('; ').slice(0, 110));
