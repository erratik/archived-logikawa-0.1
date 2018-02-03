module.exports = (config) => {
  const urls = {
    DATAWHORE: {
      development: {
        API_URL: `${config.url.api}:${config.port.api}`,
        CLIENT_URL: `${config.url.client}:${config.port.client}`
      }
    },
    NAMESPACE: {}
  };

  // console.log(`[config urls]`, urls);

  return urls;

};
