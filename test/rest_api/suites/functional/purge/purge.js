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

require('should-http');

var config = require('config');
var API = require('./../../../common/api');
var DomainConfigsDP = require('./../../../common/providers/data/domainConfigs');
var PurgeDP = require('./../../../common/providers/data/purge');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var account;
  var domainConfig;
  var purge;
  var reseller = config.get('api.users.reseller');
  var revAdmin = config.get('api.users.revAdmin');

  before(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        return API.helpers.accounts.createOne();
      })
      .then(function (newAccount) {
        account = newAccount;
        return API.helpers.domainConfigs.createOne(account.id);
      })
      .then(function (newDomainConfig) {
        domainConfig = newDomainConfig;
        return API.helpers.purge.createOne(domainConfig.domain_name);
      })
      .then(function (newPurge) {
        purge = newPurge;
      })
      .then(done)
      .catch(done);
  });

  after(function (done) {
    API.helpers
      .authenticateUser(reseller)
      .then(function () {
        API.resources.domainConfigs.deleteOne(domainConfig.id);
        done();
      })
      .catch(done);
  });

  describe('Purge resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should queue a purge that was just created.',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            var purgeData = PurgeDP.generateOne(domainConfig.domain_name);
            API.resources.purge
              .createOne(purgeData)
              .expect(200)
              .then(function (response) {
                var expMsg = 'The purge request has been successfully queued';
                response.body.message.should.equal(expMsg);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should set as `success` a purge after some time it was created.',
      function (done) {
        API.helpers
          .authenticateUser(reseller)
          .then(function () {
            var purgeData = PurgeDP.generateOne(domainConfig.domain_name);
            var counter = 10000; // 10 secs
            var interval = 1000; // 1 sec
            var cb = function () {
              if (counter < 0) {
                done(new Error('Timeout: wait purge resp-message to change.'));
              }
              counter -= interval;
              API.resources.purge
                .getOne(purge.id)
                .expect(200)
                .then(function (resp) {
                  if (resp.body.message !== 'Success') {
                    setTimeout(cb, interval);
                    return;
                  }
                  resp.body.message.should.equal('Success');
                  done();
                })
                .catch(done);
            };
            API.resources.purge
              .createOne(purgeData)
              .expect(200)
              .then(function () {
                setTimeout(cb, interval);
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return data when getting specific purge request.',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            API.resources.purge
              .getOne(purge.id)
              .expect(200)
              .then(function (res) {
                res.body.message.should.be.equal('Success');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return data when getting list purge requests.',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            API.resources.purge
              .domain_id()
              .getOne()
              .expect(200)
              .then(function (res) {
                res.body.total.should.be.equal(0);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return data when posting domain purge object.',
      function (done) {
        API.helpers
          .authenticateUser(revAdmin)
          .then(function () {
            var purgeData = PurgeDP.generateOne(domainConfig.domain_name);
            API.resources.purge
              .createOne(purgeData)
              .expect(200)
              .then(function (res) {
                var expMsg = 'The purge request has been successfully queued';
                res.body.message.should.be.equal(expMsg);
                done();
              })
              .catch(done);
          })
          .catch(done);
      });    
  });
});
