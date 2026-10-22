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

The ten generated assignment evidence files are in the repository-root `submission_evidence/` directory. The GitHub metadata evidence records the repository's actual fork status; this repository currently is not marked as a fork.
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
    [Parameter(Mandatory = $true)][string[]]$CurlArgs,
    [string]$Body,
    [string]$Command
  )
  if (-not $Command) { $Command = 'curl.exe ' + ($CurlArgs -join ' ') }
  $captureArgs = $CurlArgs + @('-w', "`nHTTP_STATUS:%{http_code}`n")
  if ($PSBoundParameters.ContainsKey('Body')) {
    $response = $Body | & curl.exe @captureArgs
  } else {
    $response = & curl.exe @captureArgs
  }
  if ($LASTEXITCODE -ne 0) { throw "cURL failed: $Command" }
  @("COMMAND: $Command", 'RESPONSE:') + $response |
    Set-Content -Encoding utf8 -Path $File
  $response
}
$evidenceDirectory = '..\submission_evidence'
```

### GitHub fork information

The repository used for this project is `12411018/expressBookReviews`. Its GitHub API metadata reports `"fork": false` and does not include parent-repository metadata, so it is **not verified as a fork** of the IBM starter. The assignment's original URL, `https://github.com/ibm-developer-skills-network/expressBookReview` (singular), returned HTTP 404 during verification. The saved evidence contains the actual response for the user's repository; do not represent it as a fork.

```powershell
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'githubrepo') -CurlArgs @('-sS', '-L', 'https://api.github.com/repos/12411018/expressBookReviews')
```

The API response includes the repository's `full_name`, `fork`, and `parent` fields.

### Public book routes

```powershell
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'getallbooks') -CurlArgs @('-sS', 'http://localhost:5000/')
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'getbooksbyISBN') -CurlArgs @('-sS', 'http://localhost:5000/isbn/1')
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'getbooksbyauthor') -CurlArgs @('-sS', 'http://localhost:5000/author/Chinua%20Achebe')
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'getbooksbytitle') -CurlArgs @('-sS', 'http://localhost:5000/title/Things%20Fall%20Apart')
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'getbookreview') -CurlArgs @('-sS', 'http://localhost:5000/review/1')
```

Expected data: `/` returns a JSON object keyed by IDs, including `"1":{"author":"Chinua Achebe","title":"Things Fall Apart","reviews":{}}`; `/isbn/1` returns that single book; the author and title searches return a keyed object containing that book; initial `/review/1` returns `{}`.

### Register, log in, and change a review

Use a unique username if you have already registered one since the server last started. The cookie jar created during login is used by the authenticated review requests.

```powershell
$evidenceUsername = 'coursera-reader'
$evidencePassword = Read-Host 'Enter a unique test password (8+ characters)' -AsSecureString
$evidencePasswordPlain = [System.Net.NetworkCredential]::new('', $evidencePassword).Password
$registerBody = @{ username = $evidenceUsername; password = $evidencePasswordPlain } | ConvertTo-Json -Compress
$registerCommand = "`$registerBody | curl.exe -sS -X POST 'http://localhost:5000/register' -H 'Content-Type: application/json' --data-binary '@-' -w '`nHTTP_STATUS:%{http_code}`n'"
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'register') -CurlArgs @('-sS', '-X', 'POST', 'http://localhost:5000/register', '-H', 'Content-Type: application/json', '--data-binary', '@-') -Body $registerBody -Command $registerCommand
$loginBody = @{ username = $evidenceUsername; password = $evidencePasswordPlain } | ConvertTo-Json -Compress
$cookieJar = Join-Path $env:TEMP 'customer-cookies.txt'
$loginCommand = "`$loginBody | curl.exe -sS -c '$cookieJar' -X POST 'http://localhost:5000/customer/login' -H 'Content-Type: application/json' --data-binary '@-' -w '`nHTTP_STATUS:%{http_code}`n'"
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'login') -CurlArgs @('-sS', '-c', $cookieJar, '-X', 'POST', 'http://localhost:5000/customer/login', '-H', 'Content-Type: application/json', '--data-binary', '@-') -Body $loginBody -Command $loginCommand
$reviewBody = @{ review = 'A thoughtful and memorable novel.' } | ConvertTo-Json -Compress
$reviewCommand = "`$reviewBody | curl.exe -sS -b '$cookieJar' -X PUT 'http://localhost:5000/customer/auth/review/1' -H 'Content-Type: application/json' --data-binary '@-' -w '`nHTTP_STATUS:%{http_code}`n'"
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'reviewadded') -CurlArgs @('-sS', '-b', $cookieJar, '-X', 'PUT', 'http://localhost:5000/customer/auth/review/1', '-H', 'Content-Type: application/json', '--data-binary', '@-') -Body $reviewBody -Command $reviewCommand
$deleteCommand = "curl.exe -sS -b '$cookieJar' -X DELETE 'http://localhost:5000/customer/auth/review/1' -w '`nHTTP_STATUS:%{http_code}`n'"
Save-CurlEvidence -File (Join-Path $evidenceDirectory 'deletereview') -CurlArgs @('-sS', '-b', $cookieJar, '-X', 'DELETE', 'http://localhost:5000/customer/auth/review/1') -Command $deleteCommand
Remove-Item $cookieJar -Force -ErrorAction SilentlyContinue
$evidencePasswordPlain = $null
$registerBody = $null
$loginBody = $null
$reviewBody = $null
```

Expected successful response shapes are `{"message":"User registered successfully."}`, `{"message":"Login successful.","username":"..."}`, `{"message":"Review added or updated successfully."}`, and `{"message":"Review deleted successfully."}`. The responses are generated by the running application. Do not include passwords in evidence or screenshots.

Required evidence filenames (without extensions) in `submission_evidence/`:

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

## GitHub repository and submission

The configured `origin` is `https://github.com/12411018/expressBookReviews.git`, and the checked-out branch is `main`. The evidence and this README can be pushed from the repository root:

```powershell
git remote -v
git add final_project/README.md submission_evidence/
git diff --cached --check
git commit -m "Add Coursera submission evidence"
git push origin main
```

The current branch and tracked path resolve to `https://github.com/12411018/expressBookReviews/blob/main/final_project/router/general.js`.

**Fork requirement:** GitHub currently reports `fork: false` for this repository. The assignment's stated upstream URL returned 404 when checked. Verify the intended upstream repository with Coursera before submission; this repository cannot be described as an IBM fork based on its current metadata.
