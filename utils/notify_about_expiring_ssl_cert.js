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

//  CHECK EXPIRING SSL CERTIFICATES AND SEND NOTIFICATION EMAILS TO USERS
//  ----------------------------------------------------------------------------------------------//
'use strict';

//  this is 0.10, console.dir( obj, opts ) doesn't work
var util = require('util');
var _ = require('lodash');
var log_ = function(o, d) {
  console.log(util.inspect(o, {
    colors: true,
    depth: (d || 100),
    showHidden: true
  }));
};



//  CLI -----------------------------

var showHelp = function() {
  console.log('\n  Notification about expiring  SSL Certs - a tool to check data and sent notification to users');
  console.log('  Usage:');
  console.log('    --dry-run :');
  console.log('        does not send email (debug mode)');
  console.log('    -h, --help :');
  console.log('        this message');
  console.log('    --accountId :');
  console.log('        get SSL Certs only related to this account');
  console.log('    --CLI_MODE :');
  console.log('        used CLI mode logging \n\n');

  process.exit(0);
};

var conf = {},
  pars = process.argv.slice(2),
  parslen = pars.length,
  curr_par = false;

for (var i = 0; i < parslen; ++i) {

  if (pars[i] === '-h' || pars[i] === '--help') {
    showHelp();
    return;
  }

  if (pars[i] === '--CLI_MODE') {
    conf.cli_mode = true;
    // } else if(pars[i] === '--date') {
    //   curr_par = 'date';
  } else if (pars[i] === '--dry-run') {
    conf.dry = true;
  } else if (pars[i] === '--accountId') {
    curr_par = 'accountId';
  } else if (curr_par) {
    conf[curr_par] = pars[i];
    curr_par = false;
  } else {
    console.error('\n    unknown parameter: ' + pars[i]);
    showHelp();
    return;
  }
}

var promise = require('bluebird');
var sslCertificatesReports = require('../lib/sslCertificatesReports');

promise.promisifyAll(sslCertificatesReports);

var countSends = 0;
var options = {
  accountId: conf.accountId
  //  count_expiring_days: 30 // TODO: add additional CLI parameter
};
// NOTE: start work-flow notification for expiring SSL Cartificates
sslCertificatesReports
  .getExpiringSSLCertificatesInformationListAsync(options)
  .then(function chechListAccounts(data) {
    log_('Get list Expiring SSL Certificates. Found expiring - ' + data.length + '.');
    return data;
  })
  .map(function(itemExperingSSLCertificateInformation) {    
    var options = itemExperingSSLCertificateInformation;
    return sslCertificatesReports.prepareNotificationEmailsForExperingSSLCetificatesAsync(options)
      .then(function(data) {
        // NOTE: return array of data for send email with email service
        return data;
      })
      .catch(function(err) {
        log_('prepareNotificationEmailsForExperingSSLCetificates:err'+ JSON.stringify( err));
        return;
      });
  }, {
    concurrency: 1 // NOTE:
  })
  .then(function(extendedInformation) {    
    // NOTE: make one mail options list for send all notification emails
    var totalListSendEmails = _.flatten(extendedInformation);
    // log_('Total count emails for send equal '+ totalListSendEmails.length);
    return totalListSendEmails;
  })
  // NOTE: start send emails
  .map(function(item) {
    var options = item;    
    if (conf.dry !== true) {
      return sslCertificatesReports.sendSSLNotificationEmailsAsync(options)
        .then(function infoResultSendEmail(data) {
          countSends = countSends+1;
          log_('Success send #' + countSends + '. Send email to ' + item.to);
          return item;
        })
        .catch(function(err) {
          log_('Error send email to' + item.to);
          return item;
        });
    } else {
      //NOTE: if conf.dry === true - not send email
      return promise.resolve(item);
    }
  }, {
    concurrency: 10 // NOTE: speed send emails
  })
  .catch(function(err) {
    log_('Error:Process notification  about expiring SSL Certificates. ' + JSON.stringify(err));
  })
  .finally(function() {
    // NOTE: close CLI script
    log_('Close executing script');
    process.exit(0);
    return;
  });
