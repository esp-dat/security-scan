const { sendRequest } = require('./request');

function isAliveStatus(status) {
  return status !== 404 && status !== 405 && status !== 501 && status !== 0;
}

async function validateEndpoints({ endpoints, session, baseUrl, realtime }) {
  const alive = [];
  const dead = [];
  const attempts = [];

  for (const endpoint of endpoints) {
    const result = await sendRequest({
      session,
      baseUrl,
      endpoint: endpoint.path,
      method: 'GET'
    });

    const attempt = {
      path: endpoint.path,
      status: result.status,
      durationMs: result.durationMs,
      error: result.error
    };

    attempts.push(attempt);

    if (isAliveStatus(result.status)) {
      alive.push({
        ...endpoint,
        status: result.status,
        sample: result.text.slice(0, 300)
      });
    } else {
      dead.push({
        ...endpoint,
        status: result.status
      });
    }

    realtime?.emit('endpoint_validated', attempt);
  }

  return {
    alive,
    dead,
    attempts
  };
}

module.exports = {
  validateEndpoints
};
