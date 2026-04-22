const { createLogger } = require('../utils/logger');

const logger = createLogger('networkCollector');

function createNetworkCollector({ endpointStore, realtime }) {
  async function recordRequest(userId, request, source = 'network') {
    const payload = {
      method: request.method(),
      url: request.url(),
      source,
      userId,
      request: {
        headers: request.headers(),
        body: request.postData ? request.postData() : null
      }
    };

    const endpoint = endpointStore.upsert(payload);
    realtime.emit('endpoint_discovered', {
      key: endpoint.key,
      method: endpoint.method,
      path: endpoint.path,
      source
    });
  }

  async function recordResponse(userId, response, source = 'network') {
    const request = response.request();
    let body = '';
    try {
      body = await response.text();
    } catch (_error) {
      body = '';
    }

    endpointStore.upsert({
      method: request.method(),
      url: response.url(),
      status: response.status(),
      source,
      userId,
      response: {
        status: response.status(),
        headers: response.headers(),
        body: body.slice(0, 2000)
      }
    });
  }

  function attach(page, userId) {
    if (!page || typeof page.on !== 'function') {
      logger.warn(`Skip network attach for ${userId}: page does not support events.`);
      return;
    }

    page.on('request', (request) => {
      recordRequest(userId, request).catch((error) => {
        logger.warn(`recordRequest failed: ${error.message}`);
      });
    });

    page.on('response', (response) => {
      recordResponse(userId, response).catch((error) => {
        logger.warn(`recordResponse failed: ${error.message}`);
      });
    });
  }

  function recordManual(entry) {
    endpointStore.upsert({
      ...entry,
      source: entry.source || 'manual'
    });
  }

  return {
    attach,
    recordManual
  };
}

module.exports = {
  createNetworkCollector
};
