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

var _ = require('lodash');

var accessModeScopesMap = {
  web_domains: {
    view: 'domain_ro',
    manage: 'domain_rw'
  },
  mobile_apps: {
    view: 'apps_ro',
    manage: 'apps_rw'
  },
  web_analytics: {
    view: 'web_analytics_ro',
    manage: 'web_analytics_rw'
  },
  app_analytics: {
    view: 'app_analytics_ro',
    manage: 'app_analytics_rw'
  },
  dashboard: {
    view: 'dashboard_ro'
  }
};

// Checks that several resources has the same owner by comparing
// `account_id` fields
// Can receive any number of arguments
var isSameOwner = function(/* resources */) {
  var resources = _.toArray(arguments).map(function(resource) {
    return resource.account_id.split(',');
  });

  return resources.length > 1 &&
    _.intersection.apply(_, resources).length > 0;
};

module.exports.getPermissionScopes = function(rec) {
  var scopes = [];

  rec.access_permissions = rec.access_permissions || {};

  _.forIn(rec.access_permissions, function(value, key) {
    var accessMode = value.access_mode;

    if (key) {
      scopes.push(_.get(accessModeScopesMap, key + '.' + accessMode));
    }
  });

  if (rec.role == 'revadmin') {
    scopes.push('any');
  }

  return _.filter(scopes, _.identity); // Filter truthly values
};

module.exports.checkDomainPermissions = function(rec, domain) {
  var deny_domains = rec.access_permissions.web_domains.access_deny_domains;
  var allow_domains = rec.access_permissions.web_domains.access_allow_domains;

  return rec.role == 'revadmin' || isSameOwner(rec, domain) &&
    !_.contains(deny_domains, domain.id) &&
    (_.isEmpty(allow_domains) || _.contains(allow_domains, domain.id));
};

module.exports.checkAppPermissions = function(rec, app) {
  var deny_apps = rec.access_permissions.mobile_apps.access_deny_apps;
  var allow_apps = rec.access_permissions.mobile_apps.access_allow_apps;

  return rec.role == 'revadmin' || isSameOwner(rec, app) &&
    !_.contains(deny_apps, app.id) &&
    (_.isEmpty(allow_apps) || _.contains(allow_apps, app.id));
};

module.exports.checkAccountPermissions = function(rec, account) {
  return rec.role == 'revadmin' ||
    _.contains(rec.account_id.split(','), account.id);
};

module.exports.checkTeamPermissions = function(rec, team) {
  return rec.role == 'revadmin' || isSameOwner(rec, team);
};

module.exports.checkUserPermissions = function(rec, user) {
  return rec.role == 'revadmin' || isSameOwner(rec, user);
};

module.exports.checkAPIKeyPermissions = function(rec, apiKey) {
  return rec.role == 'revadmin' || isSameOwner(rec, apiKey);
};
