export default function JsonViewer({ title, value }) {
  return (
    <section className="json-viewer">
      <div className="json-title">{title}</div>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </section>
  );
}
