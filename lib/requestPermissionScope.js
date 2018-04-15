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

    var accountMatch;
    var allow;
    var user = request.auth.credentials; // the requester's user/APIkey
    var permissions = user.permissions; // permissions block of user/APIkey self/inherited from group

    // sometimes we get our object inside _doc..
    if (object._doc) {
        object = _.cloneDeep(object._doc);
    }

    // Rev Admin does whateva it wanna do
    if (user.role === 'revadmin') {
        return true;
    }

    /**
     * Logic breakdown:
     *  Depending on our permissions type (domains, accounts, mobile_apps etc...)
     *  we pull our object's account_id (or ID if the object is an account),
     *  we run it through our checkAccessToAccount function which returns if we have access to
     *  that account or not (checks also child-accounts and permissions for accounts),
     *  then we run our object through the permission check, if its a list type we check our list
     *  and return a value according to that (and account match), if its just a boolean (users, groups, dashboards)
     *  we return a value according to that boolean and account match.
     */
    switch (type) {
        case 'permission_list':
            // display all account-matched resources if we need it for permissions list
            var accountId = object.proxy_config ? object.proxy_config.account_id : object.account_id;
            accountMatch = checkAccessToAccount(accountId, user);
            return accountMatch;
        case 'domains':
        case 'web_analytics':
        case 'cache_purge':
        case 'security_analytics':
            if (object.proxy_config) {
                // all domain objects should use proxy_config.account_id (not when whole list is requested)
                if (!object.proxy_config.account_id) {
                    return boom.badImplementation('Account ID not found in domain\'s proxy_config');
                }
                accountMatch = checkAccessToAccount(object.proxy_config.account_id, user);
            } else {
                accountMatch = checkAccessToAccount(object.account_id, user);
            }

            allow = checkAccessInList(object.id || object._id, type, user);

            return allow && accountMatch;
        case 'dns_zones':
        case 'dns_analytics':
        case 'mobile_apps':
        case 'mobile_analytics':
            accountMatch = checkAccessToAccount(object.account_id, user);
            allow = checkAccessInList(object.id || object._id, type, user);

            return allow && accountMatch;
        case 'dashboards':
            return (object.user_id === user.user_id) && permissions.dashboards;
        case 'users':

            if(!object.account_id) {
                return boom.badImplementation('Account ID not found in user object');
            }

            if (!permissions.users) {
                return false;
            } else if (checkAccessToAccount(object.account_id, user)) {
                switch (user.role) {
                    case 'admin':
                        return object.role === 'admin'; // admin has only access to admins
                    case 'reseller':
                        // reseller has access to admins and resellers
                        return object.role === 'admin' || object.role === 'reseller';
                }
            } else {
                return false;
            }
            break;
        case 'ssl_certs':
        case 'ssl_names':
        case 'groups':
        case 'API_keys':
        case 'logshipping_jobs':
            accountMatch = checkAccessToAccount(object.account_id, user);
            allow = user.permissions[type];

            return allow && accountMatch;
        case 'accounts':
            return checkAccessToAccount(object.id, user);
        case 'waf_rules':
            if (object.rule_type === 'builtin') {
                return true;
            }

            accountMatch = checkAccessToAccount(object.account_id, user);
            allow = user.permissions[type];

            return allow && accountMatch;
        default:
            return user.permissions[type];
    }
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
    var permissions = request.auth.credentials.permissions;
    var user = request.auth.credentials; // user/APIkey

    if (!permissions || !user) {
        return false; // don't allow access to undenified..
    }

    return permissions[type]; // true/false
};

module.exports.permissionObject = permissionObject;

/**
 * 
 * @description Checks if object is accessible by a list type permission
 * @param {String} id id of object to check
 * @param {String} list the list we need to check (domains, mobile_apps, web_analytics...)
 * @param {Object} user user object with permissions
 */
var checkAccessInList = function (id, list, user) {
    var allow = false;
    var permission = user.permissions[list];

    // if access is true, and the list is empty, return true..
    if (permission.access && (!permission.list || permission.list.length === 0)) {
        return true;
    }

    if (permission.access) {
        if (permission.list && permission.list.length > 0) {
            if (permission.list.indexOf(id) !== -1) {
                // if access is true and list contains this ID, return the allow_list value (allow/deny)
                return permission.allow_list;
            } else {
                // return the oposite of the allow_list value
                return !permission.allow_list;
            }
        }
    } else {
        return false;
    }

    return false;
};

var checkAccessToAccount = function (account, user) {
    var accountMatch = false;

    if (user.child_accounts && user.child_accounts.toString().includes(account)) {
        accountMatch = true;
    }

    if (user.permissions.accounts.access) {
        if (user.permissions.accounts.list && user.permissions.accounts.list.length > 0) {
            if (user.permissions.accounts.list.indexOf(account) !== -1) {
                accountMatch = user.permissions.accounts.allow_list;
            } else {
                if (user.child_accounts && user.child_accounts.toString().includes(account)) {
                    accountMatch = !user.permissions.accounts.allow_list;
                } else {
                    accountMatch = false;
                }
            }
        } else if (user.child_accounts && user.child_accounts.toString().includes(account)) {
            accountMatch = true;
        }
    } else {
        accountMatch = false;
    }

    if (account === user.account_id) {
        return true;
    }
    return accountMatch;
};