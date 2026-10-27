const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeReport } = require('../src/report');

describe('JSON report writer', () => {
  let outputDir;

  beforeEach(() => {
    outputDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'api-sentinel-report-')
    );
  });

  afterEach(() => {
    fs.rmSync(outputDir, { recursive: true, force: true });
  });

  test('writes a report that can be read back as JSON', () => {
    const report = {
      target: 'http://127.0.0.1:4001',
      generatedAt: '2026-10-27T10:00:00.000Z',
      durationMs: 15,
      checksRun: 1,
      summary: { PASS: 1, FAIL: 0, ERROR: 0 },
      findings: [],
    };

    const filePath = writeReport(report, outputDir);
    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    expect(path.extname(filePath)).toBe('.json');
    expect(saved).toEqual(report);
  });

  test('creates the output directory when it does not exist', () => {
    const nestedDir = path.join(outputDir, 'nested', 'reports');

    const filePath = writeReport(
      {
        generatedAt: '2026-10-27T10:00:00.000Z',
        findings: [],
      },
      nestedDir
    );

    expect(fs.existsSync(filePath)).toBe(true);
  });
});
