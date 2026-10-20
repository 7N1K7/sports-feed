// probe 73: the link preview card in each theme's colours (dark), for choosing
import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
const THEMES = {"ocean": {"paper": "#0c1218", "surface": "#141c24", "ink": "#e4edf5", "muted": "#8fa2b5", "line": "#233142", "accent": "#5cb3ff"}, "red": {"paper": "#130e0e", "surface": "#1d1615", "ink": "#f1e7e5", "muted": "#ad9a97", "line": "#352927", "accent": "#ff7b72"}, "black": {"paper": "#0a0a0a", "surface": "#151515", "ink": "#eeeeee", "muted": "#9a9a9a", "line": "#2a2a2a", "accent": "#f1f1f1"}, "kowhai": {"paper": "#12100a", "surface": "#1c1910", "ink": "#f2ecdc", "muted": "#aba189", "line": "#332e1f", "accent": "#f5c542"}, "paua": {"paper": "#0a1314", "surface": "#111e1f", "ink": "#e0f0f0", "muted": "#8ba9aa", "line": "#1f3536", "accent": "#3ccfcf"}, "purple": {"paper": "#100d17", "surface": "#181422", "ink": "#ebe6f6", "muted": "#a39bb6", "line": "#2d2640", "accent": "#a98bff"}, "orange": {"paper": "#140f0b", "surface": "#1e1712", "ink": "#f3e8de", "muted": "#b09d8c", "line": "#382a20", "accent": "#ff8a4c"}, "lime": {"paper": "#0e120a", "surface": "#161c10", "ink": "#e8f0dc", "muted": "#9cab89", "line": "#2a3420", "accent": "#a9e34b"}, "pink": {"paper": "#140c10", "surface": "#1e1419", "ink": "#f4e4eb", "muted": "#b398a5", "line": "#38242e", "accent": "#f783ac"}, "green": {"paper": "#0e1412", "surface": "#161f1c", "ink": "#e6eeea", "muted": "#93a49d", "line": "#25322d", "accent": "#46c093"}};
const src = await readFile(new URL('og/og.html', import.meta.url), 'utf8');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
for (const [k, t] of Object.entries(THEMES)) {
  // the card's green-theme colours swapped for this theme's
  const html = src.replace(/#0e1211/gi, t.paper).replace(/#141b19/gi, t.surface).replace(/#e9eeec|#e6eeea/gi, t.ink).replace(/#93a49d/gi, t.muted).replace(/#3b4a44/gi, t.line).replace(/#45c08f/gi, t.accent);
  const f = new URL('og/og-' + k + '.html', import.meta.url);
  await writeFile(f, html);
  await p.goto(f.href, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  await p.screenshot({ path: new URL('out-og-' + k + '.png', import.meta.url).pathname });
  console.log('rendered', k);
}
await b.close();
