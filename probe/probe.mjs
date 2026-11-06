import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
const out = [];
// v592 live: the This week competition buttons (names and logos only; the line's screenshots show no results)
const b = await chromium.launch({ channel: 'chrome' });
for (const vw of [1280, 820, 412, 360]) for (const sp of ['motor', 'cricket', 'football', 'rugby', 'basketball']) {
  const ctx = await b.newContext({ viewport: { width: vw, height: 900 }, deviceScaleFactor: 2, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(s => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.sport', JSON.stringify([s])); localStorage.setItem('sf.comp', '""'); } catch (e) {} }, sp);
  try {
    await p.goto('https://kickoff.kiwi/?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
    await p.waitForSelector('#weekSec > h2', { timeout: 15000 }); await p.waitForTimeout(1500);
    const st = () => p.evaluate(async () => {
      const box = document.getElementById('weekComps'); if (!box) return { none: 'no box' };
      const h = box.parentNode, r = box.getBoundingClientRect(), hr = h.getBoundingClientRect(), rg = document.getElementById('weekRange');
      const tw = document.createRange(); tw.selectNodeContents(h.firstChild); const wr = tw.getBoundingClientRect();
      const dr = document.createRange(); dr.selectNodeContents(rg); const d = dr.getBoundingClientRect();
      const hid = rg.classList.contains('qhide'), off = document.getElementById('offWeekW'), offOn = !off.hidden && off.style.visibility !== 'hidden';
      const bad = !box.hidden && box.children.length && (r.left < wr.right + 6 || (!hid && r.left < d.right + 6) || r.right > hr.right + .5 || (offOn && r.right > off.getBoundingClientRect().left - 4));
      // every logo on the buttons loads
      const urls = [...box.querySelectorAll('i, .fl, img')].map(el => el.tagName === 'IMG' ? el.src : (getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)/) || [])[1]).filter(Boolean);
      const loads = await Promise.all(urls.map(u => new Promise(res => { const im = new Image(); im.onload = () => res(1); im.onerror = () => res(0); im.src = u; })));
      return { hidden: box.hidden, kinds: [...box.children].map(x => x.classList.contains('nowchip') ? 'c' : x.classList.contains('qt') ? 't' : x.textContent).join(''), names: [...box.children].map(x => x.getAttribute('aria-label')).join(', '),
        hid, offOn, bad, x: Math.round(r.left), w: Math.round(r.width), logos: `${loads.filter(Boolean).length}/${loads.length}`, ver: (document.body.innerText.match(/\bv(5\d\d)\b/) || [])[1] };
    });
    const s0 = await st();
    let line = `${vw} ${sp}: v${s0.ver} ${s0.hidden ? 'none' : `${s0.kinds}${s0.hid ? ' (dates hidden)' : ''}${s0.offOn ? ' [off note]' : ''}${s0.bad ? ' OVERLAP' : ''} logos ${s0.logos} | ${s0.names}`}`;
    if (!s0.hidden && s0.kinds && ((vw === 412 && /cricket|motor/.test(sp)) || (vw === 1280 && sp === 'cricket') || (vw === 820 && sp === 'cricket'))) {
      await p.evaluate(() => document.querySelectorAll('body *').forEach(el => { const ps = getComputedStyle(el).position; if (ps === 'sticky' || ps === 'fixed') el.style.position = 'static'; }));
      await p.waitForTimeout(300);
      const y = await p.evaluate(() => document.querySelector('#weekSec > h2').getBoundingClientRect().top + scrollY - 8);
      await p.screenshot({ path: `probe/out-qc-${vw}-${sp}.png`, clip: { x: 0, y: Math.max(0, y), width: vw, height: 56 }, fullPage: true });
      await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
    }
    if (!s0.hidden && s0.kinds) {
      await p.click('#weekComps > [data-bigcomp]'); await p.waitForTimeout(1200);
      const s1 = await st(), hub = await p.evaluate(() => !document.getElementById('hubSec').hidden && document.getElementById('hubName').textContent.trim().slice(0, 40));
      line += `\n   opened: ${hub} | same ${s1.kinds === s0.kinds && s1.x === s0.x && s1.w === s0.w && s1.hid === s0.hid}${s1.bad ? ' OVERLAP' : ''}`;
      await p.click('#weekComps > [aria-pressed="true"]').catch(() => {}); await p.waitForTimeout(1200);
      const s2 = await st(), closed = await p.evaluate(() => document.getElementById('hubSec').hidden);
      line += ` | again: closed ${closed}, same ${s2.kinds === s0.kinds && s2.x === s0.x}`;
      if (s0.kinds.includes('+')) { await p.click('#weekComps .qmore'); await p.waitForTimeout(500); line += ` | +N list open ${await p.evaluate(() => !document.getElementById('compMenu').hidden)}`; }
    }
    out.push(line + (errs.length ? '\n   ERR ' + errs.join('; ') : ''));
  } catch (e) { out.push(`${vw} ${sp}: error ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await b.close();
writeFileSync('probe/out.txt', 'live592\n' + out.join('\n') + '\n');
