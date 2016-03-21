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

/*jslint node: true */

'use strict';

var Joi = require('joi');

var getDashboarsList = require('../handlers/getCountriesList');
var dashboars = require('../handlers/dashboards');
var routeModels = require('../lib/routeModels');

module.exports = [{
  method: 'GET',
  path: '/v1/dashboards',
  config: {
    auth: {
      scope: ['user', 'admin', 'reseller', 'revadmin']
    },
    handler: dashboars.getDashboards,
    description: 'Get a list of dashboards',
    tags: ['api', 'dashboars'],
    plugins: {
      'hapi-swagger': {
        responseMessages: routeModels.standardHTTPErrors
      }
    },
    response: {
      schema: routeModels.listOfDashboardsModel
    }
  }
}, {
  method: 'POST',
  path: '/v1/dashboards',
  config: {
    auth: {
      scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw']
    },
    handler: dashboars.createDashboard,
    description: 'Create a new dashboard',
    tags: ['api', 'dashboars'],
    plugins: {
      'hapi-swagger': {
        responseMessages: routeModels.standardHTTPErrors
      }
    },
    validate: {
      options: {
        // TODO: do we need to statement?
        stripUnknown: true
      },
      payload: {
        title: Joi.string().required().min(1).max(150)
          .trim().description('Dashboard title for screen display'),
        structure: Joi.string().max(50).trim().description('Name type dashboard structure'),
        rows: Joi.array().description('Dashboard rows content')
      }
    },
    response: {
      schema: routeModels.statusModel
    }
  }
}, {
  method: 'GET',
  path: '/v1/dashboards/{dashboard_id}',
  config: {
    auth: {
      scope: ['user', 'admin', 'reseller', 'revadmin']
    },
    handler: dashboars.getDashboard,
    description: 'Get a dashboard',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: routeModels.standardHTTPErrors
      }
    },
    validate: {
      params: {
        dashboard_id: Joi.objectId().required().description('Dashboard ID')
      }
    },
    response: {
      schema: routeModels.dashboardModel
    }
  }
}, {
  method: 'PUT',
  path: '/v1/dashboards/{dashboard_id}',
  config: {
    auth: {
      scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw']
    },
    handler: dashboars.updateDashboard,
    description: 'Update a dashboard',
    notes: 'Use this function to update dashboard information',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: routeModels.standardHTTPErrors
      }
    },
    validate: {
      options: {
        stripUnknown: false // TODO: make true
      },
      params: {
        dashboard_id: Joi.string().required().description('ID of the dashboard to be updated')
      },

    },
    response: {
      schema: routeModels.statusModel
    }
  }
}, {
  method: 'DELETE',
  path: '/v1/dashboards/{dashboard_id}',
  config: {
    auth: {
      scope: ['user_rw', 'admin_rw', 'reseller_rw', 'revadmin_rw']
    },
    handler: dashboars.deleteDashboard,
    description: 'Remove a dashboard',
    notes: 'This function should be used  to delete a dashboard',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: routeModels.standardHTTPErrors
      }
    },
    validate: {
      params: {
        dashboard_id: Joi.objectId().required().description('ID of the dashboatd to be deleted')
      }
    },
    response: {
      schema: routeModels.statusModel
    }
  }
}];
