for (const c of ['nz', 'au', 'gb-eng', 'fj', 'ck', 'in', 'ch'])
  { const t = await (await fetch(`https://flagcdn.com/${c}.svg`)).text(); console.log(c, t.length, t.slice(0, 160).replace(/\n/g, ' ')); }
