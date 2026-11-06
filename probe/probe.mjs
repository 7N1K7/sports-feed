import { writeFileSync } from 'fs';
import { chromium } from 'playwright';
const out = [];
// v591 live: each competition page's header look (text only, no screenshots: no results shown)
const b = await chromium.launch({ channel: 'chrome' });
for (const c of ['NRL', 'Formula 1', 'NBA', 'NPC', 'WTA Finals', "Women's Big Bash", 'Rugby Championship', 'Black Caps v India', 'SailGP']) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(cc => { try { localStorage.setItem('sf.nocount', 'true'); localStorage.setItem('sf.comp', JSON.stringify(cc)); } catch (e) {} }, c);
  try {
    await p.goto('https://kickoff.kiwi/?v=' + Date.now(), { waitUntil: 'networkidle', timeout: 45000 });
    await p.waitForSelector('#hubBox', { timeout: 15000 }); await p.waitForTimeout(1500);
    const r = await p.evaluate(async () => {
      const h = document.getElementById('hubBox'), cs = getComputedStyle(h), wm = h.querySelector('#hubWm i, #hubWm .wm'), lead = h.querySelector('#hubIcon i, #hubIcon img');
      const url = (wm && (getComputedStyle(wm).backgroundImage.match(/url\("?([^")]+)/) || [])[1]) || '';
      const ok = url ? await new Promise(res => { const im = new Image(); im.onload = () => res(im.naturalWidth); im.onerror = () => res('ERR'); im.src = url; }) : '-';
      const ver = (document.body.innerText.match(/\bv(5\d\d)\b/) || [])[1];
      const chip = document.querySelector(`#nowChips [data-bigcomp]`);
      return `v${ver} | ${h.className} | glow ${cs.getPropertyValue('--tb-glow').trim()} | wm ${url.replace(/^.*\//, '').slice(0, 40)} loaded ${ok} | lead ${lead ? lead.tagName : '-'} | tabs ${[...h.querySelectorAll('#hubTabs button')].length}, picked bg ${getComputedStyle(h.querySelector('#hubTabs [aria-selected="true"]') || h).backgroundColor}`;
    });
    out.push(`${c}: ${r}${errs.length ? ' | ERR ' + errs.join('; ') : ''}`);
  } catch (e) { out.push(`${c}: error ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await b.close();
writeFileSync('probe/out.txt', 'live591\n' + out.join('\n') + '\n');
