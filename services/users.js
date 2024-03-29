
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
// User Service
'use strict';

var _ = require('lodash');
var async = require('async');
var config = require('config');
var logger = require('revsw-logger')(config.log_config);
var sendgrid = require('sendgrid')(config.get('sendgrid_api_key'));
var crypto = require('crypto');
var mongoose = require('mongoose');
var utils = require('../lib/utilities.js');
var Promise = require('bluebird');

var mongoConnection = require('../lib/mongoConnections');

var User = require('../models/User');
var Account = require('../models/Account');

var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());

var dashboardService = require('./dashboards');
var statuspageService = require('./statuspage');
var vendorProfiles = config.get('vendor_profiles');
var emailService = require('./email');
var moment = require('moment');

/**
 * @name  createUser
 * @description
 *
 *  Create users
 *
 * @param  {Object} newUser - the user's data for registration
 * @param {Function}
 * @return {Promise}
 */

exports.createUser = function (newUser, callback) {
  var _createdUser_ = null;
  var isInvite = false;

  async.waterfall([
    //
    function checkExistUser(cb) {
      users.getValidation({
        email: newUser.email
      }, function (err, user_) {
        if (err) {
          return cb(err);
        }
        if (!!user_) {
          // User exist!!
          return cb({ user: user_ });
        }
        // NOTE: if new user is selt registred
        if (!!newUser.self_registered && newUser.self_registered === true) {
          var token = utils.generateToken();
          newUser.role = 'admin'; // NOTE: salf registred user can be only with Admin role
          // NOTE: only self registred user must to verify account
          newUser.validation = {
            expiredAt: Date.now() + config.get('user_verify_token_lifetime_ms'),
            token: token,
            verified: false
          };
        } else if (newUser.self_registered !== undefined && newUser.self_registered === false) {
          // user is being created by another user, we need to send an invite.          
          newUser.password = utils.getHash(crypto.randomBytes(512));
          var inviteToken = utils.generateToken(24);
          newUser.invitation_token = inviteToken;
          newUser.invitation_expire_at = Date.now() + config.get('user_invitation_expire_ms');
          isInvite = true;          
        }
        cb(null);
      });
    },
    function addNewUser(cb) {
      users.add(newUser, function (err, user) {
        if (err) {
          return cb(err);
        }
        _createdUser_ = user;
        cb(null);
      });
    },
    function defaultActionsForNewUser(cb) {
      // Check if an invitation mail is needed to be sent.
      if (isInvite && _createdUser_.invitation_token !== null && Date.now() < moment(_createdUser_.invitation_expire_at).valueOf()) {
        logger.info('UserService::createUser:info prepare to send invitation email for user with id ' + _createdUser_.user_id);
        accounts.get({_id: _createdUser_.account_id}, function (err, acc) {
          // Get the account vendor and set the URL based on that          
          var mailOptions = {
            userFullName: _createdUser_.firstname + ' ' + _createdUser_.lastname,
            userEmail: _createdUser_.email,
            invitationToken: _createdUser_.invitation_token,
            invitationExpireAt: _createdUser_.invitation_expire_at,
            portalUrl: config.get('vendor_profiles')[acc.vendor_profile].vendorUrl,
            userId: _createdUser_.user_id,
            acc: acc
          };
  
          emailService.sendInvitationEmail(mailOptions, function (err, data) {
            if (err) {
              throw new Error(err);
            }
            // invitation mail has been sent.            
          });
        });
      }

      // NOTE:
      // 1. Create default dashboard for new user
      dashboardService.createUserDashboard({ user_id: _createdUser_.user_id }, function (err) {
        if (err) {
          logger.error('UserService::createUser:error add default dashboard: ' + JSON.stringify(err));
        } else {
          logger.info('UserService::createUser:success add default dashboard for User with id ' + _createdUser_.user_id);
        }
      });
      // 2.  add new user account (self-registered or not) to RevAPM statuspage.io notification list
      if (config.get('register_new_users_for_network_status_updates') === 'yes') {
        // NOTE: not subscribe Azure users
        // NOTE: find profile with Azure 'user_email_domain'
        var userEmainDomainName = newUser.email.split('@')[1];
        var profileAzureMarketplace = _.findKey(vendorProfiles, function (key) {
          return (key.azure_marketplace.user_email_domain === userEmainDomainName);
        });
        if (!profileAzureMarketplace) {
          statuspageService.subscribe(newUser, function (err, data) {
            if (err) {
              logger.error('UserService::statuspage.subscribe:error create subscription: ' + JSON.stringify(err));
            } else {
              logger.info('UserService::statuspage.subscribe:success create subscription for user Id ' + _createdUser_.user_id);
            }
          });
        }
      }
      cb();
    }
  ],
    function (err) {
      callback(err, _createdUser_);
    });
};

/**
 * @name  removeUser
 * @description
 *
 *  Remove User from system
 *  and all his personal data
 *
 * @param  {[type]}   userId   [description]
 * @param  {Function} callback [description]
 * @return {[type]}            [description]
 */
exports.removeUser = function (userId, callback) {
  var _removedUser_ = null;
  // 1. Найти пользователя
  // 2. Удалить
  async.waterfall([
    function findUserById(cb) {
      users.get({ _id: userId }, function (err, user_) {
        if (err) {
          return cb(err);
        }
        _removedUser_ = user_;
        if (!user_) {
          return cb(new Error('User not exist'));
        }
        cb(err);
      });
    },
    function removeUserDashboards(cb) {
      dashboardService.deleteDashboardsWithUserId(_removedUser_.user_id, function (err, result) {
        if (err) {
          logger.error('removeUser:removeUserDashboards:error ' + JSON.stringify(err));
        }
        cb(null);
      });
    },
    function removeStatusPageSubscription(cb) {
      if (config.get('register_new_users_for_network_status_updates') === 'yes') {
        // NOTE: Azure users do not subscribe
        if (_removedUser_.email.match('@' + config.get('azure_marketplace.user_email_domain')) === null) {
          statuspageService.unSubscribe(_removedUser_, function (err, result) {
            if (err) {
              logger.error('removeUser:statuspageService.unSubscribe:error ' + JSON.stringify(err));
            }
          });
        }
      }
      cb(null);
    },
    // In this place can be added another operations
    function deleteUserFromSystem(cb) {
      users.remove({
        _id: _removedUser_.user_id
      }, function (err, result) {
        if (err) {
          logger.error('removeUser:deleteUserFromSystem:error ' + JSON.stringify(err));
        } else {
          logger.info('removeUser:deleteUserFromSystem:success remove User with id ' + _removedUser_.user_id);
        }
        cb(err, result);
      });
    }
  ],
    function (err) {
      callback(err, _removedUser_);
    });
};

exports.deleteAccountFromPermissions = function (account_id) {
  return new Promise(function (resolve, reject) {
    if (!account_id) {
      return reject('No account ID specified');
    }

    users.model.find({}, function (err, userList) {
      if (err || !userList || userList.length === 0) {
        return reject('Problem fetching users');
      }

      userList.forEach(function (user) {
        var orgUser = user;
        user = user._doc;
        checkUserForAccount(user, account_id).then(function () {
          if (userList.indexOf(orgUser) === userList.length - 1) {
            return resolve(true);
          }
        })
        .catch(reject);
      });
      
    });
  });
};

function checkUserForAccount(user, account_id) {
  return new Promise(function (resolve, reject) {
    if (user.permissions) {
      if (user.permissions.accounts.list && user.permissions.accounts.list.indexOf(account_id) !== -1) {
        user.permissions.accounts.list.splice(user.permissions.accounts.list.indexOf(account_id), 1);
        var updateUser = {
          user_id: user.id || user._id,
          permissions: user.permissions
        };
        users.update(updateUser, function (error, item) {
          if (error) {
            return reject(error);
          }

          return resolve(true);
        });
      } else {
        return resolve(true);
      }
    } else {
      return resolve(true);
    }
  });
}