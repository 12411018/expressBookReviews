const express = require('express');
const session = require('express-session');
const crypto = require('node:crypto');
const { authenticated: customerRoutes } = require('./router/auth_users.js');
const { general: publicRoutes } = require('./router/general.js');

const app = express();

app.use(express.json());

app.use('/customer', session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

app.use('/customer/auth', (req, res, next) => {
  if (!req.session.username) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  next();
});

app.use('/customer', customerRoutes);
app.use('/', publicRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ message: 'Request body must be valid JSON.' });
  }

  console.error('Unhandled request error:', error.message);
  return res.status(500).json({ message: 'Internal server error.' });
});

if (require.main === module) {
  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => {
    console.log(`Book Review API listening on port ${port}`);
  });
}

module.exports = app;
