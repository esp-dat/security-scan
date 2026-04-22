const { URL } = require('url');
const { createLogger } = require('../utils/logger');
const { createMockRequest, createMockResponse } = require('./browser');

const logger = createLogger('context');

function normalizeUrl(baseUrl, path) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return new URL(path, baseUrl).toString();
}

function getMockBody(pathname, user) {
  const cleanPath = pathname.replace(/\/$/, '');

  if (cleanPath === '/api/users') {
    return {
      items: [
        { id: 101, owner: user.id, email: user.username },
        { id: 102, owner: user.id, email: `${user.id}+alt@example.com` }
      ]
    };
  }

  if (cleanPath.startsWith('/api/orders/')) {
    const id = Number(cleanPath.split('/').pop()) || 123;
    return {
      id,
      owner: 'userA',
      amount: 9900,
      currency: 'USD',
      note: 'shared-order-object'
    };
  }

  if (cleanPath === '/api/admin/config') {
    return {
      error: 'forbidden'
    };
  }

  if (cleanPath === '/api/profile') {
    return {
      id: user.id,
      email: user.username,
      token_preview: `tok_${user.id}_123`
    };
  }

  return {
    ok: true,
    endpoint: cleanPath,
    user: user.id
  };
}

function createMockApiResponse(url, method, user, bodyOverride) {
  const parsed = new URL(url);
  const path = parsed.pathname;
  const request = createMockRequest(method, url, { authorization: `Bearer ${user.id}-token` });

  const statusCode = path === '/api/admin/config' ? 403 : 200;
  const payload = bodyOverride || getMockBody(path, user);
  const body = JSON.stringify(payload);
  return createMockResponse(url, statusCode, body, request);
}

async function tryLogin(page, config, user) {
  if (!config.auth.loginUrl) {
    return;
  }

  try {
    await page.goto(config.auth.loginUrl);
    await page.fill(config.auth.usernameSelector, user.username);
    await page.fill(config.auth.passwordSelector, user.password);
    await page.click(config.auth.submitSelector);
    await page.waitForTimeout(400);
    logger.info(`Logged in ${user.id}`);
  } catch (error) {
    logger.warn(`Login skipped for ${user.id}: ${error.message}`);
  }
}

function createMockSession(targetUrl, user) {
  return {
    id: user.id,
    role: user.role,
    headers: {
      authorization: `Bearer ${user.id}-token`,
      'x-user-id': user.id
    },
    request: {
      async fetch(url, options = {}) {
        const absolute = normalizeUrl(targetUrl, url);
        const method = options.method || 'GET';
        return createMockApiResponse(absolute, method, user);
      }
    }
  };
}

async function createBrowserContexts(browser, config) {
  const users = [config.users.userA, config.users.userB];
  const sessions = {};

  if (browser.__isMock) {
    for (const user of users) {
      const pageContext = await browser.newContext();
      const page = await pageContext.newPage();
      const session = createMockSession(config.targetUrl, user);
      sessions[user.id] = {
        ...session,
        context: pageContext,
        page
      };
    }

    return {
      userA: sessions.userA,
      userB: sessions.userB,
      async closeAll() {
        await Promise.all(Object.values(sessions).map((session) => session.context.close()));
      }
    };
  }

  for (const user of users) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await tryLogin(page, config, user);

    sessions[user.id] = {
      id: user.id,
      role: user.role,
      context,
      page,
      headers: {
        'x-user-id': user.id
      },
      request: context.request
    };
  }

  return {
    userA: sessions.userA,
    userB: sessions.userB,
    async closeAll() {
      await Promise.all(Object.values(sessions).map((session) => session.context.close()));
    }
  };
}

module.exports = {
  createBrowserContexts
};
