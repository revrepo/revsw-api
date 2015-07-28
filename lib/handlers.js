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
  var newuser = request.payload;
  console.log('Adding new user ', newuser);
  users.add( newuser, function(error, result) {
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
};

exports.getUser = function (request, reply) {
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
  var user_id = request.params.user_id;
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
};

exports.getDomains = function getDomains(request, reply) {
  var listOfDomains;
  domains.list( request, function(error, listOfDomains) {

    console.log('List of domains = ', listOfDomains);

    renderJSON(request, reply, error, listOfDomains);
  });
};


/* ----------------------------------------------------------------------------------- */


exports.index = index;
exports.reduced = reduced;
exports.license = license;

exports.purgeObject = purgeObject;
exports.getPurgeJobStatus = getPurgeJobStatus;

