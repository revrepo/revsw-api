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

var Promise = require('bluebird');

var MailinatorResource = require('./../../resources/external/mailinator');

// Some constants
var DELAY = 5000; // 5 second
var TIMEOUT = 120000; // 2 minutes

// # Mailinator Helper
// Abstracts common functionality for the related resource.
var MailinatorHelper = {

  /**
   * Waits for inbox to be length greater than zero. Throws error if it does not
   * happen ia specified amount of time.
   *
   * @param {String} emailAddress,
   * @param {Number} timeout, milliseconds
   */
  waitWhileInboxIsEmpty: function (emailAddress, timeout) {
    var _timeout = timeout || TIMEOUT;
    var _counter = 0;

    var _cb = function (inbox) {
      _counter += DELAY;
      if (_counter > _timeout) {
        throw 'Timeout while getting Mailinator inbox for ' + emailAddress;
      }
      if (inbox && (inbox.messages.length > 0)) {
        return;
      }
      else {
        return MailinatorResource
          .getInbox(emailAddress)
          .delay(DELAY)
          .then(_cb);
      }
    };

    return _cb();
  },

  /**
   * Gets latest message from Inbox from given Mailinator email address.
   *
   * @param {String} emailAddress
   * @returns {Promise}
   */
  getLastMessage: function (emailAddress) {
    return MailinatorResource
      .getInbox(emailAddress)
      .then(function (inbox) {
        var messages = inbox.messages;
        return messages[messages.length - 1];
      });
  },

  /**
   * Gets the RevAPM verification token from email just sent to given
   * Mailinator email address.
   *
   * @param {String} emailAddress
   * @returns {Promise}
   */
  getVerificationToken: function (emailAddress) {
    return MailinatorHelper
      .waitWhileInboxIsEmpty(emailAddress)
      .then(function () {
        return MailinatorHelper.getLastMessage(emailAddress);
      })
      .then(function (msg) {
        return MailinatorResource.getEmail(msg.id);
      })
      .then(function (fullMsg) {
        var msgBody = fullMsg.data.parts[0].body;
        var tokenRegExp = /[0-9a-f]{40}/;
        return msgBody.match(tokenRegExp)[0];
      });
  }
};

module.exports = MailinatorHelper;