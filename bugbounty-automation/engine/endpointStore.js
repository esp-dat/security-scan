const { URL } = require('url');

class EndpointStore {
  constructor() {
    this.map = new Map();
  }

  static keyOf(method, url) {
    return `${method.toUpperCase()} ${url}`;
  }

  upsert(record) {
    const key = EndpointStore.keyOf(record.method || 'GET', record.url);
    const parsedUrl = new URL(record.url);

    if (!this.map.has(key)) {
      this.map.set(key, {
        key,
        method: (record.method || 'GET').toUpperCase(),
        url: record.url,
        path: parsedUrl.pathname,
        firstSeenAt: Date.now(),
        lastSeenAt: Date.now(),
        hitCount: 0,
        statuses: new Set(),
        sources: new Set(),
        users: new Set(),
        sampleRequest: null,
        sampleResponse: null
      });
    }

    const existing = this.map.get(key);
    existing.lastSeenAt = Date.now();
    existing.hitCount += 1;

    if (record.status) {
      existing.statuses.add(record.status);
    }

    if (record.source) {
      existing.sources.add(record.source);
    }

    if (record.userId) {
      existing.users.add(record.userId);
    }

    if (record.request && !existing.sampleRequest) {
      existing.sampleRequest = record.request;
    }

    if (record.response) {
      existing.sampleResponse = record.response;
    }

    return existing;
  }

  getAll() {
    return Array.from(this.map.values()).map((item) => ({
      ...item,
      statuses: Array.from(item.statuses),
      sources: Array.from(item.sources),
      users: Array.from(item.users)
    }));
  }

  getPaths() {
    return Array.from(new Set(this.getAll().map((entry) => entry.path)));
  }
}

module.exports = {
  EndpointStore
};
