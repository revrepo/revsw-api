/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

var mongoose = require('mongoose');
var config = require('config');
var mongoConnection = require('./../lib/mongoConnections');
var Account = require('../models/Account');
var accounts = new Account(mongoose, mongoConnection.getConnectionPortal());
var User = require('../models/User');
var users = new User(mongoose, mongoConnection.getConnectionPortal());
var DomainConfig = require('../models/DomainConfig');
var domainConfigs = new DomainConfig(mongoose, mongoConnection.getConnectionPortal());
var APIKey = require('../models/APIKey');
var apikeys = new APIKey(mongoose, mongoConnection.getConnectionPortal());
var Group = require('../models/Group');
var groups = new Group(mongoose, mongoConnection.getConnectionPortal());
var accountService = require('../services/accounts.js');
var Promise = require('bluebird');
var _ = require('lodash');
var domains = [];
mongoose.set('debug', false);
var permissionsAdmin = {
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
var permissionsUser = {
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
    groups: false,
    users: false,
    API_keys: false,
    logshipping_jobs: false,
    activity_log: false,
    accounts: {
        access: false,
        list: null,
        allow_list: true
    },
    traffic_alerts: true,
    notification_lists: false,
    usage_reports: false,
    billing_statements: false,
    billing_plan: false,
    account_profile: true
};

domainConfigs.list(function (err, list) {
    if (err) {
        throw new Error(err);
    } else if (list) {
        domains = list;
        users.model.find({}, function (err, usrs) {
            if (err) {
                throw new Error(err);
            } else if (usrs) {
                apikeys.model.find({}, function (error, keys) {
                    usrs = usrs.concat(keys);
                    groups.model.find({}, function (errs, grps) {
                        usrs = usrs.concat(grps);
                        for (var i = 0; i < usrs.length; i++) {
                            updateUser(usrs[i]);
                        }
                    });                    
                });
            }
        });
    } else {
        throw new Error('Problem getting domains');
    }
});

var updateUser = function (usr) {
    var user = {};
    if (usr.companyId) {
        user.account_id = usr.companyId.includes(',') ? usr.companyId.split(',')[0] : usr.companyId;
    }

    if (!usr.key && !usr.name) {
        user.user_id = usr._id;
    } else if (usr.key) {
        user._id = usr._id;
    } else if (usr.name) {
        user.id = usr._id;
    }

    if (!usr.role) {
        var permissions = _.clone(permissionsAdmin);
        user.permissions = permissions;
        groups.update(user, function (err, doc) {
            if (err) {
                throw new Error(err);
            } else if (doc) {
                console.log(doc.name + ' successfully updated!');
            }
        });
    } else {
        switch (usr.role) {
            case 'user':
                var permissions = _.clone(permissionsUser);
                var domainArray = [];
                var domainIDs = [];
                permissions.read_only = usr.permissions.read_only || false;
    
                if (usr.domain && usr.domain !== '') {
                    if (usr.domain.includes(',')) {
                        domainArray = usr.domain.split(',');
                    } else {
                        domainArray.push(usr.domain);
                    }
                    domainArray.forEach(function (domain) {
                        domains.forEach(function (domainConfig) {
                            if (domain === domainConfig.domain_name) {
                                domainIDs.push(domainConfig._id.toString());
                            }
                        });
                    });
                }
    
                permissions.domains.list = domainIDs.length > 0 ? domainIDs : null;
                permissions.domains.access = true;
                permissions.domains.allow_list = true;
    
                user.permissions = permissions;
                if (!usr.key) {
                    users.update(user, function (err, doc) {
                        if (err) {
                            throw new Error(err);
                        } else if (doc) {
                            console.log(doc.email + ' successfully updated!');
                        }
                    });
                } else {
                    user.key = usr.key;
                    apikeys.update(user, function (err, doc) {
                        if (err) {
                            throw new Error(err);
                        } else if (doc) {
                            console.log(doc.key_name + ' successfully updated!');
                        }
                    });
                }
                break;
            case 'admin':
            case 'reseller':
            case 'revadmin':
                var permissions = _.clone(permissionsAdmin);
                permissions.read_only = usr.permissions.read_only || false;
                user.permissions = permissions;
    
                if (!usr.key) {
                    users.update(user, function (err, doc) {
                        if (err) {
                            throw new Error(err);
                        } else if (doc) {
                            console.log(doc.email + ' successfully updated!');
                        }
                    });
                } else {
                    user.key = usr.key;
                    apikeys.update(user, function (err, doc) {
                        if (err) {
                            throw new Error(err);
                        } else if (doc) {
                            console.log(doc.key_name + ' successfully updated!');
                        }
                    });
                }
                break;
            default:
                throw new Error(user.role);
                break;
        }
    }
};