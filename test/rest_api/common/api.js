/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 */

// # API object

// Required resources to apply/attach to `API` object.
var accounts = require('./resources/accounts');
var billingPlans = require('./resources/billingPlans');
var authenticate = require('./resources/authenticate');
var users = require('./resources/users');
var stats = require('./resources/stats');
var sdkConfigs = require('./resources/sdkConfigs');
var Session = require('./session');
var domainConfigs = require('./resources/domainConfigs');
var activity = require('./resources/activity');

var AccountsDP = require('./providers/data/accounts');
var DomainConfigsDP = require('./providers/data/domainConfigs');

// This allows to overpass SSL certificate check
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// `API` object that abstracts all functionality from the REST API being tested.
// Defines all resources and other components needed for testing.
module.exports = {
  // Session, will help us to _remember_ which user is currently being used.
  session: Session,
  // A set of all resources that the REST API service provides.
  resources: {
    accounts: accounts,
    billingPlans: billingPlans,
    authenticate: authenticate,
    users: users,
    stats: stats,
    sdkConfigs: sdkConfigs,
    domainConfigs: domainConfigs,
    activity: activity
  },

  helpers: {

    /**
     * ### API.authenticateUser()
     *
     * Helper method to Authenticate user before doing any type of request to
     * the REST API services.
     *
     * @param user, user information. For instance
     *     {
     *       name: 'joe@email.com',
     *       password: 'something'
     *     }
     *
     * @returns {Promise}
     */
    authenticateUser: function (user) {
      return authenticate
        .createOne({email: user.name, password: user.password})
        .then(function (response) {
          user.token = response.body.token;
          Session.setCurrentUser(user);
        });
    },

    accounts: {
      createOne: function () {
        var account = AccountsDP.generateOne();
        return accounts
          .createOneAsPrerequisite(account)
          .then(function (res) {
            account.id = res.body.object_id;
            console.log(account);
            return account;
          });
      }
    },
    domainConfigs: {
      createOne: function (accountId) {
        var domainConfig = DomainConfigsDP.generateOne(accountId);
        return domainConfigs
          .createOneAsPrerequisite(domainConfig)
          .then(function (res) {
            domainConfig.id = res.body.object_id;
            console.log(domainConfig);
            return domainConfig;
          });
      }
    }
  }
};
