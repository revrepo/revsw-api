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

var trafficAlerts = require('../handlers/trafficAlerts');

var routeModels = require('../lib/routeModels');

var RuleTypeConfig_StatusCodeFrequency = Joi.object({
    timeframe_type: Joi.required(),
    timeframe: Joi.required(),
    responses: Joi.required(),
    status_code: Joi.required(),
  }).required()
  .label('RuleTypeConfig_StatusCodeFrequency')
  .description('Rule Config for Status Code Frequency');

var RuleTypeConfig_Spike = Joi.object({
    timeframe_type: Joi.required(),
    timeframe: Joi.required(),
    spike_amount: Joi.required(),
    spike_direction: Joi.required(),
  })
  .required()
  .label('RuleTypeConfig_Spike')
  .description('Rule Config for Status Code Frequency');

module.exports = [{
    method: 'GET',
    path: '/v1/traffic_alerts',
    config: {
      auth: {
        scope: ['revadmin', 'reseller', 'admin']
      },
      handler: trafficAlerts.getTrafficAlerts,
      description: 'Get a list of trafficAlerts',
      notes: 'Use the call to receive a list of trafficAlerts for your customer account.',
      tags: ['api', 'trafficAlerts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          filters: Joi.object().keys({
              account_id: Joi.objectId().optional().allow('').trim().description('ID of a company')
            })
            .optional().description('Filters parameters')
        }
      },
      response: {
        schema: routeModels.listOfTrafficAlertsModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/traffic_alerts',
    config: {
      auth: {
        scope: ['revadmin_rw', 'reseller_rw', 'admin_rw']
      },
      handler: trafficAlerts.createTrafficAlert,
      description: 'Create a new trafficAlert',
      notes: 'Use this call to create a new trafficAlert, if account_id is not specified, the API account will be used.',
      tags: ['api', 'trafficAlerts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          name: Joi.string().min(2).max(100).required(),
          account_id: Joi.objectId().required(),
          notifications_list_id: Joi.objectId().required(),
          target_type: Joi.string().allow(['domain']).required(),
          target: Joi.string().required(),
          rule_type: Joi.string().allow(['statusCode_frequency', 'Spike']).required(),
          rule_config: Joi.object()
            .keys({
              timeframe_type: Joi.string().allow('minutes', 'hours', 'days').description('Timeframe type'),
              responses: Joi.number().min(1).max(10000000).description('Number Of Responses value'),
              timeframe: Joi.number().description('Timeframe'),
              status_code: Joi.number().description('Status Code'),
              spike_amount: Joi.number().description('Spike Ammount'),
              spike_direction: Joi.string().allow('up', 'down', 'both').optional().description('Spike Direction'),
            })

            .when('rule_type', {
              is: 'statusCode_frequency',
              then: RuleTypeConfig_StatusCodeFrequency
            })
            .when('rule_type', {
              is: 'Spike',
              then: RuleTypeConfig_Spike
            }).required()
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'PUT',
    path: '/v1/traffic_alerts/{traffic_alert_id}',
    config: {
      auth: {
        scope: ['revadmin_rw', 'reseller_rw', 'admin_rw']
      },
      handler: trafficAlerts.updateTrafficAlert,
      description: 'Update a trafficAlert',
      notes: 'Use the function to update a trafficAlert.',
      tags: ['api', 'trafficAlerts'],
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
          traffic_alert_id: Joi.objectId().required().description('The ID of trafficAlert to be updated')
        },
        payload: {
          name: Joi.string().min(2).max(100).required(),
          account_id: Joi.objectId().required(),
          notifications_list_id: Joi.objectId().required(),
          target_type: Joi.string().allow(['domain']).required(),
          target: Joi.string().required(),
          rule_type: Joi.string().allow(['statusCode_frequency', 'Spike']).required(),
          rule_config: Joi.object().description('Rule Configuration')
            .keys({
              timeframe_type: Joi.string().optional().allow('minutes', 'hours', 'days').description('Timeframe type'),
              responses: Joi.number().optional().min(1).max(10000000).description('Number Of Responses value'),
              timeframe: Joi.number().optional().description('Timeframe'),
              status_code: Joi.number().optional().description('Status Code'),
              spike_amount: Joi.number().optional().description('Spike Ammount'),
              spike_direction: Joi.string().allow('up', 'down', 'both').optional().description('Spike Direction'),
            })
            .required()
            .when('rule_type', {
              is: 'statusCode_frequency',
              then: RuleTypeConfig_StatusCodeFrequency
            })
            .when('rule_type', {
              is: 'Spike',
              then: RuleTypeConfig_Spike
            }),
          silenced: Joi.boolean(),
          silence_until: Joi.date().allow([null, 'null'])
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/traffic_alerts/{traffic_alert_id}',
    config: {
      auth: {
        scope: ['revadmin', 'reseller', 'admin']
      },
      handler: trafficAlerts.getTrafficAlert,
      description: 'Get a trafficAlert',
      notes: 'Use the call to get the details of a trafficAlert.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          traffic_alert_id: Joi.objectId().required().description('trafficAlert ID')
        }
      },
      response: {
        schema: routeModels.trafficAlertModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/traffic_alerts/{traffic_alert_id}/status',
    config: {
      auth: {
        scope: ['revadmin', 'reseller', 'admin']
      },
      handler: trafficAlerts.getTrafficAlertStatus,
      description: 'Get alert rule status',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          traffic_alert_id: Joi.objectId().required().description('trafficAlert ID')
        }
      },
      response: {
        schema: routeModels.trafficAlertRuleStatus
      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/traffic_alerts/{traffic_alert_id}',
    config: {
      auth: {
        scope: ['revadmin_rw', 'reseller_rw', 'admin_rw']
      },
      handler: trafficAlerts.deleteTrafficAlert,
      description: 'Delete a trafficAlert',
      notes: 'Use the call to delete a trafficAlert from the system.',
      tags: ['api', 'trafficAlerts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          traffic_alert_id: Joi.objectId().required().description('trafficAlert ID to delete')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
