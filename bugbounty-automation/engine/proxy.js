function getProxyOptions() {
  if (!process.env.HTTP_PROXY) {
    return undefined;
  }

  return {
    server: process.env.HTTP_PROXY,
    username: process.env.HTTP_PROXY_USER || undefined,
    password: process.env.HTTP_PROXY_PASS || undefined
  };
}

module.exports = {
  getProxyOptions
};
