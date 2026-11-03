// Kickoff Kiwi's service worker, for the home-screen app. The page and the feed always come from the network when
// there is one, so nothing goes stale; the last good copy of each is kept so the app still opens with no signal.
// Other sites' files (flags, crests, fonts) and the calendar files are left alone.
const CACHE = 'kickoff-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/data/cal/')) return;
  // one copy per file, whatever its query string; the page itself is checked with the server every time it opens
  const key = url.origin + url.pathname.replace(/\/$/, '/index.html');
  const net = fetch(req.mode === 'navigate' ? new Request(url.href, { cache: 'no-cache', credentials: 'same-origin' }) : req)
    .then(res => {
      if (req.mode === 'navigate' && res.redirected) res = new Response(res.body, res);
      if (res.ok && res.type === 'basic') { const copy = res.clone(); e.waitUntil(caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {})); }
      return res;
    });
  e.waitUntil(net.then(() => {}, () => {}));
  e.respondWith((async () => {
    try {
      // a feed that hasn't come in 8 seconds (a stalled connection) gives way to the last good copy, if there is one,
      // so the app shows the games (and how old they are) rather than "Loading"; the network's copy is still saved
      // when it comes, for the page's next refresh
      if (!url.pathname.endsWith('/data/feed.json')) return await net;
      return await Promise.race([net, new Promise((_, no) => setTimeout(() => no(new Error('slow')), 8000))]);
    } catch (err) {
      const hit = await caches.match(key);
      if (hit) return hit;
      return net;
    }
  })());
});
