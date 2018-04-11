/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013]  [2016] Rev Software, Inc.
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
var Promise = require('bluebird');
var config = require('config');
var host = config.api.host;
var APITestError = require('./../apiTestError');
// Requiring resources to use in these Helpers.
var AuthenticateRes = require('./../resources/authenticate');
var SSOAuthenticateRes = require('./../resources/authenticateSSOAzure');
var APIKeysRes = require('./../resources/apiKeys');
var UsersRes = require('./../resources/users');
var GroupsRes = require('./../resources/groups');

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
var GroupsHelper = require('./groups');
var LogShippingJobsHelper = require('./logShippingJobs');
var WAFRulesHelper = require('./wafRules');
var VendorsHelper = require('./vendorProfiles');
var MailinatorHelper = require('./../../common/helpers/external/mailinator');
var AzureHelper = require('./azure');

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
  vendors: VendorsHelper,
  azure: AzureHelper,
  groups: GroupsHelper,
  mailinator: MailinatorHelper,

  /**
  * ### API.helpers.authenticate()
  *
  * Helper method to Authenticate user/API key/azure key data before doing any type of request to
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
  authenticate: function (credentials) {
    Session.reset();
    if (credentials) {
      if (credentials.email) {
        return this.authenticateUser(credentials);
      } else if (credentials.azureKey) {
        return this.authenticateAzureKey(credentials.azureKey);
      } else if (credentials.token && credentials.resourceId) {
        return this.authenticateAzureSSO(credentials);
      } else {
        Session.setCurrentUser(credentials);
        return this.authenticateAPIKey(credentials.id);
      }
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
    Session.setCurrentUser(user);
    var acc = {
      email: user.email,
      password: user.password
    };
    if (user.oneTimePassword) {
      acc.oneTimePassword = user.oneTimePassword;
    }
    return AuthenticateRes
      .createOne(acc)
      .then(function (response) {
        if (response.status !== 200) {
          return response.status;
        } else {
          user.token = response.body.token;
          Session.resetAzureKey();
          Session.setCurrentUser(user);
        }        
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
        if (response.statusCode === 200) {
          var user = response.body;
          Session.setCurrentUser(user);
        } else {
          throw new Error('Authenticating user as API KEY ' + keyId);
        }
      })
      .catch(function () {
        throw new Error('Authenticating user as API KEY ' + keyId);
      });
  },

  /**
    * ### API.helpers.authenticateAzureKey()
    *
    * Helper method to Authenticate an Azure Token before doing any type of request to
    * the REST API services.
    *
    * @param  key
    *
    * @returns {Promise}
    */
  authenticateAzureKey: function (key) {
    Session.reset();
    return new Promise(function (resolve, reject) {
      if (key.azureKey === config.get('api.azureKey.azureKey')) {
        Session.setCurrentAzureKey(key);
        resolve();
      } else {
        throw new Error('Authenticating user as Azure token ', key);
        reject();
      }
    });
  },

    /**
    * ### API.helpers.authenticateAzureSSO()
    *
    * Helper method to Authenticate an Azure SSO Token before doing any type of request to
    * the REST API services.
    *
    * @param  key
    *
    * @returns {Promise}
    */
    authenticateAzureSSO: function (token) {
      Session.reset();
      return SSOAuthenticateRes
        .createOne(token)
        .expect(200)
        .then(function (res) {
          return UsersRes
                  .myself()
                  .getOne()
                  .set('Authorization', 'Bearer ' + res.body.token)
                  .expect(200)
                  .then(function (user) {
                    var azureUser = user.body;
                    azureUser.token = res.body.token;
                    Session.setCurrentUser(azureUser);
                  });                  
        })
        .catch(function () {
          throw new Error('Authenticating user as Azure SSO token ', token);
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
      .createOne({ email: user.email, password: user.password })
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
  },

  /**
   * Gets the API url
   *
   * @returns {String} API url
   */
  getAPIURL: function () {
    return host.protocol + '://' + host.name + ':' + host.port; 
  },

  /**
   * Create a full suite of resources for testing.
   * Mobile App, Domain, DNS Zone, Account.
   * 
   * @param {String} role the role of the user that will be created
   * @param {String} account_id account id for the resources (optional)
   *
   * @returns {Object} Object of resource (Object.mobile_app, Object.domain...)
   */
  createResources: function (role, account_id) {
    var revAdmin = config.api.users.revAdmin;
    var resources = {};
    var me = this;
    return this.authenticateUser(revAdmin)
      .then(function () {
        if (account_id) {
          return {id: account_id};
        } else {
          return AccountsHelper.createOne();
        }
      })
      .then(function (acc) {
        resources.account_id = acc.id;
        return AppsHelper.create({
          accountId: acc.id,
          platform: 'iOS'
        });
      })
      .then(function (app) {
        resources.app_id = app.id;
        return DomainConfigsHelper.createOne(resources.account_id);
      })
      .then(function (domain) {
        resources.domain_id = domain.id;
        return DNSZonesHelper.create(resources.account_id);
      })
      .then(function (DNSZone) {
        resources.dns_zone_id = DNSZone.id;
        return UsersHelper.create({
          account_id: resources.account_id,
          role: role || 'admin'
        });
      })
      .then(function (user) {
        resources.user_id = user.id;
        return UsersRes.getOne(user.id).expect(200);          
      })
      .then(function (user) {      
        var authUser = {
          email: user.body.email,
          password: 'password1'
        };
        return me.authenticate(authUser);
      })
      .then(function () {
        return Dashboards.createOne();
      })
      .then(function (dash) {
        resources.dashboard = dash.id;
        return me.authenticate(revAdmin);
      })
      .then(function () {
        return SSLCertsHelper.createOne(resources.account_id);
      })
      .then(function (ssl_cert) {
        resources.ssl_cert = ssl_cert.id;
        return GroupsHelper.create({account_id: resources.account_id});
      })
      .then(function (group) {
        resources.group = group.id;
        return APIKeysHelper.createOneForAccount({id : resources.account_id}, role);
      })
      .then(function (API_key) {
        resources.api_key = API_key.id;
        return LogShippingJobsHelper.createOne(resources.account_id);
      })
      .then(function (logshipping_jobs) {        
        return resources;
      })
      .catch(function (err) {
        return new Error('Creating resources');
      });
  }
};

module.exports = APIHelpers;
