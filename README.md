# Sports Feed

What's on today and this week for New Zealand teams (All Blacks, Black Ferns, NPC, Super Rugby, Black Caps, White Ferns, domestic cricket, Kiwis, Kiwi Ferns, Warriors), with NZ and local start times, where to watch, results with spoiler hiding, and news.

- `index.html` is the whole site. It reads `data/feed.json`.
- `scripts/fetch.mjs` builds `data/feed.json` from ESPN's scoreboard (rugby and NRL scores), RNZ's sport RSS (news), and the hand-kept files in `data/curated/` and `data/broadcast.json`.
- `.github/workflows/update.yml` runs the fetcher every 10 minutes and publishes to GitHub Pages.

To add a fixture ESPN doesn't carry (Kiwis, Black Ferns, cricket), add it to a file in `data/curated/`. To change where-to-watch defaults, edit `data/broadcast.json`.
