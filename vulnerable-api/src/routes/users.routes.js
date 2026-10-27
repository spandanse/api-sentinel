const express = require('express');
const { findUserById } = require('../data/users');

const router = express.Router();

// Demonstration vulnerability: authentication is required,
// but ownership is not checked. Any authenticated user can
// retrieve another user's profile by changing the ID.
router.get('/:id', (req, res) => {
  const user = findUserById(req.params.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user });
});

module.exports = router;
