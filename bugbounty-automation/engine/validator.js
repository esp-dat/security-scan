const { sendRequest } = require('./request');

function isAliveStatus(status) {
  return status > 0 && status !== 404;
}

function normalizeMethod(value) {
  return (value || 'GET').toUpperCase();
}

async function validateSingleEndpoint({ endpoint, session, baseUrl }) {
  const originalMethod = normalizeMethod(endpoint.method);
  const requestTarget = endpoint.url || endpoint.path;
  const originalBody = endpoint.sampleRequestBody || null;

  const primary = await sendRequest({
    session,
    baseUrl,
    endpoint: requestTarget,
    method: originalMethod,
    body: ['GET', 'HEAD', 'OPTIONS'].includes(originalMethod) ? null : originalBody
  });

  if (isAliveStatus(primary.status) || originalMethod === 'GET') {
    return {
      ...primary,
      methodUsed: originalMethod
    };
  }

  const fallback = await sendRequest({
    session,
    baseUrl,
    endpoint: requestTarget,
    method: 'GET'
  });

  if (isAliveStatus(fallback.status)) {
    return {
      ...fallback,
      methodUsed: 'GET'
    };
  }

  return {
    ...primary,
    methodUsed: originalMethod
  };
}

async function validateEndpoints({ endpoints, session, baseUrl, realtime }) {
  const alive = [];
  const dead = [];
  const attempts = [];

  for (const endpoint of endpoints) {
    const result = await validateSingleEndpoint({
      endpoint,
      session,
      baseUrl
    });

    const attempt = {
      path: endpoint.path,
      url: result.url,
      method: result.methodUsed,
      status: result.status,
      durationMs: result.durationMs,
      error: result.error
    };

    attempts.push(attempt);

    if (isAliveStatus(result.status)) {
      alive.push({
        ...endpoint,
        method: result.methodUsed,
        url: result.url,
        status: result.status,
        validatedMethod: result.methodUsed,
        sample: result.text.slice(0, 300)
      });
    } else {
      dead.push({
        ...endpoint,
        method: result.methodUsed,
        url: result.url,
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
