/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var Promise = require('bluebird');

var Session = require('./session');
var APITestError = require('./apiTestError');
var AuthenticateRes = require('./resources/authenticate');
var Constants = require('./../common/constants');

var CURRENT_AUTH_MODE = process.env.AUTH_MODE;

var authenticateWithAPIKey = function (data) {
  if (data.apiKey === undefined) {
    throw new APITestError('Authenticating user with API Key: ' +
      'No API key provided.');
  }

  Session.setCurrentUser(data);
  return Promise.resolve();
};

var authenticateWithCredentials = function (data) {
  return AuthenticateRes
    .createOne({email: data.email, password: data.password})
    .then(function (response) {
      data.token = response.body.token;
      Session.setCurrentUser(data);
    })
    .catch(function (error) {
      throw new APITestError('Authenticating user',
        error.response.body, data);
    });
};

var Identity = {

  /**
   * ### API.identity.authenticate(data)
   *
   * Helper method to Authenticate user before doing any type of request to
   * the REST API services.
   *
   * @param data, user information. For instance
   *     {
   *       name: 'joe@email.com',
   *       password: 'something'
   *     }
   *
   * @returns {Promise}
   */
  authenticate: function (data) {

    switch(CURRENT_AUTH_MODE) {
      case Constants.API.AUTH_MODE.API_KEY:
        Session.setAuthenticationMode(Constants.API.AUTH_MODE.API_KEY);
        return authenticateWithAPIKey(data);
      default: // CREDENTIALS
        Session.setAuthenticationMode(Constants.API.AUTH_MODE.CREDENTIALS);
        return authenticateWithCredentials(data);
    }
  },

  authenticateWithAPIKey: function (data) {
    Session.setAuthenticationMode(Constants.API.AUTH_MODE.API_KEY);
    return authenticateWithAPIKey(data);
  },

  authenticateWithCredentials: function (data) {
    Session.setAuthenticationMode(Constants.API.AUTH_MODE.CREDENTIALS);
    return authenticateWithCredentials(data);
  }
};

module.exports = Identity;
