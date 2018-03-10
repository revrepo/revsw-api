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

var users = require('../handlers/users');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/users',
    config: {
      auth: {
        scope: [ 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: users.getUsers,
      description: 'Get a list of registered users',
      notes: 'Use the call to receive a list of users register for your customer account.',
      tags: ['api', 'users'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate:{
        query: {
          filters: Joi.object().keys({
            account_id: Joi.objectId().optional().trim().description('ID of a company'),
            group_id: Joi.objectId().optional().trim().description('Filter by group ID')
          })
         .optional().description('Filters parameters')
        }
      },
      response: {
        schema: routeModels.listOfUsersModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/users',
    config: {
      auth: {
        scope: [ 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw' ]
      },
      handler: users.createUser,
      description: 'Create a new user in the system',
      notes: 'Use the call to create a new user account in the system. If you will not specify "companyId" and "domain" attrributes ' +
      'the values will be inherited from your API user account.',
      tags: ['api', 'users'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          email: Joi.string().email().required().trim().description('User email address also used as login name'),
          firstname: Joi.string().required().trim().max(30).regex(routeModels.userFirstName).description('First name'),
          lastname: Joi.string().required().max(30).regex(routeModels.userLastName).description('Last name'),
          password: Joi.string().min(8).max(15).optional().description('Password'),
          companyId: Joi.array().items( Joi.objectId().description('Optional account ID of the account the user should be created for' ) ),
          domain: Joi.array().items( Joi.string().lowercase().regex(routeModels.domainRegex).description('Domain name the user should have access to') ),
          two_factor_auth_enabled: Joi.boolean().description('Status of two factor authentication protection'),
          access_control_list: Joi.object( {
            dashBoard: Joi.boolean().required().default(true).description('Access to the portal Dashboard section'),
            reports: Joi.boolean().required().default(true).description('Access to the portal REPORTS section'),
            configure: Joi.boolean().required().description('Access to the portal CONFIGURE section'),
            test: Joi.boolean().required().description('Access to the portal TEST section'),
            readOnly: Joi.boolean().required().description('Enable read-only access to the configuration')
          }).required(),
          role: Joi.string().required().valid('user','admin', 'reseller').description('User role (user/admin)'),
          theme: Joi.string().required().valid('light','dark').description('Portal color scheme (light/dark)'),
          comment: Joi.string().trim().allow('').optional().max(300).description('Free-text comment about the user'),
          self_registered: Joi.boolean().optional().description('Is this user self registered or created by another user'),
          group_id: Joi.objectId().description('The group the user is in')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'PUT',
    path: '/v1/users/{user_id}',
    config: {
      auth: {
        scope: [ 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw' ]
      },
      handler: users.updateUser,
      description: 'Update a user profile',
      notes: 'Use the function to update a user profile.',
      tags: ['api', 'users'],
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
          user_id: Joi.objectId().required().description('The ID of user to be updated')
        },
        payload: {
          firstname: Joi.string().trim().max(30).regex(routeModels.userFirstName).description('First name'),
          lastname: Joi.string().max(30).regex(routeModels.userLastName).description('Last name'),
          password: Joi.string().min(8).max(15).description('New Password'),
          companyId: Joi.array().items( Joi.objectId().description('Optional account ID of the account the user should be created for' ) ),
          domain: Joi.array().items( Joi.string().lowercase().regex(routeModels.domainRegex).description('Domain name the user should have access to') ),
          two_factor_auth_enabled: Joi.boolean().description('Status of two factor authentication protection'),
          access_control_list: Joi.object( {
            dashBoard: Joi.boolean().default(true).description('Access to the portal Dashboard section'),
            reports: Joi.boolean().default(true).description('Access to the portal REPORTS section'),
            configure: Joi.boolean().description('Access to the portal CONFIGURE section'),
            test: Joi.boolean().description('Access to the portal TEST section'),
            readOnly: Joi.boolean().description('Enable read-only access to the configuration')
          }),
          role: Joi.string().valid('user','admin', 'reseller').description('User role (user/admin)'),
          theme: Joi.string().valid('light','dark').description('Portal color scheme (light/dark)'),
          comment: Joi.string().trim().allow('').optional().max(300).description('Free-text comment about the user'),
          group_id: Joi.objectId().description('The group the user is in')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/users/myself',
    config: {
      validate: {
        options: {
          stripUnknown: true
        }
      },
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: users.getMyUser,
      description: 'Get your user profile',
      notes: 'Use the call to get the details of your user account.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
     // response: {    // TODO need to add a conditional response schema for user and API key objects
     //   schema: routeModels.userModel
     // }
    }
  },

  {
    method: 'PUT',
    path: '/v1/users/password/{user_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin', 'apikey_rw' ]
      },
      handler: users.updateUserPassword,
      description: 'Update a user\'s password',
      notes: 'Use the function to update a user\'s password.',
      tags: ['api', 'users'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
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
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/users/{user_id}',
    config: {
      auth: {
        scope: [ 'admin', 'reseller', 'revadmin', 'apikey' ]
      },
      handler: users.getUser,
      description: 'Get a user profile',
      notes: 'Use the call to get the details of a user account.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          user_id: Joi.objectId().required().description('User ID')
        }
      },
      response: {
        schema: routeModels.userModel
      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/users/{user_id}',
    config: {
      auth: {
        scope: [ 'admin_rw', 'reseller_rw', 'revadmin_rw', 'apikey_rw' ]
      },
      handler: users.deleteUser,
      description: 'Delete a user',
      notes: 'Use the call to delete a user account from the system.',
      tags: ['api', 'users'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          user_id: Joi.objectId().required().description('User ID to delete')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/2fa/init',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: users.init2fa,
      description: 'Initialize two factor authentication',
      notes: 'Use the call to get the QR code for Google Authenticator. This call assigns a new secret key to the user. ' +
        'If the secret key already exists, it will be overwritten.',
//      tags: ['api', 'users'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      response: {
        schema: routeModels.generateKeyModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/2fa/enable',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: users.enable2fa,
      description: 'Enable two factor authentication for the user',
      notes: 'Use this call to enable two factor authentication for specific user',
//      tags: ['api', 'users'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          oneTimePassword: Joi.string().regex(/^\d+$/).min(6).max(6).required().description('One time password supplied by user')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/2fa/disable/{user_id}',
    config: {
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      handler: users.disable2fa,
      description: 'Disable two factor authentication for the user',
      notes: 'Use this call to disable two factor authentication for specific user',
//      tags: ['api', 'users'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          user_id: Joi.objectId().description('Disable two factor authentication for this user ID')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'PUT',
    path: '/v1/users/{user_id}/complete_invitation',
    config: {
      handler: users.completeInvitation,
      auth: false,
      description: 'Complete the invitation for a newly created user and set a password',
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          user_id: Joi.objectId().description('Complete invitation for this user ID')
        },
        payload: {
          password: Joi.string().min(8).max(15).required().description('Password'),
          invitation_token: Joi.string().length(48).required().description('The invitation token')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },
  {
    method: 'POST',
    path: '/v1/users/{user_id}/resend_invitation',
    config: {
      handler: users.resendInvitation,
      auth: {
        scope: [ 'user', 'admin', 'reseller', 'revadmin' ]
      },
      description: 'Resend an invitation mail for a user.',
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          user_id: Joi.objectId().description('Resend invitation for this user ID')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
