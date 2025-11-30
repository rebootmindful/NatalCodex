async function withRetry(fn, max = 5, baseMs = 1000) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try { return await fn(); }
    catch (e) { attempt++; if (attempt >= max) throw e; const wait = baseMs * Math.pow(2, attempt - 1); await new Promise(r => setTimeout(r, wait)); }
  }
}
module.exports = { withRetry };

