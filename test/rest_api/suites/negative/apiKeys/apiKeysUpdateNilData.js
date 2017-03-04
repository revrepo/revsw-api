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

require('should-http');
var config = require('config');
var Constants = require('./../../../common/constants');
var API = require('./../../../common/api');
var Utils = require('./../../../common/utils');
var ApiKeysDP = require('./../../../common/providers/data/apiKeys');

describe('API Keys resource: pre-requisites', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var type = Constants.API.TEST_DATA_TYPES.NIL;
  var apiKeys = {};
  var users = [
    config.get('api.users.reseller')
  ];

  before(function (done) {

    Utils.forEach(users, function (user) {
      return API.helpers
        .authenticateUser(user)
        .then(function () {
          return API.helpers.apiKeys.createOne();
        })
        .then(function (key) {
          apiKeys[user.role] = key;
        });
    }, done);
  });

  before(function (done) {

    /**
     * Generates Spec name for the given data.
     *
     * @param type
     * @param field
     * @param value
     * @returns {string}
     */
    var getSpecName = function (type, field, value) {
      return 'should return error response when updating `ApiKey` with ' +
        type + ' `' + field + '`: ' + value;
    };
    /**
     * Generates Spec function for the given data.
     *
     * @param user
     * @param model
     * @returns {Function}
     */
    var getSpecFn = function (user, field, model) {
      return function (done) {
        API.helpers
          .authenticateUser(user)
          .then(function () {
            var apiKey = apiKeys[user.role];
            model.account_id = apiKey.account_id;
            // TODO: Make ApiKey creation with full/complete data
            model.managed_account_ids = [];
            model.domains = [];
            return API.resources.apiKeys.update(apiKey.id, model);
          })
          .then(function (res) {
            res.body.statusCode.should.equal(400);
            res.body.message.should.containEql(Utils.getLastKeyFromPath(field));
            done();
          })
          .catch(done);
      }
    };

    ApiKeysDP.DataDrivenHelper.payload.genToUpdate(type, function (err, data) {

      users.forEach(function (user) {
        describe('Negative check', function () {
          // Changing default mocha's timeout (Default is 2 seconds).
          this.timeout(config.get('api.request.maxTimeout'));
          describe('API Keys resource', function () {
            describe('With user: ' + user.role, function () {
              describe('Update with `' + type + '` data', function () {

                data.forEach(function (apiKey) {
                  var field = apiKey.field;
                  var model = apiKey.model;
                  var value = Utils.getValueByPath(model, field);

                  if (value === undefined)
                    return;

                  it(getSpecName(type, field, value), getSpecFn(user, field, model));
                })
              });
            });
          });
        });
      });
      done();
    });
  });

  it('Generating `update-' + type + '-data` specs ...', function () {
    // Do not remove this spec as it is required to auto-generate other specs.
    Object.keys(apiKeys).length.should.be.above(0); // Pre-requisites check
  });
});

