jest.mock('../src/models', () => ({
  User: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { User } = require('../src/models');

const JWT_SECRET = 'test-secret-for-admin-route';

function createToken(userId) {
  return jwt.sign({}, JWT_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: '1h',
    issuer: 'api-sentinel',
    audience: 'api-sentinel-client',
  });
}

describe('Admin API', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects unauthenticated requests', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users');

    expect(response.status).toBe(401);
    expect(User.findByPk).not.toHaveBeenCalled();
    expect(User.findAll).not.toHaveBeenCalled();
  });

  test('rejects authenticated normal users', async () => {
    User.findByPk.mockResolvedValue({
      id: 'user-123',
      name: 'Normal User',
      email: 'user@example.com',
      role: 'user',
    });

    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${createToken('user-123')}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('Access forbidden.');
    expect(User.findAll).not.toHaveBeenCalled();
  });

  test('allows admins and returns limited user information', async () => {
    User.findByPk.mockResolvedValue({
      id: 'admin-123',
      name: 'Admin User',
      email: 'admin@example.com',
      role: 'admin',
    });

    User.findAll.mockResolvedValue([
      {
        id: 'user-123',
        name: 'Normal User',
        email: 'user@example.com',
        role: 'user',
        createdAt: '2026-10-01T10:00:00.000Z',
      },
    ]);

    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${createToken('admin-123')}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toEqual({
      id: 'user-123',
      name: 'Normal User',
      email: 'user@example.com',
      role: 'user',
      createdAt: '2026-10-01T10:00:00.000Z',
    });

    expect(User.findAll).toHaveBeenCalledWith({
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });
});
