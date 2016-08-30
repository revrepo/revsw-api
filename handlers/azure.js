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

var boom = require('boom');
var mongoose = require('mongoose');
var AuditLogger = require('../lib/audit');
var config = require('config');
var Promise = require('bluebird');
var Fs = require('fs');
var base64 = require('js-base64').Base64;
var base64url = require('base64-url');
var crypto = require('crypto');
var zlib = require('zlib');

var utils = require('../lib/utilities.js');
var renderJSON = require('../lib/renderJSON');
var mongoConnection = require('../lib/mongoConnections');
var publicRecordFields = require('../lib/publicRecordFields');
var logger = require('revsw-logger')(config.log_config);

var User = require('../models/User');
var Account = require('../models/Account');
var AzureSubscription = require('../models/AzureSubscription');
var AzureResource = require('../models/AzureResource');

var users = Promise.promisifyAll(new User(mongoose, mongoConnection.getConnectionPortal()));
var accounts = Promise.promisifyAll(new Account(mongoose, mongoConnection.getConnectionPortal()));
var azureSubscriptions = Promise.promisifyAll(new AzureSubscription(mongoose, mongoConnection.getConnectionPortal()));
var azureResources = Promise.promisifyAll(new AzureResource(mongoose, mongoConnection.getConnectionPortal()));

var provider = 'RevAPM.MobileCDN';

exports.createSubscription = function(request, reply) {

  var subscription = request.payload,
    subscriptionId = request.params.subscription_id,
    subscriptionDate = request.payload.RegistrationDate,
    state = request.payload.state,
    properties = request.payload.properties;

  logger.info('Processing Azure Create Subscription request for ID ' + subscriptionId + ', payload ' +
    JSON.stringify(subscription));

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, existingSubscription) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (existingSubscription) {
      logger.info('Azure Subscription ID ' + subscriptionId + ' already exists: processing possible state change');
      if (existingSubscription.subscription_state === state) { // If the subscription already exists with the same state then do
        // nothing and just return 200
        renderJSON(request, reply, error, subscription);
      } else {
        // For now just update the state in the subscription record
        // TODO: later we need to add a proper handling of state changes
        // TODO: what to do if the current state is "Deleted"?
        var updatedSubscription = {
          id: existingSubscription.id,
          subscription_id: subscriptionId,
          subscription_state: state,
          properties: properties,
          original_object: subscription
        };
        azureSubscriptions.update(updatedSubscription, function(error, result) {
          if (error || !result) {
            return reply(boom.badImplementation('Failed to update Azure subscription ' + JSON.stringify(updatedSubscription)));
          }
          renderJSON(request, reply, error, subscription);
        });
      }
    } else {
      // A call with state "Unregistered" for none existing subscription should return 200
      if (state === 'Unregistered') {
        renderJSON(request, reply, error, subscription);
      }

      logger.info('Adding new Azure Subscription with ID ' + subscriptionId + ', payload ' + JSON.stringify(subscription));
      var newSubscription = {
        subscription_id: subscriptionId,
        subscription_state: state,
        properties: properties,
        original_object: subscription
      };
      azureSubscriptions.add(newSubscription, function(error, result) {
        if (error) {
          return reply(boom.badImplementation('Failed to add to the DB a new Azure subscription ' + JSON.stringify(newSubscription)));
        }
        logger.info('Successfully added new Azure Subscription with ID ' + subscriptionId + ', subscription object ' +
          JSON.stringify(result));
        renderJSON(request, reply, error, subscription);
      });
    }
  });
};

exports.createResource = function(request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name,
    tags = resource.tags,
    resourceId = resource.id,
    properties = resource.properties,
    plan = resource.plan;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.get({
        resource_name: resourceName,
        resource_group_name: resourceGroupName,
        subscription_id: subscriptionId
      },
      function(error, existingResource) {
        if (error) {
          return reply(boom.badImplementation('Failed to check the existance of new Azure resource for subscription ID ' + subscriptionId +
            ', resource name ' + resourceName + ', group name ' + resourceGroupName));
        }
        if (existingResource) {
          renderJSON(request, reply, error, resource);
        } else {


          logger.info('Adding new Azure Resource for subscription ID ' + subscriptionId + ', payload ' + JSON.stringify(resource));
          var newAccount = {
            companyName: 'Azure Resource ' + resourceName, // TODO add resource group name too?
            createdBy: 'Azure Subscription ' + subscriptionId,
            // TODO add billing plan
          };
          accounts.add(newAccount, function(error, account) {
            if (error || !account) {
              return reply(boom.badImplementation('Failed to add new account record for Azure subscription ID ' + subscriptionId +
                ', payload ' + JSON.stringify(newAccount)));
            }

            var email = subscriptionId + '_' + resourceName + '@azure-user.revapm.net';
            var password = crypto.randomBytes(8).toString('hex');

            var newUser = {
              companyId: account.id,
              role: 'admin',
              firstname: 'Azure Subscription ' + subscriptionId,
              lastname: 'Resource ' + resourceName,
              password: password,
              email: email
            };

            users.add(newUser, function(error, user) {
              if (error || !user) {
                return reply(boom.badImplementation('Failed to add new user record for Azure subscription ID ' + subscriptionId +
                  ', payload ' + JSON.stringify(newUser)));
              }

              // TODO: add code to send email notifications about new Azure resources registered in the system
              // TODO: add code to add audit records for new subscription, resource, account, user

              var newResource = {
                subscription_id: subscriptionId,
                resource_name: resourceName,
                resource_id: resourceId,
                resource_group_name: resourceGroupName,
                account_id: account.id,
                tags: tags,
                plan: plan,
                properties: properties,
                original_object: resource
              };

              azureResources.add(newResource, function(error, createdResource) {
                if (error || !createdResource) {
                  return reply(boom.badImplementation('Failed to add new Azure resource for subscription ID ' + subscriptionId +
                    ', payload ' + JSON.stringify(newResource)));
                }
                renderJSON(request, reply, error, resource);
              });
            });
          });
        }
      });
  });
};

exports.patchResource = function(request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name,
    tags = resource.tags,
    resourceId = resource.id,
    properties = resource.properties,
    plan = resource.plan;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.get({
        resource_name: resourceName,
        resource_group_name: resourceGroupName,
        subscription_id: subscriptionId
      },
      function(error, existingResource) {
        if (error) {
          return reply(boom.badImplementation('Failed to read Azure resource for subscription ID ' + subscriptionId +
            ', resource name ' + resourceName + ', group name ' + resourceGroupName));
        }
        if (!existingResource) {
          return reply(boom.notFound('The resource is not found'));
        } else {
          var updatedResource = {
            id: existingResource.id,
            tags: tags,
            plan: plan,
            properties: properties,
            original_object: resource
          };

          azureResources.update(updatedResource, function(error, result) {
            if (error || !result) {
              return reply(boom.badImplementation('Failed to update Azure resource for subscription ID ' + subscriptionId +
                ', payload ' + JSON.stringify(updatedResource)));
            }
            renderJSON(request, reply, error, resource);
          });
        }
      });
  });
};

exports.listAllResourcesInResourceGroup = function(request, reply) {

  var subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.queryP({
      subscription_id: subscriptionId,
      resource_group_name: resourceGroupName
    }, function(error, resources) {
      if (error) {
        return reply(boom.badImplementation('Failed to read a list of Azure resources for subscription ID ' + subscriptionId +
          ', group name ' + resourceGroupName));
      }
      if (resources.length === 0) {
        return reply(boom.notFound('The Resource Group Name is not found'));
      } else {
        var response2 = resources.map(function(obj) {
          return obj.original_object;
        });
        var response = {
          value: response2,
          nextlink: ''
        };
        renderJSON(request, reply, error, response);
      }
    });
  });
};

exports.listAllResourcesInSubscription = function(request, reply) {

  var subscriptionId = request.params.subscription_id;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.queryP({
      subscription_id: subscriptionId
    }, function(error, resources) {
      if (error) {
        return reply(boom.badImplementation('Failed to read a list of Azure resources for subscription ID ' + subscriptionId));
      }

      var response2 = resources.map(function(obj) {
        return obj.original_object;
      });
      var response = {
        value: response2,
        nextlink: ''
      };
      renderJSON(request, reply, error, response);
    });
  });
};

exports.getResource = function(request, reply) {

  var subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.get({
        resource_name: resourceName,
        resource_group_name: resourceGroupName,
        subscription_id: subscriptionId
      },
      function(error, resource) {
        if (error) {
          return reply(boom.badImplementation('Failed to read Azure resource for subscription ID ' + subscriptionId +
            ', resource name ' + resourceName + ', group name ' + resourceGroupName));
        }
        if (!resource) {
          return reply(boom.notFound('The resource is not found'));
        }
        renderJSON(request, reply, error, resource.original_object);
      });
  });
};

exports.moveResources = function(request, reply) {

  var subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.queryP({
      subscription_id: subscriptionId,
      resource_group_name: resourceGroupName
    }, function(error, resources) {
      if (error) {
        return reply(boom.badImplementation('Failed to read a list of Azure resources for subscription ID ' + subscriptionId +
          ', group name ' + resourceGroupName));
      }
      if (resources.length === 0) {
        return reply(boom.notFound('The Resource Group Name is not found'));
      } else {
        return reply(boom.badRequest('The resource type does not support move'));
      }
    });
  });
};

exports.deleteResource = function(request, reply) {

  var subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.get({
        resource_name: resourceName,
        resource_group_name: resourceGroupName,
        subscription_id: subscriptionId
      },
      function(error, resource) {
        if (error) {
          return reply(boom.badImplementation('Failed to read Azure resource for subscription ID ' + subscriptionId +
            ', resource name ' + resourceName + ', group name ' + resourceGroupName));
        }
        if (!resource) {
          return reply('No Content').code(204);
        } else {
          // TODO implement actual removal of the resource: domains, apps, keys, dashboards, etc
          renderJSON(request, reply, error, resource.orignal_object);
        }
      });
  });
};

exports.listSecrets = function(request, reply) {

  var subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.get({
        resource_name: resourceName,
        resource_group_name: resourceGroupName,
        subscription_id: subscriptionId
      },
      function(error, resource) {
        if (error) {
          return reply(boom.badImplementation('Failed to read Azure resource for subscription ID ' + subscriptionId +
            ', resource name ' + resourceName + ', group name ' + resourceGroupName));
        }
        if (!resource) {
          return reply(boom.notFound('The resource is not found'));
        } else {
          renderJSON(request, reply, error, {});
        }
      });
  });
};

exports.listOperations = function(request, reply) {

  var operations = {
    'value': [{
      'name': provider + '/operations/read',
      'display': {
        'operation': 'Read Operations',
        'resource': 'Operations',
        'description': 'Read any Operation',
        'provider': provider
      }
    }, {
      'name': provider + '/updateCommunicationPreference/action',
      'display': {
        'operation': 'Update Communication Preferences',
        'resource': 'Update Communication Preferences',
        'description': 'Updates Communication Preferences',
        'provider': provider
      }
    }, {
      'name': provider + '/listCommunicationPreference/action',
      'display': {
        'operation': 'List Communication Preferences',
        'resource': 'List Communication Preferences',
        'description': 'Read any Communication Preferences',
        'provider': provider
      }
    }, {
      'name': provider + '/{resourceType}/read',
      'display': {
        'operation': 'Read <Resource Type>',
        'resource': '<Resource Type>',
        'description': 'Read any <Resource Type>',
        'provider': provider
      }
    }, {
      'name': provider + '/{resourceType}/write',
      'display': {
        'operation': 'Create or Update <Resource Type>',
        'resource': '<Resource Type>',
        'description': 'Create or Update any <Resource Type>',
        'provider': provider
      }
    }, {
      'name': provider + '/{resourceType}/delete',
      'display': {
        'operation': 'Delete <Resource Type>',
        'resource': '<Resource Type>',
        'description': 'Deletes any <Resource Type>',
        'provider': provider
      }
    }, {
      'name': provider + '/{resourceType}/listSecrets/action',
      'display': {
        'operation': 'List Secrets',
        'resource': '<Resource Type>',
        'description': 'Read any <Resource Type> Secrets',
        'provider': provider
      }
    }, {
      'name': provider + '/{resourceType}/regenerateKeys/action',
      'display': {
        'operation': 'Regenerate Keys',
        'resource': '<Resource Type>',
        'description': 'Regenerate any <Resource Type> Keys',
        'provider': provider
      }
    }, {
      'name': provider + '/{resourceType}/listSingleSignOnToken/action',
      'display': {
        'operation': 'List Single Sign On Tokens',
        'resource': '<Resource Type>',
        'description': 'Read any <Resource Type> Single Sign On Tokens',
        'provider': provider
      }
    }],
  };

  var error;

  renderJSON(request, reply, error, operations);
};

exports.updateCommunicationPreference = function(request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.listCommunicationPreference = function(request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id;

  var error;

  renderJSON(request, reply, error, resource);
};

exports.regenerateKey = function(request, reply) {

  var keys = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.get({
        resource_name: resourceName,
        resource_group_name: resourceGroupName,
        subscription_id: subscriptionId
      },
      function(error, resource) {
        if (error) {
          return reply(boom.badImplementation('Failed to read Azure resource for subscription ID ' + subscriptionId +
            ', resource name ' + resourceName + ', group name ' + resourceGroupName));
        }
        if (!resource) {
          return reply(boom.notFound('The resource is not found'));
        } else {
          var newKeys = {};
          for (var key in keys) {
            newKeys[key] = '1111111111';
          }
          renderJSON(request, reply, error, newKeys);
        }
      });
  });
};

exports.listSingleSignOnToken = function(request, reply) {

  var resource = request.payload,
    subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name;

  azureSubscriptions.get({
    subscription_id: subscriptionId
  }, function(error, result) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB an Azure subscription with ID ' + subscriptionId));
    }
    if (!result) {
      // return 404 status code if the requested subscription does not exist in our records
      return reply(boom.notFound('The requested subscription ID is not found'));
    }
    if (result.subscription_state !== 'Registered') {
      return reply(boom.conflict('The requested subscription ID is not in Registered state'));
    }

    azureResources.get({
        resource_name: resourceName,
        resource_group_name: resourceGroupName,
        subscription_id: subscriptionId
      },
      function(error, resource) {
        if (error) {
          return reply(boom.badImplementation('Failed to read Azure resource for subscription ID ' + subscriptionId +
            ', resource name ' + resourceName + ', group name ' + resourceGroupName));
        }
        if (!resource) {
          return reply(boom.notFound('The resource is not found'));
        }

        var token = {
          ExpirationTime: 'sdfsdfsdf',  // TODO add proper time for +15 minutes
          ProviderData: 'mykey'
        };
        var tokenString = JSON.stringify(token);

        var NodeRSA = require('node-rsa');
        var key = new NodeRSA(Fs.readFileSync('cert.key'));

        var encrypted = key.encrypt(tokenString);
        logger.debug('Encrypted token: ', encrypted);
        var signed = key.sign(encrypted);
        logger.debug('Signed token: ', signed);

        zlib.gzip(signed, function(error, compressed) {
          logger.debug('Compressed token: ', compressed);

          var response = {
            'url': config.get('azure_marketplace.sso_endpoint'),
            'resourceId': base64url.encode(resource.resource_id),
            'token': base64url.encode(compressed)
          };

          renderJSON(request, reply, error, response);
        });
      });
  });
};
