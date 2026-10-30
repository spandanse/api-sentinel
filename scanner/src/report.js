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

  if (!Number.isFinite(report.durationMs) || report.durationMs < 0) {
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

  const expectedSummary = { PASS: 0, FAIL: 0, ERROR: 0 };
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

// Convert untrusted text into safe HTML text.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character];
  });
}

function renderHtmlReport(report) {
  validateReport(report);

  const findingsHtml = report.findings.map((finding) => `
    <article class="finding">
      <div class="finding-header">
        <h3>${escapeHtml(finding.id)} — ${escapeHtml(finding.title)}</h3>
        <span class="status ${finding.status.toLowerCase()}">
          ${escapeHtml(finding.status)}
        </span>
      </div>

      <div class="metadata">
        <span>Severity: ${escapeHtml(finding.severity)}</span>
        <span>Confidence: ${escapeHtml(finding.confidence)}</span>
      </div>

      <h4>Evidence</h4>
      <p>${escapeHtml(finding.evidence)}</p>

      <h4>Remediation</h4>
      <p>${escapeHtml(finding.remediation)}</p>
    </article>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <title>API Sentinel Security Report</title>
  <style>
    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 32px 18px;
      background: #f3f4f6;
      color: #20242b;
      font-family: Arial, sans-serif;
      line-height: 1.6;
    }

    main {
      max-width: 950px;
      margin: auto;
    }

    h1 { margin-bottom: 4px; }
    h2 { margin-top: 32px; }

    .subtitle {
      color: #626b78;
      margin-top: 0;
    }

    .overview, .finding {
      background: white;
      border: 1px solid #e1e5eb;
      border-radius: 10px;
      padding: 20px;
      margin-top: 18px;
    }

    .metadata, .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      color: #555e6b;
    }

    .summary {
      margin-top: 20px;
    }

    .metric {
      flex: 1;
      min-width: 120px;
      padding: 14px;
      border-radius: 8px;
      background: #f3f4f6;
    }

    .metric strong {
      display: block;
      font-size: 26px;
      color: #20242b;
    }

    .finding-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .finding-header h3 { margin-top: 0; }

    .status {
      padding: 4px 10px;
      border-radius: 5px;
      font-weight: bold;
      font-size: 13px;
    }

    .pass { background: #dcfce7; color: #166534; }
    .fail { background: #fee2e2; color: #991b1b; }
    .error { background: #fef3c7; color: #92400e; }

    .metadata {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 10px;
      font-size: 14px;
    }

    .metadata span {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      background: #f3f4f6;
    }

    h4 { margin-bottom: 4px; }
    p { overflow-wrap: anywhere; }

    footer {
      margin-top: 32px;
      color: #707987;
      font-size: 13px;
      text-align: center;
    }

    @media print {
      body { background: white; padding: 0; }
      .overview, .finding { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <main>
    <h1>API Sentinel</h1>
    <p class="subtitle">Automated API Security Scan Report</p>

    <section class="overview">
      <h2>Scan Overview</h2>
      <p><strong>Target:</strong> ${escapeHtml(report.target)}</p>
      <p><strong>Generated:</strong> ${escapeHtml(report.generatedAt)}</p>
      <p><strong>Duration:</strong> ${report.durationMs} ms</p>
      <p><strong>Checks executed:</strong> ${report.checksRun}</p>

      <div class="summary">
        <div class="metric">
          <strong>${report.summary.PASS}</strong>
          PASS
        </div>
        <div class="metric">
          <strong>${report.summary.FAIL}</strong>
          FAIL
        </div>
        <div class="metric">
          <strong>${report.summary.ERROR}</strong>
          ERROR
        </div>
      </div>
    </section>

    <h2>Security Findings</h2>
    ${findingsHtml || '<p>No findings were generated.</p>'}

    <footer>
      Generated by API Sentinel. Review findings before making security decisions.
    </footer>
  </main>
</body>
</html>`;
}

function getTimestamp(report) {
  return new Date(report.generatedAt)
    .toISOString()
    .replace(/[:.]/g, '-');
}

function writeReport(report, outputDir = DEFAULT_REPORT_DIR) {
  validateReport(report);
  fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(
    outputDir,
    `scan-${getTimestamp(report)}.json`
  );

  fs.writeFileSync(filePath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });

  return filePath;
}

function writeHtmlReport(report, outputDir = DEFAULT_REPORT_DIR) {
  const html = renderHtmlReport(report);
  fs.mkdirSync(outputDir, { recursive: true });

  const filePath = path.join(
    outputDir,
    `scan-${getTimestamp(report)}.html`
  );

  fs.writeFileSync(filePath, html, {
    encoding: 'utf8',
    flag: 'wx',
  });

  return filePath;
}

module.exports = {
  writeReport,
  writeHtmlReport,
  renderHtmlReport,
  escapeHtml,
  validateReport,
  DEFAULT_REPORT_DIR,
};
