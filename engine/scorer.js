const severityWeight = {
  CRITICAL: 40,
  HIGH: 30,
  MEDIUM: 20,
  LOW: 10,
  INFO: 0
};

function scoreEndpoint({ path, auth, findings }) {
  let score = 0;

  if (auth === 'PUBLIC') {
    score += 25;
  }

  for (const finding of findings) {
    score += severityWeight[finding.severity] || 0;
  }

  if (path.includes('/admin')) {
    score += 15;
  }

  return Math.min(100, score);
}

function scoreResults({ endpoints, findings, authMap }) {
  const findingsByPath = new Map();
  for (const finding of findings) {
    if (!findingsByPath.has(finding.path)) {
      findingsByPath.set(finding.path, []);
    }
    findingsByPath.get(finding.path).push(finding);
  }

  const authByPath = new Map(authMap.map((item) => [item.path, item.auth]));

  const scoredEndpoints = endpoints.map((endpoint) => {
    const scopedFindings = findingsByPath.get(endpoint.path) || [];
    const auth = authByPath.get(endpoint.path) || 'UNKNOWN';
    const score = scoreEndpoint({
      path: endpoint.path,
      auth,
      findings: scopedFindings
    });

    return {
      ...endpoint,
      auth,
      score,
      findingCount: scopedFindings.length
    };
  });

  const highestScore = scoredEndpoints.reduce((max, item) => Math.max(max, item.score), 0);

  return {
    scoredEndpoints,
    highestScore
  };
}

module.exports = {
  scoreResults
};
