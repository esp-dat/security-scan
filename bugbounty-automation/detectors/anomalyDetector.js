function detectAnomalies({ validationAttempts, multiUserResults }) {
  const findings = [];

  for (const attempt of validationAttempts) {
    if (attempt.status >= 500) {
      findings.push({
        type: 'ANOMALY',
        severity: 'MEDIUM',
        path: attempt.path,
        confidence: 0.7,
        evidence: `Server error status detected during validation (${attempt.status})`
      });
    }

    if (attempt.durationMs > 2500) {
      findings.push({
        type: 'ANOMALY',
        severity: 'LOW',
        path: attempt.path,
        confidence: 0.55,
        evidence: `Unusual latency detected (${attempt.durationMs}ms)`
      });
    }
  }

  for (const compare of multiUserResults) {
    if (compare.userA.status !== compare.userB.status) {
      findings.push({
        type: 'ANOMALY',
        severity: 'INFO',
        path: compare.path,
        confidence: 0.65,
        evidence: `Different status codes between users (${compare.userA.status} vs ${compare.userB.status})`
      });
    }
  }

  return findings;
}

module.exports = {
  detectAnomalies
};
