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
var _ = require('lodash');
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
   * @param {String|null} subjectText, text in a email subject
   * @param {Boolean} dontError, flag to show/not show error message after timeout
   */
  waitWhileInboxIsEmpty: function (emailAddress, timeout, subjectText, dontError) {
    var _timeout = timeout || TIMEOUT;
    var _counter = 0;

    var _cb = function (inbox) {
      _counter += DELAY;
      if ((_counter > _timeout) && !dontError) {
        throw 'Timeout while getting Mailinator inbox for ' + emailAddress;
      } else if ((_counter > _timeout) && dontError) {
        // we dont want an error, just return the promise
        return;
      }
      if (inbox && (inbox.messages.length > 0)) {
        // NOTE: wait specific email
        if(!!subjectText && subjectText.length > 0) {
          var findMail =  _.filter(inbox.messages,function(itemMail) {
            return itemMail.subject.indexOf(subjectText) > -1;
          });
          if(findMail.length === 0){
            _cb();
            return;
          }else{
            return;
          }
        }else{
          return;
        }
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
   * @param {String|null} subjectText
   * @returns {Promise}
   */
  getLastMessage: function (emailAddress, subjectText) {
    return MailinatorResource
      .getInbox(emailAddress)
      .then(function (inbox) {
        if(subjectText){
          return _.find(inbox.messages,function(item){
            return item.subject.indexOf(subjectText)>-1;
          });
        }
        var messages = inbox.messages;
        return messages[messages.length - 1];
      });
  },

  /**
   * Gets all messages from Inbox from given Mailinator email address.
   *
   * @param {String} emailAddress
   * @returns {Promise}
   */
  getAllMessages: function (emailAddress) {
    return MailinatorResource
      .getInbox(emailAddress)
      .then(function (inbox) {
        return inbox.messages;
      });
  },

  /**
 * Gets a message from Inbox from given Mailinator email address.
 *
 * @param {String} Message ID
 * @returns {Promise}
 */
  getMessage: function (id) {
    return MailinatorResource
      .getEmail(id)
      .then(function (email) {
        return email;
      });
  },

  /**
   * Gets the verification token from email just sent to given
   * Mailinator email address and a part of subject text.
   *
   * @param {String} emailAddress
   * @param {String|null} subjectText
   * @returns {Promise}
   */
  getVerificationToken: function(emailAddress, subjectText) {
    return MailinatorHelper
      .waitWhileInboxIsEmpty(emailAddress, null, subjectText)
      .then(function () {
        return MailinatorHelper.getLastMessage(emailAddress, subjectText);
      })
      .then(function (msg) {
        return MailinatorResource.getEmail(msg.id, true);
      })
      .then(function (text) {
        var tokenRegExp = /[0-9a-f]{40}/g;
        return text.match(tokenRegExp)[0];
      });
  }
};

module.exports = MailinatorHelper;
