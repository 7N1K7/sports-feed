const f = await (await fetch('https://kickoff.kiwi/data/feed.json?y=' + Date.now())).json();
console.log('feed', f.generatedAt, 'age min', Math.round((Date.now() - Date.parse(f.generatedAt)) / 6e4), 'events', f.events.length);
console.log('checks', JSON.stringify(f.checks, null, 1).slice(0, 6000));
