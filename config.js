const path = require('path');

module.exports = {
  targetUrl: process.env.TARGET_URL || 'https://example.com',
  headless: process.env.HEADLESS !== 'false',
  mockMode: process.env.MOCK_MODE === 'true',
  debug: {
    keepBrowserOpen: process.env.KEEP_BROWSER_OPEN === 'true',
    keepBrowserOpenMs: Number(process.env.KEEP_BROWSER_OPEN_MS || 0)
  },
  outputFile: process.env.OUTPUT_FILE || path.resolve(__dirname, 'data/results.json'),
  realtime: {
    enabled: process.env.REALTIME_ENABLED !== 'false',
    serverUrl: process.env.REALTIME_SERVER_URL || 'http://localhost:8787'
  },
  crawler: {
    maxPages: Number(process.env.CRAWLER_MAX_PAGES || 25),
    maxDepth: Number(process.env.CRAWLER_MAX_DEPTH || 2),
    maxButtonsPerPage: Number(process.env.CRAWLER_MAX_BUTTONS || 5),
    submitForms: process.env.CRAWLER_SUBMIT_FORMS !== 'false'
  },
  discovery: {
    wordlist: ['users', 'orders', 'profile', 'admin', 'settings', 'reports', 'billing'],
    aiExpand: process.env.AI_DISCOVERY !== 'false'
  },
  fuzzing: {
    enabled: process.env.FUZZING_ENABLED !== 'false',
    maxMutationsPerEndpoint: Number(process.env.FUZZING_MAX_MUTATIONS || 6)
  },
  users: {
    userA: {
      id: 'userA',
      username: process.env.USER_A || 'userA@example.com',
      password: process.env.PASS_A || 'passwordA',
      role: 'standard'
    },
    userB: {
      id: 'userB',
      username: process.env.USER_B || 'userB@example.com',
      password: process.env.PASS_B || 'passwordB',
      role: 'standard'
    }
  },
  auth: {
    loginUrl: process.env.LOGIN_URL || '',
    usernameSelector: process.env.LOGIN_USER_SELECTOR || 'input[name="email"]',
    passwordSelector: process.env.LOGIN_PASS_SELECTOR || 'input[name="password"]',
    submitSelector: process.env.LOGIN_SUBMIT_SELECTOR || 'button[type="submit"]'
  }
};
