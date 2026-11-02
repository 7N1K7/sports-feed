import { writeFileSync } from 'fs';
const h = await (await fetch('https://kickoff.kiwi/?x=' + Date.now())).text();
writeFileSync('probe/out.txt', ['spoilAt ' + h.includes('const spoilAt = e =>'), 'lres li ' + h.includes("--li: calc(99px + var(--lcw, 0px)); --cl: calc(var(--lw) + 18px); --cr: 93px }")].join('\n') + '\n');
