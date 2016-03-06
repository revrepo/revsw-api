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
    describe('Without authentication', function () {

      var getSpecDescription = function (queryData) {
        var queryString = Utils.getJsonKeysAsString(queryData);
        return 'should return `unauthorized` response' +
          (queryString === '' ? '' : ' when using: ' + queryString);
      };

      var getSpecCallback = function (index) {
        return function (done) {
          var queryData = ActivityDDHelper.getQueryParams()[index];
          API.session.reset();
          API.resources.activity
            .getAll(queryData)
            .expect(401)
            .then(function (response) {
              response.body.error.should.containEql('Unauthorized');
              response.body.message.should
                .containEql('Missing authentication');
              done();
            })
            .catch(done);
        };
      };

      ActivityDDHelper
        .getQueryParams()
        .forEach(function (queryParams, index) {
          var specDescription = getSpecDescription(queryParams);
          var specCallback = getSpecCallback(index);
          /** Running spec for each query params */
          it(specDescription, specCallback);
        });
    });

    xdescribe('Summary: Activity resource', function () {
      describe('Without authentication', function () {

        var getSpecDescription = function (queryData) {
          var queryString = Utils.getJsonKeysAsString(queryData);
          return 'should return `unauthorized` response' +
            (queryString === '' ? '' : ' when using: ' + queryString);
        };

        var getSpecCallback = function (index) {
          return function (done) {
            var queryData = ActivityDDHelper.getQueryParams()[index];
            API.session.reset();
            API.resources.activity
              .summary()
              .getAll(queryData)
              .expect(401)
              .then(function (response) {
                response.body.error.should.containEql('Unauthorized');
                response.body.message.should
                  .containEql('Missing authentication');
                done();
              })
              .catch(done);
          };
        };

        ActivityDDHelper.summary
          .getQueryParams()
          .forEach(function (queryParams, index) {
            var specDescription = getSpecDescription(queryParams);
            var specCallback = getSpecCallback(index);
            /** Running spec for each query params */
            it(specDescription, specCallback);
          });
      });
    });
  });
});
