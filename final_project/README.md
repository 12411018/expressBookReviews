# Express Book Review API

This project completes the IBM Developer Skills Network `expressBookReviews` starter. It keeps the starter's ten book records and public route names. The starter provides book identifiers `1` through `10`; those values are used as the assignment's `isbn` route parameter.

## Project files

```text
final_project/
|-- index.js
|-- package.json
|-- router/
|   |-- auth_users.js
|   |-- booksdb.json
|   `-- general.js
`-- test/
    `-- api.test.js
```

`router/booksdb.json` is the source of book metadata and initial reviews. Review changes, registered users, and login sessions are held in memory and disappear when the process restarts. This project does not provide durable storage, transactions, or cross-process synchronization.

The retrieval functions in `router/general.js` are asynchronous. They read the supplied local JSON data by default, avoiding unnecessary HTTP calls back into the same server. If `BOOKS_API_BASE_URL` is deliberately configured, those same functions use Axios against that external-compatible API (`GET /books`, `/isbn/:isbn`, `/author?author=...`, `/title?title=...`, and `/review/:isbn`). Leave the setting unset to use the supplied JSON file.

Passwords are salted and hashed with Node.js `scrypt`. Login creates an HTTP-only session cookie; the cookie is required for protected review changes.

## Install and run

Run these commands in a VS Code terminal on Windows:

```powershell
cd .\final_project
npm install
npm test
npm start
```

The API listens on port `5000` by default. Set `PORT` to change it. In production, set `SESSION_SECRET` to a long random value and serve over HTTPS; `secure` cookies are enabled when `NODE_ENV=production`.

## Routes

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | All books |
| GET | `/isbn/:isbn` | One book |
| GET | `/author/:author` | Exact, case-insensitive author search |
| GET | `/title/:title` | Exact, case-insensitive title search |
| GET | `/review/:isbn` | Reviews for a book |
| POST | `/register` | Register username and password |
| POST | `/customer/login` | Log in and receive session cookie |
| POST | `/customer/logout` | End current session |
| PUT | `/customer/auth/review/:isbn` | Add or replace your own review |
| DELETE | `/customer/auth/review/:isbn` | Delete your own review |

Registration requires a 3-32 character username containing letters, numbers, dots, underscores, or hyphens, and a password of at least 8 characters. Review text must contain 1-2000 characters. Invalid bodies return `400`; duplicate usernames return `409`; bad credentials or absent authentication return `401`; unknown books return `404`.

## cURL tests and assignment evidence

Run the following in PowerShell after starting the server. Use `curl.exe` (not PowerShell's historical `curl` alias). The commands use the real starter IDs and records. Each evidence file below records the command and the response returned when you run it; the response is not pre-filled or invented.

First create a helper in the same PowerShell terminal. It runs cURL, prints the actual response, and writes both the exact command and response to the requested evidence filename:

```powershell
function Save-CurlEvidence {
  param(
    [Parameter(Mandatory = $true)][string]$File,
    [Parameter(Mandatory = $true)][string[]]$CurlArgs
  )
  $command = 'curl.exe ' + ($CurlArgs -join ' ')
  $response = & curl.exe @CurlArgs
  if ($LASTEXITCODE -ne 0) { throw "cURL failed: $command" }
  @("COMMAND: $command", 'RESPONSE:') + $response |
    Set-Content -Encoding utf8 -Path $File
  $response
}
```

### GitHub fork information

Fork `https://github.com/ibm-developer-skills-network/expressBookReviews` into your own GitHub account first. Replace `YOUR_GITHUB_USERNAME` below with your real username. A fork's repository API response has a `parent` entry naming the upstream repository.

```powershell
Save-CurlEvidence -File githubrepo -CurlArgs @('-sS', '-L', 'https://api.github.com/repos/YOUR_GITHUB_USERNAME/expressBookReviews')
```

Expected response shape: a GitHub repository JSON object with `"full_name"` set to your fork and `"parent":{"full_name":"ibm-developer-skills-network/expressBookReviews", ...}`. The actual account name and response depend on your fork.

### Public book routes

```powershell
Save-CurlEvidence -File getallbooks -CurlArgs @('-sS', 'http://localhost:5000/')
Save-CurlEvidence -File getbooksbyISBN -CurlArgs @('-sS', 'http://localhost:5000/isbn/1')
Save-CurlEvidence -File getbooksbyauthor -CurlArgs @('-sS', 'http://localhost:5000/author/Chinua%20Achebe')
Save-CurlEvidence -File getbooksbytitle -CurlArgs @('-sS', 'http://localhost:5000/title/Things%20Fall%20Apart')
Save-CurlEvidence -File getbookreview -CurlArgs @('-sS', 'http://localhost:5000/review/1')
```

Expected data: `/` returns a JSON object keyed by IDs, including `"1":{"author":"Chinua Achebe","title":"Things Fall Apart","reviews":{}}`; `/isbn/1` returns that single book; the author and title searches return a keyed object containing that book; initial `/review/1` returns `{}`.

### Register, log in, and change a review

Use a unique username if you have already registered one since the server last started. The cookie jar created during login is used by the authenticated review requests.

```powershell
Save-CurlEvidence -File register -CurlArgs @('-sS', '-X', 'POST', 'http://localhost:5000/register', '-H', 'Content-Type: application/json', '-d', '{"username":"bookreader1","password":"BookReview123!"}')
Save-CurlEvidence -File login -CurlArgs @('-sS', '-c', 'customer-cookies.txt', '-X', 'POST', 'http://localhost:5000/customer/login', '-H', 'Content-Type: application/json', '-d', '{"username":"bookreader1","password":"BookReview123!"}')
Save-CurlEvidence -File reviewadded -CurlArgs @('-sS', '-b', 'customer-cookies.txt', '-X', 'PUT', 'http://localhost:5000/customer/auth/review/1', '-H', 'Content-Type: application/json', '-d', '{"review":"A thoughtful and memorable novel."}')
Save-CurlEvidence -File deletereview -CurlArgs @('-sS', '-b', 'customer-cookies.txt', '-X', 'DELETE', 'http://localhost:5000/customer/auth/review/1')
```

Expected successful response shapes are `{"message":"User registered successfully."}`, `{"message":"Login successful.","username":"bookreader1"}`, `{"message":"Review added or updated successfully."}`, and `{"message":"Review deleted successfully."}`. The responses are generated by the running application. Do not include passwords in evidence or screenshots.

Required evidence filenames (without extensions):

```text
githubrepo
getallbooks
getbooksbyISBN
getbooksbyauthor
getbooksbytitle
getbookreview
register
login
reviewadded
deletereview
```

The login command also creates `customer-cookies.txt`; it contains an authentication cookie and should not be submitted publicly.

## Fork, clone, commit, and push

1. On GitHub, open the upstream repository and choose **Fork**.
2. Clone your fork (replace the placeholder):

   ```powershell
   git clone https://github.com/YOUR_GITHUB_USERNAME/expressBookReviews.git
   cd .\expressBookReviews\final_project
   ```

3. Open the cloned repository in VS Code with `code ..`.
4. Install dependencies and run tests/server using the commands above.
5. From the repository root, check and set the fork as `origin` if needed:

   ```powershell
   cd ..
   git remote -v
   git remote set-url origin https://github.com/YOUR_GITHUB_USERNAME/expressBookReviews.git
   git add final_project .gitignore
   git commit -m "Complete Express book review API"
   git push -u origin main
   ```

   If your fork's default branch is not `main`, use the branch shown by `git branch --show-current`.

6. The direct `general.js` URL is `https://github.com/YOUR_GITHUB_USERNAME/expressBookReviews/blob/main/final_project/router/general.js` (replace the username and branch with your actual values). You can obtain the exact URL by opening that file in your fork and copying its browser address.

Do not claim the project is forked, pushed, or tested on GitHub until you have completed those steps.
