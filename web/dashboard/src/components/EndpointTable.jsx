function severityBadge(findings = []) {
  if (!findings.length) {
    return 'NONE';
  }

  if (findings.some((item) => item.severity === 'CRITICAL')) {
    return 'CRITICAL';
  }

  if (findings.some((item) => item.severity === 'HIGH')) {
    return 'HIGH';
  }

  if (findings.some((item) => item.severity === 'MEDIUM')) {
    return 'MEDIUM';
  }

  return 'LOW';
}

export default function EndpointTable({ endpoints, findingsByPath, onSelect, selectedPath }) {
  return (
    <section className="table-card">
      <div className="table-headline">
        <h2>Endpoint Inventory</h2>
        <span>{endpoints.length} rows</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Path</th>
              <th>Auth</th>
              <th>Score</th>
              <th>Severity</th>
              <th>Sources</th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map((endpoint) => {
              const findings = findingsByPath.get(endpoint.path) || [];
              const severity = severityBadge(findings);

              return (
                <tr
                  key={endpoint.path}
                  className={selectedPath === endpoint.path ? 'selected' : ''}
                  onClick={() => onSelect({ ...endpoint, findings })}
                >
                  <td>{endpoint.path}</td>
                  <td>{endpoint.auth}</td>
                  <td>{endpoint.score}</td>
                  <td>
                    <span className={`severity ${severity.toLowerCase()}`}>{severity}</span>
                  </td>
                  <td>{(endpoint.sources || []).join(', ') || 'n/a'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
