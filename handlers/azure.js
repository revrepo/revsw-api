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
var _ = require('lodash');
var ursa = require('ursa');

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
var providerForOperationsResponse = 'RevAPM MobileCDN';

exports.listSubscriptions = function(request, reply) {

  azureSubscriptions.listAll(function(error, subscriptions) {
    if (error) {
      return reply(boom.badImplementation('Failed to retrive from the DB a list of all Azure subscriptions'));
    }
    renderJSON(request, reply, error, subscriptions);
  });
};

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

  var resource = request.payload;
  resource.tags = resource.tags ? resource.tags : {};
  var subscriptionId = request.params.subscription_id,
    resourceGroupName = request.params.resource_group_name,
    resourceName = request.params.resource_name,
    tags = resource.tags,
    resourceId = '/subscriptions/' + subscriptionId + '/resourcegroups/' + resourceGroupName + '/providers/' + provider + '/accounts/' + resourceName,
    properties = resource.properties,
    plan = resource.plan;

  resource.id = resourceId;
  resource.type = 'RevAPM.MobileCDN/accounts';
  resource.name = resourceName;

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

            var email = account.id + '@' + config.get('azure_marketplace.user_email_domain');
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
    tags = resource.Tags ? resource.Tags : resource.tags,
    resourceId = '/subscriptions/' + subscriptionId + '/resourcegroups/' + resourceGroupName + '/providers/' + provider + '/accounts/' + resourceName,
    properties = resource.Properties ? resource.Properties : resource.properties,
    plan = resource.Plan ? resource.Plan : resource.plan;

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
          var updatedResource = existingResource;
          var originalObject = existingResource.original_object;
          if (plan) {
            updatedResource.plan = plan;
            originalObject.plan = plan;
          }
          if (properties) {
            updatedResource.properties = properties;
            originalObject.properties = properties;
          }
          if (tags) {
            updatedResource.tags = tags;
            originalObject.tags = tags;
          } else {
            updatedResource.tags = {};
            originalObject.tags = {};
          }

          updatedResource.original_object = originalObject;

          azureResources.update(updatedResource, function(error, result) {
            if (error || !result) {
              return reply(boom.badImplementation('Failed to update Azure resource for subscription ID ' + subscriptionId +
                ', payload ' + JSON.stringify(updatedResource)));
            }
            renderJSON(request, reply, error, originalObject);
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
      resource_group_name: resourceGroupName,
      deleted: {
        $ne: true
      }
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
      subscription_id: subscriptionId,
      deleted: {
        $ne: true
      }
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
          resource.deleted = true;

          azureResources.update(resource, function(error, result) {
            if (error || !result) {
              return reply(boom.badImplementation('Failed to mark as deleted Azure resource for subscription ID ' + subscriptionId +
                ', payload ' + JSON.stringify(resource)));
            }
            renderJSON(request, reply, error, '');
          });
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
        'provider': providerForOperationsResponse
      }
    }, {
      'name': provider + '/updateCommunicationPreference/action',
      'display': {
        'operation': 'Update Communication Preferences',
        'resource': 'Update Communication Preferences',
        'description': 'Updates Communication Preferences',
        'provider': providerForOperationsResponse
      }
    }, {
      'name': provider + '/listCommunicationPreference/action',
      'display': {
        'operation': 'List Communication Preferences',
        'resource': 'List Communication Preferences',
        'description': 'Read any Communication Preferences',
        'provider': providerForOperationsResponse
      }
    }, {
      'name': provider + '/accounts/read',
      'display': {
        'operation': 'Read accounts',
        'resource': 'accounts',
        'description': 'Read any accounts',
        'provider': providerForOperationsResponse
      }
    }, {
      'name': provider + '/accounts/write',
      'display': {
        'operation': 'Create or Update accounts',
        'resource': 'accounts',
        'description': 'Create or Update any accounts',
        'provider': providerForOperationsResponse
      }
    }, {
      'name': provider + '/accounts/delete',
      'display': {
        'operation': 'Delete accounts',
        'resource': 'accounts',
        'description': 'Deletes any accounts',
        'provider': providerForOperationsResponse
      }
    }, {
      'name': provider + '/accounts/listSecrets/action',
      'display': {
        'operation': 'List Secrets',
        'resource': 'accounts',
        'description': 'Read any accounts Secrets',
        'provider': providerForOperationsResponse
      }
    }, {
      'name': provider + '/accounts/regenerateKeys/action',
      'display': {
        'operation': 'Regenerate Keys',
        'resource': 'accounts',
        'description': 'Regenerate any accounts Keys',
        'provider': providerForOperationsResponse
      }
    }, {
      'name': provider + '/accounts/listSingleSignOnToken/action',
      'display': {
        'operation': 'List Single Sign On Tokens',
        'resource': 'accounts',
        'description': 'Read any accounts Single Sign On Tokens',
        'provider': providerForOperationsResponse
      }
    }],
  };

  var error;

  renderJSON(request, reply, error, operations);
};

exports.updateCommunicationPreference = function(request, reply) {

  var payload = request.payload,
    subscriptionId = request.params.subscription_id,
    firstName = payload.FirstName ? payload.FirstName : payload.firstName,
    lastName = payload.LastName ? payload.LastName : payload.lastName,
    email = payload.Email ? payload.Email : payload.email,
    optInForCommunication = payload.OptInForCommunication ? payload.OptInForCommunication : payload.optInForCommunication;

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

    result.first_name = firstName;
    result.last_name = lastName;
    result.email = email;
    result.opt_in_for_communication = optInForCommunication;

    azureSubscriptions.update(result, function(error, result2) {
      if (error || !result2) {
        return reply(boom.badImplementation('Failed to update Azure subscription ' + JSON.stringify(result)));
      }
      renderJSON(request, reply, error, payload);
    });
  });
};

exports.listCommunicationPreference = function(request, reply) {

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

    var response = {
      firstName: result.first_name ? result.first_name : null,
      lastName: result.last_name,
      email: result.email,
      optInForCommunication: result.opt_in_for_communication
    };

    renderJSON(request, reply, error, response);
  });

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
            // Just returning some random stuff - the function is not really in use
            newKeys[key] = crypto.randomBytes(32) + '';
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

        // This token will eventually reach the authenticateSSOAzure function which will generate a proper JWT token
        // for portal authentication
        var appToken = {
          expirationTimestamp: (new Date().getTime()) + config.get('azure_marketplace.ssl_token_lifetime_minutes') * 60 * 1000,
          providerData: resource.account_id
        };
        var appTokenString = JSON.stringify(appToken);
        logger.debug('appTokenString = ', appTokenString);

        // These two values will be used in symmetric enryption of the appToken
        var sharedSecret = crypto.randomBytes(32);
        var initializationVector = crypto.randomBytes(16);

        // This private key will be used to sign the SSO token
        var key = ursa.createPrivateKey(Fs.readFileSync(config.get('azure_marketplace.sso_private_key')));
        // This public key will be used to encrypt the SSO token
        var pubkey = ursa.createPublicKey(Fs.readFileSync(config.get('azure_marketplace.sso_public_key')));


        // Performing symmetric encryption of the appToken
        var encryptedAppToken = '';
        var cipher = crypto.Cipheriv('aes-256-cbc', sharedSecret, initializationVector);
        encryptedAppToken += cipher.update(appTokenString, 'utf8', 'base64');
        encryptedAppToken += cipher.final('base64');

        // Signing the appToken
        var appTokenSigned = key.hashAndSign('sha256', appTokenString, 'utf8', 'base64');

        // Now let's create a token with the symmetric and IV keys and encrypt them with the public key
        var secretToken = {
          symmetricKey: sharedSecret.toString('base64'),
          iv: initializationVector.toString('base64')
        };
        var secretTokenString = JSON.stringify(secretToken);

        // Encrypting the secretTokenString object with the public key
        var secretTokenEncrypted = pubkey.encrypt(secretTokenString, 'utf8', 'base64');

        // Now let's prepare a token which  later will be encrypted using the public key
        var token = {
          signedHash: appTokenSigned,
          encryptedData: encryptedAppToken,
          secretToken: secretTokenEncrypted
        };

        var tokenString = JSON.stringify(token);
        logger.debug('tokenString = ', tokenString);

        // Now let's compress the token
        zlib.gzip(tokenString, function(error, tokenCompressed) {
          // Also need to compress the resourceId string
          zlib.gzip(JSON.stringify(resource.resource_id), function(error, resourceIdCompressed) {

            // Now let's URL-encode the compressed token
            var tokenEncoded = utils.webURLEncoding(tokenString);

            // URL-encoding the compressed resourceId string
            var resourceEncoded = utils.webURLEncoding(resourceIdCompressed);

            var response = {
              'url': config.get('azure_marketplace.sso_endpoint'),
              'resourceId': resourceEncoded,
              'token': tokenEncoded
            };

            renderJSON(request, reply, error, response);
          });
        });
      });
  });
};
