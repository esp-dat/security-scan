const { createLogger } = require('../utils/logger');
const { getProxyOptions } = require('./proxy');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch (error) {
  chromium = null;
}

const logger = createLogger('browser');

function createMockRequest(method, url, headers = {}, postData = null) {
  return {
    method: () => method,
    url: () => url,
    headers: () => headers,
    postData: () => postData
  };
}

function createMockResponse(url, statusCode, body, request) {
  const headers = {
    'content-type': 'application/json'
  };

  return {
    url: () => url,
    status: () => statusCode,
    headers: () => headers,
    request: () => request,
    text: async () => body
  };
}

function createMockPage(label = 'mock') {
  const listeners = new Map();
  let currentUrl = 'about:blank';

  const emit = async (event, payload) => {
    const handlers = listeners.get(event) || [];
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (error) {
        logger.warn(`Mock listener error on ${event}: ${error.message}`);
      }
    }
  };

  return {
    __isMock: true,
    label,
    on(event, handler) {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event).push(handler);
    },
    url() {
      return currentUrl;
    },
    async goto(url) {
      currentUrl = url;
      const request = createMockRequest('GET', url);
      const body = JSON.stringify({ ok: true, page: url, label });
      const response = createMockResponse(url, 200, body, request);
      await emit('request', request);
      await emit('response', response);
      return response;
    },
    async waitForTimeout(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    async $$eval(selector, callback) {
      if (selector !== 'a[href]') {
        return [];
      }

      const hrefs = [
        'https://example.com/app',
        'https://example.com/profile',
        'https://example.com/orders',
        'https://example.com/api/users',
        'https://example.com/api/orders/123',
        'https://example.com/api/admin/config'
      ];

      return typeof callback === 'function' ? callback(hrefs.map((href) => ({ href }))) : hrefs;
    },
    async $$(selector) {
      if (selector !== 'button') {
        return [];
      }

      return Array.from({ length: 2 }).map((_, index) => ({
        async click() {
          currentUrl = `${currentUrl.split('#')[0]}#button-${index}`;
        }
      }));
    },
    async $eval() {
      return null;
    }
  };
}

async function launchBrowser(config) {
  if (config.mockMode || !chromium) {
    logger.warn('Running in mock browser mode (Playwright disabled or unavailable).');
    return createMockBrowser();
  }

  try {
    logger.info(`Launching Playwright Chromium (headless=${String(config.headless)})`);
    return await chromium.launch({
      headless: config.headless,
      proxy: getProxyOptions()
    });
  } catch (error) {
    logger.warn(`Playwright launch failed, fallback to mock browser: ${error.message}`);
    return createMockBrowser();
  }
}

function createMockBrowser() {
  return {
    __isMock: true,
    async newContext() {
      return {
        __isMock: true,
        async newPage() {
          return createMockPage();
        },
        async close() {}
      };
    },
    async close() {}
  };
}

module.exports = {
  launchBrowser,
  createMockRequest,
  createMockResponse
};
