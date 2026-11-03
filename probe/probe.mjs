import { chromium } from 'playwright'; import { readFileSync, writeFileSync } from 'fs';
const css = readFileSync('probe/tight.css', 'utf8'), out = [];
const live = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text();
const b = await chromium.launch();
async function shot(w, tight) {
  const c = await b.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 3, serviceWorkers: 'block' }), p = await c.newPage();
  await c.addInitScript(() => { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.view', '"list"'); localStorage.setItem('sf.spoilers', 'true'); });
  if (tight) await p.route(/^https:\/\/kickoff\.kiwi\/(\?.*)?$/, r => r.fulfill({ body: live.replace('</head>', `<style>${css}</style></head>`), contentType: 'text/html' }));
  await p.goto('https://kickoff.kiwi/?x=1'); await p.waitForTimeout(6000);
  const m = await p.evaluate(() => { const rows = [...document.querySelectorAll('.ev.lrow:not(.lres)')].filter(r => r.offsetWidth); let cut = 0, hid = 0;
    for (const r of rows) for (const n of r.querySelectorAll('.nm')) { const d = n.scrollWidth - n.clientWidth; if (d > 2) { cut++; hid += d; } }
    const first = document.querySelector('#upcoming .ev.lrow, .daygroup .ev.lrow'); return { rows: rows.length, cut, hid, y: first ? first.getBoundingClientRect().top + scrollY - 30 : 0 }; });
  out.push(`${w} ${tight ? 'tight' : 'now'}: ${m.rows} rows, ${m.cut} names cut by more than 2px, ${m.hid}px hidden`);
  const buf = await p.screenshot({ clip: { x: 0, y: m.y, width: w, height: 470 }, fullPage: true });
  await c.close(); return buf.toString('base64');
}
for (const w of [360, 412]) {
  const a = await shot(w, false), t = await shot(w, true);
  const c = await b.newContext({ viewport: { width: 2 * w + 60, height: 540 }, deviceScaleFactor: 2 }), p = await c.newPage();
  await p.setContent(`<body style="margin:0;background:#888;font:600 16px sans-serif;display:flex;gap:20px;padding:20px"><div><div style="margin-bottom:6px">Now</div><img width="${w}" src="data:image/png;base64,${a}"></div><div><div style="margin-bottom:6px">Tighter</div><img width="${w}" src="data:image/png;base64,${t}"></div></body>`);
  await p.screenshot({ path: `probe/out-list-${w}.png`, fullPage: true }); await c.close();
}
await b.close();
writeFileSync('probe/out.txt', out.join('\n') + '\n');
