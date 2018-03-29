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

/* This is the permissions schema that is used in the Group and Users models */
var mongoose = require('mongoose');
var permissionSchema = {
    read_only: { type: Boolean, default: false },
    enforce_2fa: { type: Boolean, default: false },
    portal_login: { type: Boolean, default: true },
    API_access: { type: Boolean, default: true },
    dashboards: { type: Boolean, default: true },
    mobile_apps: {
        access: { type: Boolean, default: true },
        list: { type: [mongoose.Schema.ObjectId], default: null },
        allow_list: { type: Boolean, default: true }
    },
    mobile_analytics: { type: Boolean, default: true },
    domains: {
        access: { type: Boolean, default: true },
        list: { type: [mongoose.Schema.ObjectId], default: null },
        allow_list: { type: Boolean, default: true }
    },
    ssl_names: { type: Boolean, default: true },
    ssl_certs: { type: Boolean, default: true },
    waf_rules: { type: Boolean, default: true },
    cache_purge: {
        access: { type: Boolean, default: true },
        list: { type: [mongoose.Schema.ObjectId], default: null },
        allow_list: { type: Boolean, default: true }
    },
    web_analytics: {
        access: { type: Boolean, default: true },
        list: { type: [mongoose.Schema.ObjectId], default: null },
        allow_list: { type: Boolean, default: true }
    },
    security_analytics: {
        access: { type: Boolean, default: true },
        list: { type: [mongoose.Schema.ObjectId], default: null },
        allow_list: { type: Boolean, default: true }
    },
    dns_zones: {
        access: { type: Boolean, default: true },
        list: { type: [mongoose.Schema.ObjectId], default: null },
        allow_list: { type: Boolean, default: true }
    },
    dns_analytics: {
        access: { type: Boolean, default: true },
        list: { type: [mongoose.Schema.ObjectId], default: null },
        allow_list: { type: Boolean, default: true }
    },
    groups: { type: Boolean, default: true },
    users: { type: Boolean, default: true },
    API_keys: { type: Boolean, default: true },
    logshipping_jobs: { type: Boolean, default: true },
    activity_log: { type: Boolean, default: true },
    accounts: {
        access: { type: Boolean, default: true },
        list: { type: [mongoose.Schema.ObjectId], default: null },
        allow_list: { type: Boolean, default: true }
    },
    traffic_alerts: { type: Boolean, default: true },
    notification_lists: { type: Boolean, default: true },
    usage_reports: { type: Boolean, default: true },
    billing_statements: { type: Boolean, default: true },
    billing_plan: { type: Boolean, default: true },
    account_profile: { type: Boolean, default: true }
};

module.exports = permissionSchema;