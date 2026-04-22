const config = require('../config');
const { launchBrowser } = require('../engine/browser');
const { createBrowserContexts } = require('../engine/context');
const { createNetworkCollector } = require('../engine/networkCollector');
const { EndpointStore } = require('../engine/endpointStore');
const { crawlSite } = require('../engine/crawler');
const { discoverEndpoints } = require('../engine/discoveryEngine');
const { validateEndpoints } = require('../engine/validator');
const { analyzeAuth } = require('../engine/authDetector');
const { buildApiGraph } = require('../engine/apiGraph');
const { scoreResults } = require('../engine/scorer');
const { generateAutoFuzzCases } = require('../fuzzers/autoFuzzer');
const { runMultiUserAttack } = require('../scenarios/multiUser');
const { detectIdorFindings } = require('../detectors/idorDetector');
const { detectLeakFindings } = require('../detectors/leakDetector');
const { detectAnomalies } = require('../detectors/anomalyDetector');
const { suggestAttackVectors, analyzeResponseHints } = require('../ai/agent');
const { createRealtime } = require('../utils/realtime');
const { createLogger } = require('../utils/logger');
const { saveReport } = require('../utils/saveReport');

const logger = createLogger('runner');

function uniqueFindings(findings) {
  const map = new Map();
  for (const finding of findings) {
    const key = `${finding.type}|${finding.path}|${finding.evidence}`;
    map.set(key, finding);
  }
  return Array.from(map.values());
}

async function runScan() {
  const realtime = createRealtime(config.realtime);
  const endpointStore = new EndpointStore();
  const networkCollector = createNetworkCollector({ endpointStore, realtime });

  realtime.on('event', (event) => {
    if (event.type === 'vulnerability_found') {
      logger.warn(`Vulnerability found: ${event.payload.type} at ${event.payload.path}`);
    }
  });

  const browser = await launchBrowser(config);
  const contexts = await createBrowserContexts(browser, config);

  networkCollector.attach(contexts.userA.page, contexts.userA.id);
  networkCollector.attach(contexts.userB.page, contexts.userB.id);

  try {
    logger.info('Starting crawler');
    const crawlerResult = await crawlSite(contexts.userA.page, config.targetUrl, {
      ...config.crawler,
      realtime
    });

    logger.info('Starting discovery engine');
    const discoveredEndpoints = await discoverEndpoints({
      endpointStore,
      crawlerResult,
      wordlist: config.discovery.wordlist,
      aiEnabled: config.discovery.aiExpand,
      realtime
    });

    logger.info('Validating endpoints');
    const validation = await validateEndpoints({
      endpoints: discoveredEndpoints,
      session: contexts.userA,
      baseUrl: config.targetUrl,
      realtime
    });

    logger.info('Generating fuzz cases');
    const fuzzCases = config.fuzzing.enabled
      ? generateAutoFuzzCases(validation.alive, {
          maxMutationsPerEndpoint: config.fuzzing.maxMutationsPerEndpoint
        })
      : [];

    realtime.emit('fuzzing_completed', {
      totalCases: fuzzCases.length
    });

    logger.info('Running multi-user attack');
    const multiUserResults = await runMultiUserAttack({
      endpoints: validation.alive,
      baseUrl: config.targetUrl,
      userA: contexts.userA,
      userB: contexts.userB,
      realtime
    });

    const idorFindings = detectIdorFindings(multiUserResults);
    const leakFindings = detectLeakFindings(multiUserResults);
    const anomalyFindings = detectAnomalies({
      validationAttempts: validation.attempts,
      multiUserResults
    });

    const findings = uniqueFindings([...idorFindings, ...leakFindings, ...anomalyFindings]);

    for (const finding of findings) {
      realtime.emit('vulnerability_found', finding);
    }

    const authMap = analyzeAuth({
      validatedAttempts: validation.attempts,
      multiUserResults
    });

    const networkEndpoints = endpointStore.getAll();
    const graph = buildApiGraph(networkEndpoints);
    const scored = scoreResults({
      endpoints: validation.alive,
      findings,
      authMap
    });

    const enrichedEndpoints = scored.scoredEndpoints.map((endpoint) => {
      const responseSample = validation.alive.find((item) => item.path === endpoint.path)?.sample || '';
      return {
        ...endpoint,
        aiSuggestions: suggestAttackVectors(endpoint),
        aiResponseHints: analyzeResponseHints(responseSample)
      };
    });

    const report = {
      generatedAt: new Date().toISOString(),
      target: config.targetUrl,
      summary: {
        endpointsDiscovered: discoveredEndpoints.length,
        endpointsValidated: validation.alive.length,
        vulnerabilities: findings.length,
        highestScore: scored.highestScore
      },
      runMeta: {
        crawlerVisited: crawlerResult.visited.length,
        fuzzCases: fuzzCases.length,
        deadEndpoints: validation.dead.length
      },
      endpoints: enrichedEndpoints,
      findings,
      auth: authMap,
      graph,
      raw: {
        crawler: crawlerResult,
        validationAttempts: validation.attempts,
        multiUserResults: multiUserResults.map((item) => ({
          path: item.path,
          userA: { status: item.userA.status },
          userB: { status: item.userB.status },
          diff: item.diff
        }))
      }
    };

    const outputPath = saveReport(report, config.outputFile);
    logger.info(`Report saved to ${outputPath}`);

    realtime.emit('scan_completed', {
      outputPath,
      summary: report.summary
    });

    return report;
  } finally {
    await contexts.closeAll();
    await browser.close();
  }
}

if (require.main === module) {
  runScan()
    .then((report) => {
      logger.info('Scan completed', report.summary);
    })
    .catch((error) => {
      logger.error(`Scan failed: ${error.message}`);
      process.exitCode = 1;
    });
}

module.exports = {
  runScan
};
