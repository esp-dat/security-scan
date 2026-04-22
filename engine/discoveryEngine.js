const { aiExpandEndpoints } = require('../ai/discovery');

const NOISE_EXTENSIONS = /\.(?:js|css|png|jpe?g|gif|svg|ico|woff2?|ttf|map)(?:$|\?)/i;
const NOISE_PREFIXES = [
  '/_next/',
  '/fonts/',
  '/font/',
  '/svgs/',
  '/inter/',
  '/s/inter/',
  '/script/',
  '/sdks/',
  '/sync/',
  '/sub/',
  '/gsi/',
  '/en_US/',
  '/c/'
];
const NOISE_EXACT_PATHS = new Set(['/rw.js', '/css2', '/favicon.png']);
const TELEMETRY_PATTERNS = [/tracking-session/i, /\/v1\/traces/i, /onesignal/i, /hotjar/i];

function normalizeUrlAndPath(value) {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    try {
      const parsed = new URL(value);
      return {
        url: parsed.toString(),
        path: parsed.pathname
      };
    } catch (_error) {
      return null;
    }
  }

  const path = value.startsWith('/') ? value : `/${value}`;
  return {
    url: null,
    path
  };
}

function isLikelyApiPath(path) {
  return (
    /^\/api\//i.test(path) ||
    /^\/workspace\/api\//i.test(path) ||
    /^\/auth\/api\//i.test(path) ||
    /^\/graphql(?:\/|$)/i.test(path) ||
    /^\/v\d+\//i.test(path)
  );
}

function isNoisePath(path) {
  if (!path) {
    return true;
  }

  if (NOISE_EXACT_PATHS.has(path)) {
    return true;
  }

  if (NOISE_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return true;
  }

  if (NOISE_EXTENSIONS.test(path)) {
    return true;
  }

  if (TELEMETRY_PATTERNS.some((pattern) => pattern.test(path))) {
    return true;
  }

  return false;
}

function isActionablePath(path) {
  return isLikelyApiPath(path) && !isNoisePath(path);
}

function deriveWordlistPrefixes(networkEndpoints = []) {
  const prefixes = new Set();

  for (const endpoint of networkEndpoints) {
    const match = endpoint.path.match(/^\/(?:workspace\/api\/v\d+|auth\/api\/v\d+|api\/v\d+|api)/i);
    if (match) {
      prefixes.add(match[0]);
    }
  }

  if (prefixes.size === 0) {
    prefixes.add('/api');
  }

  return Array.from(prefixes);
}

function fromNetwork(endpointStore) {
  return endpointStore
    .getAll()
    .filter((entry) => isActionablePath(entry.path))
    .map((entry) => ({
      path: entry.path,
      method: entry.method || 'GET',
      url: entry.url,
      sampleRequestBody: entry.sampleRequest?.body || null
    }));
}

function fromDomLinks(links = []) {
  return links
    .map((link) => normalizeUrlAndPath(link))
    .filter(Boolean)
    .filter((item) => isActionablePath(item.path))
    .map((item) => ({
      path: item.path,
      method: 'GET',
      url: item.url,
      sampleRequestBody: null
    }));
}

function fromWordlist(networkEndpoints, wordlist = []) {
  const prefixes = deriveWordlistPrefixes(networkEndpoints);
  const results = [];

  for (const prefix of prefixes) {
    for (const word of wordlist) {
      results.push({
        path: `${prefix}/${word}`,
        method: 'GET',
        url: null,
        sampleRequestBody: null
      });
    }
  }

  return results
    .map((item) => ({
      ...item,
      path: item.path.replace(/\/{2,}/g, '/')
    }))
    .filter((item) => isActionablePath(item.path));
}

function fromAiExpansion(seedPaths = []) {
  return aiExpandEndpoints(seedPaths)
    .map((path) => normalizeUrlAndPath(path))
    .filter(Boolean)
    .filter((item) => isActionablePath(item.path))
    .map((item) => ({
      path: item.path,
      method: 'GET',
      url: item.url,
      sampleRequestBody: null
    }));
}

async function discoverEndpoints({ endpointStore, crawlerResult, wordlist = [], aiEnabled = true, realtime }) {
  const network = fromNetwork(endpointStore);
  const dom = fromDomLinks(crawlerResult.links || []);
  const brute = fromWordlist(network, wordlist);
  const ai = aiEnabled ? fromAiExpansion([...network, ...dom].map((item) => item.path)) : [];

  const byMethodAndPath = new Map();

  const ingest = (records, source) => {
    for (const record of records) {
      const method = (record.method || 'GET').toUpperCase();
      const key = `${method} ${record.path}`;

      if (!byMethodAndPath.has(key)) {
        byMethodAndPath.set(key, {
          path: record.path,
          method,
          url: record.url || null,
          sampleRequestBody: record.sampleRequestBody || null,
          sources: new Set()
        });
      }

      const current = byMethodAndPath.get(key);
      current.sources.add(source);
      if (!current.url && record.url) {
        current.url = record.url;
      }
      if (!current.sampleRequestBody && record.sampleRequestBody) {
        current.sampleRequestBody = record.sampleRequestBody;
      }
    }
  };

  ingest(network, 'network');
  ingest(dom, 'dom');
  ingest(brute, 'wordlist');
  ingest(ai, 'ai');

  const discovered = Array.from(byMethodAndPath.values()).map((item) => ({
    path: item.path,
    method: item.method,
    url: item.url,
    sampleRequestBody: item.sampleRequestBody,
    sources: Array.from(item.sources)
  }));

  realtime?.emit('discovery_completed', {
    total: discovered.length
  });

  return discovered;
}

module.exports = {
  discoverEndpoints
};
