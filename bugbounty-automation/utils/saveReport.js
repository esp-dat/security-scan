const fs = require('fs');
const path = require('path');

function saveReport(report, outputFile) {
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2), 'utf-8');
  return outputFile;
}

module.exports = {
  saveReport
};
