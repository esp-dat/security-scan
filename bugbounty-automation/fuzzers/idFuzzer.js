function mutateNumericSegment(path, maxMutations = 4) {
  const segments = path.split('/').filter(Boolean);
  const mutations = [];

  segments.forEach((segment, index) => {
    if (!/^\d+$/.test(segment)) {
      return;
    }

    const value = Number(segment);
    const candidates = [value - 1, value + 1, value + 10, value + 100]
      .filter((candidate) => candidate > 0)
      .slice(0, maxMutations);

    candidates.forEach((candidate) => {
      const cloned = [...segments];
      cloned[index] = String(candidate);
      mutations.push({
        path: `/${cloned.join('/')}`,
        strategy: 'segment-id-increment',
        original: path
      });
    });
  });

  return mutations;
}

function mutateQueryId(path) {
  if (!path.includes('?')) {
    return [];
  }

  const [pathname, query] = path.split('?');
  const entries = new URLSearchParams(query);
  const output = [];

  for (const [key, value] of entries.entries()) {
    if (!/(id|user|order|account)/i.test(key) || !/^\d+$/.test(value)) {
      continue;
    }

    const number = Number(value);
    const next = new URLSearchParams(entries);
    next.set(key, String(number + 1));

    output.push({
      path: `${pathname}?${next.toString()}`,
      strategy: 'query-id-increment',
      original: path
    });
  }

  return output;
}

function generateIdMutations(path, maxMutations = 6) {
  const variants = [...mutateNumericSegment(path, maxMutations), ...mutateQueryId(path)];
  return variants.slice(0, maxMutations);
}

module.exports = {
  generateIdMutations
};
