const leakPatterns = [
  { key: 'password', regex: /password|passwd|pwd/i },
  { key: 'token', regex: /token|bearer|jwt|api[_-]?key/i },
  { key: 'secret', regex: /secret|private[_-]?key|client_secret/i },
  { key: 'pii', regex: /ssn|credit[_-]?card|dob|phone/i }
];

function detectLeakFindings(responses) {
  const findings = [];

  for (const item of responses) {
    const body = `${item.userA.text || ''}\n${item.userB.text || ''}`;

    for (const pattern of leakPatterns) {
      if (pattern.regex.test(body)) {
        findings.push({
          type: 'DATA_LEAK',
          severity: pattern.key === 'secret' ? 'CRITICAL' : 'MEDIUM',
          path: item.path,
          confidence: 0.72,
          evidence: `Potential ${pattern.key} indicator in response payload`
        });
      }
    }
  }

  return findings;
}

module.exports = {
  detectLeakFindings
};
