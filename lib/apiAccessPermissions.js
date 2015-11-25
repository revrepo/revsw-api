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

module.exports.getPermissionScopes = function(rec) {
  var scopes = [];

  rec.access_permissions = rec.access_permissions || {};

  _.forIn(rec.access_permissions, function(value, key) {
    var accessMode = value.access_mode;

    if (key) {
      scopes.push(_.get(accessModeScopesMap, key + '.' + accessMode));
    }
  });

  if (rec.role && rec.role == 'revadmin') {
    scopes.push('any');
  }

  return _.filter(scopes, _.identity); // Filter truthly values
};

module.exports.checkDomainPermissions = function(rec, domain) {
  // TBD
};

module.exports.checkAppPermissions = function(rec, app) {
  // TBD
};

module.exports.checkAccountPermissions = function(rec, account) {
  // TBD
};

module.exports.checkTeamPermissions = function(rec, team) {
  // TBD
};

module.exports.checkUserPermissions = function(rec, user) {
  // TBD
};

module.exports.checkAPIKeyPermissions = function(rec, apiKey) {
  // TBD
};
