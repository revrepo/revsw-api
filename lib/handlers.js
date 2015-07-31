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
  MasterConfiguration = require('../lib/masterconfiguration.js').MasterConfiguration,
  utils = require('../lib/utilities.js'),
  crypto = require('crypto'),
  uuid = require('node-uuid'),
  pack = require('../package');


var attributesToHide = [
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
  ];

var domainMasterConfigToHide = [
  'operation',
  'rev_traffic_mgr',
  'config_command_options',
  'bp_list',
  'co_list',
  'co_cnames',
  'certificate_urls',
  'domain_name',
  'origin_domain',
  'origin_server',
  'rev_component_co.rum_beacon_url',
  'rev_component_co.co_apache_custom_config',
  'rev_component_co.rum_beacon_url',
  'rev_component_bp.bp_apache_custom_config',
  'rev_component_bp.bp_apache_fe_custom_config',
  'rev_component_bp.cache_opt_choice',
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

mongoose.set('debug', true);

exports.UserAuth = function UserAuth(request, username, password, callback) {
  console.log('Inside UserAuth function');
  users.get( { email: username },  function(error, result) {
    console.log('Inside UserAuth function. Received user details = ', result);
    if (!result) {
      return callback(null, false);
    }

    // Users without companyId data should not be able to log in
    if (!result.companyId) {
      return callback(null, false);
    }

    // Only users with 'user' and 'admin' roles should be able to use API
    if (result.role === 'revadmin' ) {
      return callback(null, false);
    }

    result.scope = [];

    result.scope.push(result.role);
    if ( !result.access_control_list.readOnly ) {
      result.scope.push(result.role + '_rw');
    }

    console.log('Inside UserAuth function: result = ', result);

    var passHash = utils.getHash(password);
    console.log('Comparing passwords: ', passHash, result.password);
    callback(error, passHash === result.password, result);
  });
};


/* ----------------------------------------------------------------------------------- */


function index(request, reply) {
  utils.getMarkDownHTML(__dirname.replace('/lib', '') + '/README.md', function(err, data) {
    reply.view('swagger.html', {
      title: pack.name + ' &#151; Calculator',
      markdown: data
    });
  });
}

function reduced(request, reply) {
  utils.getMarkDownHTML(__dirname.replace('/lib', '') + '/README.md', function(err, data) {
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
  console.log('purge request = ', request.payload);

  var domain = request.payload.domain;

  console.log('request.auth.credentials.domain = ', request.auth.credentials.domain);
  console.log('domain = ', domain);

  if ( request.auth.credentials.domain && request.auth.credentials.domain.indexOf(domain) === -1 ) {
    return reply( boom.badRequest('Domain not found') );
  }

  domains.get( { name: domain }, function (error, result) {
    if (error) {
      return reply (boom.badImplementation('Failed to retrive domain details'));
    }

    if (!result) {
      return reply (boom.badRequest('Domain not found'));
    }

    if (request.auth.credentials.companyId.indexOf(result.companyId) === -1 ) {
      return reply (boom.badRequest('Domain not found'));
    }

    if (!result.stats_url) {
      return reply (boom.badImplementation('stats_url is empty'));
    }
    var proxy_list = result.stats_url.split(',');
    for ( var i1=0; i1 < proxy_list.length; i1++ ) {
      proxy_list[i1] = proxy_list[i1].split(':')[0];
    }

    var newPurgeJob = {};

    newPurgeJob.request_json = request.payload;
    newPurgeJob.req_id = uuid.v1();

    for (var i=0; i < newPurgeJob.request_json.purges.length; i++) {
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
        return reply (boom.badImplementation('Failed to write a new purgeJob object'));

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


function getPurgeJobStatus(request, reply) {

  var request_id = request.params.request_id;

  console.log('get request = ', request_id);

  purgeJobs.get(request_id, function(error, result) {
    if (error) {
      return reply (boom.badImplementation('Failed to get purge job status'));
    }
    console.log('retrieved purge job = ', result);
    if (result) {
      var statusResponse;
      statusResponse = {
        statusCode: 200,
        message: result.req_status
      };
      renderJSON(request, reply, error, statusResponse);
    } else {
      reply( boom.badRequest('Purge job ID not found') );
    }
  });
}

//
// Management of users
//

exports.getUsers = function getUsers(request, reply) {
  var listOfUsers;
  users.list( request, function(error, listOfUsers) {
    if (error || !listOfUsers) {
      return reply (boom.badImplementation('Failed to get a list of users'));
    }

    console.log('List of users = ', listOfUsers);

    if ( listOfUsers.length === 0 ) {
      return reply (boom.badImplementation('Failed to get a list of users (there should be at least one user in the list)'));
    }

    var shortList = [];
    for ( var i=0; i < listOfUsers.length; i++ ) {
      shortList.push( {} );
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

exports.createUser = function (request, reply) {

  var newUser = request.payload;

  if (newUser.companyId) {
    if (!utils.isArray1IncludedInArray2(newUser.companyId, request.auth.credentials.companyId) ) {
      return reply (boom.badRequest('Your user does not manage the specified company ID(s)' ));
    }
  } else {
    newUser.companyId = request.auth.credentials.companyId;
  }

  if (!newUser.domain) {
    newUser.domain = request.auth.credentials.domain;
  }

  // TODO: Add a check for domains

  // check that the email address is not already in use
  users.get( { email: newUser.email }, function (error, result) {
    // got results so the email is in use
    if(result) {
      return reply( boom.badRequest('The email address is already used by another user') );

    } else {

      console.log('Adding new user ', newUser);
      users.add( newUser, function(error, result) {
        console.log('Added user, error = ', error, 'result = ', result); 

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

exports.getUser = function (request, reply) {

  var user_id = request.params.user_id;
  users.get( { _id: user_id }, function(error, result ) {
    if (error) {
      return reply (boom.badImplementation('Failed to retrieve user details'));
    }
    if (result) {

        if (result.companyId && utils.areOverlappingArrays(result.companyId, request.auth.credentials.companyId) ) {
          delete result.password;
          renderJSON( request, reply, error, result );
        } else {
          return reply( boom.badRequest('User not found') );
        }
    } else {
       return reply( boom.badRequest('User not found') );
    }
  });
};

exports.updateUser = function (request, reply) {
  var newUser = request.payload;
  console.log('In updateUser: newUser = ', newUser);

  if ( Object.keys(newUser).length === 0 ) {
    return reply( boom.badRequest('Please specify at least updated attiribute') );
  }
  var user_id = request.params.user_id;
  newUser.user_id = request.params.user_id;

  users.get( { _id: user_id }, function(error, result ) {
    if (result) {

      console.log('In updateUser: request.auth.credentials.companyId = ', request.auth.credentials.companyId);
      console.log('In updateUser: result.companyId = ', result.companyId);

      if ( ! utils.areOverlappingArrays( request.auth.credentials.companyId, result.companyId ) ) {
        return reply( boom.badRequest('User not found') );
      }

      users.update( newUser, function(error, result ) {
        if (!error) {
          var statusResponse;
          statusResponse = {
            statusCode: 200,
            message: 'Successfully updated the user'
          };
          renderJSON(request, reply, error, statusResponse);
        } else {
           return reply( boom.badRequest('User not found') );
        }
      });
    } else {
      return reply( boom.badRequest('User not found') );
    }
  });
};

exports.deleteUser = function (request, reply) {
  var user_id = request.params.user_id;

  users.get( { _id: user_id }, function(error, result ) {
    if (result) {

      console.log('In deleteUser: request.auth.credentials.companyId = ', request.auth.credentials.companyId);
      console.log('In deleteUser: result.companyId = ', result.companyId);
    
      if ( ! utils.areOverlappingArrays( request.auth.credentials.companyId, result.companyId ) ) { 
        return reply( boom.badRequest('User not found') );
      }
  
      users.remove( { _id: user_id }, function(error, result ) {
        if (!error) {
          var statusResponse;
          statusResponse = {
            statusCode: 200,
            message: 'Successfully deleted the user'
          };
          renderJSON(request, reply, error, statusResponse);
        } else {
           return reply( boom.badRequest('User not found') );
        }
      });
    } else {
      return reply( boom.badRequest('User not found') );
    }
  });
};

//
// Management of domains
//

exports.getDomains = function getDomains(request, reply) {
  var listOfDomains = [];
  domains.list( request, function(error, result) {
    if (error) {
      return reply (boom.badImplementation('Failed to get a list of domains'));
    }

    console.log('List of domains = ', result);

    for (var i=0; i < result.length; i++) {
      listOfDomains.push( {
        companyId: result[i].companyId,
        name: result[i].name,
        id: result[i].id,
        sync_status: result[i].sync_status
      } );
    }

    renderJSON(request, reply, error, listOfDomains);
  });
};

exports.getDomain = function (request, reply) {

  var domain_id = request.params.domain_id;
  domains.get( { _id: domain_id }, function(error, result ) {
    if (error) {
      return reply (boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1 ) {
      masterconfigurations.get ( { domainName: result.name }, function (error, mconfig) {
        if (error || !mconfig) {
          return reply (boom.badImplementation('Failed to retrieve domain master configuration details'));
        }
        result.config = mconfig.configurationJson;
        result.config.created_at = mconfig.created_at;
        result.config.updated_at = mconfig.updated_at;

        for (var i in attributesToHide ) {
          delete result[attributesToHide[i]];
        }

        for (i in domainMasterConfigToHide ) {
          delete result.config[domainMasterConfigToHide[i]];
        }

        renderJSON( request, reply, error, result );
      });
    } else {
      return reply( boom.badRequest('Domain not found') );
    }
  });
};

exports.updateDomain = function (request, reply) {

  var domain_id = request.params.domain_id;
  domains.get( { _id: domain_id }, function(error, result ) {
    if (error) {
      return reply (boom.badImplementation('Failed to retrieve domain details'));
    }
    if (result && request.auth.credentials.companyId.indexOf(result.companyId) !== -1 && request.auth.credentials.domain.indexOf(result.name) !== -1 ) {
      masterconfigurations.get ( { domainName: result.name }, function (error, mconfig) {
        if (error || !mconfig) {
          return reply (boom.badImplementation('Failed to retrieve domain master configuration details'));
        }

/*
        result.config = mconfig.configurationJson;
        result.config.created_at = mconfig.created_at;
        result.config.updated_at = mconfig.updated_at;

        for (var i in attributesToHide ) {
          delete result[attributesToHide[i]];
        }

        for (i in domainMasterConfigToHide ) {
          delete result.config[domainMasterConfigToHide[i]];
        }
*/

        renderJSON( request, reply, error, result );
      });
    } else {
      return reply( boom.badRequest('Domain not found') );
    }
  });
};


//
// Management of accounts
//

exports.getAccounts = function getAccounts(request, reply) {

  var listOfAccounts;
  accounts.list( request, function(error, listOfAccounts) {

    console.log('List of accounts = ', listOfAccounts);

    renderJSON(request, reply, error, listOfAccounts);
  });
};

exports.createAccount = function (request, reply) {

  var newAccount = request.payload;
  newAccount.createdBy = request.auth.credentials.email;
  console.log('Adding new account ', newAccount);

  // check that the company name is not used by another customer
  accounts.get( { companyName: newAccount.companyName }, function (error, result) {

    if (error) {
      return reply (boom.badImplementation('Failed to verify the new account name'));
    }

    if (result) {
      return reply( boom.badRequest('The company name is already registered in the system') ); 
    }

    accounts.add( newAccount, function(error, result) {
      
      console.log('Added account, error = ', error, 'result = ', result);

      if (error || !result) {
        return reply (boom.badImplementation('Failed to add new account'));
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
        console.log('updatedUser = ', updatedUser);

        users.update(updatedUser, function(error, result) {
          if (error) {
            return reply (boom.badImplementation('Failed to update user details with new account ID'));
          } else {
            renderJSON(request, reply, error, statusResponse);
          }
        });
      } 
    });
  });
};

exports.getAccount = function (request, reply) {

  var account_id = request.params.account_id;

  if ( request.auth.credentials.companyId.indexOf(account_id) === -1 ) {
       return reply( boom.badRequest('Account not found') );
  }

  accounts.get( { _id: account_id }, function(error, result ) {
    if (result) {
        renderJSON( request, reply, error, result );
    } else {
       return reply( boom.badRequest('Account not found') );
    }
  });
};

exports.updateAccount = function (request, reply) {

  var updatedAccount = request.payload;
  updatedAccount.account_id = request.params.account_id;

  if ( request.auth.credentials.companyId.indexOf(updatedAccount.account_id) === -1 ) {
       return reply( boom.badRequest('Account not found') );
  }


  // check that the company name is not used by another customer
  accounts.get( { companyName: updatedAccount.companyName }, function (error, result) {

    if (error) {
      return reply (boom.badImplementation('Failed to verify the new account name'));
    }

    if (result) {
      return reply( boom.badRequest('The company name is already registered in the system') );
    }

    accounts.update( updatedAccount, function(error, result ) {
      if (error) {
        return reply (boom.badImplementation('Failed to update the account'));
      }
      if (result) {
          renderJSON(request, reply, error, result);
      } else {
         reply( boom.badRequest('Account not found') );
      }
    });
  });
};

exports.deleteAccount = function (request, reply) {

  var account_id = request.params.account_id;

  if ( request.auth.credentials.companyId.indexOf(account_id) === -1 ) {
       return reply( boom.badRequest('Account not found') );
  }

  accounts.remove( { _id: account_id }, function(error, result ) {
    if (error) {
      return reply (boom.badRequest('Account not found'));
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

    console.log('updatedUser = ', updatedUser);

    users.update(updatedUser, function(error, result) {
      if (error) {
        return reply (boom.badImplementation('Failed to update user details with removed account ID'));
      } else {
        renderJSON(request, reply, error, statusResponse);
      }
    });
  });
};



/* ----------------------------------------------------------------------------------- */


exports.index = index;
exports.reduced = reduced;
exports.license = license;

exports.purgeObject = purgeObject;
exports.getPurgeJobStatus = getPurgeJobStatus;

