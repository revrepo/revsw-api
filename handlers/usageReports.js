/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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

var boom = require('boom');
var _ = require('lodash');
var promise = require('bluebird');
var utils = require('../lib/utilities.js');
var renderJSON = require('../lib/renderJSON');
var elasticSearch = require('../lib/elasticSearch');
var reports = require('../lib/usageReport');
var usageReport = require('../lib/usageReport.js');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);

var cacheManager = require('cache-manager');
var memoryCache = cacheManager.caching({
  store: 'memory',
  max: config.get('cache_memory_max_bytes'),
  ttl: config.get('cache_memory_ttl_seconds') /*seconds*/,
  promiseDependency: promise
});
var multiCache = cacheManager.multiCaching([memoryCache]);
var permissionCheck = require('./../lib/requestPermissionScope');
var mongoose = require('mongoose');
var mongoConnection = require('./../lib/mongoConnections');
var Account = require('./../models/Account');
var accounts = promise.promisifyAll(new Account(mongoose, mongoConnection.getConnectionPortal()));
var Json2csvParser = require('json2csv').Parser;
var csvFormatter = require('./../lib/csvFormatter');

exports.getResellersAccounts = function (request) {
  return new promise(function (resolve, reject) {
    var user = request.auth.credentials;
    var accountList = [];
    accounts.listByParentID(user.account_id, function (err, accs) {
      if (err) {
        reject(err);
      }

      if (accs) {
        accs.forEach(function (acc) {
          accountList.push(acc.id);
        });

        resolve(accountList);
      }

      reject('Cannot get accounts');
    });
  });
};


//  ----------------------------------------------------------------------------------------------//
/**
 * @name getAccountReport
 * @description Get Usage Report Date for an Account(s)
 */
exports.getAccountReport = function (request, reply) {
  var accountIds = utils.getAccountID(request);
  exports.getResellersAccounts(request).then(function (resellerAccs) {
    accountIds = resellerAccs;
    var queryProperties = _.clone(request.query);
    var isFromCache = true;
    var accountID = request.query.account_id || '';
    var isValidAccountId = true;
    var isRevAdmin = utils.isUserRevAdmin(request);
    if (!isRevAdmin) {    // For non-revadmin user check the validity of requested account IDs
      if (accountID === '') {
        accountID = utils.getAccountID(request);
        if (accountID.length === 0) {
          isValidAccountId = false;
        }
        if (accountID.length === 1) {
          accountID = accountID[0];
        }
      } else {
        if (!permissionCheck.checkPermissionsToResource(request, { id: accountID }, 'accounts')) {
          isValidAccountId = false;
        }
      }
    } else {
      // for revadmin role just give whatever is requested
      accountIds = accountID;
    }

    accountIds = accountID;

    if (request.auth.credentials.role === 'reseller' && resellerAccs && !request.query.account_id) {
      accountID = accountIds;
      accountID.push(request.auth.credentials.account_id);
    }

    if ((!isRevAdmin && !accountIds.length) || !isValidAccountId) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (request.query.agg) {
      accounts.listByParentID(request.query.account_id, function(error, listOfAccounts) {
        if (error) {
          return reply(boom.badImplementation('Failed to read accounts list from the DB'));
        }
        accountID = [request.query.account_id];
        _.map(listOfAccounts, function (acc) {
          accountID.push(acc.id);
        });

        var from = new Date(), to = new Date();// NOTE: default report period
        var from_ = request.query.from,
          to_ = request.query.to;

        if (!!from_) {
          from = new Date(from_);
        }
        from.setUTCDate(1);             //  the very beginning of the month
        from.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
        if (!!to_) {
          to = new Date(to_);
        }
        to.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
        var cacheKey = 'getAccountReport:' + accountID + ':' + JSON.stringify(queryProperties);
        return reports.checkLoadReports(from, to, accountID, request.query.only_overall, request.query.keep_samples)
          .then(function (response) {
            var response_ = {
              metadata: {
                account_id: accountID,
                from: from.valueOf(),
                from_datetime: from,
                to: to.valueOf(),
                to_datetime: to,
                data_points_count: response.length
              },
              data: response
            };
            return response_;
          }).then(function (response) {
            if (isFromCache === true) {
              logger.info('getAccountStats:return cache for key - ' + cacheKey);
            }
            reply(response).type('application/json; charset=utf-8');
          }).catch(function (err) {
            var msg = err.toString() + ': account ID ' + accountID +
              ', span from ' + (new Date(from)).toUTCString() +
              ', to ' + (new Date(to)).toUTCString();
            return reply(boom.badImplementation(msg));
          });
      });
    } else {
      var from = new Date(), to = new Date();// NOTE: default report period
      var from_ = request.query.from,
        to_ = request.query.to;

      if (!!from_) {
        from = new Date(from_);
      }
      from.setUTCDate(1);             //  the very beginning of the month
      from.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
      if (!!to_) {
        to = new Date(to_);
      }
      to.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
      var cacheKey = 'getAccountReport:' + accountID + ':' + JSON.stringify(queryProperties);
      return reports.checkLoadReports(from, to, accountID, request.query.only_overall, request.query.keep_samples)
        .then(function (response) {
          var response_ = {
            metadata: {
              account_id: accountID,
              from: from.valueOf(),
              from_datetime: from,
              to: to.valueOf(),
              to_datetime: to,
              data_points_count: response.length
            },
            data: response
          };
          return response_;
        }).then(function (response) {
          if (isFromCache === true) {
            logger.info('getAccountStats:return cache for key - ' + cacheKey);
          }
          reply(response).type('application/json; charset=utf-8');
        }).catch(function (err) {
          var msg = err.toString() + ': account ID ' + accountID +
            ', span from ' + (new Date(from)).toUTCString() +
            ', to ' + (new Date(to)).toUTCString();
          return reply(boom.badImplementation(msg));
        });
    }
  });
};

/**
 * @name getAccountStats
 * @description Get Usage Date Histogram for an Account(s)
 */
exports.getAccountStats = function (request, reply) {
  var isFromCache = true;
  var accountIds = utils.getAccountID(request);
  exports.getResellersAccounts(request).then(function (resellerAccs) {
    // TODO: need to move the following permissions checking code to a separate function
    // and it in this and previous handlers
    accountIds = resellerAccs;
    var accountID = request.query.account_id || '';
    var isValidAccountId = true;
    var isRevAdmin = utils.isUserRevAdmin(request);
    if (!isRevAdmin) {    // For non-revadmin user check the validity of requested account IDs
      if (accountID === '') {
        accountID = utils.getAccountID(request);
        if (accountID.length === 0) {
          isValidAccountId = false;
        }
        if (accountID.length === 1) {
          accountID = accountID[0];
        }
      } else {
        if (!permissionCheck.checkPermissionsToResource(request, {id: accountID}, 'accounts')) {
          isValidAccountId = false;
        }
      }
    } else {
      // for revadmin role just give whatever is requested
      accountIds = accountID;
    }

    accountIds = accountID;

    if (request.auth.credentials.role === 'reseller' && resellerAccs && !request.query.account_id) {
      accountID = accountIds;
      accountID.push(request.auth.credentials.account_id);
    }

    if ((!isRevAdmin && !accountIds.length) || !isValidAccountId) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (request.query.agg) {
      accounts.listByParentID(request.query.account_id, function(error, listOfAccounts) {
        if (error) {
          return reply(boom.badImplementation('Failed to read accounts list from the DB'));
        }
        accountID = [request.query.account_id];
        _.map(listOfAccounts, function (acc) {
          accountID.push(acc.id);
        });

        var span = utils.query2Span(request.query, 24/*def start in hrs*/, 24 * 61/*allowed period - 2 months*/);
        if (span.error) {
          return reply(boom.badRequest(span.error));
        }
        var cacheKey = 'getAccountStats:' + accountID + ':' + JSON.stringify(request.query);
        multiCache.wrap(cacheKey, function () {
          isFromCache = false;
          span.interval = 86400000; //  voluntarily set to full day
          return reports.checkLoadStats(span, accountID);
        })
          .then(function (response) {
            if (isFromCache === true) {
              logger.info('getAccountStats:return cache for key - ' + cacheKey);
            }
            reply(response).type('application/json; charset=utf-8');
          })
          .catch(function (err) {
            var msg = err.toString() + ': account ID ' + accountID +
              ', span from ' + (new Date(span.start)).toUTCString() +
              ', to ' + (new Date(span.end)).toUTCString();
            return reply(boom.badImplementation(msg));
          });

      });
    } else {
      var span = utils.query2Span(request.query, 24/*def start in hrs*/, 24 * 61/*allowed period - 2 months*/);
      if (span.error) {
        return reply(boom.badRequest(span.error));
      }
      var cacheKey = 'getAccountStats:' + accountID + ':' + JSON.stringify(request.query);
      multiCache.wrap(cacheKey, function () {
        isFromCache = false;
        span.interval = 86400000; //  voluntarily set to full day
        return reports.checkLoadStats(span, accountID);
      })
        .then(function (response) {
          if (isFromCache === true) {
            logger.info('getAccountStats:return cache for key - ' + cacheKey);
          }
          reply(response).type('application/json; charset=utf-8');
        })
        .catch(function (err) {
          var msg = err.toString() + ': account ID ' + accountID +
            ', span from ' + (new Date(span.start)).toUTCString() +
            ', to ' + (new Date(span.end)).toUTCString();
          return reply(boom.badImplementation(msg));
        });
    }
  });
};

/**
 * @name generateAccountReport
 * @description method for call generate Usage Report data
 * @param {*} request
 * @param {*} reply
 */
exports.generateAccountReport = function (request, reply) {
  var conf = {
    accountId: utils.getAccountID(request),
    dry: false // NOTE: by default save data to storage
  };
  if(request.query.account_id){
    conf.accountId = request.query.account_id;
  }
  promise.resolve()
    .then(function () {
      if (conf.accountId === false) {
        return usageReport.getListActiveAccountsForReports(conf);
      }
      return [conf.accountId];
    })
    .then(function logListAccounts(data) {
      logger.info('Get list Accounts for make day reports for ' + data.length + ' accounts');

      return data;
    })
    .map(function (itemId) {
      logger.info('usageReport:collectDayReport:call for Account Id '+itemId);
      return usageReport.collectDayReport(
        (conf.date || 'now'),
        itemId /* Account ID*/,
        conf.dry /*do not save, return collected data*/,
        false /* !!! NOT collect orphans !!!*/)
        .then(function infoResultReporting() {
          return {
            id: itemId
          };
        });
    }, {
        concurrency: 10
      })
    .then(function sucess(data) {
      var statusResponse = {
        statusCode: 200,
        message: 'Usage Report Generated'
      };

      if (conf.verbose) {
        logger.info(data, 5);
      }
      reply(statusResponse).code(200);
    })
    .catch(function (err) {
      var statusResponse = {
        statusCode: 503,
        message: err
      };

      reply(statusResponse).code(503);
      process.exit(0);
      return;
    });
};

/**
 * @name exportCSVReport
 * @description Export an account's usage report as a CSV file.
 * @param {*} request 
 * @param {*} reply 
 */
exports.exportCSVReport = function (request, reply) {
  getUsageReport(request).then(function (response) {
    csvFormatter.formatUsageReport(response.data).then(function (csvReports) {
      var res = {
        csvContent: csvReports,
        created_at: Date.now()
      };
      return reply(res);
    });
  })
  .catch(function (err) {
    return reply(boom.badRequest(err));
  });
};

/**
 * @description Get a usage report (function similiar to exports.getAccountReport())
 * @param {*} request 
 */
function getUsageReport(request) {
  return new Promise(function (resolve, reject) {
    var accountIds = utils.getAccountID(request);
   exports.getResellersAccounts(request).then(function (resellerAccs) {
      accountIds = resellerAccs;
      var queryProperties = _.clone(request.query);
      var isFromCache = true;
      var accountID = request.query.account_id || '';
      var isValidAccountId = true;
      var isRevAdmin = utils.isUserRevAdmin(request);
      if (!isRevAdmin) {    // For non-revadmin user check the validity of requested account IDs
        if (accountID === '') {
          accountID = utils.getAccountID(request);
          if (accountID.length === 0) {
            isValidAccountId = false;
          }
          if (accountID.length === 1) {
            accountID = accountID[0];
          }
        } else {
          if (!permissionCheck.checkPermissionsToResource(request, { id: accountID }, 'accounts')) {
            isValidAccountId = false;
          }
        }
      } else {
        // for revadmin role just give whatever is requested
        accountIds = accountID;
      }
  
      accountIds = accountID;
  
      if (request.auth.credentials.role === 'reseller' && resellerAccs && !request.query.account_id) {
        accountID = accountIds;
        accountID.push(request.auth.credentials.account_id);
      }
  
      if ((!isRevAdmin && !accountIds.length) || !isValidAccountId) {
        return reject('Account ID Not Found');
      }
  
      if (request.query.agg) {
        accounts.listByParentID(request.query.account_id, function (error, listOfAccounts) {
          if (error) {
            return reject('Cannot get child accounts');
          }
          accountID = [request.query.account_id];
          _.map(listOfAccounts, function (acc) {
            accountID.push(acc.id);
          });
  
          var from = new Date(), to = new Date();// NOTE: default report period
          var from_ = request.query.from,
            to_ = request.query.to;
  
          if (!!from_) {
            from = new Date(from_);
          }
          from.setUTCDate(1);             //  the very beginning of the month
          from.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
          if (!!to_) {
            to = new Date(to_);
          }
          to.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
          var cacheKey = 'getAccountReport:' + accountID + ':' + JSON.stringify(queryProperties);
         reports.checkLoadReports(from, to, accountID, request.query.only_overall, request.query.keep_samples)
            .then(function (response) {
              var response_ = {
                metadata: {
                  account_id: accountID,
                  from: from.valueOf(),
                  from_datetime: from,
                  to: to.valueOf(),
                  to_datetime: to,
                  data_points_count: response.length
                },
                data: response
              };
              return response_;
            }).then(function (response) {
              if (isFromCache === true) {
                logger.info('getAccountStats:return cache for key - ' + cacheKey);
              }
              return resolve(response);
            }).catch(function (err) {
              var msg = err.toString() + ': account ID ' + accountID +
                ', span from ' + (new Date(from)).toUTCString() +
                ', to ' + (new Date(to)).toUTCString();
              return reject(msg);
            });
        });
      } else {
        var from = new Date(), to = new Date();// NOTE: default report period
        var from_ = request.query.from,
          to_ = request.query.to;
  
        if (!!from_) {
          from = new Date(from_);
        }
        from.setUTCDate(1);             //  the very beginning of the month
        from.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
        if (!!to_) {
          to = new Date(to_);
        }
        to.setUTCHours(0, 0, 0, 0); //  the very beginning of the day
        var cacheKey = 'getAccountReport:' + accountID + ':' + JSON.stringify(queryProperties);
       reports.checkLoadReports(from, to, accountID, request.query.only_overall, request.query.keep_samples)
          .then(function (response) {
            var response_ = {
              metadata: {
                account_id: accountID,
                from: from.valueOf(),
                from_datetime: from,
                to: to.valueOf(),
                to_datetime: to,
                data_points_count: response.length
              },
              data: response
            };
            return response_;
          }).then(function (response) {
            if (isFromCache === true) {
              logger.info('getAccountStats:return cache for key - ' + cacheKey);
            }
            return resolve(response);
          }).catch(function (err) {
            var msg = err.toString() + ': account ID ' + accountID +
              ', span from ' + (new Date(from)).toUTCString() +
              ', to ' + (new Date(to)).toUTCString();
            return reject(msg);
          });
      }
    });
  });  
}