jest.mock('../src/models', () => ({
  User: {
    create: jest.fn(),
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
