// probe 214: the team logos on the live feed: each one's size, and where its ink sits (bounding box of the opaque
// pixels, and at mid-height how close the ink comes to the left and right edges), to find wordmark-style logos
import fs from 'fs';
import zlib from 'zlib';
const ua = { 'user-agent': 'KickoffKiwi/1.0 (https://kickoff.kiwi) probe' }, L = [];
const f = await (await fetch('https://kickoff.kiwi/data/feed.json?x=' + Date.now())).json();
const logos = new Map();
for (const e of f.events) for (const s of ['home', 'away']) if (e[s + 'Logo'] && /thesportsdb/.test(e[s + 'Logo']) && !logos.has(e[s + 'Logo'])) logos.set(e[s + 'Logo'], `${e[s]} (${e.team})`);
function png(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  let p = 8, w, h, bd, ct, il, idat = [], plte, trns;
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); bd = d[8]; ct = d[9]; il = d[12]; } else if (type === 'IDAT') idat.push(d); else if (type === 'PLTE') plte = d; else if (type === 'tRNS') trns = d; else if (type === 'IEND') break; p += 12 + len; }
  if (bd !== 8 || il) return { w, h, note: `bd${bd} il${il} ct${ct}` };
  const ch = { 6: 4, 2: 3, 3: 1, 0: 1, 4: 2 }[ct], raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * ch, out = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) { const ft = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) { const a = x >= ch ? out[y * stride + x - ch] : 0, b = y ? out[(y - 1) * stride + x] : 0, c = x >= ch && y ? out[(y - 1) * stride + x - ch] : 0; let v = line[x];
      if (ft === 1) v += a; else if (ft === 2) v += b; else if (ft === 3) v += (a + b) >> 1; else if (ft === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[y * stride + x] = v & 255; } }
  const alpha = (x, y) => { const i = y * stride + x * ch; return ct === 6 ? out[i + 3] : ct === 4 ? out[i + 1] : ct === 3 ? (trns && out[i] < trns.length ? trns[out[i]] : 255) : 255; };
  let x0 = w, x1 = -1, y0 = h, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (alpha(x, y) > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  // in the middle third of the ink's height, the ink's own left and right extent, against the whole ink's width
  let mx0 = w, mx1 = -1; const ih = y1 - y0 + 1;
  for (let y = y0 + Math.floor(ih / 3); y <= y0 + Math.floor(2 * ih / 3); y++) for (let x = 0; x < w; x++) if (alpha(x, y) > 40) { if (x < mx0) mx0 = x; if (x > mx1) mx1 = x; }
  // and the lower third (where a wordmark under a shield usually is)
  let lx0 = w, lx1 = -1;
  for (let y = y0 + Math.floor(2 * ih / 3); y <= y1; y++) for (let x = 0; x < w; x++) if (alpha(x, y) > 40) { if (x < lx0) lx0 = x; if (x > lx1) lx1 = x; }
  const iw = x1 - x0 + 1;
  return { w, h, ct, ink: `${iw}x${ih}`, aspect: +(iw / ih).toFixed(2), midSpan: +((mx1 - mx0 + 1) / iw).toFixed(2), lowSpan: +((lx1 - lx0 + 1) / iw).toFixed(2) };
}
const rows = [];
for (const [u, who] of logos) {
  try { const b = Buffer.from(await (await fetch(u, { headers: ua })).arrayBuffer()); const r = png(b); rows.push({ who, u: u.split('/').slice(-2).join('/'), ...(r || { note: 'not png ' + b.subarray(0, 4).toString('hex') }) }); }
  catch (e) { rows.push({ who, note: e.message }); }
}
rows.sort((a, b) => (b.aspect || 0) - (a.aspect || 0));
L.push(`${rows.length} logos`);
for (const r of rows) L.push(`${r.aspect ?? '-'} | ink ${r.ink || '-'} of ${r.w}x${r.h} ct${r.ct ?? ''} | mid ${r.midSpan ?? '-'} low ${r.lowSpan ?? '-'} | ${r.who} | ${r.u || ''} ${r.note || ''}`);
fs.writeFileSync(new URL('./out.txt', import.meta.url), L.join('\n') + '\n');
