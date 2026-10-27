const request = require('supertest');
const app = require('../src/app');

describe('Vulnerable test API - authorization checks', () => {
  test('BOLA demonstration: Alice can retrieve Bob by changing the user ID', async () => {
    const response = await request(app)
      .get('/api/v1/users/2')
      .set('Authorization', 'Bearer test-token-alice');

    // This test documents the intentionally vulnerable behavior.
    // A secure implementation should deny access to Bob's private profile.
    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe(2);
    expect(response.body.user.email).toBe('bob@example.test');
  });

  test('role authorization demonstration: a regular user can access admin reports', async () => {
    const response = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', 'Bearer test-token-alice');

    // This test passes because the vulnerability currently exists.
    // Later, we will change the expected behavior to HTTP 403.
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Administrative reports');
  });

  test('admin account can access the reports endpoint', async () => {
    const response = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', 'Bearer test-token-admin');

    expect(response.status).toBe(200);
  });
});
