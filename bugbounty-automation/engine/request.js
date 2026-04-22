const { URL } = require('url');

function toAbsoluteUrl(baseUrl, endpoint) {
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }
  return new URL(endpoint, baseUrl).toString();
}

async function parseResponseBody(apiResponse) {
  const text = await apiResponse.text();
  try {
    const parsed = JSON.parse(text);
    return {
      text,
      json: parsed
    };
  } catch (_error) {
    return {
      text,
      json: null
    };
  }
}

async function sendRequest({ session, baseUrl, endpoint, method = 'GET', headers = {}, body = null }) {
  const startedAt = Date.now();
  const url = toAbsoluteUrl(baseUrl, endpoint);
  const mergedHeaders = {
    ...(session?.headers || {}),
    ...headers
  };

  try {
    if (session?.request?.fetch) {
      const response = await session.request.fetch(url, {
        method,
        headers: mergedHeaders,
        data: body
      });

      const parsed = await parseResponseBody(response);
      return {
        url,
        method,
        status: response.status(),
        headers: response.headers(),
        durationMs: Date.now() - startedAt,
        ...parsed,
        error: null
      };
    }

    const nativeResponse = await fetch(url, {
      method,
      headers: mergedHeaders,
      body: body ? JSON.stringify(body) : undefined
    });

    const text = await nativeResponse.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch (_error) {
      json = null;
    }

    return {
      url,
      method,
      status: nativeResponse.status,
      headers: Object.fromEntries(nativeResponse.headers.entries()),
      durationMs: Date.now() - startedAt,
      text,
      json,
      error: null
    };
  } catch (error) {
    return {
      url,
      method,
      status: 0,
      headers: {},
      durationMs: Date.now() - startedAt,
      text: '',
      json: null,
      error: error.message
    };
  }
}

module.exports = {
  sendRequest,
  toAbsoluteUrl
};
