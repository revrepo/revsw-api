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

var account = require('../handlers/accounts');


var routeModels = require('../lib/routeModels');
var logShippingJobsService = require('../services/logShippingJobs.js');
var sslCertificates = require('../services/sslCertificates.js');
var emailService = require('../services/email.js');
module.exports = [{
    method: 'GET',
    path: '/v1/accounts',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: account.getAccounts,
      description: 'Get a list of customer accounts registered for a customer/reseller',
      notes: 'Use this function to get a list of customer accounts register on your reseller account',
      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.listOfAccountsModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/accounts',
    config: {
      auth: {
        scope: ['reseller_rw', 'revadmin_rw', 'apikey_rw']
      },
      handler: account.createAccount,
      description: 'Create a new customer account in the system',
      notes: 'As a reseller use the call to create a new customer account in the system',
      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          companyName: Joi.string().required().regex(routeModels.companyNameRegex).min(1).max(150)
            .trim().description('Company name of newly registered customer account'),
          vendor_profile: Joi.string().max(20).allow('').description('Vendor profile name'),
          comment: Joi.string().max(300).trim().allow('').description('Free-text comment about the company')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/accounts/{account_id}/billing_profile',
    config: {
      auth: {
        scope: ['reseller_rw', 'revadmin_rw', 'admin_rw', 'apikey_rw']
      },
      handler: account.createBillingProfile,
      description: 'Create a billing profile',
//      tags: ['api', 'accounts'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required()
        }
      },
      response: {
        schema: routeModels.accountModel
      }
    }
  },


  {
    method: 'PUT',
    path: '/v1/accounts/{account_id}',
    config: {
      auth: {
        scope: ['reseller_rw', 'revadmin_rw', 'admin_rw', 'apikey_rw']
      },
      handler: account.updateAccount,
      description: 'Update a customer account',
      notes: 'Use this function to update details of a customer account',
      tags: ['api', 'accounts'],
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
          account_id: Joi.objectId().required().description('Account ID to be updated')
        },
        payload: {
          companyName: Joi.string().required().regex(routeModels.companyNameRegex).min(1).max(150)
            .trim().description('Company name of newly registered customer account'),
          vendor_profile: Joi.string().allow('').max(20)
            .description('Vendor profile name'),
          comment: Joi.string().allow('').max(300).trim()
            .description('Free-text comment about the company'),
          first_name: Joi.string().optional().min(1).max(150).trim()
            .description('First name of contact person'),
          last_name: Joi.string().optional().min(1).max(150).trim()
            .description('Last name of contact person'),
          phone_number: Joi.string().min(1).max(30).trim()
            .description('Phone number').optional(),
          contact_email: Joi.string().email()
            .description('Contact email').optional(),
          address1: Joi.string().min(1).max(150).trim()
            .description('Address 1').optional(),
          address2: Joi.string().min(1).max(150).trim()
            .description('Address 2').optional().allow(''),
          country: Joi.string().min(1).max(150).trim()
            .description('Country').optional(),
          state: Joi.string().min(1).max(150).trim()
            .description('State').optional(),
          city: Joi.string().min(1).max(150).trim()
            .description('City').optional(),
          zipcode: Joi.string().min(1).max(30).trim()
            .description('Zip Code').optional(),
          // TODO: add proper  min/max restrictions for billing_plan
          billing_plan: Joi.string().trim()
            .description('Billing plan ID'),
          use_contact_info_as_billing_info: Joi.boolean()
            .description('Use contact info as billing info'),
          billing_info: Joi.object().optional()
            .description('Billing information for create Chargify Customer Account'),
          subscription_state: Joi.string().min(1).max(30).trim()
            .description('Subscription state (status)')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },


  {
    method: 'GET',
    path: '/v1/accounts/{account_id}',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: account.getAccount,
      description: 'Get details about a customer account',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account ID')
        }
      },
      response: {
        schema: routeModels.accountModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/accounts/{account_id}/statements',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: account.getAccountStatements,
      description: 'Get a list of billing statements',
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account ID')
        }
      },
      /*      response: {
              schema: routeModels.accountModel
            }*/
    }
  },

  {
    method: 'GET',
    path: '/v1/accounts/{account_id}/statements/{statement_id}',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: account.getAccountStatement,
      description: 'Get a specific billing statement',
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account ID'),
          statement_id: Joi.number().min(1).required().description('Statement ID')
        }
      }
      /*      response: {
       schema: routeModels.accountModel
       }*/
    }
  },

  {
    method: 'GET',
    path: '/v1/accounts/{account_id}/statements/{statement_id}/pdf',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: account.getPdfStatement,
      description: 'Get a billing statement in PDF format',
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account ID'),
          statement_id: Joi.number().min(1).required().description('Statement ID')
        }
      }
      /*      response: {
       schema: routeModels.accountModel
       }*/
    }
  },

  {
    method: 'GET',
    path: '/v1/accounts/{account_id}/transactions',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: account.getAccountTransactions,
      description: 'Get a list of billing transactions',
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account ID')
        }
      },
      /*      response: {
       schema: routeModels.accountModel
       }*/
    }
  }, {
    method: 'GET',
    path: '/v1/accounts/{account_id}/subscription_preview/{billing_plan_handle}',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: account.getAccountSubscriptionPreview,
      description: 'Get an information preview about billing plan migration process',
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account ID'),
          billing_plan_handle: Joi.string().required().description('Billing plan handle name')
        }
      },
      /*      response: {
       schema: routeModels.accountModel
       }*/
    }
  }, {
    method: 'GET',
    path: '/v1/accounts/{account_id}/subscription_summary',
    config: {
      auth: {
        scope: ['admin', 'reseller', 'revadmin', 'apikey']
      },
      handler: account.getAccountSubscriptionSummary,
      description: 'Get a subscription summary for an account',
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account ID')
        }
      },
      // TODO: add route Model
      /*      response: {
       schema: routeModels.accountModel
       }*/
    }
  },

  {
    method: 'DELETE',
    path: '/v1/accounts/{account_id}',
    config: {
      auth: {
        scope: ['reseller_rw', 'revadmin_rw', 'admin_rw', 'apikey_rw']
      },
      handler: account.deleteAccount,
      description: 'Remove a customer account',
      notes: 'This function should be used by a reseller to delete a customer account belonging to the reseller',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          account_id: Joi.objectId().required().description('Account ID to delete')
        },
        payload: {
          cancellation_message: Joi.string().optional().allow(null).trim().allow('').max(300)
            .description('Free-text comment about reason delete the account')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
