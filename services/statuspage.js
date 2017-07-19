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

/*jslint node: true */

'use strict';
var request = require('superagent');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var _ = require('lodash');
var moment = require('moment');

var statuspage = require('./../lib/statuspage');

exports.subscribe = subscribe;
exports.unSubscribe = unSubscribe;

var statusPageAPI = new statuspage.StatusPageAPI({
  pageId: config.get('statuspage.page_id'),
  apiKey: config.get('statuspage.api_key')
});

/**
 * @name  subscribe
 * @description
 *
 * @param  {String}   email
 * @param  {Function} cb    [description]
 * @return
 */
function subscribe(options, cb) {
  if (!options.email) {
    cb(new Error('Subscriber data error'));
  } else {
    var newSubscrider = {
      'subscriber[email]': options.email,
      // NOTE: @see http://doers.statuspage.io/api/v1/subscribers/ - subscriber[skip_confirmation_notification] - Deprecated.
      // NOTE: All subscribers will must confirm their subscription to protect against abuse.
      // 'subscriber[skip_confirmation_notification]': options.skip_confirmation_notification || 't',
    };
    statusPageAPI.post('subscribers', newSubscrider, function(result) {
      if (result.status !== 'success') {
        // TODO: add logger
        cb(new Error(result.error));
      } else {
        // TODO: add logger
        cb(null, result.data);
      }
    });
  }
}

/**
 * @name  unSubscribe
 * @description
 *     Unsubscride user
 * @param  {Object}   options
 * @param  {Function} cb
 * @return
 */
function unSubscribe(options, cb) {
  if (!options.email) {
    cb(new Error('Subscriber data error'));
  } else {
    // NOTE: Search subscrider by email
    statusPageAPI.get('subscribers', { q: '' + options.email + '' }, function(result) {
      if (result.data.length > 0) {
        // NOTE: Call API detele subscriber
        statusPageAPI.delete('subscriber', { subscriber_id: result.data[0].id }, function(result) {
          if (result.status === 'success') {
            // NOTE: send data unsubscribe user
            cb(null, result.data);
          } else {
            // NOTE: back error
            cb(new Error(result.error));
          }
        });
      } else {
        cb(new Error('Subscriber not found'), []);
      }
    });
  }
}
