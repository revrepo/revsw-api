/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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
var _ = require('lodash');
var config = require('config');

var notificationListHandlers = require('./../handlers/notificationLists');

module.exports = [{
    method: 'GET',
    path: '/v1/notification_lists',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      tags: ['api', 'notification_lists'],
      description: 'Notification Lists',
      notes: 'Get all Notification Lists',
      handler: notificationListHandlers.getNotificationLists,
      validate: {
        query: {
          account_id: Joi.string().description('Account Id')
        }
      }
    }
  },
  {
    method: 'POST',
    path: '/v1/notification_lists',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      tags: ['api', 'notification_lists'],
      description: 'Create Notification Lists',
      notes: 'Create new Notification Lists',
      handler: notificationListHandlers.createNotificationList,
      validate: {
        payload: {
          account_id: Joi.string().required().description('Account Id'),
          list_name: Joi.string().trim().required().max(150).description('Name of Notification List')
        }
      }
    }
  },
  {
    method: 'PUT',
    path: '/v1/notification_lists/{list_id}',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      tags: ['api', 'notification_lists'],
      description: 'Update Notification List',
      notes: 'Update a Notification List',
      handler: notificationListHandlers.updateNotificationList,
      validate: {
        params: {
          list_id: Joi.objectId().required().description('Notification List ID to be updated')
        },
        payload: {
          list_name: Joi.string().required().max(150).description('Notification List Name'),
          destinations: Joi.array().items(
            Joi.object().keys({
              destination_type: Joi.string().required().trim()
                .allow('user', 'email', 'webhook'), // TODO: later ->  'pagerduty', 'opsgenie', 'slack', 'hipchat'),
              user_id: Joi.objectId()
                .when('destination_type', {
                  is: 'user',
                  then: Joi.objectId().required(),
                })
                .description('ID of the system’s user which should receive email alerts to his profile email address'),
              email: Joi.string()
                .when('destination_type', {
                  is: 'email',
                  then: Joi.string().email().required(),
                })
                .description('Email address'),
              webhook: Joi.string()
                .when('destination_type', {
                  is: 'webhook',
                  then: Joi.string().uri().max(3000).required(),
                })
                .description('Webhook uri')
            })
          )
        }
      }
    }
  },
  {
    method: 'DELETE',
    path: '/v1/notification_lists/{list_id}',
    config: {
      auth: {
        scope: ['admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      tags: ['api', 'notification_lists'],
      description: 'Delete Notification Lists',
      notes: 'Delete a Notification Lists',
      handler: notificationListHandlers.deleteNotificationList,
      validate: {
        params: {
          list_id: Joi.objectId().required().description('Notification List ID to be deleted')
        }
      }
    }
  }
];
