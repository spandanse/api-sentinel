const express = require('express');
const { User } = require('../models');

const router = express.Router();

// List limited, non-sensitive user account information.
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return res.status(200).json({
      data: users,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
