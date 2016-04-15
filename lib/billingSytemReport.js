/*jslint node: true */

'use strict';
//  ----------------------------------------------------------------------------------------------//

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

module.exports.getListAccountsForReport = function() {
  return accounts.listSubscribersAsync().then(function(data) {
    // TODO: add logger
    return data;
  }).catch(function() {
    //TODO: add logger
    return [];
  });
};

module.exports.oneBillingReport = function(account_id, _from) {
  _from = parseDay_(_from);
  var data_memo = moment(_from).format('YYYY-MM-DD'); // NOTE: format data for

  var getUsageReportForAccount = function(account_id) {
    return new Promise(function(resolve, reject) {
      // NOTE: used exist method with params (from, to, account_id, only_overall, keep_samples)
      // TODO: !!!!! check time period !!!!!
      usageReport.checkLoadReports(_from, _from, account_id, true, true)
        .then(function(data) {
          logger.info('getUsageReportForAccount:checkLoadReports get data for Account ID ' + account_id);
          resolve(data);
        })
        .catch(function(err) {
          logger.error('getUsageReportForAccount:checkLoadReports error get report data for Account ID ' + account_id + ' ' + JSON.stringify(err));
          resolve([]); // NOTE: all call API must be resolve
        });
    });
  };

  var createMultipleAllocations = function(subscriptionId, allocations) {
    return new Promise(function(resolve) {
      logger.info('createMultipleAllocations: with Subscription Id ' + subscriptionId + ' and allocations ' + JSON.stringify(allocations));
      Customer.multipleAllocatesResource(subscriptionId, allocations,
        function(err, data) {
          if (err) {
            logger.error('createMultipleAllocations:error' + JSON.stringify(err));
          }
          logger.info('createMultipleAllocations:send data');
          resolve(data);
        });
    });
  };

  var createAllocation = function(subscriptionId, componentId, allocation) {
    return new Promise(function(resolve) {
      logger.info('createAllocation: with Subscription Id ' + subscriptionId + ', Componen Id ' + componentId + ' and the allocation ' + JSON.stringify(allocation));
      Customer.allocateResource(subscriptionId, componentId, allocation,
        function(err, data) {
          if (err) {
            logger.error('createAllocation:error' + JSON.stringify(err));
          }
          logger.info('createAllocation:send data');
          resolve(data);
        });
    });
  };

  var createUsage = function(subscriptionId, componentId, usage, day) {
    return new Promise(function(resolve) {
      logger.info('createUsage: with Subscription Id ' + subscriptionId + ', Componen Id ' + componentId + ' and the usage ' + JSON.stringify(usage));
      Customer.synceUsageResource(subscriptionId, componentId, usage, day,
        function(err, data) {
          if (err) {
            logger.error('createUsage:error' + JSON.stringify(err));
          }
          logger.info('createUsage:send data');
          resolve(data);
        });
    });
  };

  // ----------------------------------------------------------------------
  // Work-flow
  return Promise.resolve(account_id) // TODO: use
    // 1. get the Account
    .then(function getAccountInfo(id) {
      return accounts.getAsync({
        _id: id
      });
    })
    // 2. get the data for prepare API call
    .then(function getDataForReport(account) {
      // console.log(account); // TODO:delete
      return Promise.all([{
          account_id: account.id,
          subscription_id: account.subscription_id,
          billing_plan: account.billing_plan
        },
        getUsageReportForAccount(account.id),
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
    .spread(function(account, reportdata, bp) {
      var listApiCalls = [];
      // console.log(account, reportdata, bp.services);
      if (!account.subscription_id) {
        logger.error('Account with ID ' + account.account_id + ' not have Subscription ID.');
        throw new Error('Account with ID ' + account.account_id + ' not have Subscription info.');
      }

      //NOTE: getUsageReportForAccount return array.
      _.forEach(reportdata, function(data4Send) {
        console.log(data4Send); // TODO: delete after testing
        // Для каждого Service ищем данные для отправки
        _.forEach(bp.services, function(servise) {
          //console.log('internal servise ', servise);
          var allocationList = [];
          // // Mobile App
          if (servise.code_name === 'App') {
            listApiCalls.push(function() {
              var allocation = {
                quantity: data4Send.applications.total,
                memo: data_memo
              };
              var component_id = servise.chargify_component_id;
              return createAllocation(account.subscription_id, component_id, allocation);
            });
          }
          // Web Domain
          if (servise.code_name === 'Domain') {
            listApiCalls.push(function() {
              var allocation = {
                quantity: data4Send.domains.total,
                memo: data_memo
              };
              var component_id = servise.chargify_component_id;
              return createAllocation(account.subscription_id, component_id, allocation);
            });
          }
          // SSL Name
          if (servise.code_name === 'SSL Name') {
            listApiCalls.push(function() {
              var allocation = {
                quantity: data4Send.domains.ssl_enabled,
                memo: data_memo
              };
              var component_id = servise.chargify_component_id;

              return createAllocation(account.subscription_id, component_id, allocation);
            });
          }
          // Request
          if (servise.code_name === 'request') {
            listApiCalls.push(function() {
              var usage = {
                quantity: data4Send.traffic.count,
                memo: data_memo
              };
              var component_id = servise.chargify_component_id;
              return createUsage(account.subscription_id, component_id, usage);
            });
          }

          if (servise.code_name === 'traffic') {
            listApiCalls.push(function() {
              var val = (data4Send.traffic.sent_bytes + data4Send.traffic.received_bytes) / 1000;
              var usage = {
                quantity: val,
                memo: data_memo
              };
              var component_id = servise.chargify_component_id;
              return createUsage(account.subscription_id, component_id, usage, data_memo);
            });
          }
        });
      });

      // console.log('listApiCalls', listApiCalls); // TODO: delete
      var x = 0;
      return Promise.resolve(listApiCalls)
        .map(function(apiCall) {
          var n = x++;
          logger.info('API request N ' + n + ' for Account ID ' + account.account_id + ' and Subscription ' + account.subscription_id);
          // TODO: delete //console.log('API request ', n);
          return apiCall();
        }, {
          concurrency: 1
        })
        //
        .then(function resultApiCalls(data) {
          // console.log('result api call --', data);
          // resolve();
          return data;
        })
        .catch(function(err) {
          //resolve();
          // console.log('-error in map--', err);
          return;
        });

    })
    .then(function(data) {
      // TODO: add logger
      console.log('result sending data', data);
    })
    .catch(function(err) {
      return new Error('Error all process');
    });
};
