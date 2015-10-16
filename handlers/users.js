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
var AuditLogger = require('revsw-audit');
var speakeasy   = require('speakeasy');

var utils           = require('../lib/utilities.js');
var renderJSON      = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');

var User = require('../models/User');

var users = new User(mongoose, mongoConnection.getConnectionPortal());

var privateUserProfileFields = [
  'password',
  'resetPasswordToken',
  'resetPasswordExpires',
  'two_factor_auth_secret_base32'
];

function removePrivateFields(obj) {
  for (var i in privateUserProfileFields) {
    if (obj[privateUserProfileFields[i]]) {
      delete obj[privateUserProfileFields[i]];
    }
  }
  return obj;
};

exports.getUsers = function getUsers(request, reply) {
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

        newUser = removePrivateFields(newUser);

        AuditLogger.store({
          ip_adress        : request.info.remoteAddress,
          datetime         : Date.now(),
          user_id          : request.auth.credentials.user_id,
          user_name        : request.auth.credentials.email,
          user_type        : 'user',
          account_id       : request.auth.credentials.companyId,
          domain_id        : request.auth.credentials.domain,
          activity_type    : 'add',
          activity_target  : 'user',
          target_id        : result.id,
          target_name      : result.email,
          target_object    : newUser,
          operation_status : 'success'
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
      return reply(boom.badImplementation('Failed to retrieve user details'));
    }
    if (result) {
      if (  request.auth.credentials.role !== 'reseller' && result.role === 'reseller' ) {
        return reply(boom.badRequest('User not found'));
      }

      if (result.companyId && utils.areOverlappingArrays(result.companyId, request.auth.credentials.companyId)) {

        result = removePrivateFields(result);
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
      result = removePrivateFields(result);
      renderJSON(request, reply, error, result);
    } else {
      return reply(boom.badRequest('User not found'));
    }
  });
};

exports.updateUser = function(request, reply) {
  var newUser = request.payload;
  if (Object.keys(newUser).length === 0) {
    return reply(boom.badRequest('Please specify at least one updated attiribute'));
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
      if (!utils.areOverlappingArrays(request.auth.credentials.companyId, result.companyId)) {
        return reply(boom.badRequest('User not found'));
      }
      if ( request.auth.credentials.role !== 'reseller' && result.role === 'reseller' ) {
        return reply(boom.badRequest('User not found'));
      }
      users.update(newUser, function(error, result) {
        if (!error) {
          var statusResponse;
          statusResponse = {
            statusCode: 200,
            message: 'Successfully updated the user'
          };

          newUser = removePrivateFields(newUser);

          AuditLogger.store({
            ip_adress        : request.info.remoteAddress,
            datetime         : Date.now(),
            user_id          : request.auth.credentials.user_id,
            user_name        : request.auth.credentials.email,
            user_type        : 'user',
            account_id       : request.auth.credentials.companyId,
            domain_id        : request.auth.credentials.domain,
            activity_type    : 'modify',
            activity_target  : 'user',
            target_id        : user_id,
            target_name      : result.email,
            target_object    : newUser,
            operation_status : 'success'
          });

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

          result = removePrivateFields(result);

          AuditLogger.store({
            ip_adress        : request.info.remoteAddress,
            datetime         : Date.now(),
            user_id          : request.auth.credentials.user_id,
            user_name        : request.auth.credentials.email,
            user_type        : 'user',
            account_id       : request.auth.credentials.companyId,
            domain_id        : request.auth.credentials.domain,
            activity_type    : 'modify',
            activity_target  : 'user',
            target_id        : user_id,
            target_name      : result.email,
            target_object    : result,
            operation_status : 'success'
          });

          renderJSON(request, reply, error, statusResponse);
        } else {
          return reply(boom.badImplementation('Failed to update user details'));
        }
      });
    } else {
      return reply(boom.badImplementation('Failed to retrieve user details'));
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
    if (result) {

      if (!utils.areOverlappingArrays(request.auth.credentials.companyId, result.companyId)) {
        return reply(boom.badRequest('User not found'));
      }

      result = removePrivateFields(result);

      var auditRecord = {
            ip_adress        : request.info.remoteAddress,
            datetime         : Date.now(),
            user_id          : request.auth.credentials.user_id,
            user_name        : request.auth.credentials.email,
            user_type        : 'user',
            account_id       : request.auth.credentials.companyId,
            domain_id        : request.auth.credentials.domain,
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
          return reply(boom.badRequest('User not found'));
        }
      });
    } else {
      return reply(boom.badRequest('User not found'));
    }
  });
};

exports.init2fa = function (request, reply) {
  var user_id = request.auth.credentials.user_id;
  users.get({
    _id: user_id
  }, function(error, user) {
    if (user) {
      var secretKey = speakeasy.generate_key({length: 16, google_auth_qr: true});
      user.two_factor_auth_secret_base32 = secretKey.base32;
      delete user.password;
      users.update(user, function(error, result) {
        if (!error) {

          result = removePrivateFields(result);

          AuditLogger.store({
            ip_adress        : request.info.remoteAddress,
            datetime         : Date.now(),
            user_id          : request.auth.credentials.user_id,
            user_name        : request.auth.credentials.email,
            user_type        : 'user',
            account_id       : request.auth.credentials.companyId,
            domain_id        : request.auth.credentials.domain,
            activity_type    : 'modify',
            activity_target  : 'user',
            target_id        : user_id,
            target_name      : result.email,
            target_object    : result,
            operation_status : 'success'
          });

          renderJSON(request, reply, error, secretKey);
        } else {
          return reply(boom.badImplementation('Failed to update user details'));
        }
      });
    } else {
      return reply(boom.badImplementation('Failed to retrieve user details'));
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

              result = removePrivateFields(result);

              AuditLogger.store({
                ip_adress        : request.info.remoteAddress,
                datetime         : Date.now(),
                user_id          : request.auth.credentials.user_id,
                user_name        : request.auth.credentials.email,
                user_type        : 'user',
                account_id       : request.auth.credentials.companyId,
                domain_id        : request.auth.credentials.domain,
                activity_type    : 'modify',
                activity_target  : 'user',
                target_id        : user_id,
                target_name      : result.email,
                target_object    : result,
                operation_status : 'success'
              });

              renderJSON(request, reply, error, statusResponse);
            } else {
              return reply(boom.badImplementation('Failed to update user details'));
            }
          });
        } else {
          return reply(boom.badImplementation('The supplied one time password is incorrect'));
        }
      } else {
        return reply(boom.badImplementation('Must call init first'));
      }
    } else {
      return reply(boom.badImplementation('Failed to retrieve user details'));
    }
  });
};

exports.disable2fa = function (request, reply) {
  var password = request.payload.password;
  if (request.params.user_id) {
    var user_id = request.params.user_id;
    if ((user_id !== request.auth.credentials.user_id) && (request.auth.credentials.role !== 'admin')) {
      return reply(boom.badRequest('User not found'));
    }
  } else {
    user_id = request.auth.credentials.user_id;
  }
  users.get({
    _id: user_id
  }, function(error, user) {
    if (user) {
      if (user.companyId && utils.areOverlappingArrays(user.companyId, request.auth.credentials.companyId)) {
        user.two_factor_auth_enabled = false;
        users.update(user, function(error, result) {
          if (!error) {
            var statusResponse = {
              statusCode: 200,
              message: 'Successfully disabled two factor authentication'
            };

            result = removePrivateFields(result);

            AuditLogger.store({
              ip_adress        : request.info.remoteAddress,
              datetime         : Date.now(),
              user_id          : request.auth.credentials.user_id,
              user_name        : request.auth.credentials.email,
              user_type        : request.auth.credentials.role,
              account_id       : request.auth.credentials.companyId,
              domain_id        : request.auth.credentials.domain,
              activity_type    : 'modify',
              activity_target  : 'user',
              target_id        : user_id,
              target_name      : result.email,
              target_object    : result,
              operation_status : 'success'
            });

            renderJSON(request, reply, error, statusResponse);
          } else {
            return reply(boom.badImplementation('Failed to update user details'));
          }
        });
      } else {
        return reply(boom.badImplementation('User not found'));
      }
    } else {
      return reply(boom.badImplementation('Failed to retrieve user details'));
    }
  });
};
