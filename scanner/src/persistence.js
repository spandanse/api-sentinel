const { validateReport } = require('./report');
const sequelize = require('../../src/config/database');
const { Scan, Finding } = require('../../src/models');

async function persistReport(report) {
  // Never store a report that fails our existing validation rules.
  validateReport(report);

  const completedAt = new Date(report.generatedAt);
  const startedAt = new Date(
    completedAt.getTime() - report.durationMs
  );

  // Both the scan and its findings must be saved together.
  return sequelize.transaction(async (transaction) => {
    const scan = await Scan.create(
      {
        target: report.target,
        status: 'completed',
        startedAt,
        completedAt,
        durationMs: report.durationMs,
        checksRun: report.checksRun,
        summary: report.summary,
      },
      { transaction }
    );

    if (report.findings.length > 0) {
      const findings = report.findings.map((finding) => ({
        scanId: scan.id,
        checkId: finding.id,
        title: finding.title,
        status: finding.status,
        severity: finding.severity,
        confidence: finding.confidence,
        evidence: finding.evidence,
        remediation: finding.remediation,
      }));

      await Finding.bulkCreate(findings, { transaction });
    }

    return scan;
  });
}

module.exports = { persistReport };
