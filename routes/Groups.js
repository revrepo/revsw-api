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

var Joi = require('joi');

var groups = require('../handlers/groups');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/groups',
    config: {
      auth: {
        scope: ['revadmin']
      },
      handler: groups.getGroups,
      description: 'Get a list of groups',
      notes: 'Use the call to receive a list of groups for your customer account.',
      tags: ['api', 'groups'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          filters: Joi.object().keys({
            account_id: Joi.objectId().optional().trim().description('ID of a company')
          })
            .optional().description('Filters parameters')
        }
      },
      response: {
        schema: routeModels.listOfGroupsModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/groups',
    config: {
      auth: {
        scope: ['revadmin_rw']
      },
      handler: groups.createGroup,
      description: 'Create a new group',
      notes: 'Use this call to create a new group, if account_id is not specified, the API account will be used.',
      tags: ['api', 'groups'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          account_id: Joi.string().description('The account that this group is associated to'),
          name: Joi.string().trim().max(30).regex(routeModels.groupName).required().description('Group name'),
          comment: Joi.string().trim().allow('').max(300).optional().description('Group comment'),
          permissions: Joi.object({
            read_only: Joi.boolean().default(false).required().description('Read-only user group'),
            enforce_2fa: Joi.boolean().default(false).required().description('Enforce 2FA for this group'),
            portal_login: Joi.boolean().default(true).required().description('Access to portal login'),
            API_access: Joi.boolean().default(true).required().description('Access to API endpoints'),
            dashboards: Joi.boolean().default(true).required().description('Access to dashboard management'),
            mobile_apps: Joi.object({
              access: Joi.boolean().required().description('Access to mobile apps'),
              list: Joi.array().description('List of apps'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of apps')
            }),
            domains: Joi.object({
              access: Joi.boolean().required().description('Access to domains'),
              list: Joi.array().description('List of apps'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of domains')
            }),
            ssl_names: Joi.boolean().default(true).required().description('Access to SSL Names management'),
            ssl_certs: Joi.boolean().default(true).required().description('Access to SSL Certs management'),
            waf_rules: Joi.boolean().default(true).required().description('Access to WAF Rules management'),
            cache_purge: Joi.boolean().default(true).required().description('Abillity to purge cache'),
            web_analytics: Joi.object({
              access: Joi.boolean().required().description('Access to web analytics'),
              list: Joi.array().description('List of domains'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of domains')
            }),
            security_analytics: Joi.object({
              access: Joi.boolean().required().description('Access to security analytics'),
              list: Joi.array().description('List of domains'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of domains')
            }),
            dns_zones: Joi.object({
              access: Joi.boolean().required().description('Access to DNS zones'),
              list: Joi.array().description('List of zones'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of zones')
            }),
            dns_analytics: Joi.boolean().default(true).required().description('Access to DNS analytics'),
            groups: Joi.boolean().default(true).required().description('Access to groups'),
            users: Joi.boolean().default(true).required().description('Access to users'),
            API_keys: Joi.boolean().default(true).required().description('Access to API keys'),
            logshipping_jobs: Joi.boolean().default(true).required().description('Access to logshipping jobs'),
            activity_log: Joi.boolean().default(true).required().description('Access to activity log'),
            accounts: Joi.object({
              access: Joi.boolean().required().description('Access to accounts'),
              list: Joi.array().description('List of accounts'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of accounts')
            }),
            traffic_alerts: Joi.boolean().default(true).required().description('Access to traffic alerts'),
            notification_lists: Joi.boolean().default(true).required().description('Access to notification lists'),
            usage_reports: Joi.boolean().default(true).required().description('Access to usage reports'),
            billing_statements: Joi.boolean().default(true).required().description('Access to billing statements'),
            billing_plan: Joi.boolean().default(true).required().description('Access to billing plan')
          })
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'PUT',
    path: '/v1/groups/{group_id}',
    config: {
      auth: {
        scope: ['revadmin_rw']
      },
      handler: groups.updateGroup,
      description: 'Update a group',
      notes: 'Use the function to update a group.',
      tags: ['api', 'groups'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        options: {
          stripUnknown: true
        },
        params: {
          group_id: Joi.objectId().required().description('The ID of group to be updated')
        },
        payload: {
          account_id: Joi.string().description('The account that this group is associated to'),
          name: Joi.string().trim().max(30).regex(routeModels.groupName).description('Group name'),
          comment: Joi.string().trim().allow('').max(300).optional().description('Group comment'),
          permissions: Joi.object({
            read_only: Joi.boolean().description('Read-only user group'),
            enforce_2fa: Joi.boolean().description('Enforce 2FA for this group'),
            portal_login: Joi.boolean().description('Access to portal login'),
            API_access: Joi.boolean().description('Access to API endpoints'),
            dashboards: Joi.boolean().description('Access to dashboard management'),
            mobile_apps: Joi.object({
              access: Joi.boolean().description('Access to mobile apps'),
              list: Joi.array().description('List of apps'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of apps')
            }),
            domains: Joi.object({
              access: Joi.boolean().description('Access to domains'),
              list: Joi.array().description('List of domains'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of domains')
            }),
            ssl_names: Joi.boolean().description('Access to SSL Names management'),
            ssl_certs: Joi.boolean().description('Access to SSL Certs management'),
            waf_rules: Joi.boolean().description('Access to WAF Rules management'),
            cache_purge: Joi.boolean().description('Abillity to purge cache'),
            web_analytics: Joi.object({
              access: Joi.boolean().description('Access to web analytics'),
              list: Joi.array().description('List of domains'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of domains')
            }),
            security_analytics: Joi.object({
              access: Joi.boolean().description('Access to security analytics'),
              list: Joi.array().description('List of domains'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of domains')
            }),
            dns_zones: Joi.object({
              access: Joi.boolean().description('Access to DNS zones'),
              list: Joi.array().description('List of zones'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of zones')
            }),
            dns_analytics: Joi.boolean().description('Access to DNS analytics'),
            groups: Joi.boolean().description('Access to groups'),
            users: Joi.boolean().description('Access to users'),
            API_keys: Joi.boolean().description('Access to API keys'),
            logshipping_jobs: Joi.boolean().description('Access to logshipping jobs'),
            activity_log: Joi.boolean().description('Access to activity log'),
            accounts: Joi.object({
              access: Joi.boolean().description('Access to accounts'),
              list: Joi.array().description('List of accounts'),
              allow_list: Joi.boolean().description('Flag to allow/deny access to the list of accounts')
            }),
            traffic_alerts: Joi.boolean().description('Access to traffic alerts'),
            notification_lists: Joi.boolean().description('Access to notification lists'),
            usage_reports: Joi.boolean().description('Access to usage reports'),
            billing_statements: Joi.boolean().description('Access to billing statements'),
            billing_plan: Joi.boolean().description('Access to billing plan')
          })
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/groups/{group_id}',
    config: {
      auth: {
        scope: ['revadmin']
      },
      handler: groups.getGroup,
      description: 'Get a group',
      notes: 'Use the call to get the details of a group.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          group_id: Joi.objectId().required().description('Group ID')
        }
      },
      response: {
        schema: routeModels.groupModel
      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/groups/{group_id}',
    config: {
      auth: {
        scope: ['revadmin_rw']
      },
      handler: groups.deleteGroup,
      description: 'Delete a group',
      notes: 'Use the call to delete a group from the system.',
      tags: ['api', 'groups'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          group_id: Joi.objectId().required().description('Group ID to delete')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
