// probe 113: TheSportsDB's F1 and Supercars sessions for coming weekends (free key)
const get = async p => (await (await fetch('https://www.thesportsdb.com/api/v1/json/123/' + p)).json());
for (const [id, r] of [[4370, 18], [4370, 19], [4370, 20], [4489, 12], [4489, 13], [4489, 14]]) {
  const d = await get(`eventsround.php?id=${id}&r=${r}&s=2026`);
  console.log(`\n${id} round ${r}: ${(d.events || []).length} events`);
  for (const e of d.events || []) console.log('  ', e.strEvent, '|', e.strTimestamp, '|', e.dateEvent, e.strTime, '| status', e.strStatus, '| result', (e.strResult || '').slice(0, 60).replace(/\s+/g, ' '), '| venue', e.strVenue);
  await new Promise(r => setTimeout(r, 2500));
}
