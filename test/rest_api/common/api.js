
// Required resources to apply/attach to API handler.
var accounts = require('./resources/accounts');
var Session = require('./session');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = {
  session: Session,
  resources: {
    accounts: accounts
  }
};
