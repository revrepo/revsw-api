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
var queryString = require('querystring');
var moment      = require('moment');
var mongoose    = require('mongoose');
var boom        = require('boom');
var async       = require('async');
var AuditLogger = require('../lib/audit');
var config      = require('config');
var cds_request = require('request');
var utils       = require('../lib/utilities.js');
var logger      = require('revsw-logger')(config.log_config);
var Promise     = require('bluebird');
var _           = require('lodash');

var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var DomainConfig   = require('../models/DomainConfig');
var ServerGroup         = require('../models/ServerGroup');
var Account = require('../models/Account');
var SSLCertificate = require('../models/SSLCertificate');
var WAFRule = require('../models/WAFRule');

var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var serverGroups         = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var sslCertificates = new SSLCertificate(mongoose, mongoConnection.getConnectionPortal());
var wafRules = new WAFRule(mongoose, mongoConnection.getConnectionPortal());
var permissionCheck = require('./../lib/requestPermissionScope');
var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};

var TEMPLATE_DEFAULT_WAF_RULE_NAME = 'Auto-generated WAF rule for domain {{DOMAIN_NAME}}, time range {{TIME_PERIOD}}';
var MAX_NUMBER_OF_UNCOMPLETED_WAF_AUTO_GENERATED_RULE_JOBS = config.get('max_number_of_uncompleted_waf_auto_generated_rule_jobs');
/**
 * @name  callCDSWAFRules
 * @description internal method for call CDS - WAF Rules
 * @param  {Object}   options Query parameters
 * @param  {Function} cb      Callback function
 * @return
 */
function callCDSWAFRules(options, cb) {
  logger.info('callCDSWAFRules::Calling CDS to get a list WAF Rules with query paramaters: ' + JSON.stringify(options));
  cds_request({
    url: config.get('cds_url') + '/v1/waf_rules?' + queryString.stringify(options),
    headers: authHeader
  }, function(err, res, body) {
    if (err) {
      return cb(boom.badImplementation('Failed to get from CDS a list of WAF Rules'));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return cb(boom.badRequest(response_json.message));
    } else {
      if (!response_json || !utils.isArray(response_json)) {
        return cb(boom.badImplementation('Recevied a strange CDS response for a list of WAF Rules: ' + response_json));
      }
    }
    cb(null, response_json);
  });
}

/**
 * @name listWAFRules
 * @description get available for User list of WAF Rules
 * All users have access to all public WAF Rule
 * but full information about Used By Domains available only RevAdmin
 */
exports.listWAFRules = function(request, reply) {
  var filters_ = request.query.filters;
  var isRevAdmin = utils.isUserRevAdmin(request);
  var accountIds = utils.getAccountID(request);
  var options = {};
  var cdsCalls = [];
  var totalListWAFRules = [];

  // NOTE: Start main work-flow
  async.waterfall([
      function validationRequestOptions(cb) {
        if (!!filters_) {
          if (!!filters_.rule_type) {
            options.rule_type = filters_.rule_type;
          }
          if (!!filters_.account_id) {
            if (!permissionCheck.checkPermissionsToResource(request, {id: filters_.account_id}, 'accounts')) {
              return cb(boom.badRequest('WAF Rules not found'));
            }
            options.account_id = filters_.account_id;
          }
        }
        cb(null);
      },
      // NOTE: get part of data - Built-In WAF Rules
      function getListWAFRulesBuiltinType(cb) {
        var optionsBuiltin = {
          rule_type: 'builtin'
        };
        // NOTE: Skip get data if to need only 'customer' WAF Rules
        if (options.rule_type === 'customer') {
          return cb(null);
        }
        // NOTE: Only RevAdmin has access to all 'builtin' WAF Rules
        if (isRevAdmin !== true) {
          optionsBuiltin.visibility = 'public';
        }
        // Get all built-in WAF Rules
        callCDSWAFRules(optionsBuiltin, function(err, data) {
          if (!!data && data.length > 0) {
            _.forEach(data, function(item) {
              totalListWAFRules.push(item);
            });
          }
          cb(err);
        });
      },
      // NOTE: Get part available data - Customer WAF Rules
      function getListWAFRulesCustomerType(cb) {
        var optionsCustomer = {
          rule_type: 'customer'
        };
        if ((options.rule_type !== 'builtin') || !!options.account_id) {
          // NOTE: Only one CDS call
          if (!!options.account_id) {
            optionsCustomer.account_id = options.account_id;
            cdsCalls.push(function(cb_) {
              callCDSWAFRules(optionsCustomer, function(err, data) {
                cb_(err, data);
              });
            });
          } else { //start:without account_id
            if (isRevAdmin === true) {
              cdsCalls.push(function(cb_) {
                callCDSWAFRules(optionsCustomer, cb_);
              });
            }
            if (isRevAdmin !== true) {
              if (!_.isArray(accountIds)) {
                accountIds = [accountIds];
              }
              // Get all WAF Rules for Each accountId
              _.forEach(accountIds, function(itemAccountId) {
                cdsCalls.push(function(cb_) {
                  var accountOptions = _.merge({}, optionsCustomer, { account_id: itemAccountId });
                  callCDSWAFRules(accountOptions, cb_);
                });
              });
            }
          } // end:without account_id
          // Call all prepared requests
          async.parallel(cdsCalls,
            function(err, dataAll) {
              _.forEach(dataAll, function(itemResponse) {
                _.forEach(itemResponse, function(item) {
                  totalListWAFRules.push(item);
                });
              });
              cb(err);
            });
        } else {
          // skip get WAF Rules Customer types
          cb(null);
        }
      },
      //NOTE:  Extend information about Used WAF Rules into Domain Configs
      function addDomainUsageInformation(cb) {
        var listWAFRulesIds = _.map(totalListWAFRules, 'id');
        // NOTE: RevAdmin has access to all domain config
        var accounts = (isRevAdmin === true) ? null : accountIds;
        domainConfigs.infoUsedWAFRulesInDomainConfigs(accounts, listWAFRulesIds,
          function(err, dataUsedDomain) {
            if (err) {
              return cb(boom.badImplementation('Failed to get information about used by domains the WAF Rules'));
            }
            //
            totalListWAFRules = _.map(totalListWAFRules, function(itemWAFRuleIfo) {
              itemWAFRuleIfo.domains = [];
              var findInfo = _.find(dataUsedDomain, function(itemInfoUsedDomain) {
                return itemInfoUsedDomain._id === itemWAFRuleIfo.id;
              });

              if (!!findInfo) {
                _.forEach(findInfo.domain_configs, function(domainInfo) {
                  domainInfo.account_id = domainInfo.account_id.toString();
                  // NOTE: is used the common rule for check access to domain info
                  if (permissionCheck.checkPermissionsToResource(request, domainInfo, 'domains')) {
                    itemWAFRuleIfo.domains.push(domainInfo);
                  }
                });
              }
              return itemWAFRuleIfo;
            });
            cb(null);
          });
      },
      function finalTransformRespons(cb) {
        logger.info('listWAFRules:: Return total records '+ totalListWAFRules.length);
        cb(null, totalListWAFRules);
      }
    ],
    function(err, response) {
      response = _.filter(response, function (rule) {
        if (rule.rule_type === 'builtin') {
          return true;
        } 
        return permissionCheck.checkPermissionsToResource(request, { id: rule.account_id }, 'accounts');
      });

      response = _.uniq(response, 'id');
      renderJSON(request, reply, err, response);
    });

};


exports.getWAFRule = function(request, reply) {

  var wafRuleId = request.params.waf_rule_id;

  wafRules.get(wafRuleId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for WAF Rule ID ' + wafRuleId));
    }

    if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'waf_rules')) {
      return reply(boom.badRequest('WAF Rule ID not found'));
    }

    logger.info('Calling CDS to get configuration for WAF Rule ID ' + wafRuleId);
    cds_request( { url: config.get('cds_url') + '/v1/waf_rules/' + wafRuleId,
      headers: authHeader
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get from CDS the configuration for WAF Rule ID ' + wafRuleId));
      }
      var response_json = JSON.parse(body);
      if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
      }
      var response = publicRecordFields.handle(response_json, 'wafRule');

      renderJSON(request, reply, err, response);
    });
  });
};
/**
 * @name createWAFRule
 * @description Create new WAF Rule
 */
exports.createWAFRule = function (request, reply) {
  var newWAFRule = request.payload;
  if (!permissionCheck.checkSimplePermissions(request, 'waf_rules')) {
    return reply(boom.forbidden('You are not authorized to create a new WAF Rule'));
  }
  if (!permissionCheck.checkPermissionsToResource(request, {id: newWAFRule.account_id }, 'accounts')) {
    return reply(boom.badRequest('Account ID not found'));
  }

  newWAFRule.created_by = utils.generateCreatedByField(request);

  var newWAFRule2 = publicRecordFields.handle(newWAFRule, 'wafRule');
  logger.info('Calling CDS to create a new WAF Rule ' + JSON.stringify(newWAFRule2));
  cds_request({method: 'POST', url: config.get('cds_url') + '/v1/waf_rules', body: JSON.stringify(newWAFRule), headers: authHeader}, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('CDS failed to create a new WAF Rule '  + JSON.stringify(newWAFRule2)));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(response_json.message));
    } else if (res.statusCode === 200) {
      newWAFRule2.id = response_json.id;
      AuditLogger.store({
        account_id      : newWAFRule.account_id,
        activity_type   : 'add',
        activity_target : 'wafrule',
        target_id       : response_json.id,
        target_name     : newWAFRule.rule_name,
        target_object   : newWAFRule2,
        operation_status: 'success'
      }, request);
      renderJSON(request, reply, err, response_json);
    } else {
      return reply(boom.create(res.statusCode, res.message));
    }
  });
};

exports.updateWAFRule = function(request, reply) {

  var updatedWAFRule = request.payload;
  var wafRuleId = request.params.waf_rule_id;
  var optionsFlag = (request.query.options) ? '?options=' + request.query.options : '';
//   return reply(boom.badImplementation('Failed to retrieve details for WAF Rule ID ' + wafRuleId));

  wafRules.get(wafRuleId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for WAF Rule ID ' + wafRuleId));
    }
     // TODO: Check permission
    if (!permissionCheck.checkPermissionsToResource(request, {id: updatedWAFRule.account_id}, 'accounts')) {
      return reply(boom.badRequest('Account ID not found'));
    }
    // TODO: Check permission
   if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'waf_rules')) {
       return reply(boom.badRequest('WAF Rule ID not found'));
   }

    updatedWAFRule.updated_by = utils.generateCreatedByField(request);

    logger.info('Calling CDS to update configuration for WAF Rule ID: ' + wafRuleId +', optionsFlag: ' + optionsFlag);

    cds_request( { url: config.get('cds_url') + '/v1/waf_rules/' + wafRuleId + optionsFlag,
      method: 'PUT',
      headers: authHeader,
      body: JSON.stringify(updatedWAFRule)
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to update the CDS with confguration for WAF Rule ID ' + wafRuleId));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      }
      var response = response_json;

      var action = '';
      if (request.query.options && request.query.options === 'publish') {
        action = 'publish';
      } else if (!request.query.options || request.query.options !== 'verify_only') {
        action = 'modify';
      }
      var result2 = publicRecordFields.handle(updatedWAFRule, 'wafRule');

      if (action !== '') {
        AuditLogger.store({
          account_id       : updatedWAFRule.account_id,
          activity_type    : action,
          activity_target  : 'wafrule',
          target_id        : wafRuleId,
          target_name      : result2.rule_name,
          target_object    : result2,
          operation_status : 'success'
        }, request);
      }
      renderJSON(request, reply, err, response);
    });
  });
};
/**
 * @name deleteWAFRule
 * @description Delete WAF Rule
 */
exports.deleteWAFRule = function(request, reply) {

  var wafRuleId = request.params.waf_rule_id;

  wafRules.get(wafRuleId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for WAF Rule ID ' + wafRuleId));
    }

    if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'waf_rules')) {
      return reply(boom.badRequest('WAF Rule ID not found'));
    }
    // NOTE: check used this WAF Rule ID in Domain Configuration
    domainConfigs.query( { 'proxy_config.rev_component_bp.waf.waf_rules': wafRuleId, deleted: false }, function(error,res) {
      if (error) {
        return reply(boom.badImplementation('Failed to validate that WAF Rule ' + wafRuleId + ' is not in use by a domain configuration'));
      }
      if (res && res.length > 0) {
        var domainNamesWithRule = _.map(res, function(itemDomainConfig){
          return itemDomainConfig.domain_name;
        });
        return reply(boom.badRequest('The WAF Rule is in use by active domain(s) - please update the domain(s)('+domainNamesWithRule+') before removing the WAF Rule'));
      }

      var deleted_by = utils.generateCreatedByField(request);

      logger.info('Calling CDS to delete WAF Rule ID ' + wafRuleId);

      cds_request( { url: config.get('cds_url') + '/v1/waf_rules/' + wafRuleId + '?deleted_by="' + deleted_by + '"',
        method: 'DELETE',
        headers: authHeader,
      }, function (err, res, body) {
        if (err) {
          return reply(boom.badImplementation('Failed to send a CDS command to delete WAF Rule ID ' + wafRuleId));
        }
        var response_json = JSON.parse(body);
        if (res.statusCode === 400) {
          return reply(boom.badRequest(response_json.message));
        }

        var result2 = publicRecordFields.handle(result, 'wafRule');

        AuditLogger.store({
          account_id       : result.account_id,
          activity_type    : 'delete',
          activity_target  : 'wafrule',
          target_id        : wafRuleId,
          target_name      : result.rule_name,
          target_object    : result2,
          operation_status : 'success'
        }, request);
        var response = response_json;
        renderJSON(request, reply, err, response);
      });
    });
  });
};

/**
 * @name getWAFRulesStatus
 * @description Method get status WAF Rule
 */
exports.getWAFRuleStatus = function(request, reply) {

  var wafRuleId = request.params.waf_rule_id;
  wafRules.get(wafRuleId, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive the details for WAF Rule ID ' + wafRuleId));
    }
    // NOTE: status can get any user.
    //if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'waf_rules')) {
    //   return reply(boom.badRequest('WAF Rule ID not found'));
    //}

    cds_request( { url: config.get('cds_url') + '/v1/waf_rules/' + wafRuleId + '/config_status',
      headers: authHeader
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get from CDS the status for WAF Rule ' + wafRuleId));
      }
      var response_json = JSON.parse(body);
      if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
      } else {
        renderJSON(request, reply, err, response_json);
      }
    });
  });
};

/**
 * @name getWAFRuleAutoGenerated
 * @description Method get list of WAF Rule Generation Jobs
 */
exports.getWAFRuleGeneratedJobs = function(request, reply) {
  var accountId = request.query.account_id;
  var options = {
    account_id: accountId
  };
  cds_request({
    url: config.get('cds_url') + '/v1/waf_rules/auto_generated_rules?' + queryString.stringify(options),
    headers: authHeader,
    method: 'GET'
  }, function(err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get from CDS the uncompleted jobs for an account  ' + accountId));
    }
    var response_json = JSON.parse(body);
    if (res.statusCode === 400) {
      return reply(boom.badRequest(response_json.message));
    } else {
      renderJSON(request, reply, err, response_json);
    }
  });
};
/**
 * @name addWAFRuleAutoGeneratedJob
 * @description method add new job
 */
exports.addWAFRuleAutoGeneratedJob = function(request, reply) {
  var dataPayload = request.payload;
  var accountId = dataPayload.account_id;
  var domainId = dataPayload.domain_id;
  var createdBy = utils.generateCreatedByField(request);
  var newWAFRuleGenerationJob = {
    'account_id': dataPayload.account_id,
    'domain_id': dataPayload.domain_id,
    'time_period': dataPayload.time_period,
    'rule_name': dataPayload.rule_name,
    'created_by': createdBy
  };
  var domainConfig = {};
  var statusResponse = {};
  async.waterfall([
    // NOTE: check limit auto generated rules
    function(cb) {
      var options = {
        account_id: accountId
      };
      cds_request({
        url: config.get('cds_url') + '/v1/waf_rules/auto_generated_rules?' + queryString.stringify(options),
        headers: authHeader,
        method: 'GET'
      }, function(err, res, body) {
        if (err) {
          return cb(true, { statusCode: 503, message: 'CDS failed to get WAF Rule Generation Job' });
        }

        var responseJson = JSON.parse(body);
        if (!responseJson) {
          cb(true, { statusCode: 503, messate: 'Can`t get info about uncompleted jobs' });
          return;
        }
        if (responseJson.length > MAX_NUMBER_OF_UNCOMPLETED_WAF_AUTO_GENERATED_RULE_JOBS) {
          var textMessage = 'Too many uncompleted WAF rule generation requests ({{NUMBER}}) - please wait before submitting new requests'
            .replace('{{NUMBER}}', MAX_NUMBER_OF_UNCOMPLETED_WAF_AUTO_GENERATED_RULE_JOBS);
          cb(true, { statusCode: 503, message: textMessage });
        } else {
          cb(null);
        }
      });
    },
    // NOTE: get domain config information
    function(cb) {
      domainConfigs.get(domainId, function(error, result) { // jshint ignore:line
        if (error) {
          return cb(true, { statusCode: 500, message: 'Failed to retrieve domain details for domain ID ' + domainId });
        }
        if (!result) {
          return cb(true, { statusCode: 400, message: 'Domain ID not found' });
        }
        if (!permissionCheck.checkPermissionsToResource(request, result, 'domains')) {
          if (!permissionCheck.checkPermissionsToResource(request, result, 'security_analytics')) {
            return cb(true, { statusCode: 400, message: 'Domain ID not found' });
          }          
        }
        if (!permissionCheck.checkPermissionsToResource(request, result, 'security_analytics')) {
          return cb(true, { statusCode: 400, message: 'Domain ID not found' });
        }
        if (!permissionCheck.checkPermissionsToResource(request, { id: accountId }, 'accounts')) {
          return cb(true, { statusCode: 400, message: 'Account ID not found' });
        }
        domainConfig = result;
        cb(null);
      });
    },
    // TODO: validation time period
    function(cb) {
      cb(null);
    },
    // NOTE: check rule_name
    function(cb) {
      if (!newWAFRuleGenerationJob.rule_name || newWAFRuleGenerationJob.rule_name.length === 0) {
        // NOTE: Generate default waf rule name for new WAF Rule Geneteted Job
        var ruleName_ = _.clone(TEMPLATE_DEFAULT_WAF_RULE_NAME)
          .replace('{{DOMAIN_NAME}}', domainConfig.domain_name)
          .replace('{{TIME_PERIOD}}', newWAFRuleGenerationJob.time_period);
        newWAFRuleGenerationJob.rule_name = ruleName_;
      }
      cb(null);
    },
    // NOTE: call CDS for add new Job
    function(cb) {
      cds_request({
        url: config.get('cds_url') + '/v1/waf_rules/auto_generated_rules',
        headers: authHeader,
        method: 'POST',
        body: JSON.stringify(newWAFRuleGenerationJob)
      }, function(err, res, body) {
        if (err) {
          return cb(true, { statusCode: 500, message: 'CDS failed to create a new WAF Rule Generation Job' });
        }
        var responseJSON = JSON.parse(body);
        statusResponse = {
          statusCode: responseJSON.statusCode,
          message: responseJSON.message,
          object_id: responseJSON.id
        };
        cb(null, res);
      });
    }
  ], function(err, res) {

    if (res.statusCode === 400) {
      return reply(boom.badRequest(statusResponse.message));
    } else if (res.statusCode === 500) {
      return reply(boom.badImplementation(statusResponse.message));
    } else if (res.statusCode === 200) {
      renderJSON(request, reply, err, statusResponse);
    } else {
      return reply(boom.create(res.statusCode || 500, res.message));
    }
  });
};

