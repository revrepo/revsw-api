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
      description: 'Create Notification List',
      notes: 'Create new Notification List',
      handler: notificationListHandlers.createNotificationList,
      validate: {
        payload: {
          account_id: Joi.objectId().required().description('Account Id'),
          list_name: Joi.string().trim().required().max(150).description('Name of Notification List')
        }
      }
    }
  },
  {
    method: 'POST',
    path: '/v1/notification_lists/{list_id}/send_notification',
    config: {
      auth: false, // we will use a special token to auth revsw-trafficalerter
      tags: ['api', 'notification_lists'],
      description: 'Send a notification to the notification list',
      notes: 'Send a notification to the notification list',
      handler: notificationListHandlers.sendNotificationToList,
      validate: {
        params:{
          list_id: Joi.objectId().required().description('ID Notification List')
        },
        payload: {
          notification_content: Joi.string().required().description('The content of the notification'),
          notification_title: Joi.string().required().description('The title of the notification')
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
                .allow('user', 'email'), // TODO: later -> 'webhook' ,  'pagerduty', 'opsgenie', 'slack', 'hipchat'),
              user_id: Joi.objectId()
                .when('destination_type', {
                  is: 'user_id',
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
      description: 'Delete Notification List',
      notes: 'Delete a Notification List',
      handler: notificationListHandlers.deleteNotificationList,
      validate: {
        params: {
          list_id: Joi.objectId().required().description('Notification List ID to be deleted')
        }
      }
    }
  }
];
