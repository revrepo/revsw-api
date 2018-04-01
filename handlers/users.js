/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var async = require('async');
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
var DomainConfig = require('../models/DomainConfig');

var users = Promise.promisifyAll(new User(mongoose, mongoConnection.getConnectionPortal()));
var accounts = Promise.promisifyAll(new Account(mongoose, mongoConnection.getConnectionPortal()));
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());

var usersService = require('../services/users.js');
var emailService = require('../services/email');

var permissionCheck = require('./../lib/requestPermissionScope');

/**
 * @name getUsers
 * @description method get all users
 */
exports.getUsers = function getUsers(request, reply) {
  var filters_ = request.query.filters;
  var accountIds = utils.getAccountID(request);
  var usersAccountId = utils.getAccountID(request);
  if (request.auth.credentials.role === 'reseller') {
    if(permissionCheck.getResellerAccs()) {
      accountIds = _.map(permissionCheck.getResellerAccs(), function (list) {
        return list.id;
      });
      accountIds.push(utils.getAccountID(request)[0]);
    }
  }
  var options = {};
  if (!!filters_ && filters_.account_id) {
    if (!permissionCheck.checkPermissionsToResource(request, {id: filters_.account_id}, 'accounts')) {
      return reply(boom.badRequest('Account ID not found'));
    }
    usersAccountId = filters_.account_id;
    options.account_id = filters_.account_id;
  } else {
    // NOTE: set limit accounts if user is not RevAdmin
    if (!utils.isUserRevAdmin(request)) {
      options.account_id = usersAccountId;
    }
  }

  if (!!filters_ && filters_.group_id) {
    options.group_id = filters_.group_id;
  }

  users.list(options, function (error, listOfUsers) {
    if (error || !listOfUsers) {
      return reply(boom.badImplementation('Failed to get a list of users'));
    }

    if (listOfUsers.length === 0 && !filters_) {
      return reply(boom.badImplementation('Failed to get a list of users (there should be at least one user in the list)'));
    }
    listOfUsers = _.filter(listOfUsers, function (itemUser) {
      if (!permissionCheck.checkPermissionsToResource(request, itemUser, 'users')) {
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
  if (newUser.companyId) {
  newUser.account_id = newUser.account_id || newUser.companyId[0];
  }
  // NOTE: New User must have "companyId"
  if (!newUser.account_id) {
    return reply(boom.badRequest('You have to specify companyId if your user does not have a valid companyId attribute (relevant for users with revadmin role)'));
  }
  // NOTE: Who is creating new User must have access to the user after creation
  if (!permissionCheck.checkPermissionsToResource(request, newUser, 'users')) {
    // TODO: fix the error message text "You don't have permissions for this action "
    return reply(boom.badRequest('Your user does not manage the specified company ID(s)'));
  }

  var accountId = newUser.account_id;
  // check that the email address is not already in use
  users.get({
    email: newUser.email
  }, function (error, result) {
    // got results so the email is in use
    if (result) {
      return reply(boom.badRequest('The email address is already used by another user'));  // TODO: fix the error message text
    } else {
      var statusResponse;
      var resultUserData;
      async.waterfall([
        // NOTE: check for domain names
        function validateManagedDomainName(cb) {
          if (!_.isArray(newUser.domain) || (newUser.domain.length === 0)) {
            return cb();
          }
          var condition = {
            // 'proxy_config.domain_name': {$in:newUser.domain}, //TODO: ?? use this and why it empty ??
            'domain_name': { $in: newUser.domain },
            deleted: { $ne: true }
          };
          domainConfigs.query(condition, function (err, listDomainConfigs) {
            if (err) {
              return cb(err);
            }
            var isNotAvailableDomain = _.find(listDomainConfigs, function (item) {
              return !_.includes(newUser.account_id, item.proxy_config.account_id);
            });
            if (!!isNotAvailableDomain) {
              return cb('Can`t manage domain name another account');
            }
            cb();
          });
        },
        function (cb) {
          usersService.createUser(newUser, function (error, result) {
            if (error) {
              return cb(error);
            }
            resultUserData = publicRecordFields.handle(result, 'user');
            cb();
          });
        },
        function (cb) {
          // TODO: add activity log to all accounts (not only newUser.companyId[0])
          AuditLogger.store({
            account_id: accountId,
            activity_type: 'add',
            activity_target: 'user',
            target_id: resultUserData.user_id,
            target_name: resultUserData.email,
            target_object: resultUserData,
            operation_status: 'success'
          }, request);
          cb();
        },
        function (cb) {
          if (!!resultUserData) {
            statusResponse = {
              statusCode: 200,
              message: 'Successfully created new user',
              object_id: resultUserData.user_id
            };
          }
          cb(null, statusResponse);
        }
      ], function (error, statusResponse) {
        renderJSON(request, reply, error, statusResponse);
      });
      // TODO: delete old implementation
      // call operation create user and apply another operations
      // usersService.createUser(newUser, function (error, result) {
      //   // var statusResponse;
      //   // if (result) {
      //   //   statusResponse = {
      //   //     statusCode: 200,
      //   //     message: 'Successfully created new user',
      //   //     object_id: result.user_id
      //   //   };
      //   // }

      //   // result = publicRecordFields.handle(result, 'user');
      //   // // TODO: add activity log to all accounts (not only newUser.companyId[0])
      //   // AuditLogger.store({
      //   //   account_id: accountId,
      //   //   activity_type: 'add',
      //   //   activity_target: 'user',
      //   //   target_id: result.user_id,
      //   //   target_name: result.email,
      //   //   target_object: result,
      //   //   operation_status: 'success'
      //   // }, request);
      //   // renderJSON(request, reply, error, statusResponse);
      // });
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
    if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'users')) {
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
  var updateUserData = request.payload;
  var userAccountId;
  var userId;
  // NOTE: controll users Additional Accounts To Manage
  if (!!updateUserData.companyId && (updateUserData.role === 'user' || updateUserData.role === 'admin') &&
    ((_.isArray(updateUserData.companyId) && updateUserData.companyId.length > 1) ||
      ((_.isString(updateUserData.companyId) && updateUserData.companyId.split(',').length > 1)))) {
    return reply(boom.badRequest('User with role "' + updateUserData.role + '" cannot manage other accounts'));
  }
  var statusResponse;
  var storedUserData;
  var resultUserData;

  async.waterfall([
    function validateManagedDomainName(cb) {
      if (!_.isArray(updateUserData.domain) || (updateUserData.domain.length === 0)) {
        return cb();
      }
      var condition = {
        // 'proxy_config.domain_name': {$in:updateUserData.domain}, //TODO: ?? use this and why it empty ??
        'domain_name': { $in: updateUserData.domain },
        deleted: { $ne: true }
      };
      domainConfigs.query(condition, function (err, listDomainConfigs) {
        if (err) {
          return cb(err);
        }
        var isNotAvailableDomain = _.find(listDomainConfigs, function (item) {
          return !_.includes(updateUserData.companyId, item.proxy_config.account_id);
        });
        if (!!isNotAvailableDomain) {
          return cb('Can`t manage domain name another account');
        }
        cb();
      });
    },
    function (cb) {
      if (Object.keys(updateUserData).length === 0) {
        return cb('No attributes specified');
      }

      if (updateUserData.role && updateUserData.role === 'reseller' && (request.auth.credentials.role !== 'revadmin' &&
        request.auth.credentials.role !== 'reseller')) {
        return cb('Only revadmin or reseller roles can assign "reseller" role');
      }

      userId = request.params.user_id;
      updateUserData.user_id = userId;
      if (updateUserData.permissions && updateUserData.permissions.domains.access) {
        updateUserData.permissions.waf_rules = true;
        updateUserData.permissions.ssl_certs = true;
      }

      if (request.auth.credentials.role !== 'revadmin' && !utils.getAccountID(request).toString().includes(updateUserData.account_id)) {
        return cb('The new account is not found');
      }

      // TODO use an existing access verification function instead of the code
      // if (request.auth.credentials.role !== 'revadmin' &&
      //   (updateUserData.companyId &&
      //     !utils.isArray1IncludedInArray2(updateUserData.companyId, utils.getAccountID(request)))) {
      //   return cb('The new account is not found');
      // }
      // TODO: try new code
      // if(updateUserData.companyId && !utils.checkUserAccessPermissionToUser(request, updateUserData)) {
      //   return cb('The new account is not found');
      // }
      cb();
    },
    function (cb) {
      users.get({ _id: userId }, function (error, result) {
        if (error) {
          return cb(error);
        }
        storedUserData = publicRecordFields.handle(result, 'user');
        if (!storedUserData || !permissionCheck.checkPermissionsToResource(request, result, 'users')) {
          return cb('User not found');
        }
        cb();
      });
    },
    function (cb) {
      userAccountId = storedUserData.companyId[0];

      if (updateUserData.role && updateUserData.role === 'user') {
        if (storedUserData.role === 'admin') {
          users.get({
            _id: { $ne: storedUserData.user_id },
            companyId: new RegExp(userAccountId, 'i'),
            role: storedUserData.role
          }, function (err, user) {
            if (err) {
              return cb(Error('Cannot change role if you are the only one admin for the account'));
            }
            if (!user) {
              return cb('Cannot change role if you are the only one admin for the account');
            } else {
              return cb();
            }
          });
        } else if (storedUserData.role === 'reseller') {
          users.get({
            _id: { $ne: storedUserData.user_id },
            companyId: new RegExp(storedUserData.companyId.join('.*,'), 'ig'),
            role: storedUserData.role
          }, function (error, user) {
            if (error) {
              return cb(Error('Cannot change role if you are the only one reseller for the accounts'));
            }
            if (!user) {
              return cb('Cannot change role if you are the only one reseller for the accounts');
            } else {
              return cb();
            }
          });
        } else {
          cb();
        }
      } else {
        // NOTE: updateUserData.role !== 'user'
        cb();
      }
    },
    function (cb) {
      users.update(updateUserData, function (err, result) {
        if (err) {
          return cb(err);
        }
        resultUserData = publicRecordFields.handle(result, 'user');
        cb();
      });
    },
    function (cb) {
      // TODO: add activity log to all accounts (not only updateUserData.companyId[0])
      AuditLogger.store({
        account_id: userAccountId,
        activity_type: 'modify',
        activity_target: 'user',
        target_id: resultUserData.user_id,
        target_name: resultUserData.email,
        target_object: resultUserData,
        operation_status: 'success'
      }, request);

      cb();
    },
    function (cb) {
      if (!!resultUserData) {
        statusResponse = {
          statusCode: 200,
          message: 'Successfully updated the user'
        };
      }
      cb(null, statusResponse);
    }
  ], function (error, statusResponse) {
    renderJSON(request, reply, error, statusResponse);
  });
};


// TODO: delet old implementation
// exports.updateUserOld = function (request, reply) {
//   var newUser = request.payload;
//   var userAccountId;
//   var userId;
//   // NOTE: controll users Additional Accounts To Manage
//   if(!!newUser.companyId && (newUser.role === 'user' || newUser.role === 'admin')  &&
//     ((_.isArray(newUser.companyId) && newUser.companyId.length>1)||
//      ((_.isString(newUser.companyId) && newUser.companyId.split(',').length>1) ))){
//     return reply(boom.badRequest('User with role "'+newUser.role+'" cannot manage other accounts'));
//   }

//   return  Promise.try(function (resolve, reject) {
//     if (Object.keys(newUser).length === 0) {
//       return Promise.reject(Error('No attributes specified'));
//     }

//     if (newUser.role && newUser.role === 'reseller' && (request.auth.credentials.role !== 'revadmin' &&
//       request.auth.credentials.role !== 'reseller')) {
//       return Promise.reject(Error('Only revadmin or reseller roles can assign "reseller" role'));
//     }

//     userId = request.params.user_id;
//     newUser.user_id = userId;

//     // TODO use an existing access verification function instead of the code
//     if (request.auth.credentials.role !== 'revadmin' &&
//       (newUser.companyId &&
//         !utils.isArray1IncludedInArray2(newUser.companyId, utils.getAccountID(request)))) {
//       return Promise.reject(Error('The new account is not found'));
//     }
//     // TODO: try new code
//     // if(newUser.companyId && !utils.checkUserAccessPermissionToUser(request, newUser)) {
//     //   return Promise.reject(Error('The new account is not found'));
//     // }

//     return users.getAsync({_id: userId});
//   })
//     .then(function (result) {
//       if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'users')) {
//         return Promise.reject(Error('User not found'));
//       }

//       userAccountId = result.companyId[0];

//       if (newUser.role && newUser.role === 'user') {
//         if (result.role === 'admin') {
//           return Promise.try(function (resolve, reject) {
//             return users.getAsync({
//               _id: { $ne: result.user_id },
//               companyId: new RegExp(userAccountId, 'i'),
//               role: result.role
//             });
//           })
//             .then(function (user) {
//               if (!user) {
//                 return Promise.reject(Error('Cannot change role if you are the only one admin for the account'));
//               } else {
//                 return users.updateAsync(newUser);
//               }
//             })
//             .catch(function (error) {
//               return Promise.reject(Error('Cannot change role if you are the only one admin for the account'));
//             });
//         } else if (result.role === 'reseller') {
//           return Promise.try(function (resolve, reject) {
//             return users.getAsync({
//               _id: { $ne: result.user_id },
//               companyId: new RegExp(result.companyId.join('.*,'), 'ig'),
//               role: result.role
//             });
//           })
//             .then(function (user) {
//               if (!user) {
//                 return Promise.reject(Error('Cannot change role if you are the only one reseller for the accounts'));
//               } else {
//                 return users.updateAsync(newUser);
//               }
//             })
//             .catch(function (error) {
//               return Promise.reject(Error('Cannot change role if you are the only one reseller for the accounts'));
//             });
//         } else {
//           return users.updateAsync(newUser);
//         }
//       } else {
//         return users.updateAsync(newUser);
//       }
//     })
//     .then(function (result) {
//       console.log(result);
//       var statusResponse = {
//         statusCode: 200,
//         message: 'Successfully updated the user'
//       };

//       result = publicRecordFields.handle(result, 'user');

//       AuditLogger.store({
//         account_id: userAccountId,
//         activity_type: 'modify',
//         activity_target: 'user',
//         target_id: result.user_id,
//         target_name: result.email,
//         target_object: result,
//         operation_status: 'success'
//       }, request);

//       return renderJSON(request, reply, null, statusResponse);
//     })
//     .catch(function (error) {
//       if (/No attributes specified/.test(error.message)) {
//         return reply(boom.badRequest('Please specify at least one update attribute'));
//       } else if (/Only revadmin or reseller roles can assign "reseller" role/.test(error.message)) {
//         return reply(boom.badRequest('Only revadmin or reseller roles can assign "reseller" role'));
//       } else if (/The new account is not found/.test(error.message)) {
//         return reply(boom.badRequest('The new account is not found'));
//       } else if (/User not found/.test(error.message)) {
//         return reply(boom.badRequest('User not found'));
//       } else if (/Cannot change role if you are the only one admin/.test(error.message)) {
//         return reply(boom.badRequest('Cannot change role if you are the only one admin for the account'));
//       } else if (/Cannot change role if you are the only one reseller/.test(error.message)) {
//         return reply(boom.badRequest('Cannot change role if you are the only one reseller for the accounts'));
//       } else {
//         return reply(boom.badImplementation(error.message));
//       }
//     });
// };

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
    if (!result || !permissionCheck.checkPermissionsToResource(request, result, 'users')) {
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
      var secretKey = speakeasy.generate_key({ length: 16, google_auth_qr: true, name: name });
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
        var generatedOneTimePassword = speakeasy.time({ key: user.two_factor_auth_secret_base32, encoding: 'base32' });
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

    if (!user || !permissionCheck.checkPermissionsToResource(request, user, 'users')) {
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

/**
 * @name resendInvitation
 * @description Updates the password for a newly created user with the password he chose
 * and removes the invitation token, finishing the invitation process.
 */
exports.completeInvitation = function (request, reply) {
  var newPassword = request.payload.password;
  var user_id = request.params.user_id;
  var inviteToken = request.payload.invitation_token;

  users.get({
    _id: user_id
  }, function (error, user) {
    if (user) {
      if (user.invitation_token !== null && user.invitation_token === inviteToken) {
        // Ok the token is aight..
        if (user.invitation_expire_at !== null && Date.parse(user.invitation_expire_at) < Date.now()) {
          // The expire date is also aight..
          user.password = newPassword;
          user.invitation_token = null;
          user.invitation_expire_at = null;
          // remove all invitation stuff and set new password.
          var account_id = user.companyId[0] || null;
          users.update(user, function (error, result) {
            if (!error) {
              var statusResponse;
              statusResponse = {
                statusCode: 200,
                message: 'Successfully set the password'
              };

              renderJSON(request, reply, error, statusResponse);
            } else {
              return reply(boom.badImplementation('Failed to update user details for ID ' + user_id));
            }
          });
        } else {
          return reply(boom.badRequest('Invitation token has expired'));
        }
      } else {
        return reply(boom.badRequest('Bad invitation token'));
      }
    } else {
      return reply(boom.badImplementation('Failed to retrieve user details for ID ' + user_id));
    }
  });
};

/**
 * @name resendInvitation
 * @description Resends an invitation to a user, generates a new invitation token and
 * resets the expire date.
 */
exports.resendInvitation = function (request, reply) {
  var user_id = request.params.user_id;
  users.get({
    _id: user_id
  }, function (error, user) {
    if (user) {
      if (user.invitation_token !== null) {
        user.invitation_token = utils.generateToken(24);
        user.invitation_expire_at = Date.now() + config.get('user_invitation_expire_ms');
        user.invitation_sent_at = Date.now();
        var account_id = user.companyId[0] || null;
        users.update(user, function (error, result) {
          if (!error) {
            // get the account so we can get the vendor
            accounts.get({ id: account_id }, function (err, acc) {
              var statusResponse;
              if (!err) {                
                statusResponse = {
                  statusCode: 200,
                  message: 'Successfully resent the invitation'
                };
              } else {
                statusResponse = {
                  statusCode: 400,
                  message: 'Could not get account vendor'
                };
              }
              // set up an email with the new token and expiry date.
              var mailOptions = {
                userFullName: user.firstname + ' ' + user.lastname,
                userEmail: user.email,
                invitationToken: user.invitation_token,
                invitationExpireAt: user.invitation_expire_at,
                portalUrl: config.get('vendor_profiles')[acc ? acc.vendor_profile : 'revapm'].vendorUrl,
                userId: user.user_id,
                acc: acc
              };

              emailService.sendInvitationEmail(mailOptions, function (err, data) {
                if (err) {
                  throw new Error(err);
                }
                // invitation mail has been sent.    
                renderJSON(request, reply, error, statusResponse);
              });
            });
          } else {
            return reply(boom.badImplementation('Failed to update user details for ID ' + user_id));
          }
        });
      } else {
        return reply(boom.badRequest('User already completed the invitation process'));
      }
    } else {
      return reply(boom.badImplementation('Failed to retrieve user details for ID ' + user_id));
    }
  });
};