# BugBounty Automation

Automated web/API scanner pipeline with:

- Crawler (Playwright with mock fallback)
- API discovery engine (network + DOM + wordlist + AI expansion)
- Fuzzer (ID mutation + param/header attacks)
- Multi-user comparison (IDOR-oriented)
- Detectors (IDOR, leak, anomaly)
- Scoring + auth analysis + API graph
- Realtime stream to dashboard (WebSocket)

## Quick Start

### 1) Install dependencies

```bash
npm install
npm --prefix web/dashboard install
```

### 2) Run scan

```bash
npm run scan
```

Report is written to:

```bash
data/results.json
```

### 3) Start backend dashboard server

```bash
npm run server
```

Backend endpoints:

- `GET /api/health`
- `GET /api/results`
- `GET /api/events`
- `POST /api/events`
- `POST /api/replay`
- `WS /ws`

### 4) Run frontend dashboard

```bash
npm run dashboard:dev
```

or build:

```bash
npm run dashboard:build
```

## Main Flow

`runner/index.js` orchestrates:

1. Open browser contexts for user A and user B
2. Attach network collector
3. Crawl target
4. Discover endpoints
5. Validate alive endpoints
6. Generate fuzz cases
7. Run multi-user checks
8. Run detectors
9. Score endpoints + build auth/graph analysis
10. Emit realtime events + save JSON report

## Env Config

Use environment variables if needed:

- `TARGET_URL`
- `HEADLESS`
- `MOCK_MODE`
- `OUTPUT_FILE`
- `REALTIME_ENABLED`
- `REALTIME_SERVER_URL`
- `CRAWLER_MAX_PAGES`
- `CRAWLER_MAX_DEPTH`
- `FUZZING_ENABLED`
- `FUZZING_MAX_MUTATIONS`
- `AI_DISCOVERY`
- `KEEP_BROWSER_OPEN=true` (keep browser open for debug)
- `KEEP_BROWSER_OPEN_MS=30000` (optional auto-close delay in ms)

## Notes

- If Playwright browser binaries are missing, scanner automatically falls back to mock mode.
- To run real browser crawling, install binaries:

```bash
npx playwright install
```
