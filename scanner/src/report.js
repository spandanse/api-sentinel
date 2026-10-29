const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_REPORT_DIR = path.resolve(
  __dirname,
  '../../reports/generated'
);

const VALID_STATUSES = new Set(['PASS', 'FAIL', 'ERROR']);
const VALID_CONFIDENCE = new Set(['high', 'medium', 'low']);

function validateReport(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new TypeError('Report must be an object.');
  }

  if (typeof report.target !== 'string' || !report.target.trim()) {
    throw new TypeError('Report target must be a non-empty string.');
  }

  if (
    typeof report.generatedAt !== 'string' ||
    !Number.isFinite(Date.parse(report.generatedAt))
  ) {
    throw new TypeError('Report generatedAt must be a valid date string.');
  }

  if (
    !Number.isFinite(report.durationMs) ||
    report.durationMs < 0
  ) {
    throw new TypeError('Report durationMs must be a non-negative number.');
  }

  if (!Array.isArray(report.findings)) {
    throw new TypeError('Report findings must be an array.');
  }

  if (
    !Number.isInteger(report.checksRun) ||
    report.checksRun !== report.findings.length
  ) {
    throw new TypeError(
      'Report checksRun must equal the number of findings.'
    );
  }

  if (!report.summary || typeof report.summary !== 'object') {
    throw new TypeError('Report summary must be an object.');
  }

  const expectedSummary = {
    PASS: 0,
    FAIL: 0,
    ERROR: 0,
  };

  const seenIds = new Set();

  for (const finding of report.findings) {
    if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
      throw new TypeError('Every finding must be an object.');
    }

    for (const field of [
      'id',
      'title',
      'evidence',
      'remediation',
      'severity',
    ]) {
      if (
        typeof finding[field] !== 'string' ||
        !finding[field].trim()
      ) {
        throw new TypeError(
          `Finding field "${field}" must be a non-empty string.`
        );
      }
    }

    if (seenIds.has(finding.id)) {
      throw new TypeError(`Duplicate finding ID: ${finding.id}.`);
    }
    seenIds.add(finding.id);

    if (!VALID_STATUSES.has(finding.status)) {
      throw new TypeError(`Invalid finding status: ${finding.status}.`);
    }

    if (!VALID_CONFIDENCE.has(finding.confidence)) {
      throw new TypeError(
        `Invalid finding confidence: ${finding.confidence}.`
      );
    }

    expectedSummary[finding.status] += 1;
  }

  for (const status of VALID_STATUSES) {
    if (
      !Number.isInteger(report.summary[status]) ||
      report.summary[status] !== expectedSummary[status]
    ) {
      throw new TypeError(
        `Report summary.${status} does not match its findings.`
      );
    }
  }

  return true;
}

function writeReport(report, outputDir = DEFAULT_REPORT_DIR) {
  validateReport(report);

  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date(report.generatedAt)
    .toISOString()
    .replace(/[:.]/g, '-');

  const filename = `scan-${timestamp}.json`;
  const filePath = path.join(outputDir, filename);

  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });

  return filePath;
}

module.exports = {
  writeReport,
  validateReport,
  DEFAULT_REPORT_DIR,
};
