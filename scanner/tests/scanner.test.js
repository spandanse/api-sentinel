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
