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
var uuid        = require('node-uuid');
var AuditLogger = require('revsw-audit');
var config      = require('config');
var cds_request = require('request');
var utils           = require('../lib/utilities.js');
var logger = require('revsw-logger')(config.log_config);

var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var DomainConfig   = require('../models/DomainConfig');
var ServerGroup         = require('../models/ServerGroup');

var domainConfigs   = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var serverGroups         = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());

function checkDomainAccessPermission(request, domain) {
  if (request.auth.credentials.role === 'user' && request.auth.credentials.domain.indexOf(domain.name) === -1) {
     return false;
  } else if ((request.auth.credentials.role === 'admin' || request.auth.credentials.role === 'reseller') &&
    request.auth.credentials.companyId.indexOf(domain.account_id) === -1) {
    return false;
  }  
  return true;
}

exports.getDomainConfigStatus = function(request, reply) {

  var domain_id = request.params.domain_id;
  domainConfigs.get(domain_id, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive configuration details for domain ID ' + domain_id));
    }
    if (!result) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    if (!checkDomainAccessPermission(request,result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    cds_request( { url: config.get('cds_url') + '/v1/domain_configs/' + domain_id + '/config_status',
      headers: {
        Authorization: 'Bearer ' + config.get('cds_api_token')
      }
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

  cds_request( { url: config.get('cds_url') + '/v1/domain_configs',
    headers: {
      Authorization: 'Bearer ' + config.get('cds_api_token')
    }
  }, function (err, res, body) {
    if (err) {
      return reply(boom.badImplementation('Failed to get from CDS a list of domains'));
    }
    var response_json = JSON.parse(body);
    if ( res.statusCode === 400 ) {
        return reply(boom.badRequest(response_json.message));
    } else {
      if (!response_json || !utils.isArray(response_json)) {
        return reply(boom.badImplementation('Recevied a strange CDS response for a list of domains: ', response_json));
      }
      var response = [];
      for (var i=0; i < response_json.length; i++) {
        if (checkDomainAccessPermission(request,response_json[i])) {
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
    if (!result) {
      return reply(boom.badRequest('Domain ID not found'));
    }
    if (!checkDomainAccessPermission(request,result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    logger.info('Calling CDS to get configuration for domain ID: ', domain_id);
    cds_request( { url: config.get('cds_url') + '/v1/domain_configs/' + domain_id + version,
      headers: {
        Authorization: 'Bearer ' + config.get('cds_api_token')
      },
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
        response.account_id = response_json.account_id;
        response.domain_name = response_json.domain_name;
        response.origin_server_location_id = response_json.origin_server_location_id;
      }
      renderJSON(request, reply, err, response);
    });
  });

};

exports.createDomainConfig = function(request, reply) {
  var newDomainJson = request.payload;
  var originalDomainJson = newDomainJson;

  if (request.auth.credentials.companyId.indexOf(newDomainJson.account_id) === -1) {
    return reply(boom.badRequest('Account ID not found'));
  }

  serverGroups.get({
    _id : newDomainJson.origin_server_location_id,
    serverType : 'public',
    groupType  : 'CO'
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get a list of public CO server group for location ID' + newDomainJson.origin_server_location_id));
    }

    if (!result) {
      return reply(boom.badRequest('Specified Rev first mile location ID cannot be found'));
    }
    newDomainJson.created_by = request.auth.credentials.email;
    if (!newDomainJson.tolerance) {
      newDomainJson.tolerance = 3000;
    }

    domainConfigs.query({
      domain_name : newDomainJson.domain_name,
      deleted: { $ne: true }
    }, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to retrieve domain details for domain' + newDomainJson.name));
      }
      if (result.length > 0) {
        logger.debug('result = ', result);
        return reply(boom.badRequest('The domain name is already registered in the system'));
      }

      logger.info('Calling CDS to create new domain', newDomainJson);
      cds_request( { url: config.get('cds_url') + '/v1/domain_configs',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + config.get('cds_api_token')
        },
        body: JSON.stringify(newDomainJson)
      }, function (err, res, body) {
        if (err) {
          return reply(boom.badImplementation('Failed to send to CDS a request to create new domain ', newDomainJson));
        }
        var response_json = JSON.parse(body);
        if (res.statusCode === 400)  {
          return reply(boom.badRequest(response_json.message));
        }
        if (res.statusCode !== 200) {
          return renderJSON(request, reply, err, response_json);
        }

        var response = {  
          statusCode: 200,
          message: 'Successfully created new domain configuration',
          object_id: response_json._id
        };
        AuditLogger.store({
          ip_address        : request.info.remoteAddress,
          datetime         : Date.now(),
          user_id          : request.auth.credentials.user_id,
          user_name        : request.auth.credentials.email,
          user_type        : 'user',
          account_id       : request.auth.credentials.companyId,
          activity_type    : 'add',
          activity_target  : 'domain',
          target_id        : response.object_id,
          target_name      : originalDomainJson.domain_name,
          target_object    : originalDomainJson,
          operation_status : 'success'
        });

        renderJSON(request, reply, err, response);
      });
    });
  });
};

exports.updateDomainConfig = function(request, reply) {

  var newDomainJson = request.payload;
  var domain_id = request.params.domain_id;
  var optionsFlag = (request.query.options) ? '?options=' + request.query.options : '';

  domainConfigs.get(domain_id, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for domain' + domain_id));
    }
    if (!result) {
      return reply(boom.badRequest('Domain ID not found'));
    }
    if (!checkDomainAccessPermission(request,result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    logger.info('Calling CDS to update configuration for domain ID: ' + domain_id +', optionsFlag: ' + optionsFlag);

    cds_request( { url: config.get('cds_url') + '/v1/domain_configs/' + domain_id + optionsFlag,
      method: 'PUT',
      headers: {
        Authorization: 'Bearer ' + config.get('cds_api_token')
      },
      body: JSON.stringify({ proxy_config: newDomainJson })
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to update the CDS with confguration for domain ID: ' + domain_id));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      }
      var response = response_json;
      AuditLogger.store({
        ip_address        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        activity_type    : 'modify',
        activity_target  : 'domain',
        target_id        : result.domain_id,
        target_name      : result.newDomainJson,
        target_object    : result,
        operation_status : 'success'
      });

      renderJSON(request, reply, err, response);
    });
  });

};

exports.deleteDomainConfig = function(request, reply) {

  var domain_id = request.params.domain_id;

  domainConfigs.get(domain_id, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details for domain' + domain_id));
    }
    if (!result) {
      return reply(boom.badRequest('Domain ID not found'));
    }
    if (!checkDomainAccessPermission(request,result)) {
      return reply(boom.badRequest('Domain ID not found'));
    }

    logger.info('Calling CDS to delete domain ID: ' + domain_id);

    cds_request( { url: config.get('cds_url') + '/v1/domain_configs/' + domain_id,
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + config.get('cds_api_token')
      },
    }, function (err, res, body) {
      if (err) {
        return reply(boom.badImplementation('Failed to send a CDS command to delete domain ID ' + domain_id));
      }
      var response_json = JSON.parse(body);
      if (res.statusCode === 400) {
        return reply(boom.badRequest(response_json.message));
      }

      AuditLogger.store({
        ip_address        : request.info.remoteAddress,
        datetime         : Date.now(),
        user_id          : request.auth.credentials.user_id,
        user_name        : request.auth.credentials.email,
        user_type        : 'user',
        account_id       : request.auth.credentials.companyId,
        activity_type    : 'delete',
        activity_target  : 'domain',
        target_id        : result.domain_id,
        target_name      : result.proxy_config,
        target_object    : result,
        operation_status : 'success'
      });
      var response = response_json;
      renderJSON(request, reply, err, response);
    });
  });

};
