// probe 8: mock-ups on the live site. Slightly bigger card text and crests, and four takes on the UFC icon, as screenshots
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const SITE = 'https://7n1k7.github.io/sports-feed/';
const svg = f => readFileSync(new URL('mock/' + f, import.meta.url), 'utf8');
// slightly bigger: titles about 1px up, every crest and flag about 14% bigger, sport icons 18px -> 22px
const BIG = `
.ev .comp { font-size: 13px }
.ev .comp .ctitle { font-size: 14.5px }
:is(body.v-compact, body.v-mixed :is(#upcoming, #tomorrow, #later, #results, .donetoday, #dayPick, #hubBody)) .ev .comp { font-size: 12px }
:is(body.v-compact, body.v-mixed :is(#upcoming, #tomorrow, #later, #results, .donetoday, #dayPick, #hubBody)) .ev .comp .ctitle { font-size: 13.5px }
.ev .comp .sicon { width: 22px; height: 22px }
.ev .teams.matchup:has(img) .side { grid-template-rows: 2.95em auto }
.ev .teams.matchup .logo:not(.flagimg) { --lh: 2.85em; height: 2.85em; max-width: 5.7em }
.ev .teams.matchup .flagimg, .ev .teams.matchup .flagimg.after { height: 1.8em; max-width: 3.9em }
@media (max-width: 560px) { .ev .teams.matchup .logo:not(.flagimg) { --lh: 2.6em; height: 2.6em; max-width: 5em } .ev .teams.matchup .flagimg { height: 1.8em } }
:is(body.v-compact, body.v-mixed :is(#upcoming, #tomorrow, #later, #results, .donetoday, #dayPick, #hubBody)) .ev .teams.matchup .logo:not(.flagimg) { --lh: 2.45em; height: 2.45em; max-width: 4.6em }
:is(body.v-compact, body.v-mixed :is(#upcoming, #tomorrow, #later, #results, .donetoday, #dayPick, #hubBody)) .ev .teams.matchup .flagimg { height: 1.55em; max-width: 3.2em }
@media (min-width: 561px) { :is(body.v-compact, body.v-mixed :is(#upcoming, #tomorrow, #later, #results, .donetoday, #dayPick, #hubBody)) .ev .teams.matchup:has(img) .logo:not(.face) { width: 3.2em } }
`;
const MMA = sel => `.ev.sport-mma .comp .sicon { ${sel} }`;
const VARIANTS = [
  ['1-now', 'As it is now', '', null],
  ['2-bigger', 'Text and crests slightly bigger (current UFC octagon at 22px)', BIG, null],
  ['3-octagon-big', 'Bigger, plus the current UFC octagon sized up to 30px', BIG + MMA('width: 30px; height: 30px'), null],
  ['4-octagon-bold', 'Bigger, plus a bolder octagon (light rim, thick fence, red centre) at 28px', BIG + MMA('width: 28px; height: 28px'), svg('mma-bold.svg')],
  ['5-ufc-octagon', 'Bigger, plus a red octagon with UFC across it, 28px', BIG + MMA('width: 28px; height: 28px'), svg('mma-ufc.svg')],
  ['6-ufc-wordmark', 'Bigger, plus the UFC wordmark (public domain on Wikimedia Commons), 18px tall', BIG + MMA('width: auto; height: 18px'), svg('ufc-wordmark.svg')],
];
const b = await chromium.launch();
const log = [];
for (const [dev, vp] of [['desktop', { width: 1180, height: 1000 }], ['phone', { width: 390, height: 844 }]]) {
  for (const [id, label, css, icon] of VARIANTS) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: 'dark' });
    const p = await ctx.newPage();
    if (icon) await p.route(/icons\/mma\.svg/, r => r.fulfill({ contentType: 'image/svg+xml', body: icon }));
    await p.goto(SITE, { waitUntil: 'networkidle', timeout: 60000 }).catch(e => log.push('goto ' + e.message));
    if (css) await p.addStyleTag({ content: css });
    await p.waitForTimeout(2500);
    // one card of each kind: UFC, boxing, a rugby or league game with crests, and cricket
    const picks = { ufc: 'article.ev.sport-mma', boxing: 'article.ev.sport-boxing', rugby: 'article.ev.sport-rugby:has(img.logo:not(.flagimg))', league: 'article.ev.sport-league:has(img.logo)', football: 'article.ev.sport-football:has(img.logo)', cricket: 'article.ev.sport-cricket' };
    for (const [k, sel] of Object.entries(picks)) {
      const el = await p.$(sel);
      if (!el) { log.push(`${dev} ${id}: no ${k} card`); continue; }
      await el.scrollIntoViewIfNeeded();
      await el.screenshot({ path: new URL(`out-${dev}-${id}-${k}.png`, import.meta.url).pathname }).catch(e => log.push(`${dev} ${id} ${k}: ${e.message}`));
    }
    if (id === '1-now' || id === '2-bigger') await p.screenshot({ path: new URL(`out-${dev}-${id}-page.png`, import.meta.url).pathname, fullPage: false });
    await ctx.close();
  }
}
await b.close();
writeFileSync(new URL('out-labels.json', import.meta.url), JSON.stringify(VARIANTS.map(([id, label]) => ({ id, label }))));
console.log(log.join('\n') || 'all shots taken');
