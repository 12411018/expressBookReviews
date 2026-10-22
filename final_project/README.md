# Express Book Review API

This project completes the IBM Developer Skills Network Express Book Review starter while preserving its ten supplied records and route conventions.

## Project files

```text
final_project/
|-- index.js
|-- package.json
|-- router/
|   |-- auth_users.js
|   |-- booksdb.json
|   `-- general.js
|-- submission_evidence/
`-- test/
    `-- api.test.js
```

The supplied dataset has identifiers `1` through `10`, not ISBN fields. Those identifiers are the values accepted by the starter's `/isbn/:isbn` and `/review/:isbn` routes. The book metadata and initial review objects are in `router/booksdb.json`; the initial review objects are empty. The API does not invent ISBNs or initial review text.

The five async retrieval functions in `router/general.js` use Axios against the API specified by `BOOKS_API_BASE_URL` when that variable is set. With the setting unset, the Express endpoints read the supplied local JSON data directly, avoiding unnecessary requests back into the same server. Axios failures are allowed to reach the API's error handler instead of returning local data as a fake success.

User registrations, sessions, and review changes are in memory and are lost when the server restarts. Passwords are salted and hashed with Node.js `scrypt`. Review changes require the login session cookie.

## Install, test, and start

Run these commands in a VS Code PowerShell terminal:

```powershell
cd .\final_project
npm install
npm test
npm start
```

The API listens on port `5000` by default. `PORT` can change it. Set a strong `SESSION_SECRET` and use HTTPS for production; secure cookies are enabled when `NODE_ENV=production`.

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Return all books |
| GET | `/isbn/:isbn` | Return one book by supplied dataset identifier |
| GET | `/author/:author` | Exact, case-insensitive author search |
| GET | `/title/:title` | Exact, case-insensitive title search |
| GET | `/review/:isbn` | Return reviews for a supplied dataset identifier |
| POST | `/register` | Register a username and password |
| POST | `/customer/login` | Log in and receive a session cookie |
| POST | `/customer/logout` | End the current session |
| PUT | `/customer/auth/review/:isbn` | Add or update your review |
| DELETE | `/customer/auth/review/:isbn` | Delete your review |

Registration requires a 3–32 character username containing letters, numbers, dots, underscores, or hyphens, and a password of at least 8 characters. Review text must contain 1–2000 characters. Invalid input returns `400`, duplicate usernames return `409`, invalid credentials or unauthenticated review changes return `401`, and unknown books return `404`.

## Submission evidence

The ten evidence files are in this directory, `final_project/submission_evidence/`. Each includes the executed command and its actual response, with HTTP status codes. The private test password and cookie values are not included.

The GitHub API metadata for `12411018/expressBookReviews` reports `"fork": false` and no parent repository. It is not verified as a fork of IBM. The exact assignment URL `ibm-developer-skills-network/expressBookReview` returned 404 when checked. The supplied dataset contains numeric IDs rather than ISBN values, and its initial reviews are empty; the evidence documents those actual results.

To reproduce the public book requests after starting the server, use:

```powershell
curl.exe -sS http://localhost:5000/
curl.exe -sS http://localhost:5000/isbn/1
curl.exe -sS "http://localhost:5000/author/Chinua%20Achebe"
curl.exe -sS "http://localhost:5000/title/Things%20Fall%20Apart"
curl.exe -sS http://localhost:5000/review/1
```

The review routes require a registered user and session cookie. Register at `POST /register` with JSON `{ "username": "...", "password": "..." }`, then log in at `POST /customer/login` with the same JSON and retain the `connect.sid` cookie outside the evidence directory. Send review changes to `PUT /customer/auth/review/1` with JSON `{ "review": "..." }`; delete with `DELETE /customer/auth/review/1`. The Q7–Q10 evidence files contain the actual authenticated request sequence and its responses.

## GitHub

The configured remote is `https://github.com/12411018/expressBookReviews.git`, on branch `main`. The Question 11 source URL is:

https://github.com/12411018/expressBookReviews/blob/main/final_project/router/general.js

Commit and push intended project/evidence updates from the repository root:

```powershell
git add final_project/
git diff --cached --check
git commit -m "Improve Axios book retrieval and submission evidence"
git push origin main
```

Confirm the intended upstream/fork requirement with Coursera or the course staff before submission. The current repository metadata does not verify the IBM fork requirement.
