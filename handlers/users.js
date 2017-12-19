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

var boom = require('boom');
var _ = require('lodash');
var mongoose = require('mongoose');
var AuditLogger = require('../lib/audit');
var speakeasy = require('speakeasy');
var config = require('config');
var Promise = require('bluebird');

var utils = require('../lib/utilities.js');
var dashboardService = require('../services/dashboards.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var logger = require('revsw-logger')(config.log_config);

var User = require('../models/User');
var Account = require('../models/Account');

var users = Promise.promisifyAll(new User(mongoose, mongoConnection.getConnectionPortal()));
var accounts = Promise.promisifyAll(new Account(mongoose, mongoConnection.getConnectionPortal()));

var usersService = require('../services/users.js');
/**
 * @name getUsers
 * @description method get all users
 */
exports.getUsers = function getUsers(request, reply) {
  var filters_ = request.query.filters;
  var accountIds = utils.getAccountID(request);
  var usersAccountId = utils.getAccountID(request);
  var options = {};
  if(!!filters_ && filters_.account_id){
    if(!utils.checkUserAccessPermissionToAccount(request, filters_.account_id)) {
      return reply(boom.badRequest('Account ID not found'));
    }
    usersAccountId = filters_.account_id;
    options.account_id = filters_.account_id;
  } else {
    // NOTE: set limit accounts if user is not RevAdmin
    if(!utils.isUserRevAdmin(request)){
      options.account_id = accountIds;
    }
  }

  users.list(options, function (error, listOfUsers) {
    if (error || !listOfUsers) {
      return reply(boom.badImplementation('Failed to get a list of users'));
    }

    if (listOfUsers.length === 0 && !filters_) {
      return reply(boom.badImplementation('Failed to get a list of users (there should be at least one user in the list)'));
    }
    listOfUsers = _.filter( listOfUsers, function(itemUser){
      if(!utils.checkUserAccessPermissionToUser(request, itemUser)) {
        return false;
      }
      return true;
    });
    listOfUsers = publicRecordFields.handle(listOfUsers, 'users');

    renderJSON(request, reply, error, listOfUsers);
  });
};
/**
 * @createUser
 * @description
 *   Create new User
 *
 * @param  {[type]} request [description]
 * @param  {[type]} reply   [description]
 * @return {[type]}         [description]
 */
exports.createUser = function (request, reply) {
  var newUser = request.payload;
  // NOTE: set default companyId
  if ((newUser.companyId === undefined || newUser.companyId.length === 0) && utils.getAccountID(request).length !== 0) {
    newUser.companyId = utils.getAccountID(request);
  }

  // NOTE: New User must have "companyId"
  if (newUser.companyId === undefined || newUser.companyId.length === 0) {
    return reply(boom.badRequest('You have to specify companyId if your user does not have a valid companyId attribute (relevant for users with revadmin role)'));
  }
  // NOTE: Who is creating new User must have access to the user after creation
  if (!utils.checkUserAccessPermissionToUser(request, newUser)) {
    // TODO: fix the error message text "You don't have permissions for this action "
    return reply(boom.badRequest('Your user does not manage the specified company ID(s)'));
  }

  var accountId = newUser.companyId[0];

  // TODO: Add a check for domains
 if(newUser.role === 'user'  &&  newUser.domain.length>1){
  return reply(boom.badRequest('User with this role cannot manage many domains'));
 }
  // check that the email address is not already in use
  users.get({
    email: newUser.email
  }, function (error, result) {
    // got results so the email is in use
    if (result) {
      return reply(boom.badRequest('The email address is already used by another user'));  // TODO: fix the error message text
    } else {
      // call operation create user and apply another operations
      usersService.createUser(newUser, function (error, result) {
        var statusResponse;
        if (result) {
          statusResponse = {
            statusCode: 200,
            message: 'Successfully created new user',
            object_id: result.user_id
          };
        }

        result = publicRecordFields.handle(result, 'user');
        // TODO: add activity log to all accounts (not only newUser.companyId[0])
        AuditLogger.store({
          account_id: accountId,
          activity_type: 'add',
          activity_target: 'user',
          target_id: result.user_id,
          target_name: result.email,
          target_object: result,
          operation_status: 'success'
        }, request);
        renderJSON(request, reply, error, statusResponse);
      });
    }
  });
};

exports.getUser = function (request, reply) {

  var user_id = request.params.user_id;
  users.get({
    _id: user_id
  }, function (error, result) {
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

exports.getMyUser = function (request, reply) {

  if (request.auth.credentials.user_type === 'user') {
    var user_id = request.auth.credentials.user_id;
    users.get({
      _id: user_id
    }, function (error, result) {
      if (error) {
        return reply(boom.badImplementation('Failed to retrieve details for user ID ' + user_id));
      }
      if (result) {
        result = publicRecordFields.handle(result, 'user');
        result.vendor = request.auth.credentials.vendor_profile;

        renderJSON(request, reply, error, result);
      } else {
        return reply(boom.badRequest('User ID not found'));
      }
    });
  } else {
    return reply(boom.badRequest('Non-User authorization'));
  }
};

exports.updateUser = function (request, reply) {
  var newUser = request.payload;
  var userAccountId;
  var userId;

  if(newUser.role === 'user'  &&  newUser.domain.length>1){
    return reply(boom.badRequest('User with this role cannot manage many domains'));
  }

  return Promise.try(function (resolve, reject) {
    if (Object.keys(newUser).length === 0) {
      return Promise.reject(Error('No attributes specified'));
    }

    if (newUser.role && newUser.role === 'reseller' && (request.auth.credentials.role !== 'revadmin' &&
      request.auth.credentials.role !== 'reseller')) {
      return Promise.reject(Error('Only revadmin or reseller roles can assign "reseller" role'));
    }

    userId = request.params.user_id;
    newUser.user_id = userId;

    // TODO use an existing access verification function instead of the code
    if (request.auth.credentials.role !== 'revadmin' &&
      (newUser.companyId &&
        !utils.isArray1IncludedInArray2(newUser.companyId, utils.getAccountID(request)))) {
      return Promise.reject(Error('The new account is not found'));
    }
    // TODO: try new code
    // if(newUser.companyId && !utils.checkUserAccessPermissionToUser(request, newUser)) {
    //   return Promise.reject(Error('The new account is not found'));
    // }

    return users.getAsync({_id: userId});
  })
    .then(function (result) {
      if (!result || !utils.checkUserAccessPermissionToUser(request, result)) {
        return Promise.reject(Error('User not found'));
      }

      userAccountId = result.companyId[0];

      if (newUser.role && newUser.role === 'user') {
        if (result.role === 'admin') {
          return Promise.try(function (resolve, reject) {
            return users.getAsync({
              _id: { $ne: result.user_id },
              companyId: new RegExp(userAccountId, 'i'),
              role: result.role
            });
          })
            .then(function (user) {
              if (!user) {
                return Promise.reject(Error('Cannot change role if you are the only one admin for the account'));
              } else {
                return users.updateAsync(newUser);
              }
            })
            .catch(function (error) {
              return Promise.reject(Error('Cannot change role if you are the only one admin for the account'));
            });
        } else if (result.role === 'reseller') {
          return Promise.try(function (resolve, reject) {
            return users.getAsync({
              _id: { $ne: result.user_id },
              companyId: new RegExp(result.companyId.join('.*,'), 'ig'),
              role: result.role
            });
          })
            .then(function (user) {
              if (!user) {
                return Promise.reject(Error('Cannot change role if you are the only one reseller for the accounts'));
              } else {
                return users.updateAsync(newUser);
              }
            })
            .catch(function (error) {
              return Promise.reject(Error('Cannot change role if you are the only one reseller for the accounts'));
            });
        } else {
          return users.updateAsync(newUser);
        }
      } else {
        return users.updateAsync(newUser);
      }
    })
    .then(function (result) {
      console.log(result);
      var statusResponse = {
        statusCode: 200,
        message: 'Successfully updated the user'
      };

      result = publicRecordFields.handle(result, 'user');

      AuditLogger.store({
        account_id: userAccountId,
        activity_type: 'modify',
        activity_target: 'user',
        target_id: result.user_id,
        target_name: result.email,
        target_object: result,
        operation_status: 'success'
      }, request);

      return renderJSON(request, reply, null, statusResponse);
    })
    .catch(function (error) {
      if (/No attributes specified/.test(error.message)) {
        return reply(boom.badRequest('Please specify at least one update attribute'));
      } else if (/Only revadmin or reseller roles can assign "reseller" role/.test(error.message)) {
        return reply(boom.badRequest('Only revadmin or reseller roles can assign "reseller" role'));
      } else if (/The new account is not found/.test(error.message)) {
        return reply(boom.badRequest('The new account is not found'));
      } else if (/User not found/.test(error.message)) {
        return reply(boom.badRequest('User not found'));
      } else if (/Cannot change role if you are the only one admin/.test(error.message)) {
        return reply(boom.badRequest('Cannot change role if you are the only one admin for the account'));
      } else if (/Cannot change role if you are the only one reseller/.test(error.message)) {
        return reply(boom.badRequest('Cannot change role if you are the only one reseller for the accounts'));
      } else {
        return reply(boom.badImplementation(error.message));
      }
    });
};

exports.updateUserPassword = function (request, reply) {
  var currentPassword = request.payload.current_password;
  var newPassword = request.payload.new_password;
  var user_id = request.params.user_id;
  if (user_id !== request.auth.credentials.user_id) {
    return reply(boom.badRequest('Cannot update the password of another user'));
  }
  users.get({
    _id: user_id
  }, function (error, user) {
    if (user) {
      var account_id = user.companyId[0];
      var currPassHash = utils.getHash(currentPassword);
      if (currPassHash !== user.password) {
        return reply(boom.badRequest('The current user password is not correct'));
      }
      if (currentPassword === newPassword) {
        return reply(boom.badRequest('Cannot set the same password'));
      }
      user.password = newPassword;
      users.update(user, function (error, result) {
        if (!error) {
          var statusResponse;
          statusResponse = {
            statusCode: 200,
            message: 'Successfully updated the password'
          };

          result = publicRecordFields.handle(result, 'user');

          AuditLogger.store({
            account_id: account_id,
            activity_type: 'modify',
            activity_target: 'user',
            target_id: result.user_id,
            target_name: result.email,
            target_object: result,
            operation_status: 'success'
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

exports.deleteUser = function (request, reply) {
  var user_id = request.params.user_id;

  if (user_id === request.auth.credentials.user_id) {
    return reply(boom.badRequest('You cannot delete your own account'));
  }

  users.get({
    _id: user_id
  }, function (error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrieve details for user ID ' + user_id));
    }
    if (!result || !utils.checkUserAccessPermissionToUser(request, result)) {
      return reply(boom.badRequest('User ID not found'));
    }
    var account_id = result.companyId[0];

    result = publicRecordFields.handle(result, 'user');

    var auditRecord = {
      ip_address: utils.getAPIUserRealIP(request),
      datetime: Date.now(),
      user_id: request.auth.credentials.user_id,
      user_name: request.auth.credentials.email,
      user_type: 'user',
      account_id: account_id,
      activity_type: 'delete',
      activity_target: 'user',
      target_id: result.user_id,
      target_name: result.email,
      target_object: result,
      operation_status: 'success'
    };
    // call operation remove user and apply another operations
    usersService.removeUser(user_id, function (error, result) {
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
  var email_ = request.auth.credentials.email;
  var vendorProfiles = config.get('vendor_profiles');
  var currentVendor = vendorProfiles[request.auth.credentials.vendor_profile] || vendorProfiles[config.get('default_system_vendor_profile')];
  users.get({
    _id: user_id
  }, function (error, user) {
    if (user) {
      var account_id = user.companyId[0];
      var name = currentVendor.companyNameShort + ':' + email_;
      var secretKey = speakeasy.generate_key({length: 16, google_auth_qr: true, name: name});
      user.two_factor_auth_secret_base32 = secretKey.base32;
      delete user.password;
      users.update(user, function (error, result) {
        if (!error) {

          result = publicRecordFields.handle(result, 'user');

          AuditLogger.store({
            account_id: account_id,
            activity_type: 'init2fa',
            activity_target: 'user',
            target_id: result.user_id,
            target_name: result.email,
            target_object: result,
            operation_status: 'success'
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
  }, function (error, user) {
    if (user) {
      var account_id = user.companyId[0];
      if (user.two_factor_auth_secret_base32) {
        var generatedOneTimePassword = speakeasy.time({key: user.two_factor_auth_secret_base32, encoding: 'base32'});
        if (generatedOneTimePassword === oneTimePassword) {
          user.two_factor_auth_enabled = true;
          delete user.password;
          users.update(user, function (error, result) {
            if (!error) {
              var statusResponse = {
                statusCode: 200,
                message: 'Successfully enabled two factor authentication'
              };

              result = publicRecordFields.handle(result, 'user');

              AuditLogger.store({
                account_id: account_id,
                activity_type: 'enable2fa',
                activity_target: 'user',
                target_id: user.user_id,
                target_name: result.email,
                target_object: result,
                operation_status: 'success'
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
  }, function (error, user) {
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
    users.update(user, function (error, result) {
      if (!error) {
        var statusResponse = {
          statusCode: 200,
          message: 'Successfully disabled two factor authentication'
        };

        result = publicRecordFields.handle(result, 'user');

        AuditLogger.store({
          account_id: account_id,
          activity_type: 'disable2fa',
          activity_target: 'user',
          target_id: user.user_id,
          target_name: result.email,
          target_object: result,
          operation_status: 'success'
        }, request);

        renderJSON(request, reply, error, statusResponse);
      } else {
        return reply(boom.badImplementation('Failed to update user details for ID ' + user_id));
      }
    });
  });
};
