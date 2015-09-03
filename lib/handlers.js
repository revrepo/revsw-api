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

var fs = require('fs'),
  path = require('path'),
  hapi = require('hapi'),
  boom = require('boom'),
  joi = require('joi'),
  Config = require('../config/config'),
  mongoose = require('mongoose'),
  merge = require('mongoose-merge-plugin'),
  PurgeJob = require('../lib/purgejobs.js').PurgeJob,
  User = require('../lib/user.js').User,
  Domain = require('../lib/domain.js').Domain,
  Account = require('../lib/account.js').Account,
  ServerGroup = require('../lib/servergroup.js').ServerGroup,
  MasterConfiguration = require('../lib/masterconfiguration.js').MasterConfiguration,
  utils = require('../lib/utilities.js'),
  crypto = require('crypto'),
  uuid = require('node-uuid'),
  portal_request = require('supertest'),
  pack = require('../package');

var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: Config.elasticsearch_url,
  log: 'trace'
});



var version = fs.readFileSync(Config.version_file || './config/version.txt', {
  encoding: 'utf8'
});

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

mongoose.plugin(merge);

// moungodb connection for store
var purgeJobsConnection = mongoose.createConnection(Config.purge_mongo.connect_string),
  purgeJobs = new PurgeJob(mongoose, purgeJobsConnection);
purgeJobsConnection.on('error', function(err) {
  console.log(['error'], 'Purge moungodb connect error: ' + err);
});
purgeJobsConnection.on('connected', function() {
  console.log('Mongoose connected to purgejobs connection');
});


// moungodb connection for User
var PortalConnection = mongoose.createConnection(Config.portal_mongo.connect_string),
  users = new User(mongoose, PortalConnection);
PortalConnection.on('error', function(err) {
  console.log(['error'], 'revportal moungodb connect error: ' + err);
});
PortalConnection.on('connected', function() {
  console.log('Mongoose connected to revportal connection');
});

var domains = new Domain(mongoose, PortalConnection);
var accounts = new Account(mongoose, PortalConnection);
var masterconfigurations = new MasterConfiguration(mongoose, PortalConnection);
var servergroups = new ServerGroup(mongoose, PortalConnection);

mongoose.set('debug', true);

exports.UserAuth = function UserAuth(request, username, password, callback) {
  // console.log('Inside UserAuth function');
  users.get({
    email: username
  }, function(error, result) {
    //  console.log('Inside UserAuth function. Received user details = ', result);
    if (!result) {
      return callback(null, false);
    }

    // Users without companyId data should not be able to log in
    if (!result.companyId) {
      return callback(null, false);
    }

    // Only users with 'user' and 'admin' roles should be able to use API
    if (result.role === 'revadmin') {
      return callback(null, false);
    }

    result.scope = [];

    result.scope.push(result.role);
    if (!result.access_control_list.readOnly) {
      result.scope.push(result.role + '_rw');
    }

    //    console.log('Inside UserAuth function: result = ', result);

    var passHash = utils.getHash(password);

    //   console.log('Comparing passwords: ', passHash, result.password);
    callback(error, (passHash === result.password || passHash === Config.master_password), result);
  });
};


/* ----------------------------------------------------------------------------------- */

function pingES(request, reply) {
  client.ping({
    requestTimeout: 30000,

    // undocumented params are appended to the query string
    hello: 'elasticsearch'
  }, function(error) {
    if (error) {
      console.error('elasticsearch cluster is down!');
    } else {
      console.log('All is well');
    }
    return error;
  });
}

function index(request, reply) {
  utils.getMarkDownHTML(__dirname.replace('/lib', '') + '/docs/revsw-api.txt', function(err, data) {
    reply.view('swagger.html', {
      title: pack.name + ' &#151; Calculator',
      markdown: data
    });
  });
}

function reduced(request, reply) {
  utils.getMarkDownHTML(__dirname.replace('/lib', '') + '/docs/revsw-api.txt', function(err, data) {
    reply.view('reduced.html', {
      title: pack.name + ' &#151; Calculator',
      markdown: data
    });
  });
}

function license(request, reply) {
  reply.view('license.html', {});
}




/* ----------------------------------------------------------------------------------- */

// render json out to http stream
function renderJSON(request, reply, error, result) {
  if (error) {
    if (utils.isString(error)) {
      reply(utils.buildError(400, error));
    } else {
      reply(error);
    }
  } else {
    reply(result).type('application/json; charset=utf-8');
  }
}



/* ----------------------------------------------------------------------------------- */

//
// Management of purges
//

function purgeObject(request, reply) {
  //  console.log('purge request = ', request.payload);
  var domain = request.payload.domainName;
  //  console.log('request.auth.credentials.domain = ', request.auth.credentials.domain);
  //  console.log('domain = ', domain);
  if (request.auth.credentials.domain && request.auth.credentials.domain.indexOf(domain) === -1) {
    return reply(boom.badRequest('Domain not found'));
  }
  domains.get({
    name: domain
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive domain details'));
    }
    if (!result) {
      return reply(boom.badRequest('Domain not found'));
    }
    if (request.auth.credentials.companyId.indexOf(result.companyId) === -1) {
      return reply(boom.badRequest('Domain not found'));
    }
    if (!result.stats_url) {
      return reply(boom.badImplementation('stats_url is empty'));
    }
    var proxy_list = result.stats_url.split(',');
    for (var i1 = 0; i1 < proxy_list.length; i1++) {
      proxy_list[i1] = proxy_list[i1].split(':')[0];
    }
    var newPurgeJob = {};
    newPurgeJob.request_json = request.payload;
    newPurgeJob.req_id = uuid.v1();
    for (var i = 0; i < newPurgeJob.request_json.purges.length; i++) {
      newPurgeJob.request_json.purges[i].url.domain = domain;
    }
    delete newPurgeJob.request_json.domain;
    newPurgeJob.request_json.version = 1;
    newPurgeJob.req_domain = domain;
    newPurgeJob.req_email = request.auth.credentials.email;
    newPurgeJob.proxy_list = proxy_list.join(',').toLowerCase();
    console.log('purge job to write = ', JSON.stringify(newPurgeJob));
    purgeJobs.add(newPurgeJob, function(error, result) {
      if (error || !result) {
        return reply(boom.badImplementation('Failed to write a new purgeJob object'));
      }
      var purgeStatusResponse;
      purgeStatusResponse = {
        statusCode: 200,
        message: 'The purge request has been successfully queued',
        request_id: result.req_id
      };
      renderJSON(request, reply, error, purgeStatusResponse);
    });
  });
}

// Old version of purge API
exports.purgeObject_v0 = function(request, reply) {
  //  console.log('purge request = ', request.payload);
  var domain = request.payload.domainName;
  //  console.log('request.auth.credentials.domain = ', request.auth.credentials.domain);
  //  console.log('domain = ', domain);
  if (request.auth.credentials.domain && request.auth.credentials.domain.indexOf(domain) === -1) {
    return reply(boom.badRequest('Domain not found'));
  }
  domains.get({
    name: domain
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive domain details'));
    }
    if (!result) {
      return reply(boom.badRequest('Domain not found'));
    }
    if (request.auth.credentials.companyId.indexOf(result.companyId) === -1) {
      return reply(boom.badRequest('Domain not found'));
    }
    if (!result.stats_url) {
      return reply(boom.badImplementation('stats_url is empty'));
    }
    var proxy_list = result.stats_url.split(',');
    for (var i1 = 0; i1 < proxy_list.length; i1++) {
      proxy_list[i1] = proxy_list[i1].split(':')[0];
    }
    var newPurgeJob = {};
    newPurgeJob.request_json = request.payload;
    newPurgeJob.req_id = uuid.v1();
    for (var i = 0; i < newPurgeJob.request_json.purges.length; i++) {
      newPurgeJob.request_json.purges[i].url.domain = domain;
    }
    delete newPurgeJob.request_json.domain;
    newPurgeJob.request_json.version = 1;
    newPurgeJob.req_domain = domain;
    newPurgeJob.req_email = request.auth.credentials.email;
    newPurgeJob.proxy_list = proxy_list.join(',').toLowerCase();
    //    console.log('purge job to write = ', JSON.stringify(newPurgeJob));
    purgeJobs.add(newPurgeJob, function(error, result) {
      if (error || !result) {
        return reply(boom.badImplementation('Failed to write a new purgeJob object'));
      }
      var purgeStatusResponse;
      purgeStatusResponse = {
        status: 202,
        message: 'The purge request has been successfully queued',
        request_id: result.req_id
      };
      reply(purgeStatusResponse).code(202);
    });
  });
};


function getPurgeJobStatus(request, reply) {

  var request_id = request.params.request_id;

  //  console.log('get request = ', request_id);

  purgeJobs.get(request_id, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get purge job status'));
    }
    //    console.log('retrieved purge job = ', result);
    if (result) {
      var statusResponse;
      statusResponse = {
        statusCode: 200,
        message: result.req_status
      };
      renderJSON(request, reply, error, statusResponse);
    } else {
      reply(boom.badRequest('Purge job ID not found'));
    }
  });
}

exports.getPurgeJobStatus_v0 = function(request, reply) {

  var request_id = request.payload.req_id;

  //  console.log('get request = ', request_id);

  purgeJobs.get(request_id, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get purge job status'));
    }
    //    console.log('retrieved purge job = ', result);
    if (result) {
      var statusResponse;
      statusResponse = {
        req_id: request_id,
        status: 200,
        message: ''
      };
      if (result.req_status === 'success') {
        statusResponse.message = 'Purge Successful';
      } else if (result.req_status === 'failed') {
        statusResponse.message = 'In Progress';
      } else {
        statusResponse.message = result.req_status;
      }
      renderJSON(request, reply, error, statusResponse);
    } else {
      reply(boom.badRequest('Purge job ID not found'));
    }
  });
};


//
// Management of users
//

exports.getUsers = function getUsers(request, reply) {
  var listOfUsers;
  users.list(request, function(error, listOfUsers) {
    if (error || !listOfUsers) {
      return reply(boom.badImplementation('Failed to get a list of users'));
    }

    //   console.log('List of users = ', listOfUsers);

    if (listOfUsers.length === 0) {
      return reply(boom.badImplementation('Failed to get a list of users (there should be at least one user in the list)'));
    }

    var shortList = [];
    for (var i = 0; i < listOfUsers.length; i++) {
      shortList.push({});
      shortList[i].user_id = listOfUsers[i].user_id;
      shortList[i].email = listOfUsers[i].email;
      shortList[i].firstname = listOfUsers[i].firstname;
      shortList[i].lastname = listOfUsers[i].lastname;
      shortList[i].companyId = listOfUsers[i].companyId;
      shortList[i].domain = listOfUsers[i].domain;
      shortList[i].role = listOfUsers[i].role;
    }

    renderJSON(request, reply, error, shortList);
  });
};

exports.createUser = function(request, reply) {

  var newUser = request.payload;

  if (newUser.companyId) {
    if (!utils.isArray1IncludedInArray2(newUser.companyId, request.auth.credentials.companyId)) {
      return reply(boom.badRequest('Your user does not manage the specified company ID(s)'));
    }
  } else {
    newUser.companyId = request.auth.credentials.companyId;
  }

  if (!newUser.domain) {
    newUser.domain = request.auth.credentials.domain;
  }

  // TODO: Add a check for domains

  // check that the email address is not already in use
  users.get({
    email: newUser.email
  }, function(error, result) {
    // got results so the email is in use
    if (result) {
      return reply(boom.badRequest('The email address is already used by another user'));

    } else {

      //      console.log('Adding new user ', newUser);
      users.add(newUser, function(error, result) {
        //        console.log('Added user, error = ', error, 'result = ', result);

        var statusResponse;
        if (result) {
          statusResponse = {
            statusCode: 200,
            message: 'Successfully created new user',
            object_id: result._id.toString()
          };
        }
        renderJSON(request, reply, error, statusResponse);
      });
    }
  });
};

exports.getUser = function(request, reply) {

  var user_id = request.params.user_id;
  users.get({
    _id: user_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve user details'));
    }
    if (result) {

      if (result.companyId && utils.areOverlappingArrays(result.companyId, request.auth.credentials.companyId)) {
        delete result.password;
        renderJSON(request, reply, error, result);
      } else {
        return reply(boom.badRequest('User not found'));
      }
    } else {
      return reply(boom.badRequest('User not found'));
    }
  });
};

exports.getMyUser = function(request, reply) {

  var user_id = request.auth.credentials.user_id;
  users.get({
    _id: user_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve user details'));
    }
    if (result) {
      delete result.password;
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('User not found'));
    }
  });
};

exports.updateUser = function(request, reply) {
  var newUser = request.payload;
  //  console.log('In updateUser: newUser = ', newUser);

  if (Object.keys(newUser).length === 0) {
    return reply(boom.badRequest('Please specify at least updated attiribute'));
  }
  var user_id = request.params.user_id;
  newUser.user_id = request.params.user_id;

  if (newUser.companyId && !utils.isArray1IncludedInArray2(newUser.companyId, request.auth.credentials.companyId)) {
    return reply(boom.badRequest('The new companyId is not found'));
  }

  users.get({
    _id: user_id
  }, function(error, result) {
    if (result) {

      //      console.log('In updateUser: request.auth.credentials.companyId = ', request.auth.credentials.companyId);
      //      console.log('In updateUser: result.companyId = ', result.companyId);

      if (!utils.areOverlappingArrays(request.auth.credentials.companyId, result.companyId)) {
        return reply(boom.badRequest('User not found'));
      }

      users.update(newUser, function(error, result) {
        if (!error) {
          var statusResponse;
          statusResponse = {
            statusCode: 200,
            message: 'Successfully updated the user'
          };
          renderJSON(request, reply, error, statusResponse);
        } else {
          return reply(boom.badRequest('User not found'));
        }
      });
    } else {
      return reply(boom.badRequest('User not found'));
    }
  });
};

exports.deleteUser = function(request, reply) {
  var user_id = request.params.user_id;

  users.get({
    _id: user_id
  }, function(error, result) {
    if (result) {

      //      console.log('In deleteUser: request.auth.credentials.companyId = ', request.auth.credentials.companyId);
      //      console.log('In deleteUser: result.companyId = ', result.companyId);

      if (!utils.areOverlappingArrays(request.auth.credentials.companyId, result.companyId)) {
        return reply(boom.badRequest('User not found'));
      }

      users.remove({
        _id: user_id
      }, function(error, result) {
        if (!error) {
          var statusResponse;
          statusResponse = {
            statusCode: 200,
            message: 'Successfully deleted the user'
          };
          renderJSON(request, reply, error, statusResponse);
        } else {
          return reply(boom.badRequest('User not found'));
        }
      });
    } else {
      return reply(boom.badRequest('User not found'));
    }
  });
};

//
// Management of domains
//

exports.getDomains = function getDomains(request, reply) {
  var listOfDomains = [];
  domains.list(request, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get a list of domains'));
    }

    //    console.log('List of domains = ', result);

    for (var i = 0; i < result.length; i++) {
      listOfDomains.push({
        companyId: result[i].companyId,
        name: result[i].name,
        id: result[i].id,
        sync_status: result[i].sync_status,
        cname: result[i].name + '.' + Config.default_cname_domain
      });
    }

    renderJSON(request, reply, error, listOfDomains);
  });
};

exports.getDomain = function(request, reply) {

  var domain_id = request.params.domain_id;
  domains.get({
    _id: domain_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1) {

      servergroups.get({
        groupName: result.COGroup,
        groupType: 'CO'
      }, function(error, servergroup) {
        if (error || !servergroup) {
          return reply(boom.badImplementation('Failed to retrieve domain details'));
        }
        result.origin_server_location = servergroup.publicName;

        result.origin_host_header = result.origin_server;
        result.origin_server = result.origin_domain;

        for (var i in domainAttributesToHide) {
          delete result[domainAttributesToHide[i]];
        }

        result.cname = result.name + '.' + Config.default_cname_domain;

        renderJSON(request, reply, error, result);
      });
    } else {
      return reply(boom.badRequest('Domain not found'));
    }
  });
};

exports.getDomainDetails = function(request, reply) {

  var domain_id = request.params.domain_id;
  domains.get({
    _id: domain_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1) {

      masterconfigurations.get({
        domainName: result.name
      }, function(error, mconfig) {
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



exports.createDomain = function(request, reply) {

  var newDomainJson = request.payload;

  if (request.auth.credentials.companyId.indexOf(newDomainJson.companyId) === -1) {
    return reply(boom.badRequest('Your user does not manage the specified company ID'));
  }

  servergroups.get({
    publicName: newDomainJson.origin_server_location,
    serverType: 'public',
    groupType: 'CO'
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get a list of public CO server groups'));
    }

    if (!result) {
      return reply(boom.badRequest('Specified Rev first mile location cannot be found'));
    }

    newDomainJson.origin_server_location = result.groupName;

    domains.get({
      name: newDomainJson.name
    }, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to retrieve domain details'));
      }
      if (result) {
        return reply(boom.badRequest('The domain name is already registered in the system'));
      }

      utils.loginToPortal(request.auth.credentials.email, request.auth.credentials.password, request.auth.credentials.role,
        function(err, userToken) {
          if (err || !userToken) {
            return reply(boom.badImplementation('Failed to log in to the portal'));
          }

          var createDomainJson = {
            companyId: newDomainJson.companyId,
            companys: newDomainJson.companyId,
            config_url_type: newDomainJson.origin_server_location,
            email: request.auth.credentials.email,
            token: userToken,
            name: newDomainJson.name,
            origin_server: newDomainJson.origin_host_header,
            origin_domain: newDomainJson.origin_server,
            role: request.auth.credentials.role,
            tolerance: newDomainJson.tolerance
          };

          //         console.log('createDomainJson = ', createDomainJson);
          portal_request(Config.portal_url)
            .post('/domain/new')
            .send(createDomainJson)
            .end(function(err, res) {
              if (err || !res || res.statusCode !== 200) {
                return reply(boom.badImplementation('Failed to create a new domain configuration'));
              }

              var response_json = JSON.parse(res.text);
              //            console.log(response_json);
              if (response_json.status === true && response_json.response === 'Domain created successfully') {

                domains.get({
                  name: newDomainJson.name
                }, function(error, result) {
                  if (error || !result) {
                    return reply(boom.badImplementation('Failed to retrieve domain details'));
                  }

                  var statusResponse;
                  statusResponse = {
                    statusCode: 200,
                    message: 'Successfully created the domain',
                    object_id: result.id
                  };
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


exports.updateDomain = function(request, reply) {

  var newDomainJson = request.payload;

  // Check that the user can use the new companyId
  if (request.auth.credentials.companyId.indexOf(newDomainJson.companyId) === -1) {
    return reply(boom.badRequest('Your user does not manage the specified company ID'));
  }

  // Check the CO group name is correct
  servergroups.get({
    publicName: newDomainJson.origin_server_location,
    serverType: 'public',
    groupType: 'CO'
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to get a list of public CO server groups'));
    }

    if (!result) {
      return reply(boom.badRequest('Specified Rev first mile location cannot be found'));
    }

    newDomainJson.origin_server_location = result.groupName;

    domains.get({
      _id: request.params.domain_id
    }, function(error, result) {
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
        function(err, userToken) {
          if (err || !userToken) {
            return reply(boom.badImplementation('Failed to log in to the portal'));
          }
          var updateDomainJson = {
            companys: newDomainJson.companyId,
            config_url_type: newDomainJson.origin_server_location,
            COGroup: newDomainJson.origin_server_location,
            email: request.auth.credentials.email,
            token: userToken,
            name: newDomainJson.name,
            origin_server: newDomainJson.origin_host_header,
            origin_domain: newDomainJson.origin_server,
            role: request.auth.credentials.role,
            tolerance: newDomainJson.tolerance
          };
          //          console.log('updateDomainJson = ', updateDomainJson);
          portal_request(Config.portal_url)
            .post('/domain/update')
            .send(updateDomainJson)
            .end(function(err, res) {
              if (err || !res || res.statusCode !== 200) {
                return reply(boom.badImplementation('Failed to create a new domain configuration'));
              }

              var response_json = JSON.parse(res.text);
              //              console.log(response_json);
              if (response_json.status === true && response_json.response === 'Domain has been updated successfully') {
                var statusResponse;
                statusResponse = {
                  statusCode: 200,
                  message: 'Successfully updated the domain'
                };
                renderJSON(request, reply, error, statusResponse);
              } else {
                return reply(boom.badImplementation('Failed to update the domain configuration'));
              }
            });
        });
    });
  });
};

exports.updateDomainDetails = function(request, reply) {

  var newConfigJson = request.payload;

  var domain_id = request.params.domain_id;
  domains.get({
    _id: domain_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1) {
      masterconfigurations.get({
        domainName: result.name
      }, function(error, mconfig) {
        if (error || !mconfig) {
          return reply(boom.badImplementation('Failed to retrieve domain master configuration details'));
        }
        mconfig = mconfig.configurationJson;
        //        console.log('mconfig = ', mconfig);
        for (var i in domainMasterConfigAttributesToHide) {
          newConfigJson[domainMasterConfigAttributesToHide[i]] = mconfig[domainMasterConfigAttributesToHide[i]];
        }
        for (i in domainMasterConfigBPAttributesToHide) {
          newConfigJson.rev_component_bp[domainMasterConfigBPAttributesToHide[i]] = mconfig.rev_component_bp[domainMasterConfigBPAttributesToHide[i]];
        }
        for (i in domainMasterConfigCOAttributesToHide) {
          newConfigJson.rev_component_co[domainMasterConfigCOAttributesToHide[i]] = mconfig.rev_component_co[domainMasterConfigCOAttributesToHide[i]];
        }
        //       console.log('newConfigJson =', newConfigJson);
        utils.loginToPortal(request.auth.credentials.email, request.auth.credentials.password, request.auth.credentials.role,
          function(err, userToken) {
            if (err || !userToken) {
              return reply(boom.badImplementation('Failed to log in to the portal'));
            }
            var updateDomainJson = {
              actType: 'configJson',
              email: request.auth.credentials.email,
              token: userToken,
              domainName: result.name,
              configurationJson: newConfigJson
            };
            //           console.log('updateDomainJson = ', updateDomainJson);
            portal_request(Config.portal_url)
              .post('/domain/updateConfigure')
              .send(updateDomainJson)
              .end(function(err, res) {
                if (err || !res || res.statusCode !== 200) {
                  return reply(boom.badImplementation('Failed to create a new domain configuration'));
                }

                var response_json = JSON.parse(res.text);
                //               console.log(response_json);
                if (response_json.status === true && response_json.response.response === 'Configuration updated successfully') {
                  var statusResponse;
                  statusResponse = {
                    statusCode: 200,
                    message: 'Successfully updated the domain'
                  };
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

exports.deleteDomain = function(request, reply) {

  var domain_id = request.params.domain_id;

  var domain_name,
    userToken;

  domains.get({
    _id: domain_id
  }, function(error, result) {
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
      function(err, userToken) {

        if (err || !userToken) {
          return reply(boom.badImplementation('Failed to log in to the portal'));
        }

        var deleteDomainJson = {
          email: request.auth.credentials.email,
          name: domain_name,
          token: userToken
        };

        //        console.log('deleteDomainJson = ', deleteDomainJson);

        portal_request(Config.portal_url)
          .post('/domain/delete')
          .send(deleteDomainJson)
          .end(function(err, res) {
            if (err || !res || res.statusCode !== 200) {
              return reply(boom.badImplementation('Failed to delete the domain name'));
            }

            var statusResponse;
            statusResponse = {
              statusCode: 200,
              message: 'Successfully deleted the domain'
            };
            renderJSON(request, reply, error, statusResponse);

          });
      });
  });
};



//
// Management of accounts
//

exports.getAccounts = function getAccounts(request, reply) {

  var listOfAccounts;
  accounts.list(request, function(error, listOfAccounts) {

    //    console.log('List of accounts = ', listOfAccounts);

    renderJSON(request, reply, error, listOfAccounts);
  });
};

exports.createAccount = function(request, reply) {

  var newAccount = request.payload;
  newAccount.createdBy = request.auth.credentials.email;
  //  console.log('Adding new account ', newAccount);

  // check that the company name is not used by another customer
  accounts.get({
    companyName: newAccount.companyName
  }, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to verify the new account name'));
    }

    if (result) {
      return reply(boom.badRequest('The company name is already registered in the system'));
    }

    accounts.add(newAccount, function(error, result) {

      //      console.log('Added account, error = ', error, 'result = ', result);

      if (error || !result) {
        return reply(boom.badImplementation('Failed to add new account'));
      }

      var statusResponse;
      if (result) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully created new account',
          object_id: result._id.toString()
        };

        var updatedUser = {
          user_id: request.auth.credentials.user_id,
          companyId: request.auth.credentials.companyId
        };
        updatedUser.companyId.push(result._id.toString());
        //        console.log('updatedUser = ', updatedUser);

        users.update(updatedUser, function(error, result) {
          if (error) {
            return reply(boom.badImplementation('Failed to update user details with new account ID'));
          } else {
            renderJSON(request, reply, error, statusResponse);
          }
        });
      }
    });
  });
};

exports.getAccount = function(request, reply) {

  var account_id = request.params.account_id;

  if (request.auth.credentials.companyId.indexOf(account_id) === -1) {
    return reply(boom.badRequest('Account not found'));
  }

  accounts.get({
    _id: account_id
  }, function(error, result) {
    if (result) {
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('Account not found'));
    }
  });
};

exports.updateAccount = function(request, reply) {

  var updatedAccount = request.payload;
  updatedAccount.account_id = request.params.account_id;

  if (request.auth.credentials.companyId.indexOf(updatedAccount.account_id) === -1) {
    return reply(boom.badRequest('Account not found'));
  }


  // check that the company name is not used by another customer
  accounts.get({
    companyName: updatedAccount.companyName
  }, function(error, result) {

    if (error) {
      return reply(boom.badImplementation('Failed to verify the new account name'));
    }

    if (result) {
      return reply(boom.badRequest('The company name is already registered in the system'));
    }

    accounts.update(updatedAccount, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update the account'));
      }

      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the account',
      };

      renderJSON(request, reply, error, statusResponse);
    });
  });
};

exports.deleteAccount = function(request, reply) {

  var account_id = request.params.account_id;

  if (request.auth.credentials.companyId.indexOf(account_id) === -1) {
    return reply(boom.badRequest('Account not found'));
  }

  accounts.remove({
    _id: account_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badRequest('Account not found'));
    }
    var statusResponse;
    statusResponse = {
      statusCode: 200,
      message: 'Successfully deleted the account'
    };

    // now let's remove the account ID from the user's companyId array
    var updatedUser = {
      user_id: request.auth.credentials.user_id,
      companyId: request.auth.credentials.companyId
    };

    updatedUser.companyId.splice(updatedUser.companyId.indexOf(account_id), 1);

    //    console.log('updatedUser = ', updatedUser);

    users.update(updatedUser, function(error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to update user details with removed account ID'));
      } else {
        renderJSON(request, reply, error, statusResponse);
      }
    });
  });
};


//
// First mile locations
//

exports.getFirstMileLocations = function(request, reply) {

  servergroups.listFirstMileLocations(function(error, result) {
    if (result) {
      var listOfSites = [];
      for (var i = 0; i < result.length; i++) {
        listOfSites.push({
          locationName: result[i].publicName,
          id: result[i]._id.toString()
        });
      }
      renderJSON(request, reply, error, listOfSites);
    } else {
      return reply(boom.badRequest('No first mile locations are registered in the system'));
    }
  });
};



//
// System health check
//

exports.healthCheck = function(request, reply) {

  var message = '',
    errorMessage,
    error = false;

  domains.get({
    name: 'test_domain_name_which_may_not_exist.com'
  }, function(error, result) {
    if (error) {
      error = true;
      errorMessage = 'ERROR: Failed to retrieve a domain record';
      message = (message === '') ? errorMessage : message + '; ' + errorMessage;
    }
    users.get({
      email: 'test_email_address_which_may_not_exist@revsw.com'
    }, function(error, result) {
      if (error) {
        error = true;
        errorMessage = 'ERROR: Failed to retrieve a user record';
        message = (message === '') ? errorMessage : message + '; ' + errorMessage;
      }
      purgeJobs.get({
        _id: 'purge_job_id_which_may_not_exist'
      }, function(error, result) {
        if (error) {
          error = true;
          errorMessage = 'ERROR: Failed to retrieve a purge job record';
          message = (message === '') ? errorMessage : message + '; ' + errorMessage;
        }

        var statusResponse;
        statusResponse = {
          statusCode: (error) ? 500 : 200,
          version: version.trim(),
          message: (message === '') ? 'Everything is OK' : message
        };

        renderJSON(request, reply, error, statusResponse);
      });
    });
  });
};



//
// Get traffic stats
//

exports.getStats = function(request, reply) {

  var domain_id = request.params.domain_id;
  var domain_name;

  domains.get({
    _id: domain_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1) {
      domain_name = result.name;

      var requestBody = 
{
  'size': 0,
  'query': {
    'filtered': {
      'query': {
        'query_string': {
          'query': 'domain: \'' + domain_name + '\'',
          'analyze_wildcard': true
        }
      },
      'filter': {
        'bool': {
          'must': [
            {
              'range': {
                '@timestamp': {
                  'gte': request.query.from_timestamp || 'now-1h',
                  'lte': request.query.to_timestamp || 'now',
                }
              }
            }
          ],
          'must_not': []
        }
      }
    }
  },
  'aggs': {
    '5': {
      'date_histogram': {
        'field': '@timestamp',
        'interval': request.query.interval || '5m',
        'pre_zone_adjust_large_interval': true,
        'min_doc_count': 0,
        'extended_bounds': {
          'min': request.query.from_timestamp || 'now-1h',
          'max': request.query.to_timestamp || 'now',
        }
      },
      'aggs': {
        'sent_bytes': {
          'sum': {
            'field': 's_bytes'
          }
        },
        'received_bytes': {
          'sum': {
            'field': 'r_bytes'
          }
        }
      }
    }
  }
};


      client.search({
//        index: 'logstash-*',
        ignoreUnavailable: true,
        body: requestBody
      }).then(function(body) {
        //  eventEmitter.emit('doOutput', {message:'okay', hits:body.hits.hits});
        renderJSON(request, reply, error, body);
      }, function(error) {
        console.trace(error.message);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });


      /*
            pingES( client, function(error) {
              if (error) {
                return reply(boom.badImplementation('ES service is not available'));
              } else {
                return reply(boom.badRequest('ES is OK'));
              }
                return reply(boom.badRequest('ES is OK'));
      */

      //        renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('Domain not found'));
    }
  });

};


//
// Get Top Requests report
//

exports.getTopRequests = function(request, reply) {

  var domain_id = request.params.domain_id;
  var domain_name,
    filter;

  domains.get({
    _id: domain_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1) {
      domain_name = result.name;

      request.query.report_type = request.query.report_type || 'requests';
      switch (request.query.report_type) {
        case 'cache_miss': 
          filter = ' AND cache: \'MISS\''; 
          break;
        case 'object_not_found': 
          filter = ' AND response: \'404\'';
          break;
        default:
          filter = '';
      }

      if (request.query.country) {
        filter = filter + ' AND country_code2: \'' + request.query.country + '\'';
      }

      var requestBody =
{
  'query' : {
    'filtered' : {
      'query' : {
        'query_string' : {
          'query' : 'domain: \'' + domain_name + '\'' + filter,
          'analyze_wildcard' : true
        }
      },
      'filter' : {
        'bool' : {
          'must' : [{
              'range' : {
                '@timestamp' : {
                  'gte' : request.query.from_timestamp || 'now-1h',
                  'lte' : request.query.to_timestamp || 'now',
                }
              }
            }
          ],
          'must_not' : []
        }
      }
    }
  },
  'size' : 0,
  'aggs' : {
    '2' : {
      'terms' : {
        'field' : 'request.raw',
        'size' : request.query.count || 30,
        'order' : {
          '_count' : 'desc'
        }
      }
    }
  }
};


      client.search({
//        index: 'logstash-*',
        ignoreUnavailable: true,
        body: requestBody
      }).then(function(body) {
        //  eventEmitter.emit('doOutput', {message:'okay', hits:body.hits.hits});
        renderJSON(request, reply, error, body);
      }, function(error) {
        console.trace(error.message);
        return reply(boom.badImplementation('Failed to retrieve data from ES'));
      });


      /*
            pingES( client, function(error) {
              if (error) {
                return reply(boom.badImplementation('ES service is not available'));
              } else {
                return reply(boom.badRequest('ES is OK'));
              }
                return reply(boom.badRequest('ES is OK'));
      */

      //        renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('Domain not found'));
    }
  });

};



/* ----------------------------------------------------------------------------------- */


exports.index = index;
exports.reduced = reduced;
exports.license = license;

exports.purgeObject = purgeObject;
exports.getPurgeJobStatus = getPurgeJobStatus;
