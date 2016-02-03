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
var activity = require('./resources/activity');
var authenticate = require('./resources/authenticate');
var billingPlans = require('./resources/billingPlans');
var countries = require('./resources/countries');
var domainConfigs = require('./resources/domainConfigs');
var forgot = require('./resources/forgot');
var locations = require('./resources/locations');
var purge = require('./resources/purge');
var sdkConfigs = require('./resources/sdkConfigs');
var stats = require('./resources/stats');
var twoFA = require('./resources/2fa');
var users = require('./resources/users');

var Session = require('./session');

var AccountsDP = require('./providers/data/accounts');
var DomainConfigsDP = require('./providers/data/domainConfigs');
var PurgeDP = require('./providers/data/purge');
var UsersDP = require('./providers/data/users');

var APITestError = require('./apiTestError');

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
    activity: activity,
    authenticate: authenticate,
    billingPlans: billingPlans,
    countries: countries,
    domainConfigs: domainConfigs,
    forgot: forgot,
    locations: locations,
    purge: purge,
    sdkConfigs: sdkConfigs,
    stats: stats,
    twoFA: twoFA,
    users: users
  },

  dataProvider: {
    accounts: []
  },

  helpers: {

    /**
     * ### API.helpers.authenticateUser()
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
        .createOne({email: user.email, password: user.password})
        .then(function (response) {
          user.token = response.body.token;
          Session.setCurrentUser(user);
        })
        .catch(function(error){
          throw new Error('Authenticating user', error.response.body, user);
        });
    },

    /**
     * ### API.helpers.attemptToAuthenticateUser()
     *
     * Helper method to Attempt to authenticate user before doing any type of
     * request to the REST API services without catching any errors.
     *
     * @param user, user information. For instance
     *     {
     *       name: 'joe@email.com',
     *       password: 'something'
     *     }
     *
     * @returns {Promise}
     */
    attemptToAuthenticateUser: function (user) {
      return authenticate
        .createOne({email: user.email, password: user.password})
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
          .catch(function(error){
            throw new APITestError('Creating Account' , error.response.body,
              account);
          })
          .then(function (res) {
            account.id = res.body.object_id;
            return account;
          });
      }
    },
    domainConfigs: {
      createOne: function (accountId) {
        var domainConfig = DomainConfigsDP.generateOne(accountId);
        return domainConfigs
          .createOneAsPrerequisite(domainConfig)
          .catch(function(error){
            throw new APITestError('Creating Domain Config' ,
              error.response.body, domainConfig);
          })
          .then(function (res) {
            domainConfig.id = res.body.object_id;
            return domainConfig;
          });
      }
    },
    purge: {
      createOne: function (domainName) {
        var purgeData = PurgeDP.generateOne(domainName);
        return purge
          .createOneAsPrerequisite(purgeData)
          .catch(function (error) {
            throw new APITestError('Creating Purge Request' , error.response.body,
              purgeData);
          })
          .then(function (res) {
            purgeData.id = res.body.request_id;
            return purgeData;
          });
      }
    },
    users: {
      createOne: function (name) {
        var user = UsersDP.generateOne(name);
        // TODO: this should be changed to the new way to create a resource
        return users.user
          .createOneAsPrerequisite(user)
          .catch(function(error){
            throw new APITestError('Creating User' , error.response.body,
              user);
          })
          .then(function (res) {
            user.id = res.body.object_id;
            return user;
          });
      }
    }
  }
};
