const request = require('supertest');
const app = require('../src/app');

describe('API Sentinel health endpoint', () => {
  test('returns HTTP 200 and service status', async () => {
    const response = await request(app)
      .get('/api/v1/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ok',
      service: 'api-sentinel',
    });
  });
});
