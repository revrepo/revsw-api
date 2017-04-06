/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

// # Azure Resource object

// Requiring config and `BaseResource`
var BaseResource = require('./basic');

var Constants = require('./../../common/constants');
var Methods = Constants.API.METHODS;

var providerId = 'providerId';
var subscriptionId = 'subscriptionId';
var resourceGroupName = 'resourceGroupName';
var resourceName = 'resourceName';

var resourceConfig = {
  idKey: null,
  name: 'azure',
  path: '',
  methods: [],
  nestedResources: [
    {
      idKey: providerId,
      name: 'providers',
      path: '/providers/{' + providerId + '}',
      methods: [],
      nestedResources: [
        {
          idKey: null,
          name: 'operations',
          path: '/operations',
          methods: [
            Methods.READ_ALL
          ],
        }
      ]
    },
    {
      idKey: null,
      name: 'resources',
      path: '/resources',
      methods: [
        Methods.READ_ALL
      ]
    },
    {
      idKey: subscriptionId,
      name: 'subscriptions',
      path: '/subscriptions/{' + subscriptionId + '}',
      methods: [
        Methods.READ_ALL,
        Methods.UPDATE
      ],
      nestedResources: [
        {
          idKey: providerId,
          name: 'providers',
          path: '/providers/{' + providerId + '}',
          methods: [],
          nestedResources: [
            {
              idKey: resourceName,
              name: 'accounts',
              path: '/accounts/{' + resourceName + '}',
              methods: [
                Methods.READ_ALL
              ]
            },
            {
              idKey: null,
              name: 'updateCommunicationPreference',
              path: '/updateCommunicationPreference',
              methods: [
                Methods.CREATE
              ]
            },
            {
              idKey: null,
              name: 'listCommunicationPreference',
              path: '/listCommunicationPreference',
              methods: [
                Methods.CREATE
              ]
            }
          ]
        },
        {
          idKey: resourceGroupName,
          name: 'resourceGroups',
          path: '/resourcegroups/{' + resourceGroupName + '}',
          methods: [],
          nestedResources: [
            {
              idKey: providerId,
              name: 'providers',
              path: '/providers/{' + providerId + '}',
              methods: [],
              nestedResources: [
                {
                  idKey: resourceName,
                  name: 'accounts',
                  path: '/accounts/{' + resourceName + '}',
                  methods: [
                    Methods.READ_ALL,
                    Methods.READ_ONE,
                    Methods.UPDATE,
                    Methods.PATCH,
                    Methods.DELETE
                  ],
                  nestedResources: [
                    {
                      idKey: null,
                      name: 'listSecrets',
                      path: '/listSecrets',
                      methods: [
                        Methods.CREATE
                      ]
                    },
                    {
                      idKey: null,
                      name: 'regenerateKey',
                      path: '/RegenerateKey',
                      methods: [
                        Methods.CREATE
                      ]
                    },
                    {
                      idKey: null,
                      name: 'listSingleSignOnToken',
                      path: '/listSingleSignOnToken',
                      methods: [
                        Methods.CREATE
                      ]
                    }
                  ]
                }
              ]
            },
            {
              idKey: null,
              name: 'moveResources',
              path: '/moveResources',
              methods: [
                Methods.CREATE
              ],
            }
          ]
        }
      ]
    }
  ]
};

// Creating new instance of BaseResource which is going to represent the API
// `Azure resource`
module.exports = new BaseResource(resourceConfig);

