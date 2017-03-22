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

var routeModels = require('../models');
var ROUTE_IDS = require('../ids');

module.exports = [{
  method: 'GET',
  path: '/v1/dashboards',
  config: {
    id: ROUTE_IDS.DASHBOARDS.GET.ALL,
    auth: {
      scope: ['user', 'admin', 'reseller', 'revadmin']
    },
    description: 'Get a list of dashboards',
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
    id: ROUTE_IDS.DASHBOARDS.POST.NEW,
    auth: {
      scope: ['user', 'admin', 'reseller', 'revadmin']
    },
    description: 'Create a new dashboard',
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
        options: Joi.object().description('Options dashboard'),
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
    id: ROUTE_IDS.DASHBOARDS.GET.ONE,
    auth: {
      scope: ['user', 'admin', 'reseller', 'revadmin']
    },
    description: 'Get a dashboard',
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
    id: ROUTE_IDS.DASHBOARDS.PUT.ONE,
    auth: {
      scope: ['user', 'admin', 'reseller', 'revadmin']
    },
    description: 'Update a dashboard',
    notes: 'Use this function to update dashboard information',
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
    id: ROUTE_IDS.DASHBOARDS.DELETE.ONE,
    auth: {
      scope: ['user', 'admin', 'reseller', 'revadmin']
    },
    description: 'Remove a dashboard',
    notes: 'This function should be used  to delete a dashboard',
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
