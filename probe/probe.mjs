// 14 Nov: does Openverse answer from GitHub's runners (free search of CC images; nothing of ours sent)
const UA = { headers: { 'user-agent': 'sports-feed/1.0 (https://github.com/7N1K7/sports-feed; personal non-commercial site)' } };
console.log('OPENVERSE');
for (const [q, extra] of [['Joshua Buatsi', '&source=flickr&license_type=modification&mature=false&page_size=20'], ['Joshua Buatsi', '&license_type=modification&page_size=20'], ['Callum Smith boxer', '&page_size=20'], ['Erin Blanchfield', '&license_type=modification&page_size=20'], ['Kade Ruotolo', '&page_size=20']]) {
  const t = Date.now();
  try { const r = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}${extra}`, UA); const b = await r.text(); let j = {}; try { j = JSON.parse(b); } catch {}
    console.log(q, extra, '|', r.status, (Date.now() - t) + 'ms', '| results', j.result_count ?? '-', '|', (j.results || []).slice(0, 4).map(x => `${x.source}:${x.license}:${(x.title || '').slice(0, 40)}`).join(' ; ') || b.slice(0, 160));
  } catch (e) { console.log(q, 'ERR', e.message, (Date.now() - t) + 'ms'); }
  await new Promise(r => setTimeout(r, 2000));
}
