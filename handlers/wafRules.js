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
var mongoose    = require('mongoose');
var boom        = require('boom');
var AuditLogger = require('../lib/audit');
var config      = require('config');
var cds_request = require('request');
var utils           = require('../lib/utilities.js');
var logger = require('revsw-logger')(config.log_config);
var Promise = require('bluebird');
var _ = require('lodash');

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

var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};
/**
 * @name listWAFRules
 * @description get List WAF Rules
 * All users have access to all public WAF Rule
 *
 */
exports.listWAFRules = function(request, reply) {
  var filters_ = request.query.filters;
  var isRevAdmin = utils.isUserRevAdmin(request);
  var options = {};

 // NOTE: add additional filters for send to CDS
  if(!!filters_){
    if(!!filters_.account_id){
        if (!utils.checkUserAccessPermissionToAccount(request,filters_.account_id)) {
            return reply(boom.badRequest('WAF Rules not found'));
        }
        options.account_id = filters_.account_id;
        options.visibility = 'public'; // NOTE: rules for Account Id
      if(!!filters_.rule_type && filters_.rule_type === 'builtin'){
          options.rule_type = filters_.rule_type;
      }
    } else {
        if(!!filters_.rule_type){
            options.rule_type = filters_.rule_type;
        }
        if(isRevAdmin !== true){
            // NOTE: if user not RevAdmin he can`t see  'private' (only 'public')
            options.visibility = 'public';
        }
    }
  }

  cds_request( { url: config.get('cds_url') + '/v1/waf_rules?'+queryString.stringify(options),
    headers: authHeader
  }, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get from CDS a list of WAF Rules'));
    }
    var response_json = JSON.parse(body);
    if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
    } else {
      if (!response_json || !utils.isArray(response_json)) {
        return reply(boom.badImplementation('Recevied a strange CDS response for a list of WAF Rules: ' + response_json));
      }
      var response = [];
      for (var i=0; i < response_json.length; i++) {
        // TODO: Need better performance ???
         if(response_json[i].rule_type === 'customer' && !isRevAdmin){
           // NOTE: user can get access to 'customer' WAF Rule if it created for user account(s)
           if (utils.checkUserAccessPermissionToAccount(request,response_json[i].account_id)) {
              response.push(publicRecordFields.handle(response_json[i], 'wafRule'));
           }
         }else{
           response.push(publicRecordFields.handle(response_json[i], 'wafRule'));
         }
      }

      renderJSON(request, reply, err, response);
    }
  });

};

exports.getWAFRule = function(request, reply) {

  var wafRuleId = request.params.waf_rule_id;

  wafRules.get(wafRuleId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for WAF Rule ID ' + wafRuleId));
    }
    // TODO: add check permission
    // if (!result || !utils.checkUserAccessPermissionToWAFRule(request,result)) {
    //   return reply(boom.badRequest('WAF Rule ID not found'));
    // }

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
exports.createWAFRule = function(request, reply) {
  var newWAFRule = request.payload;
  if (!utils.checkUserAccessPermissionToWAFRule(request, newWAFRule)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  newWAFRule.created_by = utils.generateCreatedByField(request);

  var newWAFRule2 = publicRecordFields.handle(newWAFRule, 'sslCertificate');
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
    if (!utils.checkUserAccessPermissionToAccount(request, updatedWAFRule.account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }
    // TODO: Check permission
   if (!result || !utils.checkUserAccessPermissionToWAFRule(request,result)) {
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

    if (!result || !utils.checkUserAccessPermissionToWAFRule(request,result)) {
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
    //if (!result || !utils.checkUserAccessPermissionToWAFRule(request,result)) {
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
