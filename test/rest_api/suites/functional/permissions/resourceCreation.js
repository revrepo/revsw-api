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

describe('Functional Check: ', function () {
    this.timeout(config.api.request.maxTimeout);

    var revAdmin = config.api.users.revAdmin;
    var user;
    var objects = {};
    var accountTest;

    describe('Resource creation with different permissions', function () {
        before(function (done) {
            API.authenticate(revAdmin)
                .then(function () {
                    return API
                        .helpers
                        .accounts
                        .createCompleteOne();
                })
                .then(function (account) {
                    accountTest = account;
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
                                    return user;
                                })
                                .then(function (_user) {
                                    return API
                                        .helpers
                                        .domainConfigs
                                        .createOne(_user.account_id);
                                })
                                .then(function (domain) {
                                    objects.domain = domain.id;
                                    return API
                                        .helpers
                                        .apps
                                        .create({ accountId: user.account_id });
                                })
                                .then(function (app) {
                                    objects.app = app.id;
                                    return API
                                        .helpers
                                        .dnsZones
                                        .create(user.account_id);
                                })
                                .then(function (dnsZone) {
                                    objects.dnsZone = dnsZone.id;
                                    done();
                                })
                                .catch(done);
                        })
                        .catch(done);
                })
                .catch(done);
        });

        it('should be able to create a new domain ' +
            'with permissions to manage all domains', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.domains.access = true;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var domain = DomainDP.generateOne(user.account_id);
                                API
                                    .resources
                                    .domainConfigs
                                    .createOne(domain)
                                    .expect(200)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should be able to create a new domain ' +
            'with permissions to manage all domains but one', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.domains.access = true;
                userCopy.permissions.domains.list = [objects.domain];
                userCopy.permissions.domains.allow_list = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var domain = DomainDP.generateOne(user.account_id);
                                API
                                    .resources
                                    .domainConfigs
                                    .createOne(domain)
                                    .expect(200)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should be able to create a new DNS Zone ' +
            'with permissions to manage all DNS Zones', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.dns_zones.access = true;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var zone = DNSZonesDP.generateOne(user.account_id);
                                API
                                    .resources
                                    .dnsZones
                                    .createOne(zone)
                                    .expect(200)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should be able to create a new DNS Zone ' +
            'with permissions to manage all DNS Zones but one', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.dns_zones.access = true;
                userCopy.permissions.dns_zones.list = [objects.dnsZone];
                userCopy.permissions.dns_zones.allow_list = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var zone = DNSZonesDP.generateOne(user.account_id);
                                API
                                    .resources
                                    .dnsZones
                                    .createOne(zone)
                                    .expect(200)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should be able to create a new App ' +
            'with permissions to manage all apps', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.mobile_apps.access = true;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var app = AppsDP.generate({ accountId: user.account_id });
                                API
                                    .resources
                                    .apps
                                    .createOne(app)
                                    .expect(200)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should be able to create a new App ' +
            'with permissions to manage all apps but one', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.mobile_apps.access = true;
                userCopy.permissions.mobile_apps.list = [objects.app];
                userCopy.permissions.mobile_apps.allow_list = false;
                API
                    .authenticate(user)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var app = AppsDP.generate({ accountId: user.account_id });
                                API
                                    .resources
                                    .apps
                                    .createOne(app)
                                    .expect(200)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should be able to create a new account ' +
            'with permissions to manage all accounts (Reseller)', function (done) {
                API
                    .authenticate(revAdmin)
                    .then(function () {
                        API.helpers.users.create({
                            account_id: accountTest.id,
                            role: 'reseller'
                        })
                            .then(function (usr) {
                                API
                                    .resources
                                    .users
                                    .getOne(usr.id)
                                    .expect(200)
                                    .then(function (res) {
                                        var upUser = res.body;
                                        var upUserCopy = _.cloneDeep(upUser);
                                        delete upUserCopy.password;
                                        upUserCopy.permissions.accounts.access = true;
                                        upUser.password = 'password1';
                                        API
                                            .resources
                                            .users
                                            .update(upUser.user_id, upUserCopy)
                                            .expect(200)
                                            .then(function () {
                                                var acc = AccountsDP.generateOne();
                                                API.authenticate(upUser)
                                                    .then(function () {
                                                        API
                                                            .resources
                                                            .accounts
                                                            .createOne(acc)
                                                            .expect(200)
                                                            .end(done);
                                                    })
                                                    .catch(done);
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);
                            });
                    })
                    .catch(done);
            });

        it('should be able to create a new account ' +
            'with permissions to manage all accounts but one (Reseller)', function (done) {
                API
                    .authenticate(revAdmin)
                    .then(function () {
                        API.helpers.users.create({
                            account_id: accountTest.id,
                            role: 'reseller'
                        })
                            .then(function (usr) {
                                API
                                    .resources
                                    .users
                                    .getOne(usr.id)
                                    .expect(200)
                                    .then(function (res) {
                                        var upUser = res.body;
                                        var upUserCopy = _.cloneDeep(upUser);
                                        delete upUserCopy.password;
                                        upUserCopy.permissions.accounts.access = true;
                                        upUserCopy.permissions.accounts.list = [upUser.account_id];
                                        upUserCopy.permissions.accounts.allow_list = false;
                                        upUser.password = 'password1';
                                        API
                                            .resources
                                            .users
                                            .update(upUser.user_id, upUserCopy)
                                            .expect(200)
                                            .then(function () {
                                                var acc = AccountsDP.generateOne();
                                                API.authenticate(upUser)
                                                    .then(function () {
                                                        API
                                                            .resources
                                                            .accounts
                                                            .createOne(acc)
                                                            .expect(200)
                                                            .end(done);
                                                    })
                                                    .catch(done);
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);
                            });
                    })
                    .catch(done);
            });
    });
});