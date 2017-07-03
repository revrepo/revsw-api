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

var mongoose = require('mongoose');

var config = require('config');
var logConfig = config.log_config;
// NOTE: change logging logic if exists a specific argument command line
var argv = require('minimist')(process.argv.slice(2));
if (!!argv.CLI_MODE) {
  console.log('using CLI logging mode');
  logConfig = config.log_config_cli_mode;
}

var logger = require('revsw-logger')(logConfig);
var promise = require('bluebird');
var _ = require('lodash');
var moment = require('moment');

var mailService = require('./mail');
var mongoConnection = require('../lib/mongoConnections');

var DomainConfig = require('../models/DomainConfig');
var User = require('../models/User');
var Account = require('../models/Account');
var SSLCertificate = require('../models/SSLCertificate');

var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var sslCertificates = new SSLCertificate(mongoose, mongoConnection.getConnectionPortal());

var notificationWindowRorExpiringSSLCertDays = config.get('notification_window_for_expiring_ssl_cert_days');
var notifyAdminByEmailOnSSLCertExpiration = config.get('notify_admin_by_email_on_ssl_cert_expiration');
var vendorProfiles = config.get('vendor_profiles');
var currentVendorProfile = vendorProfiles[config.get('default_system_vendor_profile')];

promise.promisifyAll(sslCertificates);
promise.promisifyAll(users);
promise.promisifyAll(accounts);
promise.promisifyAll(domainConfigs);

/**
 * @name getExpiringSSLCertificatesList
 * @description get
 *
 * @param {Object} options  configuration parameters for request data
 *
 * @return {Array} list of data about certificates which will expiring
 */
module.exports.getExpiringSSLCertificatesInformationList = function getExpiringSSLCertificatesList(options, cb) {
  var countExpiringDays = options.count_expiring_days || notificationWindowRorExpiringSSLCertDays;
  var dateReport = options.day;
  var actualDate = moment(dateReport).utc().toDate();
  var expireDate = moment(dateReport).utc().add(countExpiringDays, 'days').endOf('day').toDate();
  var optionsFilter = {
    actualDate: actualDate,
    expireDate: expireDate
  };
  var expiringSSLCertificatesTotalInformation = null;
  sslCertificates
    .getExpiringSSLCertificatesByTimePeriodAsync(optionsFilter)
    .then(function saveListSSLCertificates(data) {
      expiringSSLCertificatesTotalInformation = data;
    })
    // NOTE: get information about Domain Configurations
    .then(function getDomainConfigs() {
      return promise.map(expiringSSLCertificatesTotalInformation, function(itemSSLCert) {
        var where = {
          ssl_cert_id: itemSSLCert.cert_id,
          deleted: {
            $ne: true
          }
        };
        return domainConfigs.queryAsync(where)
          .then(function(data) {
            var domainConfigsData = _.map(data, function(itemDomainConfig) {
              var domainConfigsInfo = {
                domain_config_id: itemDomainConfig._id.toString(),
                cname: itemDomainConfig.cname,
                domain_name: itemDomainConfig.domain_name,
                domain_aliases: itemDomainConfig.proxy_config.domain_aliases,
                domain_wildcard_alias: !itemDomainConfig.proxy_config.domain_wildcard_alias ? [] : itemDomainConfig.proxy_config.domain_wildcard_alias,
                enable_ssl: itemDomainConfig.enable_ssl
              };
              return domainConfigsInfo;
            });
            return domainConfigsData;
          })
          .then(function(data) {
            itemSSLCert.domain_configs = data;
            return itemSSLCert;
          });
      });
    })
    // NOTE: Company (Account) information
    .then(function() {
      return promise.map(expiringSSLCertificatesTotalInformation, function(itemSSLCert) {
        var where = {
          _id: itemSSLCert.account_id
        };
        // console.log('==', where)
        return accounts.getAsync(where)
          .then(function(data) {
            itemSSLCert.account_info = {
              companyName: data.companyName,
              vendor_profile: data.vendor_profile
            };
            return itemSSLCert;
          });
      });
    })
    // NOTE: Users information
    .then(function() {
      return promise.map(expiringSSLCertificatesTotalInformation, function(itemSSLCert) {
        var where = {
          companyId: itemSSLCert.account_id,
          deleted: {
            $ne: true
          }
        };
        return users.queryAsync(where)
          .then(function(data) {
            // NOTE: extend information about users whitch can use SSL Certificate
            itemSSLCert.users_info = _.map(data, function(itemUser) {
              return {
                firstname: itemUser.firstname,
                lastname: itemUser.lastname,
                email: itemUser.email,
                domains: itemUser.domain
              };
            });
            return itemSSLCert;
          });
      });
    })
    .then(function(data) {
      logger.info('getExpiringSSLCertificatesInformationList:success get additional information for ' +
        expiringSSLCertificatesTotalInformation.length + ' expiring SSL Certificates');
      cb(null, expiringSSLCertificatesTotalInformation);
    })
    .catch(function(err) {
      logger.error('getExpiringSSLCertificatesInformationList:error' + JSON.stringify(err));
      cb(err);
    });
};

/**
 * @name prepareNotificationEmailsForExperingSSLCetificates
 * @description method prepare mailOptions list for send notification about expiring SSL certificate
 *
 * @param {Object} options - Object with information about one SSL Certificate
 * which contains an additional information about users and domain configs
 */
module.exports.prepareNotificationEmailsForExperingSSLCetificates = function notificateAboutExperingSSLCertificate(options, cb) {
  var expiringSSLCertificateIformation = options;
  var adminEmail = notifyAdminByEmailOnSSLCertExpiration;
  var accountVendorProfile = currentVendorProfile;
  accountVendorProfile = vendorProfiles[expiringSSLCertificateIformation.account_info.vendor_profile] || currentVendorProfile;
  // NOTE: vendor`s depended information
  var vendorProfile = '';
  var mailOptions = {
    to: undefined,
    from: accountVendorProfile.support_email,
    fromname: accountVendorProfile.support_name,
    bcc: undefined,
    subject: undefined,
    text: undefined,
    html: undefined
  };
  var expiresCountDays = moment(expiringSSLCertificateIformation.expires_at).utc().diff(moment(), 'd').valueOf();
  var expiresDaysDetails = '';
  var mailOptionsList = [];
  // console.log('prepareNotificationEmailsForExperingSSLCetificates:options', expiringSSLCertificateIformation)
  // TODO: delete comment
  // TODO: rebase temlate to vendor config
  // From: (“support_email” and “support_name” from vendor profile)
  // Subject: [(“companyNameShort” from vendor profile)] Your SSL certificate < cert_name > will expire soon
  // Email body:
  var templateNotificationText =
    'Dear {{firstname}}, \n\n' +
    '  Our records show that SSL certificate “{{cert_name}}” will expire on {{expires_at}}{{expires_days_details}}.\n' +
    '\nThe certificate is used by the following configured web domain names:\n' +
    ' {{list_of_ssl_cert_cn_and_san_names}} \n\n' +
    // 'The certificate is used by the following domains:\n' +
    ' {{list_of_domains_which_use_the_cert}} \n\n' +
    '   To avoid a possible service interruption for your end users please log in to our customer portal and ' +
    'update the existing SSL certificate or configure a new one.' +
    // TODO: fix o rebase teplate to vendor profile
    '\n\n\ Kind regards, \n{{support_team}}\n{{company_website_url}}\n';

  // NOTE:// From: (“support_email” and “support_name” from vendor profile)
  var SubjectTextForUser = '[{{companyNameShort}}] Your SSL certificate "{{cert_name}}" will expire soon';
  // NOTE: prepare template text with  details about count expire days
  if (expiresCountDays < 0) {
    expiresDaysDetails = ' (or has expired ' + Math.abs(expiresCountDays) + ' days ago)';
  } else {
    expiresDaysDetails = ' (or in ' + expiresCountDays + ' days)';
  }

  var listOfSSLCertCNAndSANNames = '';
  if (expiringSSLCertificateIformation.domains.length > 0) {
    listOfSSLCertCNAndSANNames = expiringSSLCertificateIformation.domains.join('\n');
  }
  var listOfDomainsWhichUseTheCert = '';
  if (expiringSSLCertificateIformation.domain_configs.length > 0) {
    var links = _.map(expiringSSLCertificateIformation.domain_configs, function(itemDomainConfig) {
      // TODO: make link to portal - Domain Config Page
      var link = itemDomainConfig.domain_name;
      var details = '';
      if (itemDomainConfig.domain_wildcard_alias.length > 0) {
        details += itemDomainConfig.domain_wildcard_alias;
      }
      if (itemDomainConfig.domain_aliases.length > 0) {
        if (details.length > 0) {
          details += ',';
        }
        details += itemDomainConfig.domain_aliases.join(',');
      }

      if (details.length > 0) {
        link += '(' + details + ')';
      }
      // TODO: make links clickable
      return link;
    });
    if (links.length > 0) {
      listOfDomainsWhichUseTheCert = links.join('\n');
      listOfDomainsWhichUseTheCert = 'The certificate is used by the following domains:\n' + listOfDomainsWhichUseTheCert;
    }
  }

  // NOTE: prepare mailOptions for different types of SSL Certificate
  switch (expiringSSLCertificateIformation.cert_type) {
    // NOTE: used email address specified in API configuration attribute “notify_admin_by_email_on_ssl_cert_expiration”
    case 'shared':
      if (!!adminEmail && adminEmail !== '') {
        var mail = _.clone(mailOptions);
        mail.subject = SubjectTextForUser
          .replace('{{companyNameShort}}', expiringSSLCertificateIformation.account_info.companyName)
          .replace('{{cert_name}}', expiringSSLCertificateIformation.cert_name);
        mail.to = adminEmail;
        mail.text = _.clone(templateNotificationText) //.join('\n')
          .replace('{{firstname}}', adminEmail)
          .replace('{{cert_name}}', expiringSSLCertificateIformation.cert_name)
          .replace('{{support_team}}', accountVendorProfile.support_name)
          .replace('{{company_website_url}}', accountVendorProfile.companyWebsiteURL)
          .replace('{{list_of_ssl_cert_cn_and_san_names}}', listOfSSLCertCNAndSANNames)
          .replace('{{list_of_domains_which_use_the_cert}}', listOfDomainsWhichUseTheCert)
          .replace('{{expires_at}}', moment(expiringSSLCertificateIformation.expires_at).format('YYYY-MM-DD'))
          .replace('{{expires_days_details}}', expiresDaysDetails);

        logger.info('prepareNotificationEmailsForExperingSSLCetificates:add mail options for notificate "' + adminEmail +
          '" about SSL Certificate "' + expiringSSLCertificateIformation.cert_name + '"');
        mailOptionsList.push(mail);
      } else {
        logger.warn('prepareNotificationEmailsForExperingSSLCetificates:“notify_admin_by_email_on_ssl_cert_expiration” ' +
          ' is not exist for send info about SSL Certificate (' + expiringSSLCertificateIformation.cert_id +
          ', "' + expiringSSLCertificateIformation.cert_name + '")');
      }
      break;
      // NOTE: Make email template for each user
    case 'private':
      var usersInfo = expiringSSLCertificateIformation.users_info;
      // NOTE: Don’t alert about “private” cert which are not used by any domains
      if (expiringSSLCertificateIformation.domain_configs.length > 0) {
        usersInfo.forEach(function(itemUser) {
          if (!!itemUser.email && (itemUser.email !== '')) {
            var mail = _.clone(mailOptions);
            mail.subject = SubjectTextForUser
              .replace('{{companyNameShort}}', expiringSSLCertificateIformation.account_info.companyName)
              .replace('{{cert_name}}', expiringSSLCertificateIformation.cert_name);
            mail.to = itemUser.email;
            if (!!adminEmail) {
              mail.bcc = adminEmail;
            }
            mail.text = _.clone(templateNotificationText) //.join('\n')
              .replace('{{firstname}}', itemUser.firstname)
              .replace('{{cert_name}}', expiringSSLCertificateIformation.cert_name)
              .replace('{{support_team}}', accountVendorProfile.support_name)
              .replace('{{company_website_url}}', accountVendorProfile.companyWebsiteURL)
              .replace('{{list_of_ssl_cert_cn_and_san_names}}', listOfSSLCertCNAndSANNames)
              .replace('{{list_of_domains_which_use_the_cert}}', listOfDomainsWhichUseTheCert)
              .replace('{{expires_at}}', moment(expiringSSLCertificateIformation.expires_at).utc().format('YYYY-MM-DD'))
              .replace('{{expires_days_details}}', expiresDaysDetails);
            mailOptionsList.push(mail);
          } else {
            logger.warn('prepareNotificationEmailsForExperingSSLCetificates:no user email');
          }
        });
      }
      break;
    default:
      logger.warn('prepareNotificationEmailsForExperingSSLCetificates:warrning - unknow certificate type for email options ' +
        expiringSSLCertificateIformation.cert_type);
      break;
  }
  // NOTE: return mailOptionsList
  logger.info('prepareNotificationEmailsForExperingSSLCetificates:finished preparing email options for SSL Certificate ' +
    '"' + expiringSSLCertificateIformation.cert_name + '". Total count emails ' + mailOptionsList.length);
  cb(null, mailOptionsList);
};
/**
 *
 * @name sendSSLNotificationEmails
 * @description use internal service for send email
 * @param {any} options
 * @param {any} cb
 */
module.exports.sendSSLNotificationEmails = function sendSSLNotificationEmails(mailOptionsList, cb) {
  mailService.sendMail(mailOptionsList, function(err) {
    if (err) {
      if(err.message){
        logger.error('sendSSLNotificationEmails:error message ' + err.message);
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
