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

var boom        = require('boom');
var mongoose    = require('mongoose');
var AuditLogger = require('../lib/audit');
var speakeasy   = require('speakeasy');
var config      = require('config');

var utils           = require('../lib/utilities.js');
var handlersLib = require('./lib.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var logger = require('revsw-logger')(config.log_config);

var User = require('../models/User');

var users = new User(mongoose, mongoConnection.getConnectionPortal());

exports.getUsers = function getUsers(request, reply) {
  // TODO: move the user list filtering from the user DB model to this function
  users.list(request, function(error, listOfUsers) {
    if (error || !listOfUsers) {
      return reply(boom.badImplementation('Failed to get a list of users'));
    }

    if (listOfUsers.length === 0) {
      return reply(boom.badImplementation('Failed to get a list of users (there should be at least one user in the list)'));
    }

    listOfUsers = publicRecordFields.handle(listOfUsers, 'users');

    renderJSON(request, reply, error, listOfUsers);
  });
};

exports.createUser = function(request, reply) {
  var newUser = request.payload;

  if (newUser.role === 'reseller' && request.auth.credentials.role !== 'revadmin') {
    return reply(boom.badRequest('Only revadmin can assign "reseller" role'));
  }

  if (newUser.companyId) {
    // TODO: need to move the permissions check to a separate function or use the existing function
    if (request.auth.credentials.role !== 'revadmin' && !utils.isArray1IncludedInArray2(newUser.companyId, utils.getAccountID(request))) {
      return reply(boom.badRequest('Your user does not manage the specified company ID(s)'));
    }
  } else if (request.auth.credentials.companyId.length !== 0) {
    newUser.companyId = request.auth.credentials.companyId;
  } else {
    return reply(boom.badRequest('You have to specify companyId if your user does not have a valid companyId attribute (relevant for users with revadmin role)'));
  }

  var account_id = newUser.companyId[0];

  // TODO: Add a check for domains

  // check that the email address is not already in use
  users.get({
    email: newUser.email
  }, function(error, result) {
    // got results so the email is in use
    if (result) {
      // TODO fix the error message text
      return reply(boom.badRequest('The email address is already used by another user'));

    } else {

      users.add(newUser, function(error, result) {

        var statusResponse;
        if (result) {
          statusResponse = {
            statusCode: 200,
            message: 'Successfully created new user',
            object_id: result.user_id
          };
        }

        result = publicRecordFields.handle(result, 'user');

        AuditLogger.store({
          account_id       : account_id,
          activity_type    : 'add',
          activity_target  : 'user',
          target_id        : result.user_id,
          target_name      : result.email,
          target_object    : result,
          operation_status : 'success'
        }, request);
        handlersLib.createUserDashboard(result.user_id, null, function(err) {
          if (err) {
            logger.error('Signup:createUser:error add default dashboard: ' + JSON.stringify(err));
          } else {
            logger.info('Signup:createUser:success add default dashboard for User with id ' + result.user_id);
          }
        });
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
      return reply(boom.badImplementation('Failed to retrieve user details for user ID ' + user_id));
    }
    if (!result || !utils.checkUserAccessPermissionToUser(request, result)) {
      return reply(boom.badRequest('User ID not found'));
    } else {
      result = publicRecordFields.handle(result, 'user');
      renderJSON(request, reply, error, result);
    }
  });
};

exports.getMyUser = function(request, reply) {

  var user_id = request.auth.credentials.user_id;
  users.get({
    _id: user_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for user ID ' + user_id));
    }
    if (result) {
      result = publicRecordFields.handle(result, 'user');

      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('User ID not found'));
    }
  });
};

exports.updateUser = function(request, reply) {
  var newUser = request.payload;
  if (Object.keys(newUser).length === 0) {
    return reply(boom.badRequest('Please specify at least one updated attiribute'));
  }

  if (newUser.role && newUser.role === 'reseller' && request.auth.credentials.role !== 'revadmin') {
    return reply(boom.badRequest('Only revadmin can assign "reseller" role'));
  }

  var user_id = request.params.user_id;
  newUser.user_id = request.params.user_id;
  // TODO use an existing access verification function instead of the code
  if (request.auth.credentials.role !== 'revadmin' && (newUser.companyId && !utils.isArray1IncludedInArray2(newUser.companyId, utils.getAccountID(request)))) {
    return reply(boom.badRequest('The new companyId is not found'));
  }

  users.get({
    _id: user_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for user ID ' + user_id));
    }
    if (!result || !utils.checkUserAccessPermissionToUser(request, result)) {
      return reply(boom.badRequest('User ID not found'));
    }
    var account_id = result.companyId[0];

    users.update(newUser, function(error, result) {
      if (!error) {
        var statusResponse;
        statusResponse = {
          statusCode: 200,
          message: 'Successfully updated the user'
        };

        result = publicRecordFields.handle(result, 'user');

        AuditLogger.store({
          account_id       : account_id,
          activity_type    : 'modify',
          activity_target  : 'user',
          target_id        : result.user_id,
          target_name      : result.email,
          target_object    : result,
          operation_status : 'success'
        }, request);

        renderJSON(request, reply, error, statusResponse);
      } else {
        return reply(boom.badImplementation('Failed to update details for user with ID ' + user_id));
      }
    });
  });
};

exports.updateUserPassword = function(request, reply) {
  var currentPassword = request.payload.current_password;
  var newPassword = request.payload.new_password;
  var user_id = request.params.user_id;
  if ( user_id !== request.auth.credentials.user_id ) {
    return reply(boom.badRequest('Cannot update the password of another user'));
  }
  users.get({
    _id: user_id
  }, function(error, user) {
    if (user) {
      var account_id = user.companyId[0];
      var currPassHash = utils.getHash(currentPassword);
      if ( currPassHash !== user.password ) {
        return reply(boom.badRequest('The current user password is not correct'));
      }
      if ( currentPassword === newPassword ) {
        return reply(boom.badRequest('Cannot set the same password'));
      }
      user.password = newPassword;
      users.update(user, function(error, result) {
        if (!error) {
          var statusResponse;
          statusResponse = {
            statusCode: 200,
            message: 'Successfully updated the password'
          };

          result = publicRecordFields.handle(result, 'user');

          AuditLogger.store({
            account_id       : account_id,
            activity_type    : 'modify',
            activity_target  : 'user',
            target_id        : result.user_id,
            target_name      : result.email,
            target_object    : result,
            operation_status : 'success'
          }, request);

          renderJSON(request, reply, error, statusResponse);
        } else {
          return reply(boom.badImplementation('Failed to update user details for ID ' + user_id));
        }
      });
    } else {
      return reply(boom.badImplementation('Failed to retrieve user details for ID ' + user_id));
    }
  });
};

exports.deleteUser = function(request, reply) {
  var user_id = request.params.user_id;

  if ( user_id === request.auth.credentials.user_id ) {
    return reply(boom.badRequest('You cannot delete your own account'));
  }

  users.get({
    _id: user_id
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for user ID ' + user_id));
    }
    if (!result || !utils.checkUserAccessPermissionToUser(request, result)) {
      return reply(boom.badRequest('User ID not found'));
    }
    var account_id = result.companyId[0];

    result = publicRecordFields.handle(result, 'user');

    var auditRecord = {
      ip_address       : utils.getAPIUserRealIP(request),
      datetime         : Date.now(),
      user_id          : request.auth.credentials.user_id,
      user_name        : request.auth.credentials.email,
      user_type        : 'user',
      account_id       : account_id,
      activity_type    : 'delete',
      activity_target  : 'user',
      target_id        : result.user_id,
      target_name      : result.email,
      target_object    : result,
      operation_status : 'success'
    };

    users.remove({
      _id: user_id
    }, function(error, result) {
      if (!error) {
        var statusResponse;
        statusResponse = {
          statusCode: 200,
          message: 'Successfully deleted the user'
        };

        AuditLogger.store(auditRecord);

        renderJSON(request, reply, error, statusResponse);
      } else {
        return reply(boom.badImplementation('Failed to delete user ID ' + user_id));
      }
    });
  });
};

exports.init2fa = function (request, reply) {
  var user_id = request.auth.credentials.user_id;
  users.get({
    _id: user_id
  }, function(error, user) {
    if (user) {
      var account_id = user.companyId[0];
      var secretKey = speakeasy.generate_key({length: 16, google_auth_qr: true});
      user.two_factor_auth_secret_base32 = secretKey.base32;
      delete user.password;
      users.update(user, function(error, result) {
        if (!error) {

          result = publicRecordFields.handle(result, 'user');

          AuditLogger.store({
            account_id       : account_id,
            activity_type    : 'modify',
            activity_target  : 'user',
            target_id        : result.user_id,
            target_name      : result.email,
            target_object    : result,
            operation_status : 'success'
          }, request);

          renderJSON(request, reply, error, secretKey);
        } else {
          return reply(boom.badImplementation('Failed to update user details for ID ' + user_id));
        }
      });
    } else {
      return reply(boom.badImplementation('Failed to retrieve user details for ID ' + user_id));
    }
  });
};

exports.enable2fa = function (request, reply) {
  var oneTimePassword = request.payload.oneTimePassword;
  var user_id = request.auth.credentials.user_id;
  users.get({
    _id: user_id
  }, function(error, user) {
    if (user) {
      var account_id = user.companyId[0];
      if (user.two_factor_auth_secret_base32) {
        var generatedOneTimePassword = speakeasy.time({key: user.two_factor_auth_secret_base32, encoding: 'base32'});
        if (generatedOneTimePassword === oneTimePassword) {
          user.two_factor_auth_enabled = true;
          delete user.password;
          users.update(user, function(error, result) {
            if (!error) {
              var statusResponse = {
                statusCode: 200,
                message: 'Successfully enabled two factor authentication'
              };

              result = publicRecordFields.handle(result, 'user');

              AuditLogger.store({
                account_id       : account_id,
                activity_type    : 'modify',
                activity_target  : 'user',
                target_id        : user.user_id,
                target_name      : result.email,
                target_object    : result,
                operation_status : 'success'
              }, request);

              renderJSON(request, reply, error, statusResponse);
            } else {
              return reply(boom.badImplementation('Failed to update user details for ID ' + user_id));
            }
          });
        } else {
          return reply(boom.badRequest('The supplied one time password is incorrect'));
        }
      } else {
        return reply(boom.badRequest('Must call init first'));
      }
    } else {
      return reply(boom.badImplementation('Failed to retrieve user details for ID ' + user_id));
    }
  });
};

exports.disable2fa = function (request, reply) {
  var password = request.payload.password;
  var user_id = request.params.user_id ? request.params.user_id : request.auth.credentials.user_id;

  users.get({
    _id: user_id
  }, function(error, user) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve user details for ID ' + user_id));
    }

    // console.log('user = ', JSON.stringify(user));

    if (!user || !utils.checkUserAccessPermissionToUser(request, user)) {
      return reply(boom.badRequest('User ID not found'));
    }

    var account_id = user.companyId[0];
    user.two_factor_auth_enabled = false;
    delete user.password;
    users.update(user, function(error, result) {
      if (!error) {
        var statusResponse = {
          statusCode: 200,
          message: 'Successfully disabled two factor authentication'
        };

        result = publicRecordFields.handle(result, 'user');

        AuditLogger.store({
          account_id       : account_id,
          activity_type    : 'modify',
          activity_target  : 'user',
          target_id        : user.user_id,
          target_name      : result.email,
          target_object    : result,
          operation_status : 'success'
        }, request);

        renderJSON(request, reply, error, statusResponse);
      } else {
        return reply(boom.badImplementation('Failed to update user details for ID ' + user_id));
      }
    });
  });
};
