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
//  ----------------------------------------------------------------------------------------------//

var Promise = require('bluebird');

var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var _ = require('lodash');
var util = require('util');
var mail = require('../lib/mail');

var mongoConnection = require('../lib/mongoConnections');
var mongoose = require('mongoose');

var AuditEvents = require('../models/AuditEvents');
var Users = require('../models/User');

var auditevents = Promise.promisifyAll(new AuditEvents(mongoose, mongoConnection.getConnectionPortal()));
var users = Promise.promisifyAll(new Users(mongoose, mongoConnection.getConnectionPortal()));

var parseDate = function (date) {
  if (_.isDate(date)) {
    date.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
    return date;
  }
  if (/^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(date)) {
    return new Date(date);
  }
  var parsed = Date.parse(date);
  if (!parsed) {
    throw new Error('activityReport:: parsing error wrong date format - ' + date);
  }
  parsed.setUTCHours(0, 0, 0, 0);
  return parsed;
};

var reportActivity = function (date, reportActivities) {
  return Promise.try(function () {
    var dateString = date.getFullYear() + '-' +
      (date.getMonth().length !== 2 ? '0' + date.getMonth() : date.getMonth()) + '-' + date.getDate();
    var mailOptions = {
      to: config.get('report_daily_activity_logs'),
      subject: 'Activity logs of Rev Users (' + dateString + ')',
      text: 'Hello,\n\n' +
      'We\'ve got some user activity logs for ' + dateString + ':\n\n' +
      util.inspect(reportActivities, {colors: false, depth: (20), showHidden: false}) + '\n\n' +
      'Kind regards,\nCDN Robot\n'
    };

    return mail.sendMail(mailOptions)
      .catch(function (err) {
        logger.error('activityReport.sendEmail:: error ' + err.toString());
        logger.error(err.stack);
        throw err;
      });
  });
};

exports.collectDayReport = function (reportDate, particularUsers, dry) {
  var collectDate,
    collectDateEnd;

  return Promise.resolve(reportDate)
    .then(function (date) {
      return parseDate(date);
    })
    .then(function (parsedDate) {
      collectDate = parsedDate;
    })
    .then(function () {
      collectDateEnd = new Date(collectDate.getTime());
      collectDateEnd.setUTCHours(23, 59, 59);

      var query = {
        'meta.datetime': {
          $gte: collectDate.getTime(),
          $lte: collectDateEnd.getTime()
        }
      };

      if (particularUsers) {
        query['meta.user_id'] = {$in: particularUsers};
      }
      return auditevents.detailedOffsetAsync(query, 5000, 0);
    })
    .then(function (activities) {
      if (dry) {
        return Promise.resolve(activities);
      } else {
        return reportActivity(collectDate, activities);
      }
    })
    .catch(function (err) {
      logger.error(err);
    });
};
