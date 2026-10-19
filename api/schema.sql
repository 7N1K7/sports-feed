-- Kickoff Kiwi visitor stats. Counts only: no cookies, no IP addresses, nothing that identifies anyone.
-- daily: one row per day (NZ date), metric and key, e.g. ('2026-10-20', 'views', ''), ('2026-10-20', 'country', 'NZ')
CREATE TABLE IF NOT EXISTS daily (day TEXT NOT NULL, metric TEXT NOT NULL, key TEXT NOT NULL DEFAULT '', n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, metric, key));
-- seen: today's visitors as scrambled codes (a hash of the day's random salt, the address and the browser), so a
-- returning visitor isn't counted twice in a day; kept two days, then deleted along with the salt
CREATE TABLE IF NOT EXISTS seen (day TEXT NOT NULL, h TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, h));
CREATE TABLE IF NOT EXISTS salt (day TEXT PRIMARY KEY, v TEXT NOT NULL);
