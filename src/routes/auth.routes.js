const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');

const router = express.Router();

const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_BYTES = 72;

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    // Validate required fields and their types.
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        error: 'Invalid registration data.',
        message: 'Name, email and password must be provided as strings.',
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || normalizedName.length > 100) {
      return res.status(400).json({
        error: 'Invalid name.',
        message: 'Name must contain between 1 and 100 characters.',
      });
    }

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        error: 'Invalid email.',
        message: 'Please provide a valid email address.',
      });
    }

    if (
      password.length < MIN_PASSWORD_LENGTH ||
      Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES
    ) {
      return res.status(400).json({
        error: 'Invalid password.',
        message: `Password must contain at least ${MIN_PASSWORD_LENGTH} characters and no more than ${MAX_PASSWORD_BYTES} UTF-8 bytes.`,
      });
    }

    // Hash the password before it reaches the database.
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
    });

    return res.status(201).json({
      message: 'Account created successfully.',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    // Handle duplicate email, including concurrent registration attempts.
    if (
      error.name === 'SequelizeUniqueConstraintError' ||
      error.original?.code === '23505'
    ) {
      return res.status(409).json({
        error: 'Email already registered.',
        message: 'An account with this email address already exists.',
      });
    }

    return next(error);
  }
});


// Authenticate an existing user and issue a signed JWT.
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Invalid login data.',
        message: 'Email and password must be provided as strings.',
      });
    }

    if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      return res.status(400).json({
        error: 'Invalid login data.',
        message: 'Password must not exceed 72 bytes.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        error: 'Invalid login data.',
        message: 'Please provide valid login credentials.',
      });
    }

    const user = await User.findOne({
      where: { email: normalizedEmail },
    });

    // Use the same response for an unknown email and a wrong password.
    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed.',
        message: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Authentication failed.',
        message: 'Invalid email or password.',
      });
    }

    if (!process.env.JWT_SECRET) {
      return next(new Error('JWT_SECRET is not configured.'));
    }

    const token = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        algorithm: 'HS256',
        subject: user.id,
        expiresIn: '1h',
        issuer: 'api-sentinel',
        audience: 'api-sentinel-client',
      }
    );

    return res.status(200).json({
      message: 'Login successful.',
      data: {
        token,
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
