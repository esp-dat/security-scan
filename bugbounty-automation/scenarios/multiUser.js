const { sendRequest } = require('../engine/request');
const { compareResponses } = require('../detectors/responseDiff');

async function runMultiUserAttack({ endpoints, baseUrl, userA, userB, realtime }) {
  const results = [];

  for (const endpoint of endpoints) {
    const method = endpoint.validatedMethod || endpoint.method || 'GET';
    const target = endpoint.url || endpoint.path;
    const body = endpoint.sampleRequestBody || null;

    const resA = await sendRequest({
      session: userA,
      baseUrl,
      endpoint: target,
      method,
      body: ['GET', 'HEAD', 'OPTIONS'].includes(method) ? null : body
    });

    const resB = await sendRequest({
      session: userB,
      baseUrl,
      endpoint: target,
      method,
      body: ['GET', 'HEAD', 'OPTIONS'].includes(method) ? null : body
    });

    const diff = compareResponses(resA, resB);
    const item = {
      path: endpoint.path,
      method,
      url: target,
      userA: resA,
      userB: resB,
      diff
    };

    results.push(item);

    realtime?.emit('multi_user_checked', {
      path: endpoint.path,
      method,
      similarity: diff.similarity,
      sameStatus: diff.sameStatus
    });
  }

  return results;
}

module.exports = {
  runMultiUserAttack
};
