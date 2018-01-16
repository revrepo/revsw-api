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

/*jslint node: true */

'use strict';

var Joi = require('joi');

var locations = require('../handlers/locations');
var networkIPBlocks = require('../handlers/networkIPBlocks');
var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/locations/firstmile',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: locations.getFirstMileLocations,
      description: 'Get a list of first mile network locations',
      validate:{
        query:{
          account_id: Joi.objectId().optional().trim().description('ID of a company')
        }
      },
      tags: ['api', 'locations'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.listOfFirstMileLocationsModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/locations/lastmile',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: locations.getLastMileLocations,
      description: 'Get a list of last mile (edge) network locations',
      tags: ['api', 'locations'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.listOfLastMileLocationsModel
      }
    }
  },


  {
    method: 'GET',
    path: '/v1/locations/network_ip_blocks',
    config: {
      auth: {
        scope: ['user', 'admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: networkIPBlocks.getServersIPList,
      description: 'Get a list of CDN IP Blocks',
      tags: ['api', 'locations'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      // response: {
      //   schema: routeModels.listOfLastMileLocationsModel
      // }
    }
  },

  {
    method: 'GET',
    path: '/v1/locations/billing_zones',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: locations.getBillingZones,
      description: 'Get a list of last mile (edge) locations and assignment to billing zones',
      tags: ['api', 'locations'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.listOfBillingZonesModel
      }
    }
  }

];
