const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');
const { once } = require('node:events');
const { createServer } = require('node:http');
const app = require('../index.js');
const {
  getAllBooks,
  getBookByISBN,
  getBooksByAuthor,
  getBooksByTitle,
  getBookReview
} = require('../router/general.js');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test('book search, registration, session authentication, and review lifecycle', async () => {
  const allBooksResponse = await fetch(`${baseUrl}/`);
  assert.equal(allBooksResponse.status, 200);
  const allBooks = await allBooksResponse.json();
  assert.equal(Object.keys(allBooks).length, 10);
  assert.equal(allBooks['1'].title, 'Things Fall Apart');

  const isbnResponse = await fetch(`${baseUrl}/isbn/1`);
  assert.equal(isbnResponse.status, 200);
  assert.equal((await isbnResponse.json()).author, 'Chinua Achebe');

  const authorResponse = await fetch(`${baseUrl}/author/chinua%20achebe`);
  assert.equal(authorResponse.status, 200);
  assert.equal((await authorResponse.json())['1'].author, 'Chinua Achebe');

  const titleResponse = await fetch(`${baseUrl}/title/Things%20Fall%20Apart`);
  assert.equal(titleResponse.status, 200);
  assert.equal((await titleResponse.json())['1'].title, 'Things Fall Apart');

  const encodedTitleResponse = await fetch(
    `${baseUrl}/title/${encodeURIComponent("Njál's Saga")}`
  );
  assert.equal((await encodedTitleResponse.json())['7'].title, "Njál's Saga");

  const initialReviewsResponse = await fetch(`${baseUrl}/review/1`);
  assert.deepEqual(await initialReviewsResponse.json(), {});

  const missingBookResponse = await fetch(`${baseUrl}/isbn/unknown`);
  assert.equal(missingBookResponse.status, 404);

  const username = `reader${process.pid}`;
  const missingFieldsResponse = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  assert.equal(missingFieldsResponse.status, 400);

  const registrationResponse = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'BookReview123!' })
  });
  assert.equal(registrationResponse.status, 201);

  const duplicateResponse = await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'BookReview123!' })
  });
  assert.equal(duplicateResponse.status, 409);

  const invalidLoginResponse = await fetch(`${baseUrl}/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'WrongPassword123!' })
  });
  assert.equal(invalidLoginResponse.status, 401);

  const loginResponse = await fetch(`${baseUrl}/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'BookReview123!' })
  });
  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers.get('set-cookie').split(';')[0];

  const unauthorizedResponse = await fetch(`${baseUrl}/customer/auth/review/1`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ review: 'Not signed in.' })
  });
  assert.equal(unauthorizedResponse.status, 401);

  const reviewResponse = await fetch(`${baseUrl}/customer/auth/review/1`, {
    method: 'PUT',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ review: 'A thoughtful and memorable novel.' })
  });
  assert.equal(reviewResponse.status, 200);

  const updateResponse = await fetch(`${baseUrl}/customer/auth/review/1`, {
    method: 'PUT',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ review: 'Updated review.' })
  });
  assert.equal(updateResponse.status, 200);

  const reviewsResponse = await fetch(`${baseUrl}/review/1`);
  assert.equal((await reviewsResponse.json())[username], 'Updated review.');

  const secondUsername = `readerTwo${process.pid}`;
  await fetch(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: secondUsername, password: 'BookReview123!' })
  });
  const secondLoginResponse = await fetch(`${baseUrl}/customer/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: secondUsername, password: 'BookReview123!' })
  });
  const secondCookie = secondLoginResponse.headers.get('set-cookie').split(';')[0];
  const otherUserDeleteResponse = await fetch(`${baseUrl}/customer/auth/review/1`, {
    method: 'DELETE',
    headers: { Cookie: secondCookie }
  });
  assert.equal(otherUserDeleteResponse.status, 404);

  const deleteResponse = await fetch(`${baseUrl}/customer/auth/review/1`, {
    method: 'DELETE',
    headers: { Cookie: cookie }
  });
  assert.equal(deleteResponse.status, 200);

  const reviewsAfterDelete = await fetch(`${baseUrl}/review/1`);
  assert.deepEqual(await reviewsAfterDelete.json(), {});
});

test('all five book retrieval functions use the configured Axios API', async () => {
  const requests = [];
  const responseBodies = {
    '/books': { '1': { author: 'Remote Author', title: 'Remote Title', reviews: {} } },
    '/isbn/1': { author: 'Remote Author', title: 'Remote Title', reviews: {} },
    '/author?author=Remote+Author': { '1': { author: 'Remote Author', title: 'Remote Title', reviews: {} } },
    '/title?title=Remote+Title': { '1': { author: 'Remote Author', title: 'Remote Title', reviews: {} } },
    '/review/1': { reviewer: 'Remote review' }
  };
  const mockApi = createServer((req, res) => {
    requests.push(`${req.url}`);
    const body = responseBodies[req.url];
    if (!body) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ message: 'Not found' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(body));
  });

  mockApi.listen(0, '127.0.0.1');
  await once(mockApi, 'listening');
  const previousBaseUrl = process.env.BOOKS_API_BASE_URL;
  process.env.BOOKS_API_BASE_URL = `http://127.0.0.1:${mockApi.address().port}`;

  try {
    assert.deepEqual(await getAllBooks(), responseBodies['/books']);
    assert.deepEqual(await getBookByISBN('1'), responseBodies['/isbn/1']);
    assert.deepEqual(await getBooksByAuthor('Remote Author'), responseBodies['/author?author=Remote+Author']);
    assert.deepEqual(await getBooksByTitle('Remote Title'), responseBodies['/title?title=Remote+Title']);
    assert.deepEqual(await getBookReview('1'), responseBodies['/review/1']);
    assert.deepEqual(requests, [
      '/books',
      '/isbn/1',
      '/author?author=Remote+Author',
      '/title?title=Remote+Title',
      '/review/1'
    ]);
  } finally {
    if (previousBaseUrl === undefined) {
      delete process.env.BOOKS_API_BASE_URL;
    } else {
      process.env.BOOKS_API_BASE_URL = previousBaseUrl;
    }
    await new Promise((resolve, reject) => {
      mockApi.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
