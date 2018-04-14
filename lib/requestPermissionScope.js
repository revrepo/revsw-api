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
var childAccsIDs;
var permissionObject = {
    read_only: false,
    enforce_2fa: false,
    portal_login: true,
    API_access: true,
    dashboards: true,
    mobile_apps: {
        access: true,
        list: null,
        allow_list: true
    },
    mobile_analytics: {
        access: true,
        list: null,
        allow_list: true
    },
    domains: {
        access: true,
        list: null,
        allow_list: true
    },
    ssl_names: true,
    ssl_certs: true,
    waf_rules: true,
    cache_purge: {
        access: true,
        list: null,
        allow_list: true
    },
    web_analytics: {
        access: true,
        list: null,
        allow_list: true
    },
    security_analytics: {
        access: true,
        list: null,
        allow_list: true
    },
    dns_zones: {
        access: true,
        list: null,
        allow_list: true
    },
    dns_analytics: {
        access: true,
        list: null,
        allow_list: true
    },
    groups: true,
    users: true,
    API_keys: true,
    logshipping_jobs: true,
    activity_log: true,
    accounts: {
        access: true,
        list: null,
        allow_list: true
    },
    traffic_alerts: true,
    notification_lists: true,
    usage_reports: true,
    billing_statements: true,
    billing_plan: true,
    account_profile: true
};
/**
  * Sets the permissions (from group or permissions object of user/APIkey)
  * @param {Object} item authed user/APIkey from the request
  * @returns {Promise} Promise with the item object with permissions and role scope set
  */
module.exports.setPermissionsScope = function (item) {
    var me = this;
    return new Promise(function (resolve, reject) {
        me.setChildAccs(item).then(function (user) {
            item = user;

            // scope and usertype, scope has the roles of the user/APIkey
            item.scope = item.email ? [] : ['apikey'];
            item.user_type = item.email ? 'user' : 'apikey';
            item.scope.push(item.role);

            // cant have an empty user/APIkey
            if (!item) {
                return reject('User/APIKey is empty/null');
            }

            if (item.companyId && item.companyId.length > 0 && !item.account_id) {
                item.account_id = item.companyId[0];
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
                    if (!permissions.API_access && item.user_type === 'apikey') {
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
    /* jshint ignore:start */
    /* ignoring this because of too many statements for now */
    // TODO: tidy up the code in this function and split it to a few smaller functions

    // sometimes domain's account is in the proxy_config....
    if (object.proxy_config && object.proxy_config.account_id) {
        object.account_id === object.proxy_config.account_id;
    }
    if (object._doc) {
        object = object._doc;
    }
    var permissions = globalPerm[type];
    var user = request.auth.credentials; // user/APIkey
    var allowAccess = true;
    var roleFlag = object.role ? module.exports.getRolePermission(object, user) : true;
    var accountMatch = true;
    var showList = type === 'permission_list';

    if (object.structure) {
        // dealing with dashboards here..
        return module.exports.checkPermissionsToDashboard(object, user);
    }

    // insta allow access to revadmin or builtin waf rules
    if (request.auth.credentials.role === 'revadmin' || (object.rule_name && object.rule_type === 'builtin')) {
        return true;
    }

    if (type === 'accounts') {
        var count = 0;
        for (var prop in object) {
            count++;
        }

        if (count === 1) {
            // only account id is present in here, check account access
            return checkAccessToAccount(object, user);
        }
    }

    // reseller account hirearchy
    if ((object.companyName && user.role === 'reseller') && (object.parent_account_id === user.account_id)) {
        // allow access to child accounts for reseller role
        allowAccess = true;
        accountMatch = true;
    }

    // check account match
    if (object.account_id) {
        // the object is anything but an account
        allowAccess = checkAccessToAccount({ id: object.account_id }, user);
        accountMatch = checkAccessToAccount({ id: object.account_id }, user);
    } else if (object.companyName) {
        // the object is an account object
        allowAccess = checkAccessToAccount(object, user);
        accountMatch = checkAccessToAccount(object, user);
    }

    // check if resource is a `list` type of resource (not just boolean true/false)
    if (permissions !== null && (typeof permissions) === 'object') {
        var accessList = permissions;
        if (!accessList.access) {
            return false;
        } else if (accessList.access && (!accessList.list || accessList.list.length === 0)) {
            // the global access flag is true, and there are no specific resources specified, grant full access
            return true && roleFlag && allowAccess && accountMatch;
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

    if (object.id === user.account_id) {
        // always allow access to original account..
        allowAccess = true;
        accountMatch = true;
    }

    return (allowAccess || showList) && roleFlag && accountMatch;
    /* jshint ignore:end */
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

module.exports.setChildAccs = function (item) {
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

                resolve(item);
            });
        } else {
            resolve(item);
        }
    });
};

module.exports.getRolePermission = function (object, user) {
    var roleFlag = true;
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

    return roleFlag;
};

module.exports.checkPermissionsToDashboard = function (dashboard, user) {
    var match = dashboard.user_id === user.user_id; // dash belongs to user?
    var access = globalPerm.dashboards; // permissions allow dashboarding?

    return match && access;
};

/**
 * @name checkSimplePermissions
 * @description Get a simple type of permission (APIkeys, users, groups etc..., bool type)
 * 
 * @param request HAPI request object
 * @param type type of the permission, API_keys, users, groups, dashboards...
 * 
 * @returns {Boolean} true - has permission, false - denied permission
 */
module.exports.checkSimplePermissions = function (request, type) {
    var permissions = globalPerm[type];
    var user = request.auth.credentials; // user/APIkey

    if (!permissions || !user) {
        return false; // don't allow access to undenified..
    }

    return permissions; // true/false
};

module.exports.permissionObject = permissionObject;

var checkAccessToAccount = function (account, user) {
    var accountMatch = false;

    if (user.child_accounts && user.child_accounts.toString().includes(account.id)) {
        accountMatch = true;
    }

    if (globalPerm.accounts.access) {
        if (globalPerm.accounts.list && globalPerm.accounts.list.length > 0) {
            if (globalPerm.accounts.list.indexOf(account.id) !== -1) {
                accountMatch = globalPerm.accounts.allow_list;
            } else {
                if (user.child_accounts && user.child_accounts.toString().includes(account.id)) {
                    accountMatch = !globalPerm.accounts.allow_list;
                } else {
                    accountMatch = false;
                }
            }
        }
    } else {
        accountMatch = false;
    }

    if (account.id === user.account_id) {
        return true;
    }
    return accountMatch;
};