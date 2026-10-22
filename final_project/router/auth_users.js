const express = require('express');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const books = require('./booksdb.json');
const regd_users = express.Router();

const scrypt = promisify(crypto.scrypt);
const users = [];

function isValid(username) {
  return typeof username === 'string'
    && /^[A-Za-z0-9._-]{3,32}$/.test(username);
}

function findUser(username) {
  return users.find((user) => user.username === username);
}

async function registerUser(username, password) {
  if (findUser(username)) {
    return false;
  }

  const salt = crypto.randomBytes(16);
  const passwordHash = await scrypt(password, salt, 64);

  // Recheck after hashing so concurrent registrations cannot claim one username twice.
  if (findUser(username)) {
    return false;
  }

  users.push({ username, salt, passwordHash });
  return true;
}

async function authenticatedUser(username, password) {
  const user = findUser(username);
  if (!user || typeof password !== 'string') {
    return false;
  }

  const candidateHash = await scrypt(password, user.salt, 64);
  return crypto.timingSafeEqual(candidateHash, user.passwordHash);
}

regd_users.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    if (!await authenticatedUser(username, password)) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    req.session.username = username;
    return res.json({ message: 'Login successful.', username });
  } catch (error) {
    next(error);
  }
});

regd_users.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logout successful.' });
  });
});

regd_users.put('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  const { review } = req.body || {};
  const book = books[isbn];

  if (!book) {
    return res.status(404).json({ message: 'Book not found.' });
  }
  if (typeof review !== 'string' || review.trim().length === 0 || review.length > 2000) {
    return res.status(400).json({ message: 'Review must contain 1-2000 characters.' });
  }

  book.reviews[req.session.username] = review.trim();
  return res.json({ message: 'Review added or updated successfully.' });
});

regd_users.delete('/auth/review/:isbn', (req, res) => {
  const book = books[req.params.isbn];
  if (!book) {
    return res.status(404).json({ message: 'Book not found.' });
  }

  if (!Object.prototype.hasOwnProperty.call(book.reviews, req.session.username)) {
    return res.status(404).json({ message: 'You do not have a review for this book.' });
  }

  delete book.reviews[req.session.username];
  return res.json({ message: 'Review deleted successfully.' });
});

module.exports = {
  authenticated: regd_users,
  isValid,
  users,
  registerUser,
  authenticatedUser
};
