/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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

'use strict';

/*
*   This module will be used with every request to the API.
*   Permissions and role setting will be done here for both Users and API Keys.
*/
var _ = require('lodash');
var config = require('config');
var boom = require('boom');
var Promise = require('bluebird');
var mongoose = require('mongoose');
var mongoConnection = require('./mongoConnections');
var User = require('./../models/User');
var Account = require('./../models/Account');
var Group = require('./../models/Group');
var users = new User(mongoose, mongoConnection.getConnectionPortal());
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var groups = new Group(mongoose, mongoConnection.getConnectionPortal());
var defaultSystemVendorProfile = config.get('default_system_vendor_profile');
var globalPerm;
var childAccs;
/**
  * Sets the permissions (from group or permissions object of user/APIkey)
  * @param {Object} item authed user/APIkey from the request
  * @returns {Promise} Promise with the item object with permissions and role scope set
  */
module.exports.setPermissionsScope = function (item) {
    var me = this;
    return new Promise(function (resolve, reject) {

        if (item.role === 'reseller') {
            accounts.listByParentID(item.account_id, function (err, accs) {
                if (err) {
                    return reject('Cannot get child accounts');
                }
                childAccs = accs;
                item.child_accounts = _.map(childAccs, function (acc) {
                    return acc.id;  
                });
            });
        }

        // permissions var, will be used to check readonly
        var permissions;

        // scope and usertype, scope has the roles of the user/APIkey
        item.scope = item.email ? [] : ['apikey'];
        item.user_type = item.email ? 'user' : 'apikey';
        item.scope.push(item.role);

        // cant have an empty user/APIkey
        if (!item) {
            return reject('User/APIKey is empty/null');
        }

        // cant allow a user/APIkey without account_id, unless its revadmin, revadmin === god..
        if (item.role !== 'revadmin' && (!item.account_id || item.account_id === '')) {
            return reject('User/APIKey has no account');
        }

        // lets check if we have a group
        me.getPermissions(item).then(function (permissions) {
            globalPerm = permissions;
            if (permissions) {

                // first lets check API access permissions (for API keys)
                if(!permissions.API_access && item.user_type === 'apikey') {
                    return reject('Denied access to API');
                }

                // if permissions block is set, we can check RO and continue
                if (!permissions.read_only) {
                    item.scope.push(item.role + '_rw');
                }

                if (item.role !== 'revadmin') {
                    // check the account_id is valid
                    accounts.get({ _id: item.account_id }, function (error, account) {
                        if (error) {
                            return reject(error);
                        }

                        if (!account) {
                            return reject('Cannot get account');
                        }
                        item.vendor_profile = account.vendor_profile || defaultSystemVendorProfile;

                        // all done, resolve the promise with the user/key
                        item.permissions = permissions;
                        return resolve(item);
                    });
                } else {
                    // all done, resolve the promise with the user/key
                    item.permissions = permissions;
                    return resolve(item);
                }

            } else {
                return reject('Cannot set permissions');
            }
        }).catch(function (err) {
            return reject(err);
        });
    });
};

/**
 * Check user/APIkey access to resource
 * @param {Object} request the hap request object
 * @param {Object} object the resource object
 * @param {String} type the type of resource (SSL Names, Domains, Apps...)
 * @returns {Boolean} Allow or Deny the access
 */
module.exports.checkPermissionsToResource = function (request, object, type) {
    var permissions = globalPerm[type];
    var user = request.auth.credentials; // user/APIkey
    var allowAccess = true;
    var roleFlag = true;
    var accountMatch = true;

    if (object.role) {
        // object is user, and admin cannot have access to reseller..
        switch (object.role) {
            case 'user':
                roleFlag = user.role === 'user' || user.role === 'reseller' || user.role === 'admin';
                break;
            case 'admin':
                roleFlag = user.role === 'admin' || user.role === 'reseller';
                break;
            case 'reseller':
                roleFlag = user.role === 'reseller';
                break;
        }
    }

    // revadmin can do whateva the fuck it wanna do
    if (request.auth.credentials.role === 'revadmin') {
        return true;
    }

    // reseller account hirearchy
    if (object.companyName && user.role === 'reseller') {
        if (object.parent_account_id === user.account_id) {
            // insta-allow access to child accounts for reseller role
            return true && roleFlag;
        }
    }

    // check account match
    if (object.account_id) {
        if (user.account_id !== object.account_id) {
            // check if permissions allow for certain accounts
            if (globalPerm.accounts.list && globalPerm.accounts.list.length > 0) {
                if (globalPerm.accounts.list.toString().includes(object.account_id)) {
                    allowAccess = globalPerm.accounts.allow_list;
                    accountMatch = globalPerm.accounts.allow_list;
                } else {
                    allowAccess = !globalPerm.accounts.allow_list;
                    accountMatch = !globalPerm.accounts.allow_list;
                }
            } else {
                allowAccess = false;
                accountMatch = false;
            }

            // check if were resellers and we have child companies
            if (childAccs) {
                childAccs.forEach(function (acc) {
                    if (acc.id === object.account_id) {
                        allowAccess = true;
                        accountMatch = true;
                    }
                });
            }
        } else {
            allowAccess = true;
            accountMatch = true;
        }
    } else if (object.companyName) {
        if (user.account_id !== object.id) {
            return false;
        }
    }

    // check if resource is a `list` type of resource (not just boolean true/false)
    if (permissions !== null && (typeof permissions) === 'object') {
        var accessList = permissions;
        if (!accessList.access) {
            return false;
        } else if (accessList.access && (!accessList.list || accessList.list.length === 0)) {
            // the global access flag is true, and there are no specific resources specified, grant full access
            return true && roleFlag && allowAccess;
        }

        // check if there are specific resources listed
        if (accessList.list && accessList.length !== 0) {
            // if the account matches the resource account
            if (accessList.list.toString().includes(object.id || object._id)) {
                // if the resource is on the access list
                allowAccess = accessList.allow_list; // return either allow access to this resource or not
            } else {
                // return the oposite!
                allowAccess = !accessList.allow_list;
            }
        }
    } else {
        // permissions type is just true or false..
        allowAccess = permissions;
    }

    return allowAccess && roleFlag && accountMatch;
};

/**
 * Gets the permissions block for the user/APIkey, from group or permissions field..
 */
module.exports.getPermissions = function (item) {
    return new Promise(function (resolve, reject) {
        if (item.group_id && item.group_id !== '') {
            // if we have a group, it overrides the user's/APIkey's permission object..
            groups.getById(item.group_id).then(function (group) {
                if (!group) {
                    return reject('Cannot get group');
                }

                return resolve(group.permissions);
            })
                .catch(function (err) {
                    return reject(err);
                });
        } else {
            //if theres no group, we need to pull our permissions from the user's permissions object
            return resolve(item.permissions);
        }
    });
};

module.exports.getResellerAccs = function () {
    return childAccs;   
};