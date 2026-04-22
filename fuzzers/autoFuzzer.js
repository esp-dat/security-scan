const { generateIdMutations } = require('./idFuzzer');

const queryPayloads = [
  "' OR '1'='1",
  '<script>alert(1)</script>',
  '../../etc/passwd'
];

function addQueryPayload(path, payload) {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}q=${encodeURIComponent(payload)}`;
}

function createHeaderAttack(path) {
  return {
    type: 'header',
    path,
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'x-original-user': 'admin'
    },
    strategy: 'header-spoof'
  };
}

function generateAutoFuzzCases(endpoints, options = {}) {
  const maxMutationsPerEndpoint = options.maxMutationsPerEndpoint || 6;
  const cases = [];

  for (const endpoint of endpoints) {
    const idMutations = generateIdMutations(endpoint.path, maxMutationsPerEndpoint).map((mutation) => ({
      type: 'idor',
      path: mutation.path,
      original: mutation.original,
      strategy: mutation.strategy,
      headers: {}
    }));

    const queryCases = queryPayloads.slice(0, 2).map((payload) => ({
      type: 'param',
      path: addQueryPayload(endpoint.path, payload),
      original: endpoint.path,
      strategy: 'param-injection',
      headers: {}
    }));

    const headerCase = createHeaderAttack(endpoint.path);

    cases.push(...idMutations, ...queryCases, headerCase);
  }

  return cases;
}

module.exports = {
  generateAutoFuzzCases
};
