const { validateTarget } = require('../src/target');
const { runScan } = require('../src/scanner');

describe('Scanner target restrictions', () => {
  test('accepts only the local vulnerable test API', () => {
    expect(validateTarget('http://127.0.0.1:4001')).toBe(
      'http://127.0.0.1:4001'
    );
  });

  test.each([
    'https://example.com',
    'http://localhost:4001',
    'http://127.0.0.1:4002',
    'http://127.0.0.1:4001/other',
    'http://127.0.0.1:4001?url=http://example.com',
    'http://user:pass@127.0.0.1:4001',
  ])('rejects out-of-scope target: %s', (target) => {
    expect(() => validateTarget(target)).toThrow();
  });
});

describe('Scanner findings', () => {
  test('returns a consistent structure for every finding', async () => {
    const fakeRequest = jest.fn(async () => ({
      status: 401,
      json: async () => ({ error: 'Authentication required' }),
    }));

    const report = await runScan(
      'http://127.0.0.1:4001',
      fakeRequest
    );

    expect(report).toEqual(
      expect.objectContaining({
        target: 'http://127.0.0.1:4001',
        generatedAt: expect.any(String),
        durationMs: expect.any(Number),
        checksRun: 3,
        summary: {
          PASS: expect.any(Number),
          FAIL: expect.any(Number),
          ERROR: expect.any(Number),
        },
        findings: expect.any(Array),
      })
    );

    for (const finding of report.findings) {
      expect(finding).toEqual({
        id: expect.any(String),
        title: expect.any(String),
        status: expect.stringMatching(/^(PASS|FAIL|ERROR)$/),
        severity: expect.any(String),
        confidence: expect.any(String),
        evidence: expect.any(String),
        remediation: expect.any(String),
      });
    }
  });

  test('detects the three intentional vulnerabilities', async () => {
    const fakeRequest = jest.fn(async (url) => {
      if (url.endsWith('/api/v1/users/1')) {
        return {
          status: 200,
          json: async () => ({ user: { id: 1 } }),
        };
      }

      if (url.endsWith('/api/v1/users/2')) {
        return {
          status: 200,
          json: async () => ({
            user: { id: 2, email: 'bob@example.test' },
          }),
        };
      }

      return {
        status: 200,
        json: async () => ({ message: 'Administrative reports' }),
      };
    });

    const report = await runScan(
      'http://127.0.0.1:4001',
      fakeRequest
    );

    expect(report.checksRun).toBe(3);
    expect(report.summary.FAIL).toBe(3);
    expect(report.summary.PASS).toBe(0);
    expect(report.summary.ERROR).toBe(0);

    expect(report.findings.map((finding) => finding.id)).toEqual([
      'AUTH-001',
      'AUTHZ-001',
      'AUTHZ-002',
    ]);
  });

  test('treats unexpected HTTP statuses as inconclusive', async () => {
    const fakeRequest = jest.fn(async () => ({
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    }));

    const report = await runScan(
      'http://127.0.0.1:4001',
      fakeRequest
    );

    expect(report.summary.ERROR).toBe(3);
    expect(report.summary.FAIL).toBe(0);

    for (const finding of report.findings) {
      expect(finding.status).toBe('ERROR');
    }
  });

  test('treats a BOLA HTTP 404 as inconclusive', async () => {
    const fakeRequest = jest.fn(async (url) => {
      if (url.endsWith('/api/v1/users/1')) {
        return { status: 401, json: async () => ({}) };
      }

      if (url.endsWith('/api/v1/users/2')) {
        return { status: 404, json: async () => ({}) };
      }

      return { status: 403, json: async () => ({}) };
    });

    const report = await runScan(
      'http://127.0.0.1:4001',
      fakeRequest
    );

    const bolaFinding = report.findings.find(
      (finding) => finding.id === 'AUTHZ-001'
    );

    expect(bolaFinding.status).toBe('ERROR');
    expect(bolaFinding.confidence).toBe('low');
    expect(bolaFinding.evidence).toContain('HTTP 404 did not establish');
  });

  test('does not confirm BOLA when the HTTP 200 body is invalid JSON', async () => {
    const fakeRequest = jest.fn(async (url) => ({
      status: 200,
      json: async () => {
        if (url.endsWith('/api/v1/users/2')) {
          throw new SyntaxError('Invalid JSON');
        }

        return { user: { id: 1 } };
      },
    }));

    const report = await runScan(
      'http://127.0.0.1:4001',
      fakeRequest
    );

    const bolaFinding = report.findings.find(
      (finding) => finding.id === 'AUTHZ-001'
    );

    expect(bolaFinding.status).toBe('ERROR');
    expect(bolaFinding.evidence).not.toContain('retrieved Bob');
  });

  test('uses GET requests and disables automatic redirects', async () => {
    const fakeRequest = jest.fn(async () => ({
      status: 401,
      json: async () => ({ error: 'Authentication required' }),
    }));

    await runScan('http://127.0.0.1:4001', fakeRequest);

    for (const [, options] of fakeRequest.mock.calls) {
      expect(options.method).toBe('GET');
      expect(options.redirect).toBe('manual');
    }
  });

  test('reports request failures as ERROR instead of crashing', async () => {
    const fakeRequest = jest.fn(async () => {
      throw new TypeError('fetch failed');
    });

    const report = await runScan(
      'http://127.0.0.1:4001',
      fakeRequest
    );

    expect(report.checksRun).toBe(3);
    expect(report.summary.ERROR).toBe(3);
    expect(report.summary.FAIL).toBe(0);

    for (const finding of report.findings) {
      expect(finding.status).toBe('ERROR');
      expect(finding.evidence).toContain(
        'Request could not be completed'
      );
    }
  });

  test('reports timeouts as ERROR instead of a security failure', async () => {
    const fakeRequest = jest.fn(async () => {
      const error = new Error('The operation timed out');
      error.name = 'TimeoutError';
      throw error;
    });

    const report = await runScan(
      'http://127.0.0.1:4001',
      fakeRequest
    );

    expect(report.checksRun).toBe(3);
    expect(report.summary.ERROR).toBe(3);
    expect(report.summary.FAIL).toBe(0);

    expect(
      report.findings.every((finding) =>
        finding.evidence.includes('timed out or was aborted')
      )
    ).toBe(true);
  });

  test('does not expose raw exception messages in findings', async () => {
    const fakeRequest = jest.fn(async () => {
      throw new Error(
        'Sensitive internal detail: /home/private/config.env'
      );
    });

    const report = await runScan(
      'http://127.0.0.1:4001',
      fakeRequest
    );

    expect(report.summary.ERROR).toBe(3);

    for (const finding of report.findings) {
      expect(finding.evidence).not.toContain('/home/private/config.env');
    }
  });

  test('aborts a request when the configured timeout expires', async () => {
    const fakeRequest = jest.fn((_url, options) => {
      return new Promise((resolve, reject) => {
        const { signal } = options;

        if (signal.aborted) {
          reject(signal.reason);
          return;
        }

        signal.addEventListener(
          'abort',
          () => reject(signal.reason),
          { once: true }
        );
      });
    });

    const report = await runScan(
      'http://127.0.0.1:4001',
      fakeRequest,
      10
    );

    expect(fakeRequest).toHaveBeenCalledTimes(3);
    expect(report.summary.ERROR).toBe(3);
    expect(report.summary.FAIL).toBe(0);

    expect(
      report.findings.every((finding) =>
        finding.evidence.includes('timed out or was aborted')
      )
    ).toBe(true);
  });
});
