// Copies wrangler's output to the (public) GitHub log with the workers.dev address and email addresses hidden
let s = '';
process.stdin.on('data', d => { s += d; }).on('end', () => {
  process.stdout.write(s.replace(/[a-z0-9-]+\.workers\.dev/gi, '(account).workers.dev').replace(/[\w.%+-]+@[\w-]+(\.[\w-]+)+/g, '(email)').replace(/\S+'s Account/g, "(owner)'s Account"));
});
