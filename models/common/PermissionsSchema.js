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
//	data access layer

var mongoose = require('mongoose');

var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;

var PermissionsSchema = new Schema({
  'web_domains': {
    'access_mode': {
      'type': String,
      'default': 'off',
      'enum': ['off', 'view', 'manage'],
      'description': '"off" (no access at all) | "view" (read-only access) | "manage" (RW access)'
    },
    'access_allow_domains': {
      'type': [ObjectId],
      'description': 'if not empty then the user can access only listed domains, otherwise the user can access all domains'
    },
    'access_deny_domains': {
      'type': [ObjectId],
      'description': 'if not empty then the user should be denied with access to the listed domains; if empty - no restrictions'
    }
  },
  'mobile_apps': {
    'access_mode': {
      'type': String,
      'default': 'off',
      'enum': ['off', 'view', 'manage'],
      'description': '"off" (no access at all) | "view" (read-only access) | "manage" (RW access)'
    },
    'access_allow_apps': {
      'type': [ObjectId],
      'description': 'if not empty then the user can access only listed apps, otherwise the user can access all apps'
    },
    'access_deny_apps': {
      'type': [ObjectId],
      'description': 'if not empty then the user should be denied with access to the listed apps; if empty - no restrictions'
    }
  },
  'web_analytics': {
    'access_mode': {
      'type': String,
      'default': 'off',
      'enum': ['off', 'view'],
      'description': '"off" (no access at all) | "view" (read-only access)'
    },
    'access_allow_domains': {
      'type': [ObjectId],
      'description': 'if not empty then the user can access statistics for listed domains only, otherwise the user can access statistics for all domains'
    },
    'access_deny_domains': {
      'type': [ObjectId],
      'description': 'if not empty then the user should be denied with access to the listed domains statistics; if empty - no restrictions'
    }
  },
  'app_analytics': {
    'access_mode': {
      'type': String,
      'default': 'off',
      'enum': ['off', 'view'],
      'description': '"off" (no access at all) | "view" (read-only access)'
    },
    'access_allow_apps': {
      'type': [ObjectId],
      'description': 'if not empty then the user can access statistics for listed apps only, otherwise the user can access statistics for all apps'
    },
    'access_deny_apps': {
      'type': [ObjectId],
      'description': 'if not empty then the user should be denied with access to the listed apps statistics; if empty - no restrictions'
    }
  },
  'dashboard': {
    'access_mode': {
      'type': String,
      'default': 'off',
      'enum': ['off', 'view', 'manage'],
      'description': '"off" (no access at all) | "view" (read-only access) | "manage" (RW access)'
    }
  }
});

module.exports = PermissionsSchema;
