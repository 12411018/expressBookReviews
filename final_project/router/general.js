const express = require('express');
const axios = require('axios');
const books = require('./booksdb.json');
const { registerUser, isValid } = require('./auth_users.js');
const public_users = express.Router();

const clone = (value) => JSON.parse(JSON.stringify(value));

async function getRemoteBooks(path, params) {
  const baseURL = process.env.BOOKS_API_BASE_URL;
  if (!baseURL) {
    return null;
  }

  const response = await axios.get(path, { baseURL, params, timeout: 5000 });
  return response.data;
}

async function getAllBooks() {
  const remoteBooks = await getRemoteBooks('/books');
  return clone(remoteBooks || books);
}

async function getBookByISBN(isbn) {
  const remoteBook = await getRemoteBooks(`/isbn/${encodeURIComponent(isbn)}`);
  if (remoteBook !== null) {
    return remoteBook;
  }
  return books[isbn] ? clone(books[isbn]) : null;
}

async function getBooksByAuthor(author) {
  const remoteBooks = await getRemoteBooks('/author', { author });
  if (remoteBooks !== null) {
    return remoteBooks;
  }

  const search = author.trim().toLocaleLowerCase();
  return Object.fromEntries(
    Object.entries(books)
      .filter(([, book]) => book.author.toLocaleLowerCase() === search)
      .map(([isbn, book]) => [isbn, clone(book)])
  );
}

async function getBooksByTitle(title) {
  const remoteBooks = await getRemoteBooks('/title', { title });
  if (remoteBooks !== null) {
    return remoteBooks;
  }

  const search = title.trim().toLocaleLowerCase();
  return Object.fromEntries(
    Object.entries(books)
      .filter(([, book]) => book.title.toLocaleLowerCase() === search)
      .map(([isbn, book]) => [isbn, clone(book)])
  );
}

async function getBookReview(isbn) {
  const remoteReviews = await getRemoteBooks(`/review/${encodeURIComponent(isbn)}`);
  if (remoteReviews !== null) {
    return remoteReviews;
  }
  return books[isbn] ? clone(books[isbn].reviews) : null;
}

public_users.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!isValid(username) || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        message: 'Provide a username (3-32 letters, numbers, dots, underscores, or hyphens) and a password of at least 8 characters.'
      });
    }

    if (await registerUser(username, password)) {
      return res.status(201).json({ message: 'User registered successfully.' });
    }

    return res.status(409).json({ message: 'Username is already registered.' });
  } catch (error) {
    next(error);
  }
});

public_users.get('/', async (req, res, next) => {
  try {
    return res.json(await getAllBooks());
  } catch (error) {
    next(error);
  }
});

public_users.get('/isbn/:isbn', async (req, res, next) => {
  try {
    const book = await getBookByISBN(req.params.isbn);
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    return res.json(book);
  } catch (error) {
    next(error);
  }
});

public_users.get('/author/:author', async (req, res, next) => {
  try {
    return res.json(await getBooksByAuthor(req.params.author));
  } catch (error) {
    next(error);
  }
});

public_users.get('/title/:title', async (req, res, next) => {
  try {
    return res.json(await getBooksByTitle(req.params.title));
  } catch (error) {
    next(error);
  }
});

public_users.get('/review/:isbn', async (req, res, next) => {
  try {
    const reviews = await getBookReview(req.params.isbn);
    if (reviews === null) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    return res.json(reviews);
  } catch (error) {
    next(error);
  }
});

module.exports = {
  general: public_users,
  getAllBooks,
  getBookByISBN,
  getBooksByAuthor,
  getBooksByTitle,
  getBookReview
};
