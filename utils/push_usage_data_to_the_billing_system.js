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
'use strict';

var promise = require('bluebird');
var billingSytemReport = require('../lib/billingSytemReport.js');
//  this is 0.10, console.dir( obj, opts ) doesn't work
var util = require('util');
var log_ = function(o, d) {
  console.log(util.inspect(o, {
    colors: true,
    depth: (d || 100),
    showHidden: true
  }));
}

//  CLI -----------------------------

var showHelp = function() {
  console.log('\n  Usage Report Generator - a tool to collect usage data and store it to the MongoDB');
  console.log('  Usage:');
  console.log('    --date :');
  console.log('        date of the report, for ex. "2015-11-19" or "-3d"');
  console.log('        today assumed if absent');
  console.log('    -a, --account :');
  console.log('        account Id');
  console.log('    --dry-run :');
  console.log('        show collected data, does not store anything (debug mode)');
  console.log('    -h, --help :');
  console.log('        this message\n\n');
  process.exit(0);
};

var conf = {},
  pars = process.argv.slice(2),
  parslen = pars.length,
  curr_par = false,
  accountId = null,
  subscriptionId = null;

for (var i = 0; i < parslen; ++i) {

  if (pars[i] === '-h' || pars[i] === '--help') {
    showHelp();
    return;
  }
  if (pars[i] === '-a' || pars[i] === '--account') {
    curr_par = 'accountId';
  } else if (pars[i] === '-s' || pars[i] === '--subscription') {
    curr_par = 'subscriptionId';
  } else if (pars[i] === '--date') {
    curr_par = 'date';
  } else if (pars[i] === '--dry-run') {
    conf.dry = true;
  } else if (curr_par) {
    conf[curr_par] = pars[i];
    curr_par = false;

  } else {
    console.error('\n    unknown parameter: ' + pars[i]);
    showHelp();
    return;
  }
}

console.log(conf.dry);

billingSytemReport.getListAccountsForReport(conf)
  .then(function chechListAccounts(data) {
    log_('Get list Accounts for send billing info for ' + data.length + ' accounts.');
    return data;
  })
  .map(function(item) {
    return billingSytemReport.oneBillingReport((conf.date || 'now'), item.id /* Account ID*/ , conf.dry /*do not save, return collected data*/ )
      .then(function infoResultReporting() {
        return {
          id: item.id,
          company_name: item.companyName,
          subscription_id: item.subscription_id,
          contact_email: item.contact_email,
          subscription_state: item.subscription_state,
          billing_plan: item.billing_plan
        }
      });
  }, {
    concurrency: 100 // TODO: make as parameter ?
  })
  .then(function sucess(data) {
    log_(data, 5);
  })
  .catch(function(err) {
    console.log(err);
    log_('Error:Process send billing information. ' + JSON.stringify(err));
  })
  .finally(function() {
    process.exit(0);
    return;
  });
