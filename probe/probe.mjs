// probe 220: v504 deployed (List view score colours, Standard spacing, late-font refit)
import fs from 'fs';
const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text();
fs.writeFileSync(new URL('./out.txt', import.meta.url), `lscoreHtml: ${h.includes('const lscoreHtml')}; spacing: ${h.includes('body.v-mixed #today > .daygroup > .ev + .ev')}; refit: ${h.includes("addEventListener('loadingdone'")}\n`);
