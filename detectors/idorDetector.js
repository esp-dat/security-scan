function detectIdorFindings(multiUserResults) {
  return multiUserResults
    .filter((item) => item.userA.status === 200 && item.userB.status === 200)
    .filter((item) => item.diff.sameStatus && item.diff.similarity >= 0.9)
    .map((item) => ({
      type: 'IDOR',
      severity: item.path.includes('/admin') ? 'CRITICAL' : 'HIGH',
      path: item.path,
      confidence: Number(item.diff.similarity.toFixed(2)),
      evidence: `User A and User B received highly similar responses (${item.diff.similarity.toFixed(2)})`
    }));
}

module.exports = {
  detectIdorFindings
};
