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

describe('Functional check', function () {
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
                                API.resources.accounts.createOne(secAcc).then(function (res) {
                                    secAcc.id = res.body.object_id;
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
    });

    describe('Parent accounts permissions', function () {

        it('should be able to change an accounts parent account as Rev Admin',
            function (done) {
                API.helpers
                    .authenticateUser(revAdmin)
                    .then(function () {
                        API
                            .resources
                            .accounts
                            .getOne(firstAcc.id)
                            .expect(200)
                            .then(function (acc) {
                                acc.body.parent_account_id.should.equal(accountSample.id);
                                var updateAcc = acc.body;
                                updateAcc.parent_account_id = secAcc.id;
                                API
                                    .resources
                                    .accounts
                                    .update(updateAcc.id, updateAcc)
                                    .expect(200)
                                    .then(function (res) {
                                        API
                                            .resources
                                            .accounts
                                            .getOne(updateAcc.id)
                                            .expect(200)
                                            .then(function (uAcc) {
                                                uAcc.body.parent_account_id.should.equal(secAcc.id);
                                                done();
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);
                            })
                            .catch(done);
                    });
            });

        it('should be able to create an account with a parent account as Rev Admin',
            function (done) {
                API.helpers
                    .authenticateUser(revAdmin)
                    .then(function () {
                        var newAcc = AccountsDP.generateOne();
                        newAcc.parent_account_id = firstAcc.id;
                        API
                            .resources
                            .accounts
                            .createOne(newAcc)
                            .expect(200)
                            .then(function (res) {
                                var id = res.body.object_id;
                                API
                                    .resources
                                    .accounts
                                    .getOne(id)
                                    .expect(200)
                                    .then(function (res) {
                                        res.body.parent_account_id.should.equal(firstAcc.id);
                                        done();
                                    })
                                    .catch(done);
                            })
                            .catch(done);
                    });
            });
    });
});