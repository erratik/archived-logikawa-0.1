const config = {
  'development': {
      port: {
        api: 10010,
        client: 4200
      },
      url: {
        api: 'http://datawhore.erratik.ca',
        client: 'http://datawhore.erratik.ca'
      }
    }
};


module.exports = env => {
  // console.log(`[datawhore config] ${config[env]}`);
  return config[env];
}
