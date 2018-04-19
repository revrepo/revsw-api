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
var should = require('should');
var config = require('config');
var _ = require('lodash');
var API = require('./../../../common/api');
var DomainDP = require('./../../../common/providers/data/domainConfigs');
var DNSZonesDP = require('./../../../common/providers/data/dnsZones');
var AppsDP = require('./../../../common/providers/data/apps');
var AccountsDP = require('./../../../common/providers/data/accounts');
var request = require('supertest-as-promised');
var DashboardsDP = require('./../../../common/providers/data/dashboards');
var GroupsDP = require('./../../../common/providers/data/groups');
var UsersDP = require('./../../../common/providers/data/users');
var SSLNamesDP = require('./../../../common/providers/data/sslNames');
var SSLCertsDP = require('./../../../common/providers/data/sslCerts');
var LogshippingDP = require('./../../../common/providers/data/logShippingJobs');
var APIKeysDP = require('./../../../common/providers/data/apiKeys');
var WAFRulesDP = require('./../../../common/providers/data/wafRules');

describe('Negative Check: ', function () {
    this.timeout(config.api.request.maxTimeout);

    var revAdmin = config.api.users.revAdmin;
    var user;
    var objects = {};

    describe('Simple resource creation with restricted permissions', function () {
        before(function (done) {
            API.authenticate(revAdmin)
                .then(function () {
                    return API
                        .helpers
                        .accounts
                        .createCompleteOne();
                })
                .then(function (account) {
                    API
                        .helpers
                        .users
                        .create({
                            account_id: account.id
                        })
                        .then(function (res) {
                            API
                                .resources
                                .users
                                .getOne(res.id)
                                .expect(200)
                                .then(function (_user) {
                                    user = _user.body;
                                    user.password = 'password1';
                                    done();
                                })
                                .catch(done);
                        })
                        .catch(done);
                })
                .catch(done);
        });

        it('should not be able to create a new dashboard ' +
            'without `manage dashboards` permission', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.dashboards = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var dashboard = DashboardsDP.generateOne();
                                API
                                    .resources
                                    .dashboards
                                    .createOne(dashboard)
                                    .expect(403)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not be able to create a new group ' +
            'without `manage groups` permission', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.groups = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var group = GroupsDP.generateValid({
                                    account_id: user.account_id
                                });
                                API
                                    .resources
                                    .groups
                                    .createOne(group)
                                    .expect(403)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not be able to create a new user ' +
            'without `manage users` permission', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.users = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var user_ = UsersDP.generate({
                                    account_id: user.account_id
                                });
                                API
                                    .resources
                                    .users
                                    .createOne(user_)
                                    .expect(403)
                                    .end(function () {
                                        var userCopy = _.cloneDeep(user);
                                        delete userCopy.password;
                                        userCopy.permissions.users = true;
                                        API
                                            .authenticate(revAdmin)
                                            .then(function () {
                                                API
                                                    .resources
                                                    .users
                                                    .update(user.user_id, userCopy)
                                                    .expect(200)
                                                    .then(function () {
                                                        done();
                                                    });
                                            })
                                            .catch(done);
                                    });
                            });
                    });
            });

        it('should not be able to create a new SSL Cert ' +
            'without `manage SSL certs` permission', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.domains.access = false;
                userCopy.permissions.ssl_certs = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var sslCert = SSLCertsDP.generateOne(user.account_id);
                                API
                                    .resources
                                    .sslCerts
                                    .createOne(sslCert)
                                    .expect(403)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not be able to create a new WAF Rule ' +
            'without `manage WAF rules` permission', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.domains.access = false;
                userCopy.permissions.waf_rules = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var rule = WAFRulesDP.generateOne({
                                    accountId: user.account_id
                                });
                                API
                                    .resources
                                    .wafRules
                                    .createOne(rule)
                                    .expect(403)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not be able to create a new API Key ' +
            'without `manage API keys` permission', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.API_keys = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var key = APIKeysDP.generateOne(user.account_id);
                                API
                                    .resources
                                    .apiKeys
                                    .createOne(key)
                                    .expect(403)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not be able to create a new Logshipping Job ' +
            'without `manage Logshipping jobs` permission', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.logshipping_jobs = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var job = LogshippingDP.generateOne(user.account_id);
                                API
                                    .resources
                                    .logShippingJobs
                                    .createOne(job)
                                    .expect(403)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });
    });
});