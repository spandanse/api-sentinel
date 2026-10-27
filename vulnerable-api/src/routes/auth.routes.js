const express = require('express');
const { findAccount, findUserById } = require('../data/users');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      error: 'Username and password are required',
    });
  }

  const account = findAccount(username, password);

  if (!account) {
    return res.status(401).json({
      error: 'Invalid credentials',
    });
  }

  const user = findUserById(account.userId);

  return res.json({
    accessToken: account.token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
    },
  });
});

module.exports = router;
