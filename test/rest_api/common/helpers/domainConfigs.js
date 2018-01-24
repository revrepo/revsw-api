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

var DomainConfigsResource = require('./../resources/domainConfigs');
var DomainConfigsDP = require('./../providers/data/domainConfigs');
var APITestError = require('./../apiTestError');
var Promise = require('bluebird');

// # Domain Configs Helper
// Abstracts common functionality for the related resource.
module.exports = {

  createOne: function (accountId, prefix) {
    var domainConfig = DomainConfigsDP.generateOne(accountId, prefix);
    return DomainConfigsResource
      .createOne(domainConfig)
      .then(function (res) {
        domainConfig.id = res.body.object_id;
        return domainConfig;
      })
      .catch(function (error) {
        throw new APITestError('Creating Domain Config',
          error.response.body, domainConfig);
      });
  },
  waitForDomain: function (domainId) {
    return new Promise(function (resolve, reject) {
      var times = 15; // try 15 times
      var interval = 5000; // every 5 sec
      var polling = function (times) {
        if (times <= 0) {
          reject();
        } else {
          DomainConfigsResource
            .status(domainId)
            .getOne()
            .expect(200)
            .then(function (res) {
              if (res.body.staging_status !== 'Published' && res.body.global_status !== 'Published') {
                setTimeout(function () {
                  polling(times -= 1);
                }, interval);
              } else {
                resolve();
              }
            })
            .catch(reject);
        }
      };

      polling(times);
    });
  }
};
