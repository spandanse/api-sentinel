const { runScan } = require('./scanner');
const { writeReport } = require('./report');

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

  let reportPath;

  try {
    reportPath = writeReport(report);
  } catch (error) {
    console.error(`Could not save the report: ${error.message}`);
    process.exitCode = 1;
    return;
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

  console.log(`\nJSON report saved to: ${reportPath}`);
}

main().catch((error) => {
  console.error('Unexpected scanner error:', error.message);
  process.exitCode = 1;
});
