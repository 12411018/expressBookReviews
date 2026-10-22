const express = require('express');
const axios = require('axios');
const books = require('./booksdb.json');
const { registerUser, isValid } = require('./auth_users.js');
const public_users = express.Router();

const clone = (value) => JSON.parse(JSON.stringify(value));
const getApiBaseURL = () => process.env.BOOKS_API_BASE_URL || 'http://localhost:5000';

function getLocalBooksByAuthor(author) {
  const search = author.trim().toLocaleLowerCase();
  return Object.fromEntries(
    Object.entries(books)
      .filter(([, book]) => book.author.toLocaleLowerCase() === search)
      .map(([isbn, book]) => [isbn, clone(book)])
  );
}

function getLocalBooksByTitle(title) {
  const search = title.trim().toLocaleLowerCase();
  return Object.fromEntries(
    Object.entries(books)
      .filter(([, book]) => book.title.toLocaleLowerCase() === search)
      .map(([isbn, book]) => [isbn, clone(book)])
  );
}

async function getAllBooks() {
  const response = await axios.get('/', {
    baseURL: getApiBaseURL(),
    timeout: 5000
  });
  return response.data;
}

async function getBookByISBN(isbn) {
  const response = await axios.get(`/isbn/${encodeURIComponent(isbn)}`, {
    baseURL: getApiBaseURL(),
    timeout: 5000
  });
  return response.data;
}

async function getBooksByAuthor(author) {
  const response = await axios.get(`/author/${encodeURIComponent(author)}`, {
    baseURL: getApiBaseURL(),
    timeout: 5000
  });
  return response.data;
}

async function getBooksByTitle(title) {
  const response = await axios.get(`/title/${encodeURIComponent(title)}`, {
    baseURL: getApiBaseURL(),
    timeout: 5000
  });
  return response.data;
}

async function getBookReview(isbn) {
  const response = await axios.get(`/review/${encodeURIComponent(isbn)}`, {
    baseURL: getApiBaseURL(),
    timeout: 5000
  });
  return response.data;
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
    return res.json(clone(books));
  } catch (error) {
    next(error);
  }
});

public_users.get('/isbn/:isbn', async (req, res, next) => {
  try {
    const book = books[req.params.isbn] ? clone(books[req.params.isbn]) : null;
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
    return res.json(getLocalBooksByAuthor(req.params.author));
  } catch (error) {
    next(error);
  }
});

public_users.get('/title/:title', async (req, res, next) => {
  try {
    return res.json(getLocalBooksByTitle(req.params.title));
  } catch (error) {
    next(error);
  }
});

public_users.get('/review/:isbn', async (req, res, next) => {
  try {
    const book = books[req.params.isbn];
    if (!book) {
      return res.status(404).json({ message: 'Book not found.' });
    }
    return res.json(clone(book.reviews));
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
