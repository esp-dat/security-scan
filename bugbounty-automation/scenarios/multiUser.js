const { sendRequest } = require('../engine/request');
const { compareResponses } = require('../detectors/responseDiff');

async function runMultiUserAttack({ endpoints, baseUrl, userA, userB, realtime }) {
  const results = [];

  for (const endpoint of endpoints) {
    const resA = await sendRequest({
      session: userA,
      baseUrl,
      endpoint: endpoint.path,
      method: 'GET'
    });

    const resB = await sendRequest({
      session: userB,
      baseUrl,
      endpoint: endpoint.path,
      method: 'GET'
    });

    const diff = compareResponses(resA, resB);
    const item = {
      path: endpoint.path,
      userA: resA,
      userB: resB,
      diff
    };

    results.push(item);

    realtime?.emit('multi_user_checked', {
      path: endpoint.path,
      similarity: diff.similarity,
      sameStatus: diff.sameStatus
    });
  }

  return results;
}

module.exports = {
  runMultiUserAttack
};
