require('dotenv').config();

const { runScan } = require('./scanner');
const {
  writeReport,
  writeHtmlReport,
} = require('./report');
const { persistReport } = require('./persistence');

async function main() {
  const target = process.argv[2] || 'http://127.0.0.1:4001';

  let report;

  try {
    report = await runScan(target);
  } catch (error) {
    console.error(`Scan could not start: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  let jsonPath;
  let htmlPath;

  try {
    jsonPath = writeReport(report);
    htmlPath = writeHtmlReport(report);
  } catch (error) {
    console.error(`Could not save the reports: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  let savedScan;

  try {
    savedScan = await persistReport(report);
  } catch (error) {
    console.error(`Could not save scan to PostgreSQL: ${error.message}`);
    process.exitCode = 1;
  }

  console.log('\nAPI Sentinel scan completed');
  console.log(`Target: ${report.target}`);
  console.log(`Checks: ${report.checksRun}`);
  console.log(
    `Results: ${report.summary.PASS} PASS, ` +
    `${report.summary.FAIL} FAIL, ${report.summary.ERROR} ERROR`
  );
  console.log(`Duration: ${report.durationMs} ms`);

  for (const finding of report.findings) {
    console.log(`\n[${finding.status}] ${finding.id}: ${finding.title}`);
    console.log(`Evidence: ${finding.evidence}`);
  }

  console.log(`\nJSON report saved to: ${jsonPath}`);
  console.log(`HTML report saved to: ${htmlPath}`);

  if (savedScan) {
    console.log(`Database scan ID: ${savedScan.id}`);
    console.log('Scan and findings saved to PostgreSQL.');
  }
}

main()
  .catch((error) => {
    console.error('Unexpected scanner error:', error.message);
    process.exitCode = 1;
  });
