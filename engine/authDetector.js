function detectAuthLevel(statuses = []) {
  if (statuses.some((status) => status === 401 || status === 403)) {
    return 'AUTH_REQUIRED';
  }

  if (statuses.some((status) => status >= 200 && status < 300)) {
    return 'PUBLIC';
  }

  return 'UNKNOWN';
}

function analyzeAuth({ validatedAttempts, multiUserResults }) {
  const map = new Map();

  for (const attempt of validatedAttempts) {
    if (!map.has(attempt.path)) {
      map.set(attempt.path, []);
    }

    map.get(attempt.path).push(attempt.status);
  }

  for (const compare of multiUserResults) {
    if (!map.has(compare.path)) {
      map.set(compare.path, []);
    }

    map.get(compare.path).push(compare.userA.status, compare.userB.status);
  }

  return Array.from(map.entries()).map(([path, statuses]) => ({
    path,
    auth: detectAuthLevel(statuses),
    statuses
  }));
}

module.exports = {
  analyzeAuth
};
