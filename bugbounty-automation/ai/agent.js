function suggestAttackVectors(endpoint) {
  const suggestions = [];

  if (/admin|config|internal/i.test(endpoint.path)) {
    suggestions.push('Try privilege escalation with role header spoofing.');
  }

  if (/users|accounts|profile/i.test(endpoint.path)) {
    suggestions.push('Run ID mutation to test object-level authorization.');
  }

  if (/search|filter|query/i.test(endpoint.path)) {
    suggestions.push('Inject SQLi/XSS payloads in query parameters.');
  }

  if (suggestions.length === 0) {
    suggestions.push('Apply baseline method/header fuzzing.');
  }

  return suggestions;
}

function analyzeResponseHints(responseText = '') {
  const hints = [];
  if (/stack trace|exception|sql/i.test(responseText)) {
    hints.push('Possible verbose error handling in production endpoint.');
  }

  if (/token|secret|api[_-]?key/i.test(responseText)) {
    hints.push('Potential sensitive data exposure in response body.');
  }

  return hints;
}

module.exports = {
  suggestAttackVectors,
  analyzeResponseHints
};
