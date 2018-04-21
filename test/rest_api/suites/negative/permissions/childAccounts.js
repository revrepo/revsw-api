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
var AccountsDP = require('./../../../common/providers/data/accounts');
var DataProvider = require('./../../../common/providers/data');
var DomainDP = require('./../../../common/providers/data/domainConfigs');

describe('Negative check', function () {
    this.timeout(config.api.request.maxTimeout);

    var revAdmin = config.get('api.users.revAdmin');
    var userSample = DataProvider.generateUser('reseller');
    var accountSample = AccountsDP.generateOne();
    var firstAcc = AccountsDP.generateOne();
    var secAcc = AccountsDP.generateOne();
    before(function (done) {
        API.helpers
            .authenticateUser(revAdmin)
            .then(function () {
                return API.resources.accounts.createOne(accountSample);
            })
            .then(function (response) {
                accountSample.id = response.body.object_id;
            })
            .then(function () {
                userSample.account_id = accountSample.id;
                return API.resources.users.createOne(userSample);
            })
            .then(function (response) {
                userSample.id = response.body.object_id;
                userSample.name = userSample.email;
                API
                    .resources
                    .users
                    .getOne(userSample.id)
                    .expect(200)
                    .then(function (userRes) {
                        userSample = userRes.body;
                        userSample.password = 'secret123';
                        API.authenticate(userSample).then(function () {
                            API.resources.accounts.createOne(firstAcc).then(function (res) {
                                firstAcc.id = res.body.object_id;
                                // domains for testing permissions
                                API.resources.accounts.createOne(secAcc).then(function (res) {
                                    secAcc.id = res.body.object_id;
                                    API.helpers.domainConfigs.createOne(firstAcc.id)
                                        .then(function () {
                                            API.helpers.domainConfigs.createOne(secAcc.id)
                                                .then(function () {
                                                    done();
                                                })
                                                .catch(done);
                                        })
                                        .catch(done);
                                })
                                    .catch(done);
                            })
                                .catch(done);
                        })
                            .catch(done);
                    })
                    .catch(done);
            })
            .catch(done);
    });

    describe('Child accounts permissions', function () {

        it('should have the main account ID set as the child account\'s `parent_account_id`',
            function (done) {
                API.helpers
                    .authenticateUser(userSample)
                    .then(function () {
                        API
                            .resources
                            .accounts
                            .getOne(firstAcc.id)
                            .expect(200)
                            .then(function (acc) {
                                acc.body.parent_account_id.should.equal(accountSample.id);
                                API
                                    .resources
                                    .accounts
                                    .getOne(secAcc.id)
                                    .expect(200)
                                    .then(function (acc2) {
                                        acc2.body.parent_account_id.should.equal(accountSample.id);
                                        done();
                                    })
                                    .catch(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should have access to child account\'s resources',
            function (done) {
                API.helpers
                    .authenticateUser(userSample)
                    .then(function () {
                        API
                            .resources
                            .domainConfigs
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(2);
                                res.body.forEach(function (domain) {
                                    should(domain.account_id === firstAcc.id
                                        || domain.account_id === secAcc.id);
                                });
                                done();
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not have access to child account\'s resources after ' +
            'disabling permission for that child account',
            function (done) {
                API.helpers
                    .authenticateUser(userSample)
                    .then(function () {
                        var updateSample = _.cloneDeep(userSample);
                        delete updateSample.password;
                        updateSample.permissions.accounts.list = [firstAcc.id];
                        updateSample.permissions.accounts.allow_list = false;
                        API
                            .resources
                            .users
                            .update(updateSample.user_id, updateSample)
                            .expect(200)
                            .then(function () {
                                API.helpers
                                    .authenticateUser(userSample)
                                    .then(function () {
                                        API
                                            .resources
                                            .domainConfigs
                                            .getAll()
                                            .expect(200)
                                            .then(function (res) {
                                                res.body.length.should.equal(1);
                                                res.body[0].account_id.should.not.equal(firstAcc.id);
                                                done();
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);

                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not have access to child account\'s resources after ' +
            'disabling permission for all child accounts',
            function (done) {
                API.helpers
                    .authenticateUser(userSample)
                    .then(function () {
                        var updateSample = _.cloneDeep(userSample);
                        delete updateSample.password;
                        updateSample.permissions.accounts.access = false;
                        API
                            .resources
                            .users
                            .update(updateSample.user_id, updateSample)
                            .expect(200)
                            .then(function () {
                                API.helpers
                                    .authenticateUser(userSample)
                                    .then(function () {
                                        API
                                            .resources
                                            .domainConfigs
                                            .getAll()
                                            .expect(200)
                                            .then(function (res) {
                                                res.body.length.should.equal(0);
                                                done();
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);

                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not have access to child account\'s resources if child account ' +
            'is not listed in permissions list',
            function (done) {
                API.helpers
                    .authenticateUser(userSample)
                    .then(function () {
                        var updateSample = _.cloneDeep(userSample);
                        delete updateSample.password;
                        updateSample.permissions.accounts.access = true;
                        updateSample.permissions.accounts.list = [firstAcc.id];
                        updateSample.permissions.accounts.allow_list = true;
                        API
                            .resources
                            .users
                            .update(updateSample.user_id, updateSample)
                            .expect(200)
                            .then(function () {
                                API.helpers
                                    .authenticateUser(userSample)
                                    .then(function () {
                                        API
                                            .resources
                                            .domainConfigs
                                            .getAll()
                                            .expect(200)
                                            .then(function (res) {
                                                res.body.length.should.equal(1);
                                                res.body[0].account_id.should.equal(firstAcc.id);
                                                done();
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);

                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        it('should not have access to parent\'s account resources',
            function (done) {
                API.helpers
                    .authenticateUser(userSample)
                    .then(function () {
                        var updateSample = _.cloneDeep(userSample);
                        delete updateSample.password;
                        updateSample.permissions.accounts.access = true;
                        updateSample.permissions.accounts.list = null;
                        updateSample.permissions.accounts.allow_list = true;
                        API
                            .resources
                            .users
                            .update(updateSample.user_id, updateSample)
                            .expect(200)
                            .then(function () {
                                API.helpers
                                    .authenticateUser(userSample)
                                    .then(function () {
                                        API
                                            .helpers
                                            .users
                                            .create({ account_id: firstAcc.id })
                                            .then(function (testUser) {
                                                API.helpers.domainConfigs.createOne(userSample.account_id)
                                                    .then(function () {
                                                        API
                                                            .authenticate(testUser)
                                                            .then(function () {
                                                                API
                                                                    .resources
                                                                    .domainConfigs
                                                                    .getAll()
                                                                    .expect(200)
                                                                    .then(function (res) {
                                                                        res.body.length.should.equal(1);
                                                                        res.body[0].account_id.should.equal(firstAcc.id);
                                                                        done();
                                                                    })
                                                                    .catch(done);
                                                            })
                                                            .catch(done);
                                                    })
                                                    .catch(done);
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);

                            })
                            .catch(done);
                    })
                    .catch(done);
            });

        describe('Parent account change', function () {
            var acc1;
            var acc2;
            before(function (done) {
                API
                    .authenticate(config.api.users.reseller)
                    .then(function () {
                        return API.helpers.accounts.createOne();
                    })
                    .then(function (res) {
                        acc1 = res;
                        return API.helpers.accounts.createOne();
                    })
                    .then(function (res) {
                        acc2 = res;
                        done();
                    })
                    .catch(done);
            });

            it('should NOT be able to change an accounts parent account with ' + config.api.users.reseller.role,
                function (done) {
                    API.helpers
                        .authenticate(config.api.users.reseller)
                        .then(function () {
                            API
                                .resources
                                .accounts
                                .getOne(acc1.id)
                                .expect(200)
                                .then(function (acc) {

                                    var updateAcc = acc.body;
                                    updateAcc.id = acc1.id;
                                    updateAcc.parent_account_id = acc2.id;
                                    API
                                        .resources
                                        .accounts
                                        .update(updateAcc.id, updateAcc)
                                        .expect(400)
                                        .then(function (res) {
                                            res.body.message.should.equal('Cannot update parent account');
                                            done();
                                        })
                                        .catch(done);
                                })
                                .catch(done);
                        });
                });

            [
                config.api.users.admin,
                config.api.apikeys.admin,
                config.api.apikeys.reseller
            ].forEach(function (cred) {
                it('should NOT be able to change an accounts parent account with ' + cred.role,
                    function (done) {
                        API.helpers
                            .authenticate(cred)
                            .then(function () {
                                API
                                    .resources
                                    .accounts
                                    .getOne(cred.account.id)
                                    .expect(200)
                                    .then(function (acc) {

                                        var updateAcc = acc.body;
                                        updateAcc.id = cred.account.id;
                                        updateAcc.parent_account_id = acc2.id;
                                        API
                                            .resources
                                            .accounts
                                            .update(updateAcc.id, updateAcc)
                                            .expect(400)
                                            .then(function (res) {
                                                res.body.message.should.equal('Cannot update parent account');
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
});

