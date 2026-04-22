function aiExpandEndpoints(seedEndpoints = []) {
  const expanded = new Set();

  for (const seed of seedEndpoints) {
    expanded.add(seed);

    if (seed.includes('/users')) {
      expanded.add('/api/users/me');
      expanded.add('/api/users/1');
      expanded.add('/api/users/2');
      expanded.add('/api/admin/users');
    }

    if (seed.includes('/orders')) {
      expanded.add('/api/orders/1');
      expanded.add('/api/orders/2');
      expanded.add('/api/orders/search');
    }

    if (seed.includes('/admin')) {
      expanded.add('/api/admin/audit');
      expanded.add('/api/admin/config');
    }
  }

  return Array.from(expanded);
}

module.exports = {
  aiExpandEndpoints
};
