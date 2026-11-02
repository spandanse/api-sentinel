const request = require('supertest');
const app = require('../src/app');
const errorHandler = require('../src/middleware/error.middleware');

describe('Centralized error handling', () => {
  test('returns JSON 404 for an unknown endpoint', async () => {
    const response = await request(app).get('/api/v1/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Not found.',
      message: 'The requested API endpoint does not exist.',
    });
  });

  test('returns JSON 400 for malformed JSON', async () => {
    const response = await request(app)
      .post('/api/v1/scans')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'Invalid request body.',
      message: 'The request body must contain valid JSON.',
    });
  });

  test('does not expose internal error details', () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const next = jest.fn();
    const internalError = new Error('Sensitive database connection details');

    const originalConsoleError = console.error;
    console.error = jest.fn();

    try {
      errorHandler(internalError, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal server error.',
        message: 'Something went wrong while processing the request.',
      });

      expect(JSON.stringify(res.json.mock.calls[0])).not.toContain(
        'Sensitive database connection details'
      );
    } finally {
      console.error = originalConsoleError;
    }
  });
});
