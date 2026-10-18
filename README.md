# Sports Feed

What's on today and this week for New Zealand teams (All Blacks, Black Ferns, NPC, Super Rugby, Black Caps, White Ferns, domestic cricket, Kiwis, Kiwi Ferns, Warriors), with NZ and local start times, where to watch, results with spoiler hiding, and news.

- `index.html` is the whole site. It reads `data/feed.json`.
- `scripts/fetch.mjs` builds `data/feed.json` every 10 minutes from Wikipedia season pages (fixtures and results, listed in `data/wiki-pages.json`), TheSportsDB's free API (A-League, NRL and Super Rugby rounds, UFC, team logos), RNZ's sport RSS (news), and the hand-kept files in `data/curated/` and `data/broadcast.json`. All of these allow automated use; Wikipedia content is CC BY-SA and is credited in the page footer.
- `.github/workflows/update.yml` runs the fetcher every 10 minutes and publishes to GitHub Pages.

To follow a new competition, add its Wikipedia page to `data/wiki-pages.json`. To add a fixture none of the sources carry, add it to a file in `data/curated/`. To change where-to-watch defaults, edit `data/broadcast.json`.
