function parentPath(path) {
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) {
    return '/';
  }
  return `/${parts.slice(0, -1).join('/')}`;
}

function buildApiGraph(endpoints = []) {
  const nodesMap = new Map();
  const edgesMap = new Map();

  for (const endpoint of endpoints) {
    const path = endpoint.path || '/';

    if (!nodesMap.has(path)) {
      nodesMap.set(path, {
        id: path,
        path,
        hits: 0
      });
    }

    nodesMap.get(path).hits += endpoint.hitCount || 1;

    const parent = parentPath(path);
    if (parent && parent !== path) {
      const edgeKey = `${parent} -> ${path}`;
      if (!edgesMap.has(edgeKey)) {
        edgesMap.set(edgeKey, {
          from: parent,
          to: path,
          weight: 0
        });
      }
      edgesMap.get(edgeKey).weight += 1;

      if (!nodesMap.has(parent)) {
        nodesMap.set(parent, {
          id: parent,
          path: parent,
          hits: 0
        });
      }
    }
  }

  return {
    nodes: Array.from(nodesMap.values()),
    edges: Array.from(edgesMap.values())
  };
}

module.exports = {
  buildApiGraph
};
