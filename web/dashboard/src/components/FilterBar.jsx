const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];

export default function FilterBar({ filters, onChange }) {
  return (
    <section className="filters">
      <label>
        <span>Search</span>
        <input
          placeholder="/api/users"
          value={filters.search}
          onChange={(event) => onChange((prev) => ({ ...prev, search: event.target.value }))}
        />
      </label>

      <label>
        <span>Severity</span>
        <select
          value={filters.severity}
          onChange={(event) => onChange((prev) => ({ ...prev, severity: event.target.value }))}
        >
          {severities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
