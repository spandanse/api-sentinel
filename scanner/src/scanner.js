const { validateTarget } = require('./target');

const ALICE_TOKEN = 'test-token-alice';

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function makeFinding({
  id,
  title,
  status,
  severity,
  confidence,
  evidence,
  remediation,
}) {
  return {
    id,
    title,
    status,
    severity,
    confidence,
    evidence,
    remediation,
  };
}

function confidenceForStatus(status) {
  return status === 'PASS' || status === 'FAIL' ? 'high' : 'low';
}

function describeRequestError(error) {
  if (
    error?.name === 'TimeoutError' ||
    error?.name === 'AbortError'
  ) {
    return 'Request could not be completed: timed out or was aborted.';
  }

  if (error?.name === 'TypeError') {
    return 'Request could not be completed: connection failed or request was rejected.';
  }

  return 'Request could not be completed due to an unexpected error.';
}

async function runScan(target, request = fetch, timeoutMs = 3000) {
  const baseUrl = validateTarget(target);
  const startedAt = Date.now();
  const findings = [];

  async function get(path, token) {
    const headers = { Accept: 'application/json' };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return request(`${baseUrl}${path}`, {
      method: 'GET',
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
  }

  // Check 1: A protected endpoint must reject missing authentication.
  try {
    const response = await get('/api/v1/users/1');

    let status = 'ERROR';
    let evidence = `Endpoint returned HTTP ${response.status}.`;

    if (response.status === 401) {
      status = 'PASS';
      evidence = 'Unauthenticated request was rejected with HTTP 401.';
    } else if (response.status === 200) {
      status = 'FAIL';
      evidence =
        'Unauthenticated request accessed a protected endpoint (HTTP 200).';
    }

    findings.push(
      makeFinding({
        id: 'AUTH-001',
        title: 'Authentication enforcement',
        status,
        severity: 'high',
        confidence: confidenceForStatus(status),
        evidence,
        remediation:
          'Require valid authentication on protected endpoints and reject missing or invalid credentials.',
      })
    );
  } catch (error) {
    findings.push(
      makeFinding({
        id: 'AUTH-001',
        title: 'Authentication enforcement',
        status: 'ERROR',
        severity: 'high',
        confidence: 'low',
        evidence: describeRequestError(error),
        remediation:
          'Check that the local test API is running and reachable.',
      })
    );
  }

  // Check 2: Alice must not retrieve Bob's profile.
  try {
    const response = await get('/api/v1/users/2', ALICE_TOKEN);
    const body = await readJson(response);

    let status = 'ERROR';
    let evidence = `Authenticated request returned HTTP ${response.status}.`;

    if (response.status === 403) {
      status = 'PASS';
      evidence =
        "Access to another user's profile was denied with HTTP 403.";
    } else if (response.status === 404) {
      evidence =
        'HTTP 404 did not establish whether access was denied or the record was absent.';
    } else if (response.status === 200 && body?.user?.id === 2) {
      status = 'FAIL';
      evidence =
        "Alice retrieved Bob's profile; the response exposed user ID 2.";
    } else if (response.status === 401) {
      evidence =
        'The test token was rejected. The authorization check could not be validated.';
    }

    findings.push(
      makeFinding({
        id: 'AUTHZ-001',
        title: 'Broken object-level authorization (BOLA/IDOR)',
        status,
        severity: 'high',
        confidence: confidenceForStatus(status),
        evidence,
        remediation:
          'Verify object ownership or explicit access permissions on every request that uses a user-controlled object ID.',
      })
    );
  } catch (error) {
    findings.push(
      makeFinding({
        id: 'AUTHZ-001',
        title: 'Broken object-level authorization (BOLA/IDOR)',
        status: 'ERROR',
        severity: 'high',
        confidence: 'low',
        evidence: describeRequestError(error),
        remediation:
          'Check that the local test API is running and the test account is configured.',
      })
    );
  }

  // Check 3: A regular user must not access admin reports.
  try {
    const response = await get('/api/v1/admin/reports', ALICE_TOKEN);

    let status = 'ERROR';
    let evidence = `Endpoint returned HTTP ${response.status}.`;

    if (response.status === 403) {
      status = 'PASS';
      evidence =
        'Ordinary user was denied access to admin reports (HTTP 403).';
    } else if (response.status === 200) {
      status = 'FAIL';
      evidence =
        'An ordinary user accessed the administrator reports endpoint (HTTP 200).';
    } else if (response.status === 401) {
      evidence =
        'The test token was rejected. Role authorization could not be validated.';
    }

    findings.push(
      makeFinding({
        id: 'AUTHZ-002',
        title: 'Broken role-based authorization',
        status,
        severity: 'high',
        confidence: confidenceForStatus(status),
        evidence,
        remediation:
          'Enforce server-side role or permission checks on administrator-only endpoints; authentication alone is insufficient.',
      })
    );
  } catch (error) {
    findings.push(
      makeFinding({
        id: 'AUTHZ-002',
        title: 'Broken role-based authorization',
        status: 'ERROR',
        severity: 'high',
        confidence: 'low',
        evidence: describeRequestError(error),
        remediation:
          'Check that the local test API is running and the test account is configured.',
      })
    );
  }

  const summary = findings.reduce(
    (result, finding) => {
      result[finding.status] += 1;
      return result;
    },
    { PASS: 0, FAIL: 0, ERROR: 0 }
  );

  return {
    target: baseUrl,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    checksRun: findings.length,
    summary,
    findings,
  };
}

module.exports = { runScan };
