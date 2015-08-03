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

var domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;

var statusModel = Joi.object({
  statusCode: Joi.number().description('Operation status code (should be equal to HTTP response code)'),
  error: Joi.string().description('Optional description of statusCode'),
  message: Joi.string().description('Optional message'),
  request_id: Joi.string().description('Optional request ID for asynchronous requsts like domain configuration change or object page'),
  object_id: Joi.objectId().description('Optional object ID for newly created objects like users, accounts, domains, etc.')
}).meta({
  className: 'Status'
});

var statusModel_v0 = Joi.object({
  status: Joi.number().description('Operation status code (should be equal to HTTP response code)'),
  error: Joi.string().description('Optional description of statusCode'),
  message: Joi.string().description('Optional message'),
  request_id: Joi.string().description('Optional request ID for asynchronous requsts like domain configuration change or object page'),
  req_id: Joi.string().description('Optional request ID for asynchronous requsts like domain configuration change or object page'),
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
},

//
// Purge calls
//

{
  method: 'POST',
  path: '/purge',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.purgeObject_v0,
    description: 'Purge Objects - obsolete API version',
    notes: ['Purge object from Rev edge caching servers'],
    tags: ['api', 'purge'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      payload: {
        domainName: Joi.string().regex(domainRegex).required().description('Domain name to purge objects for'),
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
      schema: statusModel_v0
    }
  }
},

{
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
        domainName: Joi.string().regex(domainRegex).required().description('Domain name to purge objects for'),
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
}, 

{
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
  method: 'POST',
  path: '/checkStatus',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.getPurgeJobStatus_v0,
    description: 'Get the status of a previously submitted purge request - obsolete API version',
    tags: ['api', 'purge'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      payload: {
        req_id: Joi.string().trim().length(36)
          .required()
          .description('The ID of previously submitted purge request')
      }
    },
    response: {
      schema: statusModel_v0
    }
  }
},


//
//  User-related calls
//

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
        domain: Joi.array().items( Joi.string().regex(domainRegex).description('Domain name the user should have access to') ),
        access_control_list: Joi.object( {
          dashBoard: Joi.boolean().required().default(true).description('Access to the portal Dashboard section'),
          reports: Joi.boolean().required().default(true).description('Access to the portal REPORTS section'),
          configure: Joi.boolean().required().description('Access to the portal CONFIGURE section'),
          test: Joi.boolean().required().description('Access to the portal TEST section'),
          readOnly: Joi.boolean().required().description('Enable read-only access to the configuration')
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
    description: 'Update a user profile',
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
        firstname: Joi.string().trim().description('First name'),
        lastname: Joi.string().description('Last name'),
        password: Joi.string().min(8).max(15).description('New Password'),
        companyId: Joi.array().items( Joi.objectId().description('Optional account ID of the account the user should be created for' ) ),
        domain: Joi.array().items( Joi.string().regex(domainRegex).description('Domain name the user should have access to') ),
        access_control_list: Joi.object( {
          dashBoard: Joi.boolean().default(true).description('Access to the portal Dashboard section'),
          reports: Joi.boolean().default(true).description('Access to the portal REPORTS section'),
          configure: Joi.boolean().description('Access to the portal CONFIGURE section'),
          test: Joi.boolean().description('Access to the portal TEST section'),
          readOnly: Joi.boolean().description('Enable read-only access to the configuration')
        }),
        role: Joi.string().valid('user','admin').description('User role (user/admin)'),
        theme: Joi.string().valid('light','dark').description('Portal color scheme (light/dark)')
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

//
// Domain-related calls
//

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
  path: '/v1/domains/{domain_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user', 'admin', 'reseller' ]
    },
    handler: handlers.getDomain,
    description: 'Get basic domain configuration',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        domain_id: Joi.objectId().required().description('Domain ID')
      }
    },
  }
},

 {
  method: 'GET',
  path: '/v1/domains/{domain_id}/details',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user', 'admin', 'reseller' ]
    },
    handler: handlers.getDomainDetails,
    description: 'Get detailed domain configuration',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        domain_id: Joi.objectId().required().description('Domain ID')
      }
    },
  }
},


 {
  method: 'POST',
  path: '/v1/domains',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user_rw', 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.createDomain,
    description: 'Create a new domain configuration',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      payload: {
        // TODO: Enforce strict domain names (not string())
        name: Joi.string().regex(domainRegex)
          .required().description('The name of the new domain to be registered in the system'),
        companyId: Joi.objectId().required().description('Account ID of the account the domain should be created for' ),
        origin_host_header: Joi.string().regex(domainRegex).required()
          .description('"Host" header value used when accessing the origin server'),
        origin_server: Joi.string().required().description('Origin server host name or IP address'),
        origin_server_location: Joi.string().required().description('The name of origin server location'),
        tolerance: Joi.string().required().description('APEX metric for RUM reports')
      }
    },
  }
},

 {
  method: 'PUT',
  path: '/v1/domains/{domain_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user_rw', 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.updateDomain,
    description: 'Update basic domain configuration',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        domain_id: Joi.objectId().required().description('Domain ID')
      },
      payload: {
        // TODO: Enforce strict domain names (not string())
        companyId: Joi.objectId().required().description('Account ID of the account the domain should belong to'),
        origin_host_header: Joi.string().regex(domainRegex).required()
          .description('"Host" header value used when accessing the origin server'),
        origin_server: Joi.string().required().description('Origin server host name or IP address'),
        origin_server_location: Joi.string().required().description('The name of origin server location'),
        tolerance: Joi.string().required().description('APEX metric for RUM reports')
      }
    },
  }
},

 {
  method: 'PUT',
  path: '/v1/domains/{domain_id}/details',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user_rw', 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.updateDomainDetails,
    description: 'Update detailed domain configuration',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        domain_id: Joi.objectId().required().description('Domain ID')
      },

      payload: {
        rev_component_co: Joi.object( {
          enable_rum: Joi.boolean().required(),
          enable_optimization: Joi.boolean().required(),
          mode: Joi.string().valid( 'least', 'moderate', 'aggressive', 'custom', 'adaptive' ).required(),
          img_choice: Joi.string().valid( 'off', 'low', 'medium', 'high' ).required(),
          js_choice: Joi.string().valid( 'off', 'low', 'medium', 'high' ).required(),
          css_choice: Joi.string().valid( 'off', 'low', 'medium', 'high' ).required(),
        }).required(),
        rev_component_bp: Joi.object( {
          enable_cache: Joi.boolean().required(),
          block_crawlers: Joi.boolean().required(),
          cdn_overlay_urls: Joi.array().items( Joi.string()).required(),
          caching_rules: Joi.array().items( {
            version: Joi.number().valid(1).required(),
            url: Joi.object( {
              is_wildcard: Joi.boolean().required(),
              value: Joi.string().required(),
            }).required(),
            edge_caching: Joi.object( {
              override_origin: Joi.boolean().required(),
              new_ttl: Joi.number().integer().required(),
              override_no_cc: Joi.boolean().required()
            }).required(),
            browser_caching: Joi.object( {
              override_edge: Joi.boolean().required(),
              new_ttl: Joi.number().integer().required(),
              force_revalidate: Joi.boolean().required(),
            }).required(),
            cookies: Joi.object( {
              override: Joi.boolean().required(),
              ignore_all: Joi.boolean().required(),
              list_is_keep: Joi.boolean().required(),
              keep_or_ignore_list: Joi.array().items( Joi.string() ).required(),
              remove_ignored_from_request: Joi.boolean().required(),
              remove_ignored_from_response: Joi.boolean().required()
            }).required(),
          }).required(),
          enable_security: Joi.boolean().required(),
          web_app_firewall: Joi.string().valid( 'off', 'detect', 'block', 'block_all' ).required(),
          acl: Joi.object( {
            enabled: Joi.boolean().required(),
            action: Joi.string().valid( 'deny_except', 'allow_except' ).required(),
            acl_rules: Joi.array().items ({
              host_name: Joi.string().allow('').required(),
              subnet_mask: Joi.string().allow('').required(),
              country_code: Joi.string().allow('').required(),
              header_name: Joi.string().allow('').required(),
              header_value: Joi.string().allow('').required(),
            }).required()
          }).required(),
          cache_bypass_locations: Joi.array().items( Joi.string()).required()
        }).required(),
      }
    },
  }
},


 {
  method: 'DELETE',
  path: '/v1/domains/{domain_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user_rw', 'admin_rw', 'reseller_rw' ]
    },
    handler: handlers.deleteDomain,
    description: 'Delete a domain',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        domain_id: Joi.objectId().required().description('Domain ID')
      },
    }
  }
},



//
// Account-related calls
//

 {
  method: 'GET',
  path: '/v1/accounts',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'reseller' ]
    },
    handler: handlers.getAccounts,
    description: 'Get a list of customer accounts registered for a customer/reseller',
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
    description: 'Create a new customer account in the system',
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


//
// Account-related calls
//

 {
  method: 'GET',
  path: '/v1/locations/firstmile',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'admin', 'reseller' ]
    },
    handler: handlers.getFirstMileLocations,
    description: 'Get a list of Rev first mile locations',
    tags: ['api', 'locations'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    }
  }
},


//
// Health check calls
//

 {
  method: 'GET',
  path: '/healthcheck',
  config: {
    handler: handlers.healthCheck,
    description: 'Run a quick system health check ',
    tags: [],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    }
  }
}



];


exports.routes = routes;
