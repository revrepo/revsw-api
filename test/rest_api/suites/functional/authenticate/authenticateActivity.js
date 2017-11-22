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

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  var user = config.get('api.users.reseller');

  before(function (done) {
    API.identity
      .authenticate(user)
      .then(function () {
        API.resources.users
          .myself()
          .getOne()
          .then(function (response) {
            user.id = response.body.user_id;
            done();
          })
          .catch(done);
      })
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('Authenticate - Activity resource', function () {

    beforeEach(function (done) {
      done();
    });

    afterEach(function (done) {
      done();
    });

    it('should return activity after generating token',
      function (done) {
        var startTime = Date.now();
        API.resources.authenticate
          .createOne({email: user.email, password: user.password})
          .expect(200)
          .then(function () {
            API.resources.activity
              .getAll({
                user_id: user.id,
                from_timestamp: startTime
              })
              .expect(200)
              .then(function (response) {
                var activities = response.body.data;
                activities.length.should.be.equal(1);
                var activity = activities[0];
                activity.activity_type.should.equal('login');
                activity.activity_target.should.equal('user');
                activity.target_id.should.equal(user.id);
                activity.operation_status.should.equal('success');
                done();
              })
              .catch(done);
          })
          .catch(done);
      });

    it('should return activity for each token generated',
      function (done) {
        var startTime = Date.now();
        API.resources.authenticate
          .createOne({email: user.email, password: user.password})
          .expect(200)
          .then(function (response) {
            setTimeout(function () {
              var firstToken = response.body.token;
              API.resources.authenticate
                .createOne({email: user.email, password: user.password})
                .expect(200)
                .then(function (response) {
                  var secondToken = response.body.token;
                  firstToken.should.not.equal(secondToken);
                  API.resources.activity
                    .getAll({
                      user_id: user.id,
                      from_timestamp: startTime
                    })
                    .expect(200)
                    .then(function (response) {
                      var activities = response.body.data;
                      activities.length.should.be.equal(2);
                      activities.forEach(function (activity) {
                        activity.activity_type.should.equal('login');
                        activity.activity_target.should.equal('user');
                        activity.target_id.should.equal(user.id);
                        activity.operation_status.should.equal('success');
                      });
                      done();
                    })
                    .catch(done);
                })
                .catch(done);
            }, 1000);
          })
          .catch(done);
      });
  });
});
