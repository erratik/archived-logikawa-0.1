
const OAuth = require('oauth');

module.exports = {
  makeOAuthHeaders: (data, v) => {
    // helper to construct echo/oauth headers from URL
    const oauth = new OAuth.OAuth(`https://${data.apiUrl}/oauth/request_token`,
        `https://${data.apiUrl}/oauth/access_token`,
        data.apiKey,
        data.apiSecret,
        '1.0',
        null,
        'HMAC-SHA1');

    if (data.space === 'twitter') {
        oauth._clientOptions.requestTokenHttpMethod = 'GET';
        oauth._clientOptions.accessTokenHttpMethod = 'GET';
    }

    const orderedParams = oauth._prepareParameters(
        data.accessToken, // test user secret
        data.tokenSecret, // test user token
        'GET',
        `https://${data.apiUrl}${data.url}`
    );
    return oauth._buildAuthorizationHeaders(orderedParams);
  }
}
