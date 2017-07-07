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

//  USAGE REPORT COLLECT AND STORE
//  ----------------------------------------------------------------------------------------------//
'use strict';

var promise = require('bluebird');

//  this is 0.10, console.dir( obj, opts ) doesn't work
var util = require('util');
var log_ = function(o, d) {
  console.log(util.inspect(o, {
    colors: true,
    depth: (d || 100),
    showHidden: true
  }));
};



//  CLI -----------------------------

var showHelp = function() {
  console.log('\n  Usage Report Generator - a tool to collect usage data and store it to the MongoDB');
  console.log('  Usage:');
  console.log('    --date :');
  console.log('        date of the report, for ex. "2015-11-19"');
  console.log('        today assumed if absent');
  console.log('    --accountId :');
  console.log('        a accountId for create Usage Report');
  console.log('    --alert_on_traffic_changes :');
  console.log('        a traffic change alerting');
  console.log('    --traffic_alerting_threshold :');
  console.log('        a threshold of traffic change for alerting');
  console.log('     --traffic_alerting_email :');
  console.log('        an email user who will get traffic change alerting');
  console.log('    --dry-run :');
  console.log('        does not store anything (debug mode)');
  console.log('    --verbose, -v :');
  console.log('        show collected data');
  console.log('    -h, --help :');
  console.log('        this message');
  console.log('    --CLI_MODE :');
  console.log('        used CLI mode logging \n\n');

  process.exit(0);
};

var conf = {
    alert_on_traffic_changes: false,
    traffic_alerting_threshold: 80,
    accountId: false, // NOTE: "false" is means what all accounts will used
    dry: false // NOTE: by default save data to storage
  },
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
  } else if (pars[i] === '--date') {
    curr_par = 'date';
  } else if (pars[i] === '--accountId') {
    curr_par = 'accountId';
  } else if (pars[i] === '--alert_on_traffic_changes') {
    conf.alert_on_traffic_changes = true;
  } else if (pars[i] === '--traffic_alerting_threshold') {
    curr_par = 'traffic_alerting_threshold';
  } else if (pars[i] === '--traffic_alerting_email') {
    curr_par = 'traffic_alerting_email';
  } else if (pars[i] === '--dry-run') {
    conf.dry = true;
  } else if (pars[i] === '--verbose' || pars[i] === '-v') {
    conf.verbose = true;
  } else if (curr_par) {
    conf[curr_par] = pars[i];
    curr_par = false;
  } else {
    console.error('\n    unknown parameter: ' + pars[i]);
    showHelp();
    return;
  }
}

// console.log('conf', conf)

//  here we go ... -------------------------------------------------------------------------------//
var usageReportTraffic = require('../lib/usageReportTraffic.js');
promise.promisifyAll(usageReportTraffic);
var countSends = 0;
promise.resolve()
  .then(function() {
    return require('../lib/usageReport.js').collectDayReport(
        (conf.date || 'now'),
        conf.accountId, //  no particular id(s)
        conf.dry, //  do not save, return collected data
        true //  collect orphans
      )
      .then(function(data) {
        if (conf.verbose) {
          log_(data, 2);
        }
        console.log('collectDayReport done.\n');
      });
  })
  .then(function() {
    if (conf.alert_on_traffic_changes === false || !conf.traffic_alerting_email) {
      return promise.resolve();
    }
    var options = {
      current_day: (conf.date || undefined),
      accountId: conf.accountId,
      test_mode: conf.dry,
      traffic_threshold: conf.traffic_alerting_threshold
    };
    return usageReportTraffic.getDomainsTrafficChangesFromUsageReportsAsync(options)
      .then(function(data) {
        log_('getDomainsTrafficChangesFromUsageReports:success - count ' + data.length);
        var options = {
          domains_traffic: data,
          main_alerting_email: conf.traffic_alerting_email,
          traffic_threshold: parseInt(conf.traffic_alerting_threshold)
        };
        return usageReportTraffic.prepareDomainsTrafficChangesEmailOptionsAsync(options)
          .then(function(data) {
            log_('prepareDomainsTrafficChangesEmailOptions:success - count ' + data.length);
            return data;
          })
          // NOTE: start send emails
          .map(function(item) {
            var options = item;
            if (conf.dry !== true) {
              return usageReportTraffic.sendDomainTrafficChangesEmailsAsync(options)
                .then(function infoResultSendEmail(data) {
                  countSends = countSends + 1;
                  log_('Success send #' + countSends + '. Send email to "' + item.to + '" with subject "' + item.subject + '"');
                  return item;
                })
                .catch(function(err) {
                  log_('Error send email to' + item.to);
                  return item;
                });
            } else {
              log_('Not send email to ' + item.to + '"' + item.to + '" with subject "' + item.subject + '"');
              //NOTE: if conf.dry === true - not send email
              return promise.resolve(item);
            }
          }, {
            concurrency: 10 // NOTE: speed send emails
          });
      })
      .then(function(data) {
        // TODO: send emails
        log_('End send emails ');
      });
  })
  .catch(function(err) {
    console.log(err);
  })
  .finally(function() {
    log_('Script end to work');
    process.exit(0);
    return;
  });


//  ----------------------------------------------------------------------------------------------//
