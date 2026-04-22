function normalizeBody(value = '') {
  return value
    .toLowerCase()
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(value) {
  return new Set(normalizeBody(value).split(/[^a-z0-9_]+/).filter(Boolean));
}

function jaccard(a, b) {
  if (!a.size && !b.size) {
    return 1;
  }

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function compareResponses(a, b) {
  const tokenA = tokenSet(a.text || '');
  const tokenB = tokenSet(b.text || '');
  const similarity = jaccard(tokenA, tokenB);

  return {
    similarity,
    lengthDelta: Math.abs((a.text || '').length - (b.text || '').length),
    sameStatus: a.status === b.status
  };
}

module.exports = {
  compareResponses
};
