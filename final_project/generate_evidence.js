/**
 * Evidence generator for Coursera Express Book Reviews submission.
 * Run from: node generate_evidence.js (inside final_project folder)
 */
const fs = require('node:fs');
const path = require('node:path');
const app = require('./index.js');

const EVIDENCE_DIR = path.resolve(__dirname, '..', 'submission_evidence');
fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

function write(name, content) {
  const file = path.join(EVIDENCE_DIR, name);
  fs.writeFileSync(file, content, 'utf8');
  console.log('  wrote:', file);
}

function fmt(label, method, url, statusCode, body) {
  return [
    `=== ${label} ===`,
    `COMMAND: ${method} ${url}`,
    `HTTP_STATUS: ${statusCode}`,
    `RESPONSE BODY:`,
    typeof body === 'string' ? body : JSON.stringify(body, null, 2),
    ''
  ].join('\n');
}

async function run() {
  const server = app.listen(0);
  await new Promise((res) => server.once('listening', res));
  const base = `http://127.0.0.1:${server.address().port}`;
  console.log('Server listening at', base);

  try {
    // ── GET all books ──────────────────────────────────────────────────────────
    let r = await fetch(`${base}/`);
    const allBooks = await r.json();
    write('getallbooks.txt', fmt('GET All Books', 'GET', `${base}/`, r.status, allBooks));

    // ── GET by ISBN ────────────────────────────────────────────────────────────
    r = await fetch(`${base}/isbn/1`);
    write('getbooksbyISBN.txt', fmt('GET Book by ISBN', 'GET', `${base}/isbn/1`, r.status, await r.json()));

    // ── GET by author ──────────────────────────────────────────────────────────
    r = await fetch(`${base}/author/Chinua%20Achebe`);
    write('getbooksbyauthor.txt', fmt('GET Books by Author', 'GET', `${base}/author/Chinua%20Achebe`, r.status, await r.json()));

    // ── GET by title ───────────────────────────────────────────────────────────
    r = await fetch(`${base}/title/Things%20Fall%20Apart`);
    write('getbooksbytitle.txt', fmt('GET Books by Title', 'GET', `${base}/title/Things%20Fall%20Apart`, r.status, await r.json()));

    // ── GET review (initial empty) ─────────────────────────────────────────────
    r = await fetch(`${base}/review/1`);
    write('getbookreview.txt', fmt('GET Book Review (initial)', 'GET', `${base}/review/1`, r.status, await r.json()));

    // ── Register ───────────────────────────────────────────────────────────────
    r = await fetch(`${base}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'courseraevidence', password: 'BookReview123!' })
    });
    write('register.txt', fmt('POST Register', 'POST', `${base}/register`, r.status, await r.json()));

    // ── Login ──────────────────────────────────────────────────────────────────
    r = await fetch(`${base}/customer/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'courseraevidence', password: 'BookReview123!' })
    });
    const cookie = r.headers.get('set-cookie').split(';')[0];
    const loginBody = await r.json();
    write('login.txt', fmt('POST Login', 'POST', `${base}/customer/login`, r.status, loginBody) +
      `[Session cookie set in Set-Cookie response header. Value not recorded for security.]\n`);

    // ── Add review ─────────────────────────────────────────────────────────────
    r = await fetch(`${base}/customer/auth/review/1`, {
      method: 'PUT',
      headers: { Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ review: 'A powerful and moving account of cultural collision — essential reading.' })
    });
    const reviewAdded = await r.json();

    // Verify review visible on public endpoint
    const rvr = await fetch(`${base}/review/1`);
    const reviews = await rvr.json();
    write('reviewadded.txt',
      fmt('PUT Add Review', 'PUT', `${base}/customer/auth/review/1`, r.status, reviewAdded) +
      '\n--- Verification: GET /review/1 after PUT ---\n' +
      `HTTP_STATUS: ${rvr.status}\nRESPONSE BODY:\n${JSON.stringify(reviews, null, 2)}\n`);

    // ── Delete review ──────────────────────────────────────────────────────────
    r = await fetch(`${base}/customer/auth/review/1`, {
      method: 'DELETE',
      headers: { Cookie: cookie }
    });
    const deleted = await r.json();

    // Confirm review is gone
    const rvr2 = await fetch(`${base}/review/1`);
    const reviews2 = await rvr2.json();
    write('deletereview.txt',
      fmt('DELETE Review', 'DELETE', `${base}/customer/auth/review/1`, r.status, deleted) +
      '\n--- Verification: GET /review/1 after DELETE ---\n' +
      `HTTP_STATUS: ${rvr2.status}\nRESPONSE BODY:\n${JSON.stringify(reviews2, null, 2)}\n`);

    // ── GitHub repo info ───────────────────────────────────────────────────────
    write('githubrepo.txt', [
      '=== GitHub Repository ===',
      '',
      'Repository URL:',
      '  https://github.com/12411018/expressBookReviews',
      '',
      'general.js public URL:',
      '  https://github.com/12411018/expressBookReviews/blob/main/final_project/router/general.js',
      '',
      'GitHub API metadata (as of audit 2026-10-24):',
      '  full_name : 12411018/expressBookReviews',
      '  fork      : false',
      '  parent    : null',
      '',
      'WARNING: This repository was NOT forked from ibm-developer-skills-network/expressBookReviews.',
      'It contains identical working code but GitHub records fork=false.',
      'See course staff for guidance on re-forking if required.',
      ''
    ].join('\n'));

    console.log('\nAll evidence files written to:', EVIDENCE_DIR);
    console.log('Files:');
    fs.readdirSync(EVIDENCE_DIR).forEach(f => console.log(' ', f));

  } finally {
    await new Promise((res, rej) => server.close(e => e ? rej(e) : res()));
  }
}

run().catch(e => { console.error(e); process.exit(1); });
