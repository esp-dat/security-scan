const { URL } = require('url');
const { createLogger } = require('../utils/logger');

const logger = createLogger('crawler');

function normalize(baseUrl, candidate) {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch (_error) {
    return null;
  }
}

function toPath(url) {
  try {
    return new URL(url).pathname;
  } catch (_error) {
    return '/';
  }
}

async function extractLinks(page, baseUrl) {
  try {
    const hrefs = await page.$$eval('a[href]', (anchors) => anchors.map((item) => item.href || '').filter(Boolean));
    return hrefs
      .map((href) => normalize(baseUrl, href))
      .filter(Boolean);
  } catch (error) {
    logger.warn(`extractLinks failed: ${error.message}`);
    return [];
  }
}

async function clickButtons(page, maxButtonsPerPage) {
  try {
    const buttons = await page.$$('button');
    const selected = buttons.slice(0, maxButtonsPerPage);

    for (const button of selected) {
      try {
        await button.click();
        await page.waitForTimeout(100);
      } catch (_error) {
        // Ignore click errors in aggressive crawling mode.
      }
    }

    return selected.length;
  } catch (_error) {
    return 0;
  }
}

async function submitForms(page) {
  try {
    await page.$eval('form', (form) => {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.submit();
      }
    });
    await page.waitForTimeout(200);
    return 1;
  } catch (_error) {
    return 0;
  }
}

async function crawlSite(page, startUrl, options = {}) {
  const {
    maxPages = 20,
    maxDepth = 2,
    maxButtonsPerPage = 5,
    submitForms: shouldSubmitForms = true,
    realtime
  } = options;

  const queue = [{ url: startUrl, depth: 0 }];
  const visited = new Set();
  const discoveredLinks = new Set();
  const activity = [];

  while (queue.length && visited.size < maxPages) {
    const current = queue.shift();

    if (visited.has(current.url) || current.depth > maxDepth) {
      continue;
    }

    visited.add(current.url);
    realtime?.emit('crawler_visit', {
      url: current.url,
      depth: current.depth
    });

    try {
      await page.goto(current.url, {
        waitUntil: 'domcontentloaded'
      });
    } catch (error) {
      logger.warn(`Failed to open ${current.url}: ${error.message}`);
      continue;
    }

    const clicked = await clickButtons(page, maxButtonsPerPage);
    const submitted = shouldSubmitForms ? await submitForms(page) : 0;
    const links = await extractLinks(page, startUrl);

    for (const link of links) {
      discoveredLinks.add(link);
      if (!visited.has(link)) {
        queue.push({
          url: link,
          depth: current.depth + 1
        });
      }
    }

    activity.push({
      url: current.url,
      path: toPath(current.url),
      depth: current.depth,
      clicked,
      submitted,
      linkCount: links.length
    });
  }

  return {
    visited: Array.from(visited),
    links: Array.from(discoveredLinks),
    activity
  };
}

module.exports = {
  crawlSite
};
