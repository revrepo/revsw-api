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

var groups = require('../handlers/groups');

var routeModels = require('../lib/routeModels');

module.exports = [
  {
    method: 'GET',
    path: '/v1/groups',
    config: {
      auth: {
        scope: ['revadmin', 'reseller', 'admin']
      },
      handler: groups.getGroups,
      description: 'Get a list of groups',
      notes: 'Use the call to receive a list of groups for your customer account.',
      tags: ['api', 'groups'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        query: {
          filters: Joi.object().keys({
            account_id: Joi.objectId().optional().allow('').trim().description('ID of a company'),
            operation: Joi.string().optional().allow('').trim().description('Operation of request')
          })
            .optional().description('Filters parameters')
        }
      },
      response: {
        schema: routeModels.listOfGroupsModel
      }
    }
  },

  {
    method: 'POST',
    path: '/v1/groups',
    config: {
      auth: {
        scope: ['revadmin_rw', 'reseller_rw', 'admin_rw']
      },
      handler: groups.createGroup,
      description: 'Create a new group',
      notes: 'Use this call to create a new group, if account_id is not specified, the API account will be used.',
      tags: ['api', 'groups'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        payload: {
          account_id: Joi.string().description('The account that this group is associated to'),
          name: Joi.string().trim().max(30).regex(routeModels.groupName).required().description('Group name'),
          comment: Joi.string().trim().allow('').max(300).optional().description('Group comment'),
          permissions: routeModels.permissionsModel
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'PUT',
    path: '/v1/groups/{group_id}',
    config: {
      auth: {
        scope: ['revadmin_rw', 'reseller_rw', 'admin_rw']
      },
      handler: groups.updateGroup,
      description: 'Update a group',
      notes: 'Use the function to update a group.',
      tags: ['api', 'groups'],
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
          group_id: Joi.objectId().required().description('The ID of group to be updated')
        },
        payload: {
          account_id: Joi.string().description('The account that this group is associated to'),
          name: Joi.string().trim().max(30).regex(routeModels.groupName).description('Group name'),
          comment: Joi.string().trim().allow('').max(300).optional().description('Group comment'),
          permissions: routeModels.permissionsModel
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/groups/{group_id}',
    config: {
      auth: {
        scope: ['revadmin', 'reseller', 'admin']
      },
      handler: groups.getGroup,
      description: 'Get a group',
      notes: 'Use the call to get the details of a group.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          group_id: Joi.objectId().required().description('Group ID')
        },
        query: {
          filters: Joi.object().keys({
            operation: Joi.string().optional().allow('').trim().description('Operation of request')
          })
            .optional().description('Filters parameters')
        }
      },
      response: {
        schema: routeModels.groupModel
      }
    }
  },

  {
    method: 'GET',
    path: '/v1/groups/{group_id}/users',
    config: {
      auth: {
        scope: ['revadmin', 'reseller', 'admin']
      },
      handler: groups.getGroupUsers,
      description: 'Get a list of users in a group',
      notes: 'Use the call to get the list of users of a group.',
      tags: ['api'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          group_id: Joi.objectId().required().description('Group ID')
        }
      },
      response: {
        schema: routeModels.groupUsersModel
      }
    }
  },

  {
    method: 'DELETE',
    path: '/v1/groups/{group_id}',
    config: {
      auth: {
        scope: ['revadmin_rw', 'reseller_rw', 'admin_rw']
      },
      handler: groups.deleteGroup,
      description: 'Delete a group',
      notes: 'Use the call to delete a group from the system.',
      tags: ['api', 'groups'],
      plugins: {
        'hapi-swagger': {
          responseMessages: routeModels.standardHTTPErrors
        }
      },
      validate: {
        params: {
          group_id: Joi.objectId().required().description('Group ID to delete')
        }
      },
      response: {
        schema: routeModels.statusModel
      }
    }
  }
];
