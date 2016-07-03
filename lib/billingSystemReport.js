/*jslint node: true */

'use strict';
//  ----------------------------------------------------------------------------------------------//

/** *********************************
@dmitry:

I'd recommend to do the following:

  • line 39, "var Promise = require('bluebird')"
    I would rename it to --> "var promise = require('bluebird')", look the case
    the point is that Promise is reserved word (well, will be in the next version of V8)
    despite the bluebird completely overlaps the functionality of the native promises
    it's not good approach to hide them anyway;

  • functions
      var getUsageReportForAccount = function(...
      var createUsage = function(...
      var createAllocation = function(...
    I would move them outside the "oneBillingReport" and add underscore sign as a prefix or suffix
    to mark them as a "private" functions;

  • Next, they need good description in a Docblock Comment standards;

  • As the whole module makes tricky things interacting with third-party service - I would add :
    · reference to that service's API documentation
    · description/examples of data running both ways
    (yep, it's boring tedious shit, but it may let you avoid much deeper shit later)

 */


var _ = require('lodash');
var moment = require('moment');
var mongoose = require('mongoose');
var mongoConnection = require('../lib/mongoConnections');

var Promise = require('bluebird');
mongoose.Promise = Promise;

var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var Account = require('../models/Account');
var BillingPlan = require('../models/BillingPlan');

var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var usageReport = require('../lib/usageReport.js');

Promise.promisifyAll(accounts);
Promise.promisifyAll(BillingPlan);

var Customer = require('../lib/chargify').Customer;
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
    throw new Error('usageReport parsing error: wrong date format - ' + day);
  }
  parsed.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
  return parsed;
};

/**
 * @name  getListAccountsForReport
 * @description
 * @return {Array} [description]
 */
module.exports.getListAccountsForReport = function(config) {
  var filters = {
    subscription_id: config.subscriptionId,
    account_id: config.accountId
  };
  return accounts.listSubscribersAsync(filters)
    .then(function(data) {
      // TODO: add logger
      return data;
    }).catch(function() {
      //TODO: add logger
      return [];
    });
};

module.exports.oneBillingReport = function(day, account_id, dry) {
  day = parseDay_(day);
  var data_memo = moment(day).format('YYYY-MM-DD'); // NOTE: format data for memo field

  logger.info('oneBillingReport: send billing report for Account ID ' + account_id + ' on day ' + data_memo);

  var getUsageReportForAccount = function(day, account_id, dry) {
    //console.log('--- get data ',day, account_id, dry);
    return new Promise(function(resolve, reject) {
      // NOTE: get only
      usageReport.collectDayReport(day, account_id, dry)
        .then(function(data) {
          // console.log(data)
          logger.info('getUsageReportForAccount:collectDayReport get data for Account ID ' + account_id);
          resolve(data);
        })
        .catch(function(err) {
          logger.error('getUsageReportForAccount:collectDayReport error get report data for Account ID ' + account_id + ' ' + JSON.stringify(err));
          resolve([]); // NOTE: all call API must be resolve
        });
    });
  };

  var createAllocation = function(subscriptionId, componentId, allocation, day, dry) {
    return new Promise(function(resolve, reject) {
      logger.info('createAllocation: with Subscription Id ' + subscriptionId + ', Component Id ' + componentId + ' and the allocation ' + JSON.stringify(allocation));
      // save
      if (!dry) {
        Customer.allocateResource(subscriptionId, componentId, allocation,
          function(err, data) {
            if (err) {
              logger.error('createAllocation:error:' + JSON.stringify(err.status));
              if (!!err.status && err.status === 422) {
                // NOTE: 422 status not criticle for work-flow
                resolve(data);
              } else {
                // NOTE: stop sending data
                reject(new Error('Billing System API call error'));
              }
            } else {
              logger.info('createAllocation:send data');
              resolve(data);
            }
          });
      } else {

        resolve({
          subscription_id: subscriptionId,
          component_id: componentId,
          allocation: allocation
        });
      }
    });
  };

  var createUsage = function(subscriptionId, componentId, usage, day, dry) {
    return new Promise(function(resolve, reject) {
      logger.info('createUsage: with Subscription Id ' + subscriptionId + ', Component Id ' + componentId + ' and the usage ' + JSON.stringify(usage));
      // save
      if (!dry) {
        Customer.syncUsageResource(subscriptionId, componentId, usage, day,
          function(err, data) {
            if (err) {
              logger.error('createUsage:error' + JSON.stringify(err));
              if (!!err.status && err.status === 422) {
                // NOTE: 422 status not criticle for work-flow
                resolve(data);
              } else {
                // NOTE: stop sending data
                reject(new Error('Billing System API call error'));
              }
            } else {
              logger.info('createUsage:send data');
              resolve(data);
            }
          });
      } else {

        resolve({
          subscription_id: subscriptionId,
          component_id: componentId,
          usage: usage
        });

      }
    });
  };


  // ----------------------------------------------------------------------
  // Work-flow
  return Promise.resolve(day)
    .then(parseDay_)
    .then(function(d) {
      day = d;
      return Promise.resolve(day);
    })
    // get the Account
    .then(function getAccountInfo() {
      return accounts.getAsync({
        _id: account_id
      });
    })
    // 2. get the data for preparing API call
    .then(function getDataForReport(account) {
      return Promise.all([{
          account_id: account.id,
          subscription_id: account.subscription_id,
          billing_plan: account.billing_plan
        },
        // get Repor Data
        getUsageReportForAccount(day, account.id, dry),
        // NOTE: get internal billing plan data
        BillingPlan.getAsync({
          _id: account.billing_plan
        })
      ]);
    })
    .catch(function(err) {
      logger.error('Account can not be found. Error ' + JSON.stringify(err));
      // Broke process
      throw new Error('Account can not be found.');
    })
    // 3. Используя получены данные
    // - основная информация об Account
    // - данные за указанную дату
    // - данные о сомпонентах
    // сформировать обращения для обновления данных
    .spread(function(account, reportDay, bp) {
      var listApiCalls = [];
      if (!bp) {
        throw new Error('Billing Plan not exist. Need manual fix.');
      }

      if (!account.subscription_id) {
        logger.error('Account with ID ' + account.account_id + ' not have Subscription ID.');
        throw new Error('Account with ID ' + account.account_id + ' not have Subscription info.');
      }
      // Для каждого Service ищем данные для отправки
      _.forEach(bp.services, function(servise) {
        var allocationList = [];
        // Mobile App
        if (servise.code_name === 'App') {
          // console.log('internal servise ', servise,reportDay.applications.total);
          listApiCalls.push(function(dry) {
            var allocation = {
              quantity: reportDay.applications.active,
              memo: data_memo
            };
            var component_id = servise.chargify_component_id;
            return createAllocation(account.subscription_id, component_id, allocation, day, dry);
          });
        }
        // Web Domain
        if (servise.code_name === 'Domain') {
          listApiCalls.push(function(dry) {
            var allocation = {
              quantity: reportDay.domains.active,
              memo: data_memo
            };
            var component_id = servise.chargify_component_id;
            return createAllocation(account.subscription_id, component_id, allocation, day, dry);
          });
        }
        // SSL Name
        if (servise.code_name === 'SSL Name') {
          listApiCalls.push(function(dry) {
            var allocation = {
              quantity: reportDay.domains.ssl_enabled,
              memo: data_memo
            };
            var component_id = servise.chargify_component_id;

            return createAllocation(account.subscription_id, component_id, allocation, day, dry);
          });
        }
        // Request
        if (servise.code_name === 'request') {
          listApiCalls.push(function(dry) {
            var usage = {
              quantity: parseFloat(reportDay.traffic.count / 10000).toFixed(2),
              memo: data_memo
            };
            var component_id = servise.chargify_component_id;
            return createUsage(account.subscription_id, component_id, usage, day, dry);
          });
        }

        if (servise.code_name === 'traffic') {
          listApiCalls.push(function(dry) {
            var val = parseFloat((reportDay.traffic.sent_bytes) / 1000000000).toFixed(2);
            var usage = {
              quantity: val,
              memo: data_memo
            };
            var component_id = servise.chargify_component_id;
            return createUsage(account.subscription_id, component_id, usage, day, dry);
          });
        }
      });

      var x = 1; // NOTE: count send API request
      return Promise.resolve(listApiCalls)
        .map(function(apiCall) {
          var n = x++;
          logger.info('API request N ' + n + ' for Account ID ' + account.account_id + ' and Subscription ' + account.subscription_id);
          return apiCall(dry);
        }, {
          concurrency: 1
        })
        //
        .then(function resultAllApiCalls(data) {
          logger.info('Success sendin data' + JSON.stringify(data));
          return data;
        })
        .catch(function(err) {
          logger.error('Stop sending data for Account Id ' + account.account_id +
            ' and Subscription Id ' + account.subscription_id + '. Reason info ' + JSON.stringify(err));
          return;
        });
    })
    // .then(function(data) {
    //   // TODO: add logger
    //   console.log('result sending data', data);
    // })
    .catch(function(err) {
      console.log(err);
      return new Error('Error all process');
    });
};
