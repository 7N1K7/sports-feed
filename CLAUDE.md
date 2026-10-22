# Kickoff Kiwi

Free NZ sports site (https://kickoff.kiwi): kick-off times in NZ time for every NZ team, where to watch, results
behind a spoiler guard, no sign-up. Static GitHub Pages site plus a small Cloudflare stats Worker.

## Layout
- `index.html` — the whole site (HTML, CSS, JS in one file). `stats.html` — private stats page.
- `scripts/fetch.mjs` (+ `sources.mjs`, `rankings.mjs`) — builds `data/feed.json` in CI from free sources
  (Wikipedia, TheSportsDB, ESPN etc). `data/curated/*.json` — hand-kept fixtures; `data/broadcast.json` — where-to-watch
  rules (first match wins; `au` adds the In Australia list).
- `api/worker.js` — stats server (Cloudflare Worker + D1), deployed by `.github/workflows/api.yml` when `api/` changes.
  New counted events must be added to its `EVENTS`/`KEYED` lists and to `stats.html`.
- `.github/workflows/update.yml` — builds the feed and deploys the site; the version shown (vN) is the commit count.

## Working
- Push straight to `main`: `git fetch -q origin main && (git merge-base --is-ancestor origin/main HEAD || git rebase -q origin/main) && git push -q origin main`.
  Tell the user the version: `gh api -i "repos/7N1K7/sports-feed/commits?sha=main&per_page=1" | grep -o 'page=[0-9]*>; rel="last"'`.
- Test in a local copy with Playwright (Chromium at `/opt/pw-browsers/...`), served by `python3 -m http.server`; check
  phone (412px, 360px), compact desktop (~700–900px) and full desktop. Screenshot changes before pushing.
- Outside sites are blocked in the cloud container: read them through the `probe` branch (edit `probe/probe.mjs`, push,
  read `probe/out.txt`). Probe output is public: never print secrets. Browser probes of kickoff.kiwi set
  `localStorage sf.nocount=true` so they don't count as visits.
- After a big addition of data or a filled gap, add a line to `ADDED` in `stats.html` (the coverage hub).
- A new sport gets its own word for one event (`EV_WORD` in index.html: a race, a fight, a match, a tournament; a game
  otherwise) and its start's name (`START_LABEL`: Kick-off, First ball, Lights out), so labels never say "game" for a race.
- No test suite; `node --check` the scripts.

## The user's rules
- Nothing static moves when toggling, paging, opening or resizing (fixed widths, reserved space, same row counts).
- Prefer small, compact buttons; even rows (balanced chip rows); centred where things are centred.
- Images only from sources whose terms allow it (TheSportsDB, free-licence Wikimedia Commons), credited. A grey sport
  icon stands in for a missing logo.
- No scores anywhere spoilers would show them; hover labels only after a deliberate hold.
- Keep the owner's name and email out of anything public. No model names in commits.
- Report what changed and the version number; say plainly what's unverified.
