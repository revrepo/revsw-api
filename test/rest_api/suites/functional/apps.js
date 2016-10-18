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
var API = require('./../../common/api');
var AppsDP = require('./../../common/providers/data/apps');

describe('Functional check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  // Defining set of users for which all below tests will be run
  var reseller = config.get('api.users.reseller');
  var secondReseller = config.get('api.users.secondReseller');
  var users = [
    //config.get('api.users.revAdmin'),
    reseller
  ];

  users.forEach(function (user) {

    var secondTestAccount;
    var secondTestApp;
    var testAccount;
    var testApp;

    describe('With user: ' + user.role, function () {

      describe('Apps resource', function () {

        before(function (done) {
          API.helpers
            .authenticateUser(user)
            .then(function () {
              return API.helpers.accounts.createOne();
            })
            .then(function (newAccount) {
              testAccount = newAccount;
              return API.helpers.apps.create({accountId: testAccount.id});
            })
            .then(function (app) {
              testApp = app;
              return API.helpers
                .authenticateUser(secondReseller)
                .then(function () {
                  return API.helpers.accounts.createOne();
                })
                .then(function (newAccount) {
                  secondTestAccount = newAccount;
                  return API.helpers.apps.create({accountId: secondTestAccount.id});
                })
                .then(function (app) {
                  secondTestApp = app;
                })
                .then(done)
                .catch(done);
            })
            .catch(done);
        });

        after(function (done) {
          done();
        });

        beforeEach(function (done) {
          done();
        });

        afterEach(function (done) {
          done();
        });

        it('should not allow to get apps from other user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .getAll()
                  .expect(200)
                  .then(function (response) {
                    var apps = response.body;
                    apps.forEach(function (app) {
                      app.id.should.not.equal(secondTestApp.id);
                    });
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to get specific app from other user.',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .getOne(secondTestApp.id)
                  .expect(400)
                  .then(function (response) {
                    response.body.message.should.equal('App ID not found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to update an app from other user.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: secondTestAccount.id});
            var updatedApp = AppsDP.generateOneForUpdate(secondTestAccount.id);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .update(response.body.id, updatedApp)
                  .expect(404)
                  .then(function (response) {
                    response.body.error.should.equal('Not Found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to delete an app from other user.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: secondTestAccount.id});
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .deleteOne(response.body.id)
                  .expect(404)
                  .then(function (response) {
                    response.body.error.should.equal('Not Found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to get config status for specific app from ' +
          'other user',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .configStatus(secondTestApp.id)
                  .getOne()
                  .expect(400)
                  .then(function (response) {
                    response.body.message.should.equal('App ID not found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should not allow to get all versions for specific app form ' +
          'other user',
          function (done) {
            API.helpers
              .authenticateUser(user)
              .then(function () {
                API.resources.apps
                  .versions(secondTestApp.id)
                  .getAll()
                  .expect(400)
                  .then(function (response) {
                    response.body.message.should.equal('App ID not found');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to verify an app config.',
          function (done) {
            var options = {options: 'verify_only'};
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .update(response.body.id, updatedApp, options)
                  .expect(200)
                  .then(function (response) {
                    var updatedApp = response.body;
                    updatedApp.statusCode.should.equal(200);
                    updatedApp.message.should.equal('The configuration ' +
                      'has been successfully verified');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should allow to publish an app config.',
          function (done) {
            var options = {options: 'publish'};
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                API.resources.apps
                  .update(response.body.id, updatedApp, options)
                  .expect(200)
                  .then(function (response) {
                    var updatedApp = response.body;
                    updatedApp.statusCode.should.equal(200);
                    updatedApp.message.should.equal('The application record ' +
                      'has been successfully updated');
                    done();
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should set `staging status` to `InProgress` right after ' +
          'updating an app',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                var appId = response.body.id;
                API.resources.apps
                  .update(appId, updatedApp)
                  .expect(200)
                  .then(function () {
                    API.resources.apps
                      .configStatus(appId)
                      .getOne()
                      .then(function (res) {
                        ['InProgress', 'Published']
                          .should.containEql(res.body.staging_status);
                        res.body.global_status.should.equal('Modified');
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should set `staging status` to `Published` some secs after ' +
          'updating an app',
          function (done) {
            var appId;
            var counter = 180000; // 3 mins
            var interval = 1000;
            var cb = function () {
              if (counter < 0) {
                done(new Error('Timeout: waiting app-status to change.'));
              }
              counter -= interval;
              API.resources.apps
                .configStatus(appId)
                .getOne()
                .then(function (res) {
                  if (res.body.staging_status !== 'Published') {
                    setTimeout(cb, interval);
                    return;
                  }
                  res.body.staging_status.should.equal('Published');
                  res.body.global_status.should.equal('Modified');
                  done();
                })
                .catch(done);
            };

            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                appId = response.body.id;
                API.resources.apps
                  .update(appId, updatedApp)
                  .expect(200)
                  .then(function () {
                    setTimeout(cb, interval);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should set `staging status` to `InProgress` right after ' +
          'publishing an app',
          function (done) {
            var options = {options: 'publish'};
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                var appId = response.body.id;
                API.resources.apps
                  .update(appId, updatedApp, options)
                  .expect(200)
                  .then(function () {
                    API.resources.apps
                      .configStatus(appId)
                      .getOne()
                      .then(function (res) {
                        ['InProgress', 'Published']
                          .should.containEql(res.body.staging_status);
                        res.body.global_status.should.equal('InProgress');
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });

        it('should set `staging status` to `Published` some secs after ' +
          'publishing an app',
          function (done) {
            var appId;
            var counter = 360000; // 6 mins
            var interval = 1000;
            var cb = function () {
              if (counter < 0) {
                done(new Error('Timeout: waiting app-status to change.'));
              }
              counter -= interval;
              API.resources.apps
                .configStatus(appId)
                .getOne()
                .then(function (res) {
                  if (res.body.staging_status !== 'Published') {
                    setTimeout(cb, interval);
                    return;
                  }
                  res.body.staging_status.should.equal('Published');
                  res.body.global_status.should.equal('Published');
                  done();
                })
                .catch(done);
            };

            var options = {options: 'publish'};
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            var updatedApp = AppsDP.generateOneForUpdate(testAccount.id);
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                appId = response.body.id;
                API.resources.apps
                  .update(appId, updatedApp, options)
                  .expect(200)
                  .then(function () {
                    setTimeout(cb, interval);
                  })
                  .catch(done);
              })
              .catch(done);
          });

         it('should allow to create apps with same data for two different account.', function(done) {
          var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
          API.helpers
            .authenticateUser(user)
            .then(function() {
              return API.resources.apps.createOneAsPrerequisite(newApp)
                .then(function() {
                  return API.resources.apps
                    .createOne(newApp)
                    .expect(400);
                });
            })
            .then(function(resource) {
              return API.helpers
                .authenticateUser(secondReseller)
                .then(function() {
                  // Same data for second Account
                  newApp.account_id = secondTestAccount.id;
                  return API.resources.apps.createOne(newApp)
                    .expect(200)
                    .then(function(response) {
                      // Delete app
                      API.resources.apps
                        .deleteOne(response.body.object_id)
                        .end(done);
                    })
                    .catch(done);
                });
            })
            .catch(done);
        });

        it('should allow to get app data after updating it.',
          function (done) {
            var newApp = API.providers.data.apps.generate({accountId: testAccount.id});
            var ts = Date.now();
            var updatedApp = {
              account_id: testAccount.id,
              app_name: 'ALL_UPDATED_' + ts,
              configs: [
                {
                  sdk_release_version: 2,
                  logging_level: 'info',
                  configuration_refresh_interval_sec: 2400,
                  configuration_stale_timeout_sec: 24000,
                  operation_mode: 'off',
                  initial_transport_protocol: 'rmp',
                  stats_reporting_interval_sec: 70,
                  stats_reporting_level: 'info',
                  stats_reporting_max_requests_per_report: 700,
                  a_b_testing_origin_offload_ratio: 1,
                  domains_black_list: ['black-' + ts + '.com'],
                  domains_white_list: ['white-' + ts + '.com'],
                  domains_provisioned_list: ['provisioned-' + ts + '.com'],
                  allowed_transport_protocols: ['rmp']
                }
              ]
            };
            API.helpers
              .authenticateUser(user)
              .then(function () {
                return API.resources.apps.createOneAsPrerequisite(newApp);
              })
              .then(function (response) {
                var appId = response.body.id;
                API.resources.apps
                  .update(appId, updatedApp)
                  .expect(200)
                  .then(function () {
                    API.resources.apps
                      .getOne(appId)
                      .then(function (response) {
                        var data = response.body;
                        var config = data.configs[0];
                        var expConfig = updatedApp.configs[0];
                        updatedApp.account_id.should.equal(data.account_id);
                        updatedApp.app_name.should.equal(data.app_name);
                        config.sdk_release_version.should
                          .equal(expConfig.sdk_release_version);
                        config.logging_level.should
                          .equal(expConfig.logging_level);
                        config.configuration_refresh_interval_sec.should
                          .equal(expConfig.configuration_refresh_interval_sec);
                        config.configuration_stale_timeout_sec.should
                          .equal(expConfig.configuration_stale_timeout_sec);
                        config.operation_mode.should
                          .equal(expConfig.operation_mode);
                        config.initial_transport_protocol.should
                          .equal(expConfig.initial_transport_protocol);
                        config.stats_reporting_interval_sec.should
                          .equal(expConfig.stats_reporting_interval_sec);
                        config.stats_reporting_level.should
                          .equal(expConfig.stats_reporting_level);
                        config.stats_reporting_max_requests_per_report
                          .should.equal(expConfig
                            .stats_reporting_max_requests_per_report);
                        config.a_b_testing_origin_offload_ratio
                          .should.equal(expConfig
                            .a_b_testing_origin_offload_ratio);
                        config.domains_black_list[0].should
                          .equal(expConfig.domains_black_list[0]);
                        config.domains_white_list[0].should
                          .equal(expConfig.domains_white_list[0]);
                        config.domains_provisioned_list[0].should
                          .equal(expConfig.domains_provisioned_list[0]);
                        config.allowed_transport_protocols[0].should
                          .equal(expConfig.allowed_transport_protocols[0]);
                        done();
                      })
                      .catch(done);
                  })
                  .catch(done);
              })
              .catch(done);
          });
      });
    });
  });
});
