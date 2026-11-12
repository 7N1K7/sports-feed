// 13 Nov: TheSportsDB's NBA logo, for a local mock-up
import { writeFileSync } from 'fs';
const r = await fetch('https://r2.thesportsdb.com/images/media/league/badge/frdjqy1536585083.png/small');
writeFileSync('probe/out-nbalogo.png', Buffer.from(await r.arrayBuffer()));
