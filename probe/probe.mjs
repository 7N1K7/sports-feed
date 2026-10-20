// probe 76: the random link preview: the page's og:image, and what the server hands out over several asks
const html = await (await fetch('https://kickoff.kiwi/?' + Date.now())).text();
const og = (html.match(/property="og:image" content="([^"]+)"/) || [])[1];
console.log('og:image', og ? og.replace(/\/\/[^/]+workers\.dev/, '//(stats server)') : 'none');
const seen = {};
for (let i = 0; i < 12; i++) { const r = await fetch(og); const b = new Uint8Array(await r.arrayBuffer()); seen[b.length] = (seen[b.length] || 0) + 1; if (i === 0) console.log('status', r.status, r.headers.get('content-type'), r.headers.get('cache-control')); }
console.log('distinct images over 12 asks (by size):', Object.keys(seen).length, JSON.stringify(seen));
