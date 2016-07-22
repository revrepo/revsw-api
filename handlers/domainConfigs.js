/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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

var mongoose    = require('mongoose');
var boom        = require('boom');
var AuditLogger = require('../lib/audit');
var config      = require('config');
var cdsRequest = require('request');
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
var User = require('../models/User');

var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var serverGroups         = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());

var billing_plans = require('../models/BillingPlan');
var authHeader = {Authorization: 'Bearer ' + config.get('cds_api_token')};

var checkDomainsLimit = function (companyId, callback) {
   accounts.get({_id: companyId}, function (err, account) {
     if (err) {
       return callback('DomainConfigs::checkDomainsList: Failed to find an account with ID' +
         'Account ID: ' + companyId, null);
     }
     billing_plans.get({_id: account.billing_plan}, function (err, bp) {
       if (err) {
         return callback('DomainConfigs::checkDomainsList:  Failed to find a billing plan associated with account provided' +
           ' Account ID: ' + companyId + ' CreatedBy: ' + account.createdBy, null);
       }
       var serviceIndex = _.findIndex(bp.services, {code_name: 'domain'});
       domainConfigs.model.count({account_id: companyId}, function (err, count) {
         if(err){
           return callback('DomainConfigs::checkDomainsList: Could not count domains for account' +
             ' Account ID: ' + companyId + ' CreatedBy: ' + account.createdBy, null);
         }
         if(serviceIndex<0){
           return callback('DomainConfigs::checkDomainsList: Could not find a \'domain\' service within billing plan' +
             ' Billing Plan ID: ' + bp.id, null);
         }
         return callback(null, bp.services[serviceIndex].included - count);
       });
     });
   });
};

var isSubscriptionActive = function (companyId, callback) {
  accounts.get({_id: companyId}, function (err, account) {
    if (err) {
      return callback('DomainConfigs::isSubscriptionActive: Failed to find an account with ID' +
        'Account ID: ' + companyId, null);
    }
    return account.subscription_state !== 'active' ? callback(false, null) : callback(true, null);
  });
};

exports.getDomainConfigStatus = function(request, reply) {

  var domain_id = request.params.domain_id;
  domainConfigs.get(domain_id, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive configuration details for domain ID ' + domain_id));
    }
    if (!result || !utils.checkUserAccessPermissionToDomain(request,result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    cdsRequest( { url: config.get('cds_url') + '/v1/domain_configs/' + domain_id + '/config_status',
      headers: authHeader
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get from CDS the configuration status for domain ' + domain_id));
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


exports.getDomainConfigs = function(request, reply) {

  cdsRequest( { url: config.get('cds_url') + '/v1/domain_configs',
    headers: authHeader
  }, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get from CDS a list of domains'));
    }
    var response_json = JSON.parse(body);
    if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
    } else {
      if (!response_json || !utils.isArray(response_json)) {
        return reply(boom.badImplementation('Recevied a strange CDS response for a list of domains: ' + response_json));
      }
      var response = [];
      for (var i=0; i < response_json.length; i++) {
        if (utils.checkUserAccessPermissionToDomain(request,response_json[i])) {
          response.push(response_json[i]);
        }
      }
      renderJSON(request, reply, err, response);
    }
  });

};

exports.getDomainConfig = function(request, reply) {

  var domain_id = request.params.domain_id;
  var version = (request.query.version) ? '?version=' + request.query.version : '';

  domainConfigs.get(domain_id, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for domain' + domain_id));
    }
    if (!result || !utils.checkUserAccessPermissionToDomain(request,result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    if (!result.proxy_config) {
      return reply(boom.badImplementation('No "proxy_config" section in configuraiton for domain ID ' + domain_id));
    }

    logger.info('Calling CDS to get configuration for domain ID: ' + domain_id);
    cdsRequest( { url: config.get('cds_url') + '/v1/domain_configs/' + domain_id + version,
      headers: authHeader
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get from CDS the configuration for domain ID: ' + domain_id));
      }
      var response_json = JSON.parse(body);
      if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
      }
      var response = response_json;
      if (response_json.proxy_config) {
        response = response_json.proxy_config;
        if (!response.tolerance) {
          response.tolerance = '3000';
        }
      }
      if (response_json.comment) {
        response.comment = response_json.comment;
      }
      response.published_domain_version = response_json.published_domain_version;
      response.last_published_domain_version = response_json.last_published_domain_version;
      response.enable_ssl = response_json.enable_ssl;
      response.ssl_conf_profile = response_json.ssl_conf_profile;
      response.ssl_cert_id = response_json.ssl_cert_id;
      response.ssl_protocols = response_json.ssl_protocols;
      response.ssl_ciphers = response_json.ssl_ciphers;
      response.ssl_prefer_server_ciphers = response_json.ssl_prefer_server_ciphers;
      response.btt_key = response_json.btt_key;
      response.bp_lua_enable_all = response_json.bp_lua_enable_all;
      response.bp_lua = response_json.bp_lua && response_json.bp_lua.length > 0 ?
        response_json.bp_lua.map(function(lua) {
          return {
            enable: lua.enable,
            location: lua.location,
            code: lua.code
          };
        }) : [];
      response.co_lua_enable_all = response_json.co_lua_enable_all;
      response.co_lua = response_json.co_lua && response_json.co_lua.length > 0 ?
      response_json.co_lua.map(function(lua) {
        return {
          enable: lua.enable,
          location: lua.location,
          code: lua.code
        };
      }) : [];

      renderJSON(request, reply, err, response);
    });
  });
};

exports.getDomainConfigVersions = function(request, reply) {
  var domain_id = request.params.domain_id;
  domainConfigs.get(domain_id, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for domain' + domain_id));
    }
    if (!result || !utils.checkUserAccessPermissionToDomain(request,result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    logger.info('Calling CDS to get configuration versions for domain ID: ', domain_id);
    cdsRequest( { url: config.get('cds_url') + '/v1/domain_configs/' + domain_id + '/versions',
      headers: authHeader
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to get from CDS the configuration for domain ID: ' + domain_id));
      }
      var response_json = JSON.parse(body);
      if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
      }
      // TODO: add here the same ssl/btt transformations as we do a simple GET above
      var response = response_json;
      renderJSON(request, reply, err, response);
    });
  });
};

exports.createDomainConfig = function(request, reply) {
  var newDomainJson = request.payload;
  var originalDomainJson = newDomainJson;
  var account_id = newDomainJson.account_id;
  if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
    return reply(boom.badRequest('Account ID not found'));
  }

  var createDomain = function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get a list of public CO server group for location ID' + newDomainJson.origin_server_location_id));
    }

    if (!result) {
      return reply(boom.badRequest('Specified Rev first mile location ID cannot be found'));
    }

    newDomainJson.created_by = utils.generateCreatedByField(request);
    if (!newDomainJson.tolerance) {
      newDomainJson.tolerance = '3000';
    }

    domainConfigs.query({
      domain_name : newDomainJson.domain_name,
      deleted: { $ne: true }
    }, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to retrieve domain details for domain name ' + newDomainJson.name));
      }
      if (result.length > 0) {
        logger.debug('result = ', result);
        return reply(boom.badRequest('The domain name is already registered in the system'));
      }

      logger.info('Calling CDS to create new domain ' + JSON.stringify(newDomainJson));
      cdsRequest( { url: config.get('cds_url') + '/v1/domain_configs',
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(newDomainJson)
      }, function (err, res, body) {
        if (err) {
          return reply(boom.badImplementation('Failed to send to CDS a request to create new domain ' + JSON.stringify(newDomainJson)));
        }
        var response_json = JSON.parse(body);
        if (res.statusCode === 400)  {
          return reply(boom.badRequest(response_json.message));
        }
        if (res.statusCode !== 200) {
          return renderJSON(request, reply, err, response_json);
        }
        // NOTE: Update user permissions for domains
         if(request.auth.credentials.user_type === 'user' && request.auth.credentials.role === 'user'){
          var user_id = request.auth.credentials.user_id;
          var domains = request.auth.credentials.domain;
          domains.push(originalDomainJson.domain_name);
          var updateInfo = {
                user_id: user_id,
                domain: domains
          };
          users.update(updateInfo, function(err, data) {
            if (err) {
              logger.error('createDomainConfig:Error update user domain list' + JSON.stringify(err));
            } else {
              logger.info('createDomainConfig:Success update user domain list' + JSON.stringify(err));
            }
            // NOTE: response after update user
            responseSuccessMessage();
          });
        } else {
            // NOTE: response for API and users not with role 'user'
            responseSuccessMessage();
        }

        function responseSuccessMessage() {
            var response = {
              statusCode: 200,
              message: 'Successfully created new domain configuration',
              object_id: response_json._id
            };

            AuditLogger.store({
              account_id: account_id,
              activity_type: 'add',
              activity_target: 'domain',
              target_id: response.object_id,
              target_name: originalDomainJson.domain_name,
              target_object: originalDomainJson,
              operation_status: 'success'
            }, request);

            renderJSON(request, reply, err, response);
        }
      });
    });
  };


  accounts.get({_id: account_id}, function (err, account) {
    if(err) {
      return reply(boom.badImplementation('DomainConfigs::checkDomainsList: Failed to find an account with ID ' +
        newDomainJson.account_id));
    }

    if (!utils.checkUserAccessPermissionToAccount(request, account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    if (false /* TODO need to restore a check for status of account.billing_plan */ ) {
      isSubscriptionActive(newDomainJson.account_id, function (err, res) {
          if (err) {
            return reply(boom.badImplementation(err));
          }
          if (!res) {
            return reply(boom.forbidden(account.companyName + ' subscription is not active'));
          }
          checkDomainsLimit(request.auth.credentials.companyId, function (err, diff) {
            if (err) {
              return reply(boom.badImplementation(err));
            }
            if (diff <= 0) {
              return reply(boom.forbidden('Billing plan service limit reached'));
            }
            serverGroups.get({
              _id : newDomainJson.origin_server_location_id,
              serverType : 'public',
              groupType  : 'CO'
            }, createDomain);
          });
        });
    } else {
      serverGroups.get({
        _id : newDomainJson.origin_server_location_id,
        serverType : 'public',
        groupType  : 'CO'
      }, function (error, result) {
        if (error) {
          return reply(boom.badImplementation('Failed to get a list of public CO server group for location ID ' + newDomainJson.origin_server_location_id));
        }

        if (!result) {
          return reply(boom.badRequest('Specified Rev first mile location ID cannot be found'));
        }
        newDomainJson.created_by = utils.generateCreatedByField(request);
        if (!newDomainJson.tolerance) {
          newDomainJson.tolerance = '3000';
        }

        domainConfigs.query({
          domain_name : newDomainJson.domain_name,
          deleted: { $ne: true }
        }, createDomain);
      });
    }

  });
};

exports.updateDomainConfig = function(request, reply) {

  var newDomainJson = request.payload;
  var newDomainJsonAudit = utils.clone(request.payload);
  var domain_id = request.params.domain_id;
  var optionsFlag = (request.query.options) ? '?options=' + request.query.options : '';

  // TODO: fix jshint (too many statements)
  domainConfigs.get(domain_id, function (error, result) { // jshint ignore:line
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for domain ID ' + domain_id));
    }
    if (!result || !utils.checkUserAccessPermissionToDomain(request,result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    if (!utils.checkUserAccessPermissionToAccount(request, newDomainJson.account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }

    var bpLua = newDomainJson.bp_lua;
    delete newDomainJson.bp_lua;
    var coLua = newDomainJson.co_lua;
    delete newDomainJson.co_lua;

    var isAdmin = utils.isUserAdmin(request);
    var luaForbidden = false;

    if (bpLua) {
      bpLua.forEach(function(lua) {
        if (!isAdmin && lua.approve) {
          luaForbidden = true;
        }
      });
    } else {
      bpLua = [];
    }

    if (coLua && !luaForbidden) {
      coLua.forEach(function(lua) {
        if (!isAdmin && lua.approve) {
          luaForbidden = true;
        }
      });
    } else {
      coLua = [];
    }

    if (luaForbidden) {
      return reply(boom.forbidden('You are not allowed to approve lua locations for proxy server'));
    } else {
      var _comment = newDomainJson.comment || '';
      delete newDomainJson.comment;
      var _enable_ssl = newDomainJson.enable_ssl;
      delete newDomainJson.enable_ssl;
      var _ssl_conf_profile = newDomainJson.ssl_conf_profile || '';
      delete newDomainJson.ssl_conf_profile;
      var _ssl_cert_id = newDomainJson.ssl_cert_id || '';
      delete newDomainJson.ssl_cert_id;
      var _ssl_protocols = newDomainJson.ssl_protocols || '';
      delete newDomainJson.ssl_protocols;
      var _ssl_ciphers = newDomainJson.ssl_ciphers || '';
      delete newDomainJson.ssl_ciphers;
      var _ssl_prefer_server_ciphers = newDomainJson.ssl_prefer_server_ciphers;
      delete newDomainJson.ssl_prefer_server_ciphers;
      var _btt_key = newDomainJson.btt_key || '';
      delete newDomainJson.btt_key;
      var _bpLuaEnabled = newDomainJson.bp_lua_enable_all || false;
      delete newDomainJson.bp_lua_enable_all;
      var _coLuaEnabled = newDomainJson.co_lua_enable_all || false;
      delete newDomainJson.co_lua_enable_all;

      var newDomainJson2 = {
        updated_by: utils.generateCreatedByField(request),
        proxy_config: newDomainJson,
        comment: _comment,
        enable_ssl: _enable_ssl,
        ssl_conf_profile: _ssl_conf_profile,
        ssl_cert_id: _ssl_cert_id,
        ssl_protocols: _ssl_protocols,
        ssl_ciphers: _ssl_ciphers,
        ssl_prefer_server_ciphers: _ssl_prefer_server_ciphers,
        btt_key: _btt_key,
        bp_lua: bpLua,
        bp_lua_enable_all: _bpLuaEnabled,
        co_lua: coLua,
        co_lua_enable_all: _coLuaEnabled
      };

      logger.info('Calling CDS to update configuration for domain ID: ' + domain_id + ', optionsFlag: ' + optionsFlag + ', request body: ' +
        JSON.stringify(newDomainJson2));
      cdsRequest({
        url: config.get('cds_url') + '/v1/domain_configs/' + domain_id + optionsFlag,
        method: 'PUT',
        headers: authHeader,
        body: JSON.stringify(newDomainJson2)
      }, function (err, res, body) {
        if (err) {
          return reply(boom.badImplementation('Failed to update the CDS with confguration for domain ID: ' + domain_id));
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
        if (action !== '') {
          AuditLogger.store({
            account_id: newDomainJson.account_id,
            activity_type: action,
            activity_target: 'domain',
            target_id: result._id,
            target_name: result.domain_name,
            target_object: newDomainJsonAudit,
            operation_status: 'success'
          }, request);
        }
        renderJSON(request, reply, err, response);
      });
    }
  });
};

exports.deleteDomainConfig = function(request, reply) {
  var domainId = request.params.domain_id;
  var _deletedBy = utils.generateCreatedByField(request);
  var options = '?deleted_by='+_deletedBy;

  domainConfigs.get(domainId, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for domain' + domainId, error));
    }
    if (!result || !utils.checkUserAccessPermissionToDomain(request,result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    logger.info('Calling CDS to delete domain ID: ' + domainId + ' and option deleted_by '+ _deletedBy);

    cdsRequest( { url: config.get('cds_url') + '/v1/domain_configs/' + domainId + options,
      method: 'DELETE',
      headers: authHeader,
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to send a CDS command to delete domain ID ' + domainId));
      }
      var responseJson = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(responseJson.message));
      }

      AuditLogger.store({
        account_id       : result.proxy_config.account_id,
        activity_type    : 'delete',
        activity_target  : 'domain',
        target_id        : result._id,
        target_name      : result.domain_name,
        target_object    : result.proxy_config,
        operation_status : 'success'
      }, request);
      var response = responseJson;
      renderJSON(request, reply, err, response);
    });
  });
};
