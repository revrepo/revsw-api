/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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
var API = require('./../../../common/api');
var Utils = require('./../../../common/utils');
var ActivityDP = require('./../../../common/providers/data/activity');
var ActivityDDHelper = ActivityDP.DataDrivenHelper;

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user = config.get('api.users.reseller');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('Activity resource', function () {
    describe('With `bogus` data', function () {

      var getSpecDescription = function (queryData) {
        var queryString = Utils.getJsonAsKeyValueString(queryData);
        return 'should return `bad request` response' +
          (queryString === '' ? '' : ' when using: ' + queryString);
      };

      var getSpecCallback = function (queryData) {
        return function (done) {
          API.helpers
            .authenticateUser(user)
            .then(function () {
              API.resources.activity
                .getAll(queryData)
                .expect(400)
                .then(function (response) {
                  response.body.error.should.containEql('Bad Request');
                  done();
                })
                .catch(done);
            })
            .catch(done);
        };
      };

      ActivityDDHelper
        .getBogusQueryParams()
        .forEach(function (queryParams) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecCallback(queryParams);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    xdescribe('Summary: Activity resource', function () {
      describe('With `bogus` data', function () {

        var getSpecDescription = function (queryData) {
          var queryString = Utils.getJsonAsKeyValueString(queryData);
          return 'should return `bad request` response' +
            (queryString === '' ? '' : ' when using: ' + queryString);
        };

        var getSpecCallback = function (queryData) {
          return function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.activity
                  .summary()
                  .getAll(queryData)
                  .expect(400)
                  .then(function (response) {
                    response.body.error.should.containEql('Bad Request');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          };
        };

        ActivityDDHelper.summary
          .getBogusQueryParams()
          .forEach(function (queryParams) {
            var specDescription = getSpecDescription(queryParams);
            var specCallback = getSpecCallback(queryParams);
            /** Running spec for each query params */
            it(specDescription, specCallback);
          });
      });
    });
  });
});
