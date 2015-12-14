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
var bluebird = require('bluebird');
var Team = require('models/Team');

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

// Gets permissions for `rec` document
// If `rec` belongs to the team (and team has own permissions) then
// team's permissions will be returned.
// Otherwise returns rec's permissions
var getAccessPermissions = function(rec) {
  return new bluebird.Promise(function (resolve, reject) {
    if (rec.team_id) {
      // If record belongs to a team, fetch the team first
      Team.getById(rec.team_id, function(err, team) {
        if (err) {
          reject(rec);
        } else {
          resolve(team);
        }
      });
    } else {
      reject(rec);
    }
  })
  .then(function(doc) {
    return doc.access_permissions || rec.access_permissions || {};
  });
};

module.exports.createPermissionScopes = function(rec) {
  return getAccessPermissions(rec)
    // Iterate through permissions and get the list of corresponding auth scopes
    .then(function(accessPermissions) {
      var scopes = [];

      _.forIn(accessPermissions, function(value, key) {
        var accessMode = value.access_mode;

        if (key) {
          scopes.push(_.get(accessModeScopesMap, key + '.' + accessMode));
        }
      });

      return _.filter(scopes, _.identity); // Filter truthly values
    })
    // Extend scopes list with `any` scope for revadmin user
    .then(function(scopes) {
      if (rec.role == 'revadmin') {
        scopes.push('any');
      }

      return scopes;
    });
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
