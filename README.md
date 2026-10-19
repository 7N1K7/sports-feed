# Kickoff Kiwi

What's on today and this week for New Zealand teams (All Blacks, Black Ferns, NPC, Super Rugby, Black Caps, White Ferns, domestic cricket, Kiwis, Kiwi Ferns, Warriors), with NZ and local start times, where to watch, results with spoiler hiding, and news.

- `index.html` is the whole site. It reads `data/feed.json`.
- `scripts/fetch.mjs` builds `data/feed.json` every 10 minutes from Wikipedia season pages (fixtures and results, listed in `data/wiki-pages.json`), TheSportsDB's free API (A-League, NRL and Super Rugby rounds, UFC, team logos), and the hand-kept files in `data/curated/` and `data/broadcast.json`. RNZ's sport RSS is off (`RNZ_ON` in `scripts/fetch.mjs`): its terms don't allow posting it on a website without RNZ's permission. Cricket's live state of play (rain delays, lunch, stumps) and score come from ESPN's score-strip feed (`ESPN_ON`); ESPN's terms don't allow automated access without permission, and the owner chose to use it on this non-commercial site. The sources in use allow automated use; Wikipedia content is CC BY-SA and is credited in the page footer.
- `.github/workflows/update.yml` runs the fetcher every 10 minutes and publishes to GitHub Pages.

To follow a new competition, add its Wikipedia page to `data/wiki-pages.json`. To add a fixture none of the sources carry, add it to a file in `data/curated/`. To change where-to-watch defaults, edit `data/broadcast.json`.
