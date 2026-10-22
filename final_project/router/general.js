const express = require('express');
const axios = require('axios');
const books = require('./booksdb.json');
const { registerUser, isValid } = require('./auth_users.js');
const public_users = express.Router();

const clone = (value) => JSON.parse(JSON.stringify(value));

async function getAllBooks() {
  if (process.env.BOOKS_API_BASE_URL) {
    const response = await axios.get('/books', {
      baseURL: process.env.BOOKS_API_BASE_URL,
      timeout: 5000
    });
    return response.data;
  }
  return clone(books);
}

async function getBookByISBN(isbn) {
  if (process.env.BOOKS_API_BASE_URL) {
    const response = await axios.get(`/isbn/${encodeURIComponent(isbn)}`, {
      baseURL: process.env.BOOKS_API_BASE_URL,
      timeout: 5000
    });
    return response.data;
  }
  return books[isbn] ? clone(books[isbn]) : null;
}

async function getBooksByAuthor(author) {
  if (process.env.BOOKS_API_BASE_URL) {
    const response = await axios.get('/author', {
      baseURL: process.env.BOOKS_API_BASE_URL,
      params: { author },
      timeout: 5000
    });
    return response.data;
  }

  const search = author.trim().toLocaleLowerCase();
  return Object.fromEntries(
    Object.entries(books)
      .filter(([, book]) => book.author.toLocaleLowerCase() === search)
      .map(([isbn, book]) => [isbn, clone(book)])
  );
}

async function getBooksByTitle(title) {
  if (process.env.BOOKS_API_BASE_URL) {
    const response = await axios.get('/title', {
      baseURL: process.env.BOOKS_API_BASE_URL,
      params: { title },
      timeout: 5000
    });
    return response.data;
  }

  const search = title.trim().toLocaleLowerCase();
  return Object.fromEntries(
    Object.entries(books)
      .filter(([, book]) => book.title.toLocaleLowerCase() === search)
      .map(([isbn, book]) => [isbn, clone(book)])
  );
}

async function getBookReview(isbn) {
  if (process.env.BOOKS_API_BASE_URL) {
    const response = await axios.get(`/review/${encodeURIComponent(isbn)}`, {
      baseURL: process.env.BOOKS_API_BASE_URL,
      timeout: 5000
    });
    return response.data;
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
