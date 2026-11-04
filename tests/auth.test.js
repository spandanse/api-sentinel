jest.mock('../src/models', () => ({
  User: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { User } = require('../src/models');

describe('Authentication API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    test('registers a user and stores a bcrypt hash', async () => {
      User.create.mockImplementation(async (data) => ({
        id: 'user-123',
        name: data.name,
        email: data.email,
      }));

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: '  Test User  ',
          email: ' TEST@EXAMPLE.COM ',
          password: 'StrongPassword123!',
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Account created successfully.');

      expect(response.body.data).toEqual({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      });

      const savedUser = User.create.mock.calls[0][0];

      expect(savedUser.name).toBe('Test User');
      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.passwordHash).not.toBe('StrongPassword123!');
      expect(savedUser.passwordHash.startsWith('$2')).toBe(true);
      expect(savedUser.passwordHash).toMatch(/^\$2[aby]\$12\$/);

      expect(
        await bcrypt.compare('StrongPassword123!', savedUser.passwordHash)
      ).toBe(true);

      expect(response.body.data).not.toHaveProperty('password');
      expect(response.body.data).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(response.body)).not.toContain(savedUser.passwordHash);
    });

    test('ignores a client-supplied admin role during registration', async () => {
      User.create.mockImplementation(async (data) => ({
        id: 'user-123',
        name: data.name,
        email: data.email,
        role: 'user',
      }));

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'StrongPassword123!',
          role: 'admin',
        });

      expect(response.status).toBe(201);

      const savedUser = User.create.mock.calls[0][0];

      expect(savedUser).not.toHaveProperty('role');
      expect(response.body.data).not.toHaveProperty('role');
    });

    test('rejects missing or incorrectly typed fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid registration data.');
      expect(User.create).not.toHaveBeenCalled();
    });

    test('rejects an invalid email address', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'not-an-email',
          password: 'StrongPassword123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid email.');
      expect(User.create).not.toHaveBeenCalled();
    });

    test('rejects a password that is too short', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'short',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid password.');
      expect(User.create).not.toHaveBeenCalled();
    });

    test('rejects a password exceeding bcrypt byte limit', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'a'.repeat(73),
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid password.');
      expect(User.create).not.toHaveBeenCalled();
    });

    test('returns 409 when the email is already registered', async () => {
      const duplicateError = new Error('Duplicate email');
      duplicateError.name = 'SequelizeUniqueConstraintError';

      User.create.mockRejectedValue(duplicateError);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'StrongPassword123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Email already registered.');
    });
  });
});

describe('POST /api/v1/auth/login', () => {
  const jwt = require('jsonwebtoken');

  const testUser = {
    id: 'user-login-123',
    name: 'Login Test User',
    email: 'login@example.com',
    passwordHash: '$2b$12$placeholder',
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-jest-only';
    User.findOne.mockReset();
  });

  test('logs in successfully and returns a valid JWT', async () => {
    const passwordHash = await bcrypt.hash('StrongPassword123!', 4);

    User.findOne.mockResolvedValue({
      ...testUser,
      passwordHash,
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: ' LOGIN@EXAMPLE.COM ',
        password: 'StrongPassword123!',
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Login successful.');
    expect(response.body.data.tokenType).toBe('Bearer');
    expect(response.body.data.expiresIn).toBe(3600);
    expect(response.body.data.user).toEqual({
      id: testUser.id,
      name: testUser.name,
      email: testUser.email,
    });

    const decoded = jwt.verify(
      response.body.data.token,
      process.env.JWT_SECRET,
      {
        algorithms: ['HS256'],
        issuer: 'api-sentinel',
        audience: 'api-sentinel-client',
      }
    );

    expect(decoded.sub).toBe(testUser.id);
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
  });

  test('rejects an incorrect password', async () => {
    const passwordHash = await bcrypt.hash('CorrectPassword123!', 4);

    User.findOne.mockResolvedValue({
      ...testUser,
      passwordHash,
    });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword123!',
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password.');
  });

  test('rejects an unknown email', async () => {
    User.findOne.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'unknown@example.com',
        password: 'StrongPassword123!',
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password.');
  });

  test('rejects missing or incorrectly typed fields', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email });

    expect(response.status).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test('rejects passwords exceeding 72 UTF-8 bytes', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'a'.repeat(73),
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe(
      'Password must not exceed 72 bytes.'
    );
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test('rejects invalid email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'not-an-email',
        password: 'StrongPassword123!',
      });

    expect(response.status).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  test('does not issue a token when JWT secret is missing', async () => {
    const passwordHash = await bcrypt.hash('StrongPassword123!', 4);

    User.findOne.mockResolvedValue({
      ...testUser,
      passwordHash,
    });

    delete process.env.JWT_SECRET;

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'StrongPassword123!',
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Internal server error.');
  });
});
