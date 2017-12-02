/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

// # Main API Helper

var Session = require('./../session');

// Requiring resources to use in these Helpers.
var AuthenticateRes = require('./../resources/authenticate');
var APIKeysRes = require('./../resources/apiKeys');



// Required Helpers to attach to main API helper object
var AccountsHelper = require('./accounts');
var AppsHelper = require('./apps');
var APIKeysHelper = require('./apiKeys');
var BillingPlansHelper = require('./billingPlans');
var Dashboards = require('./dashboards');
var DNSZonesHelper = require('./dnsZones');
var DomainConfigsHelper = require('./domainConfigs');
var PurgeHelper = require('./purge');
var SignUpHelper = require('./signUp');
var SSLCertsHelper = require('./sslCerts');
var SSLNamesHelper = require('./sslNames');
var UsersHelper = require('./users');
var LogShippingJobsHelper = require('./logShippingJobs');
var WAFRulesHelper = require('./wafRules');

var MailinatorHelper = require('./../../common/helpers/external/mailinator');

// Abstracts common functionality for the API.
var APIHelpers = {

  accounts: AccountsHelper,
  apps: AppsHelper,
  apiKeys: APIKeysHelper,
  billingPlans: BillingPlansHelper,
  dashboards: Dashboards,
  dnsZones: DNSZonesHelper,
  domainConfigs: DomainConfigsHelper,
  purge: PurgeHelper,
  signUp: SignUpHelper,
  sslCerts: SSLCertsHelper,
  sslNames: SSLNamesHelper,
  users: UsersHelper,
  logShippingJobs: LogShippingJobsHelper,
  wafRules: WAFRulesHelper,

  /**
  * ### API.helpers.authenticate()
  *
  * Helper method to Authenticate user data before doing any type of request to
  * the REST API services.
  *
  * @param {Object} credentials , credentials data.
  *  For instance user
  *     {
  *       name: 'joe@email.com',
  *       password: 'something'
  *     }
  *  For API Key
  *     {
  *      id: '',
  *      key: ''
  *     }
  * @returns {Promise}
  */
  authenticate: function(credentials) {

    if(!!credentials.email){
      return this.authenticateUser(credentials);
    }else{
      Session.setCurrentUser(credentials);
      return this.authenticateAPIKey(credentials.id);
    }
  },
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
    return AuthenticateRes
      .createOne({email: user.email, password: user.password})
      .then(function (response) {
        user.token = response.body.token;
        Session.setCurrentUser(user);
      })
      .catch(function (error) {
        throw new Error('Authenticating user', error.response.body, user);
      });
  },
  /**
   * ### API.helpers.authenticateAPIKey()
   *
   * Helper method to Authenticate user as API KEY type before doing any type of request to
   * the REST API services.
   *
   * @param  keyId
   *
   * @returns {Promise}
   */
  authenticateAPIKey: function (keyId) {
    return APIKeysRes
      .getOne(keyId)
      .then(function (response) {
        var user  = response.body;
        Session.setCurrentUser(user);
      })
      .catch(function (error) {
        throw new Error('Authenticating user as API KEY ', error.response.body, keyId);
      });
  },

  authenticateAzureKey: function (token) {
    return APIKeysRes
      .getOne(token)
      .then(function (response) {
        var user  = response.body;
        Session.setCurrentUser(user);
      })
      .catch(function (error) {
        throw new Error('Authenticating user as Azure token ', error.response.body, token);
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
    return AuthenticateRes
      .createOne({email: user.email, password: user.password})
      .then(function (response) {
        user.token = response.body.token;
        Session.setCurrentUser(user);
      });
  },

  /**
   * Signs up a user and the verifies it.
   *
   * @returns {Promise} which will return a user object
   */
  signUpAndVerifyUser: function () {
    var testUser;
    var me = this;
    return me.signUp
      .createOne()
      .then(function (user) {
        testUser = user;
        return MailinatorHelper.getVerificationToken(user.email);
      })
      .then(function (token) {
        return me.signUp.verify(token);
      })
      .then(function () {
        return testUser;
      });
  }
};

module.exports = APIHelpers;
