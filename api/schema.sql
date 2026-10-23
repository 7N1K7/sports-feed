-- Kickoff Kiwi visitor stats. Counts only: no cookies, no IP addresses, nothing that identifies anyone.
-- daily: one row per day (NZ date), metric and key, e.g. ('2026-10-20', 'views', ''), ('2026-10-20', 'country', 'NZ')
CREATE TABLE IF NOT EXISTS daily (day TEXT NOT NULL, metric TEXT NOT NULL, key TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, metric, key));
-- seen: today's visitors as scrambled codes (a hash of the day's random salt, the address and the browser), so a
-- returning visitor isn't counted twice in a day; kept two days, then deleted along with the salt
CREATE TABLE IF NOT EXISTS seen (day TEXT NOT NULL, h TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, h));
CREATE TABLE IF NOT EXISTS salt (day TEXT PRIMARY KEY, v TEXT NOT NULL);
-- opens: today's visits per visitor code (each open, or return after 10+ minutes away), so the stats can say how often
-- people come back in a day; kept two days like seen, then only the day's totals remain (metric 'repeat')
CREATE TABLE IF NOT EXISTS opens (day TEXT NOT NULL, h TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, h));
-- reports: what visitors sent with the site's "Report a problem" button: when, what it was about (a game's id and
-- name, or the site as a whole) and their words. Nothing about who sent it is kept
CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, kind TEXT NOT NULL, ref TEXT NOT NULL DEFAULT '', note TEXT NOT NULL);
