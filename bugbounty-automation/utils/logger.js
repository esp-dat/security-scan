function createLogger(scope) {
  const tag = `[${scope}]`;

  return {
    info(message, meta) {
      console.log(new Date().toISOString(), tag, message, meta || '');
    },
    warn(message, meta) {
      console.warn(new Date().toISOString(), tag, message, meta || '');
    },
    error(message, meta) {
      console.error(new Date().toISOString(), tag, message, meta || '');
    }
  };
}

module.exports = {
  createLogger
};
