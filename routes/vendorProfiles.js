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

var vendorProfile = require('../handlers/vendorProfiles');


var routeModels = require('../lib/routeModels');
module.exports = [{
    method: 'GET',
    path: '/v1/vendor_profiles',
    config: {
      auth: {
        scope: ['revadmin']
      },
      handler: vendorProfile.getVendorProfiles,
      description: 'Get a list of vendor profile names',
      notes: 'Use this function to get a list of vendor profile names',
      //tags: ['api', 'vendor_profiles'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.listOfVendorProfileNamesModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/vendor_profiles/{vendorUrl}',
    config: {
      auth: false,
      handler: vendorProfile.getVendorProfile,
      description: 'Get a vendor profile by customer portal URL',
      notes: 'Use this function to get a vendor profile by customer portal URL',
      validate: {
        params: {
          vendorUrl: Joi.string().required().description('Customer Portal URL')
        }
      },
      response: {
        schema: routeModels.vendorProfileConfig
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/vendor_profiles/name/{vendor}',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: vendorProfile.getVendorProfileByName,
      description: 'Get a vendor profile by name',
      notes: 'Use this function to get a vendor profile by name',
      validate: {
        params: {
          vendor: Joi.string().required().description('Vendor name')
        }
      },
      response: {
        schema: routeModels.vendorProfileConfig
      }
    }
  },

  {
    method: 'PUT',
    path: '/v1/vendor_profiles/{account_id}',
    config: {
      auth: {
        scope: ['revadmin']
      },
      handler: vendorProfile.updateAccountVendor,
      description: 'Update vendor for account',
      notes: 'Use this function to update vendor for account',
      validate: {
        params: {
          account_id: Joi.string().required().description('Account ID')
        },
        payload: {
          vendor_profile: Joi.string().required().description('Vendor profile')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
