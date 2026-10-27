const request = require('supertest');
const app = require('../src/app');

describe('Vulnerable test API - authentication', () => {
  test('health endpoint responds successfully', async () => {
    const response = await request(app).get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  test('valid synthetic credentials return a token', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'alice',
        password: 'alice-test-123',
      });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBe('test-token-alice');
    expect(response.body.user.role).toBe('user');
  });

  test('invalid credentials are rejected', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: 'alice',
        password: 'wrong-password',
      });

    expect(response.status).toBe(401);
  });

  test('protected endpoint rejects a missing token', async () => {
    const response = await request(app).get('/api/v1/users/1');

    expect(response.status).toBe(401);
  });
});
