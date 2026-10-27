const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_REPORT_DIR = path.resolve(
  __dirname,
  '../../reports/generated'
);

function writeReport(report, outputDir = DEFAULT_REPORT_DIR) {
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date(report.generatedAt || Date.now())
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

module.exports = { writeReport, DEFAULT_REPORT_DIR };
