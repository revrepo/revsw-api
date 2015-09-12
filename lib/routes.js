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

// var domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
var domainRegex = /(?=^.{4,253}$)(^((?!-)(?!\_)[a-zA-Z0-9-\_]{0,62}[a-zA-Z0-9]\.)+[a-zA-Z]{2,63}$)/;

var statusModel = Joi.object({
  statusCode: Joi.number().required().description('Operation status code (should be equal to HTTP response code)'),
  error: Joi.string().description('Optional description of statusCode'),
  message: Joi.string().required().description('Status message'),
  object_id: Joi.objectId().description('Optional object ID for newly created objects like users, accounts, domains, etc.'),
  request_id: Joi.string().trim().length(36).description('Optional request ID of submitted object purge requests.')
}).meta({
  className: 'Status'
});

var purgeResponseModel_v0 = Joi.object({
  status: Joi.number().description('Operation status code (should be equal to HTTP response code)'),
  message: Joi.string().description('Optional message'),
  request_id: Joi.string().description('Optional request ID for asynchronous requsts like domain configuration change or object page'),
}).meta({
  className: 'Purge Submit Response'
});


var purgeStatusModel_v0 = Joi.object({
  status: Joi.number().description('Operation status code (should be equal to HTTP response code)'),
  message: Joi.string().description('Optional message'),
  req_id: Joi.string().description('Optional request ID for asynchronous requsts like domain configuration change or object page'),
}).meta({
  className: 'Purge Status Response'
});


var listOfUsersModel = Joi.array().items({
  user_id: Joi.objectId().required().description('User ID'),
  email: Joi.string().email().required().description('Login name (email address)'),
  companyId: Joi.array().items( Joi.objectId().required().description('The ID of customer account the user belongs to') ),
  domain: Joi.array().items( Joi.string().description('Domain name the customer can manage') ).required(),
  firstname: Joi.string().required().description('First name'),
  lastname: Joi.string().required().description('Last name'),
  role: Joi.string().required().description('User role'),
}).meta({
  className: 'List of Users'
});

var userModel = Joi.object({
  user_id: Joi.objectId().required().description('User ID'),
  email: Joi.string().email().required().description('Login name (email address)'),
  companyId: Joi.array().items( Joi.objectId().required().description('The ID of customer account the user belongs to') )
    .description('An array of company IDs managed by the user'),
  domain: Joi.array().items( Joi.string().description('Domain name the customer can manage') ).required()
    .description('An array of domain names managed by the user'),
  firstname: Joi.string().required().description('First name'),
  lastname: Joi.string().required().description('Last name'),
  role: Joi.string().required().description('User role'),
  theme: Joi.string().required().description('User portal color schema'),
  created_at: Joi.date().required().description('User account creation date/time'),
  updated_at: Joi.date().required().description('User account last update date/time'),
  access_control_list: Joi.object({
    readOnly: Joi.boolean().description('Read-only flag'),
    test: Joi.boolean().description('Access flag to TEST portal section'),
    configure: Joi.boolean().description('Access flag to CONFIGURE portal section'),
    reports: Joi.boolean().description('Access flag to REPORTS portal section'),
    dashBoard: Joi.boolean().description('Access flag to DASHBOARD portal section')
  }).meta({ className: 'User Permission Flag'})
}).meta({
  className: 'User profile details'
});


var listOfFirstMileLocationsModel = Joi.array().items({
  locationName: Joi.string().required().description('The name of Rev first mile location'),
  id: Joi.string().required().description('Location ID'),
}).meta({
  className: 'List of Rev first mile locations'
});


var listOfDomainsModel = Joi.array().items({
  companyId: Joi.objectId().required().description('The ID of customer account (company) managing the domain'),
  id: Joi.objectId().required().description('Domain ID'),
  name: Joi.string().required().description('Domain name'),
  sync_status: Joi.string().required().description('Domain configuration publishing status'),
  cname: Joi.string().required().description('CNAME record which should be used to point the domain to RevAPM platform'),
}).meta({
  className: 'List of Domains'
});


var domainModel = Joi.object({
  companyId: Joi.objectId().required().description('The ID of customer account (company) managing the domain'),
  id: Joi.objectId().required().description('Domain ID'),
  name: Joi.string().required().description('Domain name'),
  sync_status: Joi.string().required().description('Domain configuration publishing status'),
  cname: Joi.string().required().description('CNAME record which should be used to point the domain to RevAPM platform'),
  origin_server: Joi.string().required().description('DNS name or IP address of customer origin server which provides the domain\'s content'),
  tolerance: Joi.string().required().description('APEX metric for RUM reports'),
  created_at: Joi.date().required().description('Domain creation date/time'),
  updated_at: Joi.date().required().description('Domain last update date/time'),
  origin_server_location: Joi.string().required().description('Rev\' first mile location used to access the origin server'),
  origin_host_header: Joi.string().required().description('The valud of HTTP "Host" request header used while accessing the customer origin server')
}).meta({
  className: 'Basic domain configuration'
});


var listOfAccountsModel = Joi.array().items({
  id: Joi.objectId().required().description('Account ID'),
  companyName: Joi.string().required().description('Company name'),
  createdBy: Joi.string().required().description('User which created the account'),
  created_at: Joi.date().required().description('Account creation date/time'),
  updated_at: Joi.date().required().description('Account last update date/time')
}).meta({
  className: 'List of Accounts'
});


var accountModel = Joi.object({
  id: Joi.objectId().required().description('Account ID'),
  companyName: Joi.string().required().description('Company name'),
  createdBy: Joi.string().required().description('User which created the account'),
  created_at: Joi.date().required().description('Account creation date/time'),
  updated_at: Joi.date().required().description('Account last update date/time')
}).meta({
  className: 'Account Details'
});


var standardHTTPErrors = [{
  code: 400,
  message: 'Bad Request'
}, {
  code: 401,
  message: 'Unauthorized'
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
    notes: ['Purge object from Rev edge caching servers. You can specify multiple URL objects to purge several files at once.'],
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
      schema: purgeResponseModel_v0
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
    description: 'Purge objects cached on Rev edge servers',
    notes: 'Use the function to purge objects from Rev edge caching servers. You can specify several "url" objects to purge multiple cached ' + 
      'objects at once. After a purge request is submitted to the system you should remember received "request_id" ID and use it to check ' +
      'the status of the request using /v1/purge/{request_id} GET call.',
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
    notes: 'Use the call to get the status of a previously submitted object purge request.',
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
    handler: handlers.getPurgeJobStatus_v0,
    description: 'Get the status of a previously submitted purge request - obsolete API version',
    notes: 'Use the call to check the status of a previously submitted object purge request submitted via /purge API end point (obsolete API call).',
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
      schema: purgeStatusModel_v0
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
    description: 'Get a list of registered users',
    notes: 'Use the call to receive a list of users register for your customer account.',
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
    notes: 'Use the call to create a new user account in the system. If you will not specify "companyId" and "domain" attrributes ' +
      'the values will be inherited from your API user account.',
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
        }).required(),
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
    notes: 'Use the function to update a user profile.',
    tags: ['api', 'users'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: { 
      options: {
        stripUnknown: true
      },
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
    },
    response: {
      schema: statusModel
    }
  }
},

 {
  method: 'GET',
  path: '/v1/users/myself',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user', 'admin', 'reseller' ]
    },
    handler: handlers.getMyUser,
    description: 'Get your user profile',
    notes: 'Use the call to get the details of your user account.',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    response: {
      schema: userModel
    }
  }
},


{
  method: 'PUT',
  path: '/v1/users/password/{user_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user', 'admin', 'reseller' ]
    },
    handler: handlers.updateUserPassword,
    description: 'Update a user\'s password',
    notes: 'Use the function to update a user\'s password.',
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
        current_password: Joi.string().min(8).max(15).required().description('Current User Password'),
        new_password: Joi.string().min(8).max(15).required().description('New Password')
      }
    },
    response: {
      schema: statusModel
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
    notes: 'Use the call to get the details of a user account.',
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
    },
    response: {
      schema: userModel
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
    notes: 'Use the call to delete a user account from the system.',
    tags: ['api', 'users'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        user_id: Joi.objectId().required().description('User ID to delete')
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
    notes: 'Use the call to receive a list of domains managed by the API user.',
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
    notes: 'Use the call to receive basic domain configuration for specified domain ID.',
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
    response: {
      schema: domainModel
    }
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
    notes: 'Use the function to retrieve detailed domain configuration which includes caching rules, ALC, content optimization, SSL, etc.',
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
    notes: 'Use the call to create a new domain configuration with default caching/ALC/etc rules. After that you can use ' +
      '/v1/domains/{domain_id}/details calls to read and update many low-level domain configuration properties.',
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
    response: {
      schema: statusModel
    }
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
    notes: 'Use the call to update a domain\'s basic configuration like origin server, "Host" header value for origin reqiests, ' + 
      'etc. Use /v1/domains/{domain_id}/details API end-points ' +
      'to get/update detailed domain configuration like caching rules, ACL, content optimization, etc.',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      options: {
        stripUnknown: true
      },
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
    response: {
      schema: statusModel
    }
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
    notes: 'Use the function to update detailed domain configuration previously retreived using GET call for /v1/domains/{domain_id}/details end-point.',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      options: {
        stripUnknown: true
      },
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
            cookies_cache_bypass: Joi.array().items( Joi.string())
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
    response: {
      schema: statusModel
    }
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
    notes: 'Use the call to delete a domain configuration.',
    tags: ['api', 'domains'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        domain_id: Joi.objectId().required().description('Domain ID to delete')
      },
    },
    response: {
      schema: statusModel
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
    notes: 'Use this function to get a list of customer accounts register on your reseller account',
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
    notes: 'As a reseller use the call to create a new customer account in the system',
    tags: ['api', 'accounts'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      payload: {
        companyName: Joi.string().required().trim().description('Company name of newly registered customer account')
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
    notes: 'Use this function to update details of a customer account',
    tags: ['api', 'accounts'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
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
        companyName: Joi.string().required().trim().description('Company name')
      }
    },
    response: {
      schema: statusModel
    }
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
    },
    response: {
      schema: accountModel
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
    notes: 'This function should be used by a reseller to delete a customer account belonging to the reseller',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        account_id: Joi.objectId().required().description('Account ID to delete')
      }
    },
    response: {
      schema: statusModel
    }
  }
},


//
// Locations-related calls
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
    },
    response: {
      schema: listOfFirstMileLocationsModel
    }
  }
},

 {
  method: 'GET',
  path: '/v1/countries/list',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user', 'admin', 'reseller' ]
    },
    handler: handlers.getCountriesList,
    description: 'Get a list of country two-character codes',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
//    response: {
//      schema: listOfFirstMileLocationsModel
//    }
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
},

//
// Traffic stats
//

 {
  method: 'GET',
  path: '/v1/stats/{domain_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user', 'admin', 'reseller' ]
    },
    handler: handlers.getStats,
    description: 'Get traffic stats for a domain',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        domain_id: Joi.objectId().required().description('Domain ID')
      },
      query: {
        from_timestamp: Joi.number().integer().min(1).description('Report period start timestamp'),
        to_timestamp: Joi.number().integer().min(1).description('Report period end timestamp'),
        status_code: Joi.number().integer().min(100).max(600).description('HTTP status code to filter'),
        cache_code: Joi.string().valid( 'HIT', 'MISS' ).description('HTTP cache hit/miss status to filter'),
        request_status: Joi.string().valid( 'OK', 'ERROR' ).description('Request completion status to filter'),
        protocol: Joi.string().valid( 'HTTP', 'HTTPS' ).description('HTTP/HTTPS protocol to filter'),
//        http_protocol: Joi.string().valid( 'HTTP\/1.0', 'HTTP\/1.1' ).description('HTTP protocol version value to filter'),
        http_method: Joi.string().valid( 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH' )
          .description('HTTP method value to filter'),
        country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
        os: Joi.string().description('OS name/version to filter'),
        device: Joi.string().description('Device name/version to filter')
      }
    },
//    response: {
//      schema: statsModel
//    }
  }
},

 {
  method: 'GET',
  path: '/v1/stats/top_objects/{domain_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user', 'admin', 'reseller' ]
    },
    handler: handlers.getTopObjects,
    description: 'Get a list of top object requests for a domain',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        domain_id: Joi.objectId().required().description('Domain ID')
      },
      query: {
        from_timestamp: Joi.number().integer().min(1).description('Report period start timestamp (defaults to one hour ago from now)'),
        to_timestamp: Joi.number().integer().min(1).description('Report period end timestamp (defaults to now)'),
        count: Joi.number().integer().min(1).max(250).description('Number of top objects to report (default to 30)'),
        status_code: Joi.number().integer().min(100).max(600).description('HTTP status code to filter'),
        cache_code: Joi.string().valid( 'HIT', 'MISS' ).description('HTTP cache hit/miss status to filter'),
        request_status: Joi.string().valid( 'OK', 'ERROR' ).description('Request completion status to filter'),
        protocol: Joi.string().valid( 'HTTP', 'HTTPS' ).description('HTTP/HTTPS protocol to filter'),
//        http_protocol: Joi.string().valid( 'HTTP\/1.0', 'HTTP\/1.1' ).description('HTTP protocol version value to filter'),
        http_method: Joi.string().valid( 'GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'TRACE', 'OPTIONS', 'CONNECT', 'PATCH' )
          .description('HTTP method value to filter'),
        country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
        os: Joi.string().description('OS name/version to filter'),
        device: Joi.string().description('Device name/version to filter')
      }
    },
//    response: {
//      schema: statsModel
//    }
  }
},

 {
  method: 'GET',
  path: '/v1/stats/top/{domain_id}',
  config: {
    auth: {
      strategy: 'simple',
      scope: [ 'user', 'admin', 'reseller' ]
    },
    handler: handlers.getTopReports,
    description: 'Get a list of top traffic properties for a domain',
    tags: ['api'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        domain_id: Joi.objectId().required().description('Domain ID')
      },
      query: {
        from_timestamp: Joi.string().description('Report period start timestamp (defaults to one hour ago from now)'),
        to_timestamp: Joi.number().integer().min(1).description('Report period end timestamp (defaults to now)'),
        count: Joi.number().integer().min(1).max(250).description('Number of entries to report (default to 30)'),
        report_type: Joi.string().required().valid ( 'referer', 'status_code', 'cache_status', 'content_type', 'protocol', 'request_status',
          'http_protocol', 'http_method', 'content_encoding', 'os', 'device', 'country' ).description('Type of requested report (defaults to "referer")'),
        country: Joi.string().length(2).uppercase().regex(/[A-Z]{2}/).description('Two-letters country code of end user location to filter'),
      }
    },
//    response: {
//      schema: statsModel
//    }
  }
},

//
// Portal user password reset functions
//

 {
  method: 'POST',
  path: '/v1/forgot',
  config: {
    handler: handlers.forgotPassword,
    description: 'An internal portal call to initiate a password reset process for a user',
    tags: ['api', 'web'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      payload: {
        email: Joi.string().email().required().description('Login name (email address) to start a password reset process for')
      }
    }
  }
},


 {
  method: 'GET',
  path: '/v1/reset/{token}',
  config: {
    handler: handlers.checkPasswordResetToken,
    description: 'An internal portal call to check the validity of a password reset token',
    tags: ['api', 'web'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        token: Joi.string().trim().length(40).required().description('Password reset token to verify')
      }
    }
  }
},


 {
  method: 'POST',
  path: '/v1/reset/{token}',
  config: {
    handler: handlers.resetPassword,
    description: 'An internal portal call to reset password for a user',
    tags: ['api', 'web'],
    plugins: {
      'hapi-swagger': {
        responseMessages: standardHTTPErrors
      }
    },
    validate: {
      params: {
        token: Joi.string().trim().length(40).required().description('Password reset token to verify')
      },
      payload: {
        password: Joi.string().min(8).max(15).required().description('New password to set for the user')
      }
    }
  }
},



];


exports.routes = routes;
