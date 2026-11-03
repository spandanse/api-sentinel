jest.mock('../src/models', () => ({
  Scan: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Finding: {},
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { Scan } = require('../src/models');

function authenticatedGet(path) {
  const token = jwt.sign(
    {},
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      subject: 'test-user-id',
      expiresIn: '1h',
      issuer: 'api-sentinel',
      audience: 'api-sentinel-client',
    }
  );

  return request(app)
    .get(path)
    .set('Authorization', `Bearer ${token}`);
}

describe('Scan management API', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-jest-only';
    jest.clearAllMocks();
  });

  describe('GET /api/v1/scans', () => {
    test('returns paginated scan history', async () => {
      const mockScans = [
        { id: 'scan-1', status: 'completed' },
        { id: 'scan-2', status: 'completed' },
      ];

      Scan.findAndCountAll.mockResolvedValue({
        rows: mockScans,
        count: 12,
      });

      const response = await authenticatedGet('/api/v1/scans?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockScans);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 12,
        totalPages: 6,
      });

      expect(Scan.findAndCountAll).toHaveBeenCalledWith({
        attributes: [
          'id', 'target', 'status', 'startedAt', 'completedAt',
          'durationMs', 'checksRun', 'summary', 'createdAt', 'updatedAt',
        ],
        limit: 2,
        offset: 0,
        order: [['createdAt', 'DESC']],
      });
    });

    test('uses default pagination when parameters are omitted', async () => {
      Scan.findAndCountAll.mockResolvedValue({
        rows: [],
        count: 0,
      });

      const response = await authenticatedGet('/api/v1/scans');

      expect(response.status).toBe(200);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    });

    test('rejects invalid pagination parameters', async () => {
      const response = await authenticatedGet('/api/v1/scans?page=0&limit=100');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Invalid pagination parameters.'
      );
      expect(Scan.findAndCountAll).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/scans/:id', () => {
    test('returns a scan with its findings', async () => {
      const mockScan = {
        id: '3fd32cdf-0f5d-49c7-9890-60292f142148',
        status: 'completed',
        findings: [
          { checkId: 'AUTH-001', status: 'PASS' },
          { checkId: 'AUTHZ-001', status: 'FAIL' },
        ],
      };

      Scan.findByPk.mockResolvedValue(mockScan);

      const response = await authenticatedGet('/api/v1/scans/3fd32cdf-0f5d-49c7-9890-60292f142148');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual(mockScan);

      expect(Scan.findByPk).toHaveBeenCalledWith(
        '3fd32cdf-0f5d-49c7-9890-60292f142148',
        {
          attributes: [
            'id', 'target', 'status', 'startedAt', 'completedAt',
            'durationMs', 'checksRun', 'summary', 'createdAt', 'updatedAt',
          ],
          include: [{
            model: expect.anything(),
            as: 'findings',
            attributes: [
              'id', 'scanId', 'checkId', 'title', 'status',
              'severity', 'confidence', 'evidence', 'remediation',
              'createdAt', 'updatedAt',
            ],
          }],
        }
      );
    });

    test('rejects an invalid scan ID', async () => {
      const response = await authenticatedGet('/api/v1/scans/not-a-uuid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid scan ID.');
      expect(Scan.findByPk).not.toHaveBeenCalled();
    });

    test('returns 404 when the scan does not exist', async () => {
      Scan.findByPk.mockResolvedValue(null);

      const response = await authenticatedGet('/api/v1/scans/3fd32cdf-0f5d-49c7-9890-60292f142148');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Scan not found.');
    });
  });
});

describe('Scan authentication', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-jest-only';
    jest.clearAllMocks();
  });

  test('rejects requests without an Authorization header', async () => {
    const response = await request(app)
      .get('/api/v1/scans');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Authentication required.');
    expect(Scan.findAndCountAll).not.toHaveBeenCalled();
  });

  test('rejects an invalid JWT', async () => {
    const response = await request(app)
      .get('/api/v1/scans')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid authentication token.');
    expect(Scan.findAndCountAll).not.toHaveBeenCalled();
  });

  test('rejects a JWT signed with a different secret', async () => {
    const token = jwt.sign(
      {},
      'some-other-secret',
      {
        algorithm: 'HS256',
        subject: 'test-user-id',
        expiresIn: '1h',
        issuer: 'api-sentinel',
        audience: 'api-sentinel-client',
      }
    );

    const response = await request(app)
      .get('/api/v1/scans')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(Scan.findAndCountAll).not.toHaveBeenCalled();
  });

  test('rejects a JWT signed using an unsupported algorithm', async () => {
    const token = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        algorithm: 'HS384',
        subject: 'test-user-id',
        expiresIn: '1h',
        issuer: 'api-sentinel',
        audience: 'api-sentinel-client',
      }
    );

    const response = await request(app)
      .get('/api/v1/scans')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(Scan.findAndCountAll).not.toHaveBeenCalled();
  });

  test('rejects an expired JWT', async () => {
    const token = jwt.sign(
      {},
      process.env.JWT_SECRET,
      {
        algorithm: 'HS256',
        subject: 'test-user-id',
        expiresIn: -1,
        issuer: 'api-sentinel',
        audience: 'api-sentinel-client',
      }
    );

    const response = await request(app)
      .get('/api/v1/scans')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid authentication token.');
    expect(Scan.findAndCountAll).not.toHaveBeenCalled();
  });
});
