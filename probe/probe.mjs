import { writeFileSync } from 'fs';
// the Fluent Emoji (MIT) information mark, for the i button mock-ups
const out = [];
for (const [n, u] of [['info3d', 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Information/3D/information_3d.png'], ['infoflat', 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Information/Flat/information_flat.svg'], ['bulb3d', 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Light%20bulb/3D/light_bulb_3d.png']]) {
  try { const r = await fetch(u); const b = Buffer.from(await r.arrayBuffer()); writeFileSync(`probe/out-${n}.${u.endsWith('svg') ? 'svg' : 'png'}`, b); out.push(`${n} ${r.status} ${b.length}`); } catch (e) { out.push(`${n} error ${e.message}`); }
}
writeFileSync('probe/out.txt', 'infoicons\n' + out.join('\n') + '\n');
