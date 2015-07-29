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
  PurgeJobs = require('../lib/purgejobs.js').PurgeJobs,
  User = require('../lib/user.js').User,
  Domain = require('../lib/domain.js').Domain,
  Account = require('../lib/account.js').Account,
  utils = require('../lib/utilities.js'),
  crypto = require('crypto'),
  pack = require('../package');

mongoose.plugin(merge);

// moungodb connection for store
var purgeJobsConnection = mongoose.createConnection(Config.purge_mongo.connect_string),
  purgeJobs = new PurgeJobs(mongoose, purgeJobsConnection);
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

mongoose.set('debug', true);

var get_hash = function (password) {
  return crypto.createHash('md5').update(password).digest('hex');
};

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

    console.log('Inside UserAuth function: result = ', result);

    var passHash = get_hash(password);
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


function purgeObject(request, reply) {
  var newPurgeJob = {};

//  console.log('purge request = ', request);

  newPurgeJob.request_json=request.payload;
  console.log('purge job to write = ', newPurgeJob);

  purgeJobs.add(newPurgeJob, function(error, result) {
    var statusResponse;
    if (result) {
      statusResponse = {
        statusCode: 200,
        message: 'The purge request has been successfully queued',
        request_id: result._id.toString()
      };
    }
    renderJSON(request, reply, error, statusResponse);
  });
}


function getPurgeJobStatus(request, reply) {

  var request_id = request.params.request_id;

  console.log('get request = ', request_id);

  purgeJobs.get(request_id, function(error, result) {

    var statusResponse;

    if (result) {
      statusResponse = {
        statusCode: 200,
        message: result.req_status,
        request_id: result._id.toString()
      };
    }
    console.log('retrieved purge job = ', result);
    renderJSON(request, reply, error, statusResponse);
  });
}




exports.getUsers = function getUsers(request, reply) {
  var listOfUsers;
  users.list( request, function(error, listOfUsers) {

    console.log('List of users = ', listOfUsers);

    renderJSON(request, reply, error, listOfUsers);
  });
};

exports.createUser = function (request, reply) {
  if ( request.auth.credentials.role !== 'admin' && request.auth.credentials.role !== 'reseller' ) {
    reply( boom.forbidden('Not enough privileges to create new user') );
  }

  var newUser = request.payload;

  if (newUser.companyId) {
    if (!utils.isArray1IncludedInArray2(newUser.companyId, request.auth.credentials.companyId) ) {
      reply (boom.badRequest('Your user does not manage the specified company ID(s)' ));
    }
  } else {
    newUser.companyId = request.auth.credentials.companyId;
  }

  // check that the email address is not already in use
  users.get( { email: newUser.email }, function (error, result) {
    // got results so the email is in use
    if(result) {
      reply( boom.badRequest('The email address is already used by another user') );

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
  if ( request.auth.credentials.role === 'user' ) {
    reply( boom.forbidden('Not enough privileges to access user details') );
  }

  var user_id = request.params.user_id;
  users.get( { _id: user_id }, function(error, result ) {
    if (result) {
        renderJSON( request, reply, error, result );
    } else {
       reply( boom.badRequest('User not found') );
    }
  });
};

exports.updateUser = function (request, reply) {
  var newUser = request.payload;
  newUser.user_id = request.params.user_id;
  users.update( newUser, function(error, result ) {
    if (result) {
        renderJSON(request, reply, error, result);
    } else {
       reply( boom.badRequest('User not found') );
    }
  });
};

exports.deleteUser = function (request, reply) {
  if ( request.auth.credentials.role === 'user' ) {
    reply( boom.forbidden('Not enough privileges to delete a user') );
  }
  var user_id = request.params.user_id;

  users.get( { _id: user_id }, function(error, result ) {
    if (result) {

      console.log('In deleteUser: request.auth.credentials.role.companyId = ', request.auth.credentials.role.companyId);
      console.log('In deleteUser: result.companyId = ', result.companyId);
    
      if ( ! utils.areOverlappingArrays( request.auth.credentials.companyId, result.companyId ) ) { 
        reply( boom.badRequest('User not found') );
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
           reply( boom.badRequest('User not found') );
        }
      });
    } else {
      reply( boom.badRequest('User not found') );
    }
  });
};

exports.getDomains = function getDomains(request, reply) {
  var listOfDomains;
  domains.list( request, function(error, listOfDomains) {

    console.log('List of domains = ', listOfDomains);

    renderJSON(request, reply, error, listOfDomains);
  });
};

exports.getAccounts = function getAccounts(request, reply) {

  if ( request.auth.credentials.role !== 'reseller' ) {
    reply( boom.forbidden('Only users with role "reseller" can access account-related functions') );
  }

  var listOfAccounts;
  accounts.list( request, function(error, listOfAccounts) {

    console.log('List of accounts = ', listOfAccounts);

    renderJSON(request, reply, error, listOfAccounts);
  });
};

exports.createAccount = function (request, reply) {

  if ( request.auth.credentials.role !== 'reseller' ) {
    reply( boom.forbidden('Only users with role "reseller" can access account-related functions') );
  }

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

  if ( request.auth.credentials.role !== 'reseller' ) {
    return reply( boom.forbidden('Only users with role "reseller" can access account-related functions') );
  }

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

  if ( request.auth.credentials.role !== 'reseller' ) {
    return reply( boom.forbidden('Only users with role "reseller" can access account-related functions') );
  }

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
  if ( request.auth.credentials.role !== 'reseller' ) {
    reply( boom.forbidden('Only users with role "reseller" can access account-related functions') );
  }

  var account_id = request.params.account_id;

  if ( request.auth.credentials.companyId.indexOf(account_id) === -1 ) {
       reply( boom.badRequest('Account not found') );
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

