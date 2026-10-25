// probe 199: the live site after v477: the version, the new code on the page, flagcdn's PNG flags' edge rows, and the
// "off in settings" note drawn (basketball picked, the NBA off as it comes), not counted as a visit
import fs from 'fs';
import { chromium } from 'playwright';
const L = [];
const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text();
L.push('page: offnote=' + h.includes('id="offWeek"') + ' skygo channel=' + h.includes('skygo.co.nz/watch-tv/') + ' png flags=' + h.includes('flagcdn.com/h240/') + ' slowWhy=' + h.includes('function slowWhy') + ' v=' + (h.match(/vN?\W{0,3}(\d{3})/) || [])[1]);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 412, height: 900 } });
await p.addInitScript(() => { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.sport', '["basketball"]'); });
await p.goto('https://kickoff.kiwi/', { waitUntil: 'load' }); await p.waitForTimeout(5000);
L.push('note: ' + await p.evaluate(() => [...document.querySelectorAll('.offnote')].map(n => `${n.id} hidden=${n.hidden} vis=${n.style.visibility || 'shown'} "${n.textContent}" go=${n.dataset.offgo}`).join(' | ')));
L.push('version shown: ' + await p.evaluate(() => (document.body.innerText.match(/\bv\d{3}\b/) || [''])[0]));
// flag edges: each row of the top and bottom three rows, centre of the left third (France's blue)
const px = await p.evaluate(async () => { const out = [];
  for (const c of ['fr', 'in']) { const img = new Image(); img.crossOrigin = 'anonymous'; img.src = `https://flagcdn.com/h240/${c}.png`; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d'); x.drawImage(img, 0, 0);
    const at = (px, py) => [...x.getImageData(px, py, 1, 1).data].join(','); const cx = Math.round(img.width / 6);
    out.push(`${c} ${img.width}x${img.height} rows0-2: ${[0, 1, 2].map(y => at(cx, y)).join(' / ')} last3: ${[3, 2, 1].map(d => at(cx, img.height - d)).join(' / ')}`); }
  return out; });
L.push(...px);
await b.close();
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
