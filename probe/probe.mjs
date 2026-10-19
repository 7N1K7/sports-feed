// probe 30: hockey parser again, with the location field read for the town
const UA = 'KickoffKiwi/1.0 (https://kickoff.kiwi/; probe)';
for (const t of ["New Zealand men's national field hockey team", "New Zealand women's national field hockey team"]) {
  const r = await fetch(`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(t)}&action=raw`, { headers: { 'user-agent': UA } });
  const s = await r.text();
  console.log('=====', t, s.length);
  const boxes = [...s.matchAll(/\{\{\s*(football box collapsible|footballbox collapsible|fb[^|\n]*|hockeybox[^|\n]*|field ?hockey ?box[^|\n]*)\s*\|/gi)];
  console.log('box names:', [...new Set(boxes.map(m => m[1]))].join(', '), boxes.length);
  for (const m of boxes.slice(-3)) console.log(s.slice(m.index, m.index + 1100).replace(/\n{2,}/g, '\n'), '\n---');
  // and one World Cup box from the national page
  const wc = boxes.find(m => /World Cup/.test(s.slice(m.index, m.index + 600)));
  if (wc) console.log('WC box:\n' + s.slice(wc.index, wc.index + 900));
}
