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

/*jslint node: true */
'use strict';

var _ = require('lodash');
var moment = require('moment');
var mongoose = require('mongoose');
var promise = require('bluebird');
mongoose.Promise = promise;
var argv = require('minimist')(process.argv.slice(2));
var config = require('config');
var logConfig = config.log_config;
// NOTE: change logging logic if exists a specific argument command line
if (!!argv.CLI_MODE) {
  console.log('using CLI logging mode');
  logConfig = config.log_config_cli_mode;
}

var logger = require('revsw-logger')(logConfig);
var utils = require('../lib/utilities.js');
var es = require('../lib/elasticSearch');
var mailService = require('./mail');
var mongoConnection = require('../lib/mongoConnections');

var DomainConfig = require('../models/DomainConfig');
var Location = require('../models/Location');
var App = require('../models/App');
var APIKey = require('../models/APIKey');
var UsageReport = require('../models/UsageReport');
var Account = require('../models/Account');
var User = require('../models/User');
var SSLName = require('../models/SSLName');
var SSLCert = require('../models/SSLCertificate');
var DNSZone = require('../models/DNSZone');
var PurgeJob = require('../models/PurgeJob');
var LogShippingJob = require('../models/LogShippingJob');

var NSONE = require('./../lib/nsone.js');

var locationsModel = new Location(mongoose, mongoConnection.getConnectionPortal());
var domainsModel = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var applicationsModel = new App(mongoose, mongoConnection.getConnectionPortal());
var apiKeysModel = new APIKey(mongoose, mongoConnection.getConnectionPortal());
var reportsModel = new UsageReport(mongoose, mongoConnection.getConnectionPortal());
var accountsModel = new Account(mongoose, mongoConnection.getConnectionPortal());
var usersModel = new User(mongoose, mongoConnection.getConnectionPortal());

var vendorProfiles = config.get('vendor_profiles');
var currentVendorProfile = vendorProfiles[config.get('default_system_vendor_profile')];

var dayRegEx_ = /^20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

var parseDay_ = function(day) {
  if (_.isDate(day)) {
    day.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
    return day;
  }
  if (dayRegEx_.test(day)) {
    return new Date(day);
  }
  var parsed = Date.parse(day);
  if (!parsed) {
    throw new Error('usageReportTraffic parsing error: wrong date format - ' + day);
  }
  parsed.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
  return parsed;
};
/**
 * @name getDomainsTrafficChangesFromLastUsageReports
 * @description method get list of data for domains with they traffic by days
 *
 */
module.exports.getDomainsTrafficChangesFromUsageReports = function(options, cb) {
  if (options.current_day) {
    options.current_day = parseDay_(options.current_day);
  }
  var currentDate = new moment(options.current_day).utc().startOf('day');
  var previousDate = new moment(currentDate).utc().subtract(1, 'day').startOf('day');
  var options_ = {
    current_date: currentDate.toDate(),
    previous_date: previousDate.toDate(),
    account_id: options.account_id
  };
  reportsModel.aggregateDomainTrafficByDays(options_)
    .then(function(data) {
      logger.info('aggregateDomainTrafficByDays:success find ' + data.length);
      cb(null, data);
    })
    .catch(function(err) {
      logger.error('aggregateDomainTrafficByDays:err ' + err.message);
      cb(err);
    });
};
/**
 * @name prepareDomainsTrafficChangesEmailOptions
 * @description method prepare mail options for send emails about changes domain traffic
 * @param {Object} options
 */
module.exports.prepareDomainsTrafficChangesEmailOptions = function(options, cb) {
  var domainsTrafficList = options.domains_traffic;
  var trafficThresholdValue = options.traffic_threshold;
  var mailOptionsList = [];
  var mailOptions = {
    to: options.main_alerting_email, // TODO: add checking existing email
    from: currentVendorProfile.support_email,
    fromname: currentVendorProfile.support_name,
    bcc: undefined,
    subject: undefined,
    text: undefined,
    html: undefined
  };


  var SubjectText = ' Traffic change detected for domain {{DOMAIN_NAME}}';
  var templateEmailText =
    'Hola amigo! \n\n' +
    'We have detected a traffic change for domain {{DOMAIN_NAME}}: \n' +
    '\n Traffic for yesterday - {{traffic_yesterday}} GB \n' +
    '\n Traffic for day before yesterday - {{traffic_before_yesterday}} GB \n' +
    '\n\n\Kind regards, \n{{support_team}}\n{{company_website_url}}\n';

  _.map(domainsTrafficList, function(itemDomain) {
    itemDomain.traffics_day = _.sortBy(itemDomain.traffics_day, 'report_for_day');
    // NOTE: check traffic changes
    var trafficBeforeYesterday = itemDomain.traffics_day[0].total_traffic_gb;
    var trafficYesterday = itemDomain.traffics_day[1].total_traffic_gb;
    // NOTE: detect % traffic changes
    var diff = 0;
    if (trafficBeforeYesterday > 0) {
      diff = 100 - (trafficYesterday * 100 / trafficBeforeYesterday);
    } else if (trafficYesterday > 0) {
      diff = 100;
    }
    if (Math.abs(diff) >= trafficThresholdValue) {
      var mail = _.clone(mailOptions);
      mail.subject = SubjectText
        .replace('{{DOMAIN_NAME}}', itemDomain.domain);

      mail.text = _.clone(templateEmailText)
        .replace('{{DOMAIN_NAME}}', itemDomain.domain)
        .replace('{{support_team}}', currentVendorProfile.support_name)
        .replace('{{company_website_url}}', currentVendorProfile.companyWebsiteURL)
        .replace('{{traffic_before_yesterday}}', trafficBeforeYesterday)
        .replace('{{traffic_yesterday}}', trafficYesterday);

      logger.info('prepareDomainsTrafficChangesEmailOptions:add mail options for notificate "' + mailOptions.to +
        '" about changes traffic "' + itemDomain.domain + '"');
      mailOptionsList.push(mail);
    }
  });

  cb(null, mailOptionsList);
};

/**
 *
 * @name sendDomainTrafficChangesEmails
 * @description use internal service for send email
 * @param {any} options
 * @param {any} cb
 */
module.exports.sendDomainTrafficChangesEmails = function sendDomainTrafficChangesEmails(mailOptionsList, cb) {
  mailService.sendMail(mailOptionsList, function(err) {
    if (err) {
      if (err.message) {
        logger.error('sendDomainTrafficChangesEmails:error message ' + err.message);
      }
      cb(new Error('Failed send mail to user'));
      return;
    }
    cb(null, {
      success: true,
      message: 'Success send email to ' + mailOptionsList.to
    });
  });
};
