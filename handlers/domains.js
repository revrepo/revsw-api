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

var boom           = require('boom');
var config         = require('config');
var mongoose       = require('mongoose');
var AuditLogger    = require('revsw-audit');
var portal_request = require('supertest');

var utils           = require('../lib/utilities.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');

var Domain              = require('../models/Domain');
var ServerGroup         = require('../models/ServerGroup');
var MasterConfiguration = require('../models/MasterConfiguration');

var domains              = new Domain(mongoose, mongoConnection.getConnectionPortal());
var servergroups         = new ServerGroup(mongoose, mongoConnection.getConnectionPortal());
var masterconfigurations = new MasterConfiguration(mongoose, mongoConnection.getConnectionPortal());

var domainAttributesToHide = [
  'BPGroup',
  'COGroup',
  'bp_apache_custom_config',
  'bp_apache_fe_custom_config',
  'co_apache_custom_config',
  'co_cnames',
  'config_command_options',
  'config_url',
  'cube_url',
  'nt_status',
  'rum_beacon_url',
  'stats_url',
  'status',
  'webpagetest_url',
  'origin_domain'
];

var domainMasterConfigAttributesToHide = [
  '3rd_party_rewrite',
  'version',
  'origin_protocol',
  'operation',
  'rev_traffic_mgr',
  'config_command_options',
  'bp_list',
  'co_list',
  'co_cnames',
  'certificate_urls',
  'domain_name',
  'origin_domain',
  'origin_server'
];

var domainMasterConfigCOAttributesToHide = [
  'rum_beacon_url',
  'co_apache_custom_config',
  'rum_beacon_url'
];

var domainMasterConfigBPAttributesToHide = [
  'ssl_certificates',
  'certificate_urls',
  'bp_apache_custom_config',
  'bp_apache_fe_custom_config',
  'cache_opt_choice'
];

//
// Management of domains
//

exports.getDomains = function getDomains(request, reply) {
  var listOfDomains = [];
  domains.list(request, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get a list of domains'));
    }

    for (var i = 0; i < result.length; i++) {
      listOfDomains.push({
        companyId   : result[i].companyId,
        name        : result[i].name,
        id          : result[i].id,
        sync_status : result[i].sync_status,
        cname       : result[i].name + '.' + config.get('default_cname_domain')
      });
    }

    renderJSON(request, reply, error, listOfDomains);
  });
};

exports.getDomain = function (request, reply) {

  var domain_id = request.params.domain_id;
  domains.get({
    _id : domain_id
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1) {

      servergroups.get({
        groupName : result.COGroup,
        groupType : 'CO'
      }, function (error, servergroup) {
        if (error || !servergroup) {
          return reply(boom.badImplementation('Failed to retrieve domain details'));
        }

        result.cname = result.name + '.' + config.get('default_cname_domain');

        result.origin_server_location = servergroup.publicName;

        result.origin_host_header = result.origin_server;
        result.origin_server = result.origin_domain;

        result = publicRecordFields.handle(result, 'domain');

        renderJSON(request, reply, error, result);
      });
    } else {
      return reply(boom.badRequest('Domain not found'));
    }
  });
};

exports.getDomainDetails = function (request, reply) {

  var domain_id = request.params.domain_id;
  domains.get({
    _id : domain_id
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1) {

      masterconfigurations.get({
        domainName : result.name
      }, function (error, mconfig) {
        if (error || !mconfig) {
          return reply(boom.badImplementation('Failed to retrieve domain master configuration details'));
        }
        result = mconfig.configurationJson;

        for (var i in domainMasterConfigAttributesToHide) {
          delete result[domainMasterConfigAttributesToHide[i]];
        }

        for (i in domainMasterConfigBPAttributesToHide) {
          delete result.rev_component_bp[domainMasterConfigBPAttributesToHide[i]];
        }

        for (i in domainMasterConfigCOAttributesToHide) {
          delete result.rev_component_co[domainMasterConfigCOAttributesToHide[i]];
        }

        renderJSON(request, reply, error, result);
      });
    } else {
      return reply(boom.badRequest('Domain not found'));
    }
  });
};

exports.createDomain = function (request, reply) {

  var newDomainJson = request.payload;

  if (request.auth.credentials.companyId.indexOf(newDomainJson.companyId) === -1) {
    return reply(boom.badRequest('Your user does not manage the specified company ID'));
  }

  servergroups.get({
    publicName : newDomainJson.origin_server_location,
    serverType : 'public',
    groupType  : 'CO'
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get a list of public CO server groups'));
    }

    if (!result) {
      return reply(boom.badRequest('Specified Rev first mile location cannot be found'));
    }

    newDomainJson.origin_server_location = result.groupName;

    domains.get({
      name : newDomainJson.name
    }, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to retrieve domain details'));
      }
      if (result) {
        return reply(boom.badRequest('The domain name is already registered in the system'));
      }

      utils.loginToPortal(request.auth.credentials.email, request.auth.credentials.password, request.auth.credentials.role,
        function (err, userToken) {
          if (err || !userToken) {
            return reply(boom.badImplementation('Failed to log in to the portal'));
          }

          var createDomainJson = {
            companyId       : newDomainJson.companyId,
            companys        : newDomainJson.companyId,
            config_url_type : newDomainJson.origin_server_location,
            email           : request.auth.credentials.email,
            token           : userToken,
            name            : newDomainJson.name,
            origin_server   : newDomainJson.origin_host_header,
            origin_domain   : newDomainJson.origin_server,
            role            : request.auth.credentials.role,
            tolerance       : newDomainJson.tolerance
          };

          portal_request(config.get('portal_url'))
            .post('/domain/new')
            .send(createDomainJson)
            .end(function (err, res) {
              if (err || !res || res.statusCode !== 200) {
                return reply(boom.badImplementation('Failed to create a new domain configuration'));
              }

              var response_json = JSON.parse(res.text);

              if (response_json.status === true && response_json.response === 'Domain created successfully') {
                domains.get({
                  name : newDomainJson.name
                }, function (error, result) {
                  if (error || !result) {
                    return reply(boom.badImplementation('Failed to retrieve domain details'));
                  }

                  var statusResponse;
                  statusResponse = {
                    statusCode : 200,
                    message    : 'Successfully created the domain',
                    object_id  : result.id
                  };

                  result = publicRecordFields.handle(result, 'domain');

                  AuditLogger.store({
                    ip_address        : request.info.remoteAddress,
                    datetime         : Date.now(),
                    user_id          : request.auth.credentials.user_id,
                    user_name        : request.auth.credentials.email,
                    user_type        : 'user',
                    account_id       : request.auth.credentials.companyId,
//                    domain_id        : request.auth.credentials.domain,
                    activity_type    : 'add',
                    activity_target  : 'domain',
                    target_id        : result.id,
                    target_name      : result.name,
                    target_object    : result,
                    operation_status : 'success'
                  });

                  renderJSON(request, reply, error, statusResponse);
                });
              } else {
                return reply(boom.badImplementation('Failed to create a new domain configuration'));
              }
            });
        });
    });
  });
};

exports.updateDomain = function (request, reply) {

  var newDomainJson = request.payload;

  // Check that the user can use the new companyId
  if (request.auth.credentials.companyId.indexOf(newDomainJson.companyId) === -1) {
    return reply(boom.badRequest('Your user does not manage the specified company ID'));
  }

  // Check the CO group name is correct
  servergroups.get({
    publicName : newDomainJson.origin_server_location,
    serverType : 'public',
    groupType  : 'CO'
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get a list of public CO server groups'));
    }

    if (!result) {
      return reply(boom.badRequest('Specified Rev first mile location cannot be found'));
    }

    newDomainJson.origin_server_location = result.groupName;

    domains.get({
      _id : request.params.domain_id
    }, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to retrieve domain details'));
      }
      if (!result) {
        return reply(boom.badRequest('Domain not found'));
      }

      if (request.auth.credentials.companyId.indexOf(result.companyId) === -1 || request.auth.credentials.domain.indexOf(result.name) === -1) {
        return reply(boom.badRequest('Domain not found'));
      }

      newDomainJson.name = result.name;

      utils.loginToPortal(request.auth.credentials.email, request.auth.credentials.password, request.auth.credentials.role,
        function (err, userToken) {
          if (err || !userToken) {
            return reply(boom.badImplementation('Failed to log in to the portal'));
          }
          var updateDomainJson = {
            companys        : newDomainJson.companyId,
            config_url_type : newDomainJson.origin_server_location,
            COGroup         : newDomainJson.origin_server_location,
            email           : request.auth.credentials.email,
            token           : userToken,
            name            : newDomainJson.name,
            origin_server   : newDomainJson.origin_host_header,
            origin_domain   : newDomainJson.origin_server,
            role            : request.auth.credentials.role,
            tolerance       : newDomainJson.tolerance
          };
          //          console.log('updateDomainJson = ', updateDomainJson);
          portal_request(config.get('portal_url'))
            .post('/domain/update')
            .send(updateDomainJson)
            .end(function (err, res) {
              if (err || !res || res.statusCode !== 200) {
                return reply(boom.badImplementation('Failed to create a new domain configuration'));
              }

              var response_json = JSON.parse(res.text);
              //              console.log(response_json);
              if (response_json.status === true && response_json.response === 'Domain has been updated successfully') {
                var statusResponse;
                statusResponse = {
                  statusCode : 200,
                  message    : 'Successfully updated the domain'
                };

                result = publicRecordFields.handle(result, 'domain');

                AuditLogger.store({
                  ip_address        : request.info.remoteAddress,
                  datetime         : Date.now(),
                  user_id          : request.auth.credentials.user_id,
                  user_name        : request.auth.credentials.email,
                  user_type        : 'user',
                  account_id       : request.auth.credentials.companyId,
//                  domain_id        : request.auth.credentials.domain,
                  activity_type    : 'modify',
                  activity_target  : 'domain',
                  target_id        : result.id,
                  target_name      : result.name,
                  target_object    : result,
                  operation_status : 'success'
                });

                renderJSON(request, reply, error, statusResponse);
              } else {
                return reply(boom.badImplementation('Failed to update the domain configuration'));
              }
            });
        });
    });
  });
};

exports.updateDomainDetails = function (request, reply) {

  var newConfigJson = request.payload;

  var domain_id = request.params.domain_id;
  domains.get({
    _id : domain_id
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1) {
      masterconfigurations.get({
        domainName : result.name
      }, function (error, mconfig) {
        if (error || !mconfig) {
          return reply(boom.badImplementation('Failed to retrieve domain master configuration details'));
        }
        mconfig = mconfig.configurationJson;

        for (var i in domainMasterConfigAttributesToHide) {
          newConfigJson[domainMasterConfigAttributesToHide[i]] = mconfig[domainMasterConfigAttributesToHide[i]];
        }

        for (i in domainMasterConfigBPAttributesToHide) {
          newConfigJson.rev_component_bp[domainMasterConfigBPAttributesToHide[i]] = mconfig.rev_component_bp[domainMasterConfigBPAttributesToHide[i]];
        }

        for (i in domainMasterConfigCOAttributesToHide) {
          newConfigJson.rev_component_co[domainMasterConfigCOAttributesToHide[i]] = mconfig.rev_component_co[domainMasterConfigCOAttributesToHide[i]];
        }

        utils.loginToPortal(request.auth.credentials.email, request.auth.credentials.password, request.auth.credentials.role,
          function (err, userToken) {
            if (err || !userToken) {
              return reply(boom.badImplementation('Failed to log in to the portal'));
            }
            var updateDomainJson = {
              actType           : 'configJson',
              email   : request.auth.credentials.email,
              token   : userToken,
              domainName : result.name,
              configurationJson : newConfigJson
            };

            portal_request(config.get('portal_url'))
              .post('/domain/updateConfigure')
              .send(updateDomainJson)
              .end(function (err, res) {
                if (err || !res || res.statusCode !== 200) {
                  return reply(boom.badImplementation('Failed to create a new domain configuration'));
                }

                var response_json = JSON.parse(res.text);

                if (response_json.status === true && response_json.response.response === 'Configuration updated successfully') {
                  var statusResponse;
                  statusResponse = {
                    statusCode : 200,
                    message    : 'Successfully updated the domain'
                  };

                  result = publicRecordFields.handle(result, 'domain');

                  AuditLogger.store({
                    ip_address        : request.info.remoteAddress,
                    datetime         : Date.now(),
                    user_id          : request.auth.credentials.user_id,
                    user_name        : request.auth.credentials.email,
                    user_type        : 'user',
                    account_id       : request.auth.credentials.companyId,
//                    domain_id        : request.auth.credentials.domain,
                    activity_type    : 'modify',
                    activity_target  : 'domain',
                    target_id        : result.id,
                    target_name      : result.name,
                    target_object    : result,
                    operation_status : 'success'
                  });

                  renderJSON(request, reply, error, statusResponse);
                } else {
                  return reply(boom.badImplementation('Failed to update the domain configuration'));
                }
              });
          });
      });
    } else {
      return reply(boom.badRequest('Domain not found'));
    }
  });
};

exports.deleteDomain = function (request, reply) {

  var domain_id = request.params.domain_id;

  var domain_name;

  domains.get({
    _id : domain_id
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to read domain details'));
    }
    if (!result) {
      return reply(boom.badRequest('Domain not found'));
    }
    if (request.auth.credentials.companyId.indexOf(result.companyId) === -1 || request.auth.credentials.domain.indexOf(result.name) === -1) {
      return reply(boom.badRequest('Domain not found'));
    }

    domain_name = result.name;

    utils.loginToPortal(request.auth.credentials.email, request.auth.credentials.password, request.auth.credentials.role,
      function (err, userToken) {

        if (err || !userToken) {
          return reply(boom.badImplementation('Failed to log in to the portal'));
        }

        var deleteDomainJson = {
          email : request.auth.credentials.email,
          name  : domain_name,
          token : userToken
        };

        //        console.log('deleteDomainJson = ', deleteDomainJson);

        portal_request(config.get('portal_url'))
          .post('/domain/delete')
          .send(deleteDomainJson)
          .end(function (err, res) {
            if (err || !res || res.statusCode !== 200) {
              return reply(boom.badImplementation('Failed to delete the domain name'));
            }

            var statusResponse;
            statusResponse = {
              statusCode : 200,
              message    : 'Successfully deleted the domain'
            };

            result = publicRecordFields.handle(result, 'domain');

            AuditLogger.store({
              ip_address        : request.info.remoteAddress,
              datetime         : Date.now(),
              user_id          : request.auth.credentials.user_id,
              user_name        : request.auth.credentials.email,
              user_type        : 'user',
              account_id       : request.auth.credentials.companyId,
//              domain_id        : request.auth.credentials.domain,
              activity_type    : 'delete',
              activity_target  : 'domain',
              target_id        : result.id,
              target_name      : result.name,
              target_object    : result,
              operation_status : 'success'
            });

            renderJSON(request, reply, error, statusResponse);
          });
      });
  });
};

