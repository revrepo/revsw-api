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

// Required third-party libraries.
var request = require('supertest-as-promised');

// Requiring config.
var config = require('config');

var BASE_URL = 'https://api.mailinator.com/api';
var API_TOKEN = config.get('mailinator.api.token');

// # Mailinator Resource object
var MailinatorResource = {

  /**
   * Gets inbox data for given email address from Mailinator
   *
   * @param {String} emailAddress
   * @returns {Promise}
   */
  getInbox: function (emailAddress) {
    var localPart = emailAddress.split('@')[0];
    return request(BASE_URL)
      .get('/inbox')
      .query({
        to: localPart,
        token: API_TOKEN
      })
      .then(function (res) {
        return res.body;
      });
  },

  /**
   * Gets email info for given email ID from Mailinator
   *
   * @param {String} emailId, the email message ID from Mailinator
   * @returns {Promise}
   */
  getEmail: function (emailId) {
    return request(BASE_URL)
      .get('/email')
      .query({
        id: emailId,
        token: API_TOKEN
      })
      .then(function (res) {
        return JSON.parse(res.text);
      });
  },

  /**
   * DEletes email info for given email ID from Mailinator
   *
   * @param {String} emailId, the email message ID from Mailinator
   * @returns {Promise}
   */
  deleteEmail: function (emailId) {
    return request(BASE_URL)
      .get('/delete')
      .query({
        id: emailId,
        token: API_TOKEN
      })
      .then(function (res) {
        return res.body;
      });
  }
};

module.exports = MailinatorResource;
