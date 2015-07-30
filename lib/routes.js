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
var hapi = require('hapi'),
  Joi = require('joi'),
  handlers = require('../lib/handlers.js');

Joi.objectId = require('joi-objectid');

var statusModel = Joi.object({
  statusCode: Joi.number().description('Operation status code (should be equal to HTTP response code)'),
  error: Joi.string().description('Optional description of statusCode'),
  message: Joi.string().description('Optional message'),
  request_id: Joi.string().description('Optional request ID for asynchronous requsts like domain configuration change or object page'),
  object_id: Joi.objectId().description('Optional object ID for newly created objects like users, accounts, domains, etc.')
}).meta({
  className: 'Status'
});

var listOfUsersModel = Joi.array({
  user_id: Joi.objectId().required().description('User ID'),
  login: Joi.string().email().required().description('Login name (email address)'),
  account_id: Joi.objectId().required().description('The ID of customer account the user belongs to')
}).meta({
  className: 'List of Users'
});

var listOfDomainsModel = Joi.array({
  domain_id: Joi.objectId().required().description('Domain ID'),
  domain_name: Joi.string().required().description('Domain name'),
  account_id: Joi.objectId().required().description('The ID of customer account the domain belongs to')
}).meta({
  className: 'List of Domains'
});



var listOfAccountsModel = Joi.array({
  id: Joi.objectId().required().description('Account ID'),
  companyName: Joi.string().required().description('Company name'),
  createdBy: Joi.string().email().required().description('User which created the account'),
  created_at: Joi.date().required().description('Account creation date/time'),
  updated_at: Joi.date().required().description('Account last update date/time')
}).meta({
  className: 'List of Accounts'
});



var standardHTTPErrors = [{
  code: 400,
  message: 'Bad Request'
}, {
  code: 500,
  message: 'Internal Server Error'
}];

var extendedHTTPErrors = [{
  code: 400,
  message: 'Bad Request'
}, {
  code: 404,
  message: 'Sum not found'
}, {
  code: 500,
  message: 'Internal Server Error'
}];

var fileHTTPErrors = [{
  code: 400,
  message: 'Bad Request'
}, {
  code: 415,
  message: 'Unsupported Media Type'
}, {
  code: 500,
  message: 'Internal Server Error'
}];




// adds the routes and validation for api
var routes = [{
  method: 'GET',
  path: '/',
  config: {
    handler: handlers.index
  }
}, {
  method: 'GET',
  path: '/reduced',
  config: {
    handler: handlers.reduced
  }
}, {
  method: 'GET',
  path: '/license',
  config: {
    handler: handlers.license
  }
}, {
  method: 'GET',
  path: '/images/{file*}',
  handler: {
    directory: {
      path: './node_modules/hapi-swagger/public/swaggerui/images'
    }
  }
}, {
  method: 'GET',
  path: '/{path*}',
  handler: {
    directory: {
      path: './public',
      listing: false,
      index: true
    }
  }
}, {
  method: 'POST',
  path: '/v1/purge',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.purgeObject,
    description: 'Purge Objects',
    notes: ['Purge object from Rev edge caching servers'],
    tags: ['api', 'purge'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      payload: {
        domain: Joi.string().required().description('Domain name to purge objects for'),
        purges: Joi.array().items({
          url: Joi.object({
            is_wildcard: Joi.boolean().required()
              .description('Set true if "expression" is a regular expression, set to "false" if the "expression" is a wildcard pattern'),
            expression: Joi.string().required().description('Wildcard expression if "is_wildcard" is set to true, otherwise - a regular expression')
          })
        }).required().description('Array of URLs to purge')
      }
    },
    response: {
      schema: statusModel
    }
  }
},  {
  method: 'GET',
  path: '/v1/purge/{request_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.getPurgeJobStatus,
    description: 'Get the status of a previously submitted purge request',
    tags: ['api', 'purge'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        request_id: Joi.string().trim().length(36)
          .required()
          .description('The ID of previously submitted purge request')
      }
    },
    response: {
      schema: statusModel
    }
  }
},

 {
  method: 'GET',
  path: '/v1/users',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin', 'reseller' ],
    },
    handler: handlers.getUsers,
    description: 'Get a list of users registered for a customer account',
    tags: ['api', 'users'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    response: {
      schema: listOfUsersModel
    }
  }
},

{
  method: 'POST',
  path: '/v1/users',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.createUser,
    description: 'Create a new user in the system',
    tags: ['api', 'users'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      payload: {
        email: Joi.string().email().required().trim().description('User email address also used as login name'),
        firstname: Joi.string().required().trim().description('First name'),
        lastname: Joi.string().required().description('Last name'),
        password: Joi.string().min(8).max(15).required().description('Password'),
        companyId: Joi.array().items( Joi.objectId().description('Optional account ID of the account the user should be created for' ) ),
        domain: Joi.array().items( Joi.string().description('Domain name the user should have access to') ),
        access_control_list: Joi.object( {
          dashBoard: Joi.boolean().required().default(true).description('Access to the portal dashboard section'),
          reports: Joi.boolean().required().default(true).description('Access to the portal REPORTS section'),
          configure: Joi.boolean().required().description('Access to the portal CONFIGURE section'),
          test: Joi.boolean().required().description('Access to the portal TEST section'),
          readOnly: Joi.boolean().required().description('Enabled read-only access to the configuration')
        }),
        role: Joi.string().required().valid('user','admin').description('User role (user/admin)'),
        theme: Joi.string().required().valid('light','dark').description('Portal color scheme (light/dark)')
      } 
    },
    response: {
      schema: statusModel
    }
  }
},

{
  method: 'PUT',
  path: '/v1/users/{user_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.updateUser,
    description: 'Update a user',
    tags: ['api', 'users'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: { 
      params: {
        user_id: Joi.objectId().required().description('The ID of user to be updated')
      },
      payload: {
        email: Joi.string().email().trim().description('User email address also used as login name'),
        firstname: Joi.string().trim().description('First name'),
        lastname: Joi.string().trim().description('Last name'),
        password: Joi.string().min(8).max(15).description('Password - should from 8 to 14 characters')
      }
    }
  }
},


 {
  method: 'GET',
  path: '/v1/users/{user_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin', 'reseller' ]
    },
    handler: handlers.getUser,
    description: 'Get a user profile',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        user_id: Joi.objectId().required().description('User ID')
      }
    }
  }
},

 {
  method: 'DELETE',
  path: '/v1/users/{user_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.deleteUser,
    description: 'Delete a user',
    tags: ['api', 'users'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        user_id: Joi.objectId().required().description('User ID')
      }
    },
    response: {
      schema: statusModel
    }
  }
},


 {
  method: 'GET',
  path: '/v1/domains',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user', 'admin', 'reseller' ]
    },
    handler: handlers.getDomains,
    description: 'Get a list of domains registered for a customer',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    response: {
      schema: listOfDomainsModel
    }
  }
},


 {
  method: 'GET',
  path: '/v1/accounts',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'reseller' ]
    },
    handler: handlers.getAccounts,
    description: 'Get a list of customer accounts registered by a customer/reseller',
    tags: ['api', 'accounts'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    response: {
      schema: listOfAccountsModel
    }
  }
},

{
  method: 'POST',
  path: '/v1/accounts',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'reseller_rw' ]
    },
    handler: handlers.createAccount,
    description: 'Create a new account in the system',
    tags: ['api', 'accounts'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      payload: {
        companyName: Joi.string().required().trim().description('Company name')
      }
    },
    response: {
      schema: statusModel
    }
  }
},


{
  method: 'PUT',
  path: '/v1/accounts/{account_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'reseller_rw' ]
    },
    handler: handlers.updateAccount,
    description: 'Update a customer account',
    tags: ['api', 'accounts'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        account_id: Joi.objectId().required().description('Account ID to be updated')
      },
      payload: {
        companyName: Joi.string().required().trim().description('Company name')
      }
    },
  }
},


 {
  method: 'GET',
  path: '/v1/accounts/{account_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'reseller' ]
    },
    handler: handlers.getAccount,
    description: 'Get details about a customer account',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        account_id: Joi.objectId().required().description('Account ID')
      }
    }
  }
},

 {
  method: 'DELETE',
  path: '/v1/accounts/{account_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'reseller_rw' ]
    },
    handler: handlers.deleteAccount,
    description: 'Remove a customer account',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        account_id: Joi.objectId().required().description('Account ID')
      }
    }
  }
},


];


exports.routes = routes;
