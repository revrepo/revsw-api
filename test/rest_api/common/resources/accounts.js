
var config = require('./../../config/default');
var BaseResource = require('./base');

module.exports = new BaseResource({
  host: config.api.host,
  apiVersion: config.api.version,
  apiResource: config.api.resources.accounts
});
