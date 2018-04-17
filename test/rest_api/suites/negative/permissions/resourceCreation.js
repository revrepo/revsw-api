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

describe('Negative Check: ', function () {
    this.timeout(config.api.request.maxTimeout);

    var revAdmin = config.api.users.revAdmin;
    var user;
    var objects = {};

    describe('Resource creation with restricted permissions', function () {
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

        it('should not be able to create a new domain ' +
            'with permissions to manage only a specific domain', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.domains.access = true;
                userCopy.permissions.domains.list = [objects.domain];
                userCopy.permissions.domains.allow_list = true;
                // We only have access to a single domain (objects.domain), we should get
                // forbidden error if we try to create a domain
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
                                    .expect(403)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not be able to create a new DNS Zone ' +
            'with permissions to manage only a specific DNS Zone', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.dns_zones.access = true;
                userCopy.permissions.dns_zones.list = [objects.dnsZone];
                userCopy.permissions.dns_zones.allow_list = true;
                // We only have access to a single zone (objects.dnsZone), we should get
                // forbidden error if we try to create a zone
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
                                    .expect(403)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not be able to create a new App ' +
            'with permissions to manage only a specific App', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.mobile_apps.access = true;
                userCopy.permissions.mobile_apps.list = [objects.app];
                userCopy.permissions.mobile_apps.allow_list = true;
                // We only have access to a single app (objects.app), we should get
                // forbidden error if we try to create a app
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
                                    .expect(403)
                                    .end(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not be able to create a new account ' +
            'with permissions to manage only a specific account (Reseller)', function (done) {
                var userCopy = _.cloneDeep(user);
                delete userCopy.password;
                userCopy.permissions.accounts.access = true;
                userCopy.permissions.accounts.list = [user.account_id];
                userCopy.permissions.accounts.allow_list = true;
                userCopy.role = 'reseller';
                // We only have access to a single account (user.account_id), we should get
                // forbidden error if we try to create a account
                API
                    .authenticate(revAdmin)
                    .then(function () {
                        API
                            .resources
                            .users
                            .update(user.user_id, userCopy)
                            .expect(200)
                            .then(function () {
                                var acc = AccountsDP.generateOne();
                                API.authenticate(user)
                                    .then(function () {
                                        API
                                            .resources
                                            .accounts
                                            .createOne(acc)
                                            .expect(403)
                                            .end(done);
                                    })
                                    .catch(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });
    });
});