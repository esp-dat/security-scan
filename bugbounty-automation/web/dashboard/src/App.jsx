import { useEffect, useMemo, useState } from 'react';
import EndpointTable from './components/EndpointTable';
import FilterBar from './components/FilterBar';
import JsonViewer from './components/JsonViewer';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8787';

const emptyReport = {
  generatedAt: null,
  target: null,
  summary: {
    endpointsDiscovered: 0,
    endpointsValidated: 0,
    vulnerabilities: 0,
    highestScore: 0
  },
  endpoints: [],
  findings: []
};

function toWsUrl(apiBase) {
  if (apiBase.startsWith('https://')) {
    return apiBase.replace('https://', 'wss://') + '/ws';
  }
  return apiBase.replace('http://', 'ws://') + '/ws';
}

export default function App() {
  const [report, setReport] = useState(emptyReport);
  const [events, setEvents] = useState([]);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    severity: 'ALL'
  });

  const refreshReport = async () => {
    const response = await fetch(`${API_BASE}/api/results`);
    const data = await response.json();
    setReport(data);
  };

  useEffect(() => {
    refreshReport().catch(() => {
      setReport(emptyReport);
    });

    fetch(`${API_BASE}/api/events`)
      .then((res) => res.json())
      .then((data) => setEvents(data.items || []))
      .catch(() => setEvents([]));

    const socket = new WebSocket(toWsUrl(API_BASE));

    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data);
        setEvents((prev) => [event, ...prev].slice(0, 100));

        if (event.type === 'results_updated' || event.type === 'scan_completed') {
          refreshReport().catch(() => {});
        }
      } catch (_error) {
        // ignore malformed events
      }
    };

    return () => socket.close();
  }, []);

  const findingsByPath = useMemo(() => {
    const map = new Map();
    for (const finding of report.findings || []) {
      if (!map.has(finding.path)) {
        map.set(finding.path, []);
      }
      map.get(finding.path).push(finding);
    }
    return map;
  }, [report.findings]);

  const filteredEndpoints = useMemo(() => {
    const search = filters.search.toLowerCase().trim();

    return (report.endpoints || []).filter((endpoint) => {
      const severityMatch =
        filters.severity === 'ALL' ||
        (findingsByPath.get(endpoint.path) || []).some((finding) => finding.severity === filters.severity);

      const textMatch =
        search.length === 0 ||
        endpoint.path.toLowerCase().includes(search) ||
        endpoint.auth.toLowerCase().includes(search);

      return severityMatch && textMatch;
    });
  }, [report.endpoints, filters, findingsByPath]);

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Bug Bounty Automation</p>
        <h1>API Attack Surface Command Center</h1>
        <p className="subtitle">
          Crawl, discover, fuzz, compare multi-user behavior, and rank vulnerabilities in real time.
        </p>
      </header>

      <section className="summary-grid">
        <article>
          <p>Endpoints</p>
          <strong>{report.summary.endpointsValidated}</strong>
          <span>validated</span>
        </article>
        <article>
          <p>Vulnerabilities</p>
          <strong>{report.summary.vulnerabilities}</strong>
          <span>findings</span>
        </article>
        <article>
          <p>Top Risk Score</p>
          <strong>{report.summary.highestScore}</strong>
          <span>out of 100</span>
        </article>
        <article>
          <p>Generated At</p>
          <strong>{report.generatedAt ? new Date(report.generatedAt).toLocaleTimeString() : '--:--'}</strong>
          <span>{report.target || 'No target yet'}</span>
        </article>
      </section>

      <FilterBar filters={filters} onChange={setFilters} />

      <main className="content-grid">
        <EndpointTable
          endpoints={filteredEndpoints}
          findingsByPath={findingsByPath}
          onSelect={setSelectedEndpoint}
          selectedPath={selectedEndpoint?.path}
        />

        <aside className="side-panel">
          <JsonViewer title="Endpoint Details" value={selectedEndpoint || { message: 'Select an endpoint' }} />
          <JsonViewer title="Realtime Stream (latest 10)" value={events.slice(0, 10)} />
        </aside>
      </main>
    </div>
  );
}
