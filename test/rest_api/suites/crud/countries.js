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

// # Smoke check: countries
var config = require('config');

var API = require('./../../common/api');

describe('CRUD check', function () {
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var users = [
    config.get('api.users.revAdmin'),
    config.get('api.users.reseller')
  ];

  users.forEach(function (user) {

    describe('With user: ' + user.role, function () {

      describe('Countries resource', function () {

        before(function (done) {
          done();
        });

        after(function (done) {
          done();
        });

        it('should allow to get all countries.',
          function (done) {
            API.identity
              .authenticate(user)
              .then(function () {
                API.resources.countries
                  .getAll()
                  .expect(200)
                  .then(function (response) {
                    var countriesObject = response.body;
                    countriesObject.should.not.be.undefined();
                    var countriesKeys = Object.keys(countriesObject);
                    countriesKeys.should.not.be.empty();
                    countriesKeys.length.should.greaterThan(0);
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
