const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  writeReport,
  writeHtmlReport,
  renderHtmlReport,
  escapeHtml,
  validateReport,
} = require('../src/report');

function createValidReport() {
  return {
    target: 'http://127.0.0.1:4001',
    generatedAt: '2026-10-27T10:00:00.000Z',
    durationMs: 15,
    checksRun: 2,
    summary: { PASS: 1, FAIL: 1, ERROR: 0 },
    findings: [
      {
        id: 'AUTH-001',
        title: 'Authentication enforcement',
        status: 'PASS',
        severity: 'high',
        confidence: 'high',
        evidence: 'Unauthenticated request was rejected with HTTP 401.',
        remediation: 'Require authentication on protected endpoints.',
      },
      {
        id: 'AUTHZ-001',
        title: 'Broken object-level authorization',
        status: 'FAIL',
        severity: 'high',
        confidence: 'high',
        evidence: 'Another user profile was accessible.',
        remediation: 'Verify object ownership for each request.',
      },
    ],
  };
}

describe('Report writers', () => {
  let outputDir;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'api-sentinel-report-')
    );
  });

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('writes a validated JSON report', () => {
    const report = createValidReport();

    expect(validateReport(report)).toBe(true);

    const filePath = writeReport(report, outputDir);
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    expect(path.extname(filePath)).toBe('.json');
    expect(saved).toEqual(report);
  });

  test('writes an HTML report', () => {
    const report = createValidReport();

    const filePath = writeHtmlReport(report, outputDir);
    const saved = fs.readFileSync(filePath, 'utf8');

    expect(path.extname(filePath)).toBe('.html');
    expect(saved).toContain('<!DOCTYPE html>');
    expect(saved).toContain('API Sentinel');
    expect(saved).toContain('Authentication enforcement');
    expect(saved).toContain('Another user profile was accessible.');
    expect(saved).toContain('Remediation');
  });

  test('creates the output directory when it does not exist', () => {
    const nestedDir = path.join(outputDir, 'nested', 'reports');

    const filePath = writeReport(createValidReport(), nestedDir);

    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('escapes HTML special characters', () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      '&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;'
    );
  });

  test('escapes untrusted report content in HTML output', () => {
    const report = createValidReport();
    report.target = '<script>alert("target")</script>';
    report.findings[0].evidence = '<img src=x onerror=alert(1)>';

    const html = renderHtmlReport(report);

    expect(html).toContain(
      '&lt;script&gt;alert(&quot;target&quot;)&lt;/script&gt;'
    );
    expect(html).toContain(
      '&lt;img src=x onerror=alert(1)&gt;'
    );
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
  });

  test('rejects summary counts that do not match findings', () => {
    const report = createValidReport();
    report.summary.FAIL = 0;

    expect(() => validateReport(report)).toThrow(
      'Report summary.FAIL does not match its findings.'
    );
  });

  test('rejects checksRun that does not match findings length', () => {
    const report = createValidReport();
    report.checksRun = 10;

    expect(() => validateReport(report)).toThrow(
      'Report checksRun must equal the number of findings.'
    );
  });

  test('rejects findings with an invalid status', () => {
    const report = createValidReport();
    report.findings[0].status = 'UNKNOWN';

    expect(() => validateReport(report)).toThrow(
      'Invalid finding status: UNKNOWN.'
    );
  });

  test('rejects duplicate finding IDs', () => {
    const report = createValidReport();
    report.findings[1].id = report.findings[0].id;

    expect(() => validateReport(report)).toThrow(
      'Duplicate finding ID: AUTH-001.'
    );
  });

  test('rejects incomplete findings', () => {
    const report = createValidReport();
    delete report.findings[0].remediation;

    expect(() => validateReport(report)).toThrow(
      'Finding field "remediation" must be a non-empty string.'
    );
  });

  test('does not create a report file when validation fails', () => {
    const report = createValidReport();
    report.summary.ERROR = 5;

    expect(() => writeReport(report, outputDir)).toThrow(
      'Report summary.ERROR does not match its findings.'
    );

    expect(fs.readdirSync(outputDir)).toEqual([]);
  });
});
