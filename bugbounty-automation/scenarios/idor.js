const { sendRequest } = require('../engine/request');
const { generateIdMutations } = require('../fuzzers/idFuzzer');

async function runIdorScenario({ endpoint, baseUrl, userA, userB }) {
  const mutations = generateIdMutations(endpoint.path, 4);
  const results = [];

  for (const mutation of mutations) {
    const resA = await sendRequest({
      session: userA,
      baseUrl,
      endpoint: mutation.path,
      method: 'GET'
    });

    const resB = await sendRequest({
      session: userB,
      baseUrl,
      endpoint: mutation.path,
      method: 'GET'
    });

    results.push({
      mutation,
      userA: resA,
      userB: resB
    });
  }

  return results;
}

module.exports = {
  runIdorScenario
};
