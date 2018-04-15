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
var PurgeDP = require('./../../../common/providers/data/purge');
var DataProvider = require('./../../../common/providers/data');
var request = require('supertest-as-promised');

describe('Functional Check: ', function () {
    this.timeout(config.api.request.maxTimeout);

    var API_URL = API.helpers.getAPIURL();

    var revAdmin = config.api.users.revAdmin;

    var users = ['user-admin',
        'user-reseller',
        'apikey-admin',
        'apikey-reseller'];


    users.forEach(function (user) {
        var testingUser;
        var object1;
        var object2;
        var purge1;
        var purge2;
        var account_id;
        describe('Cache Purge permissions with - ' + user, function () {
            before(function (done) {
                API.authenticate(revAdmin)
                    .then(function () {
                        return API.helpers.accounts.createOne();
                    })
                    .then(function (account) {
                        account_id = account.id;
                        switch (user) {
                            case 'user-admin':
                            case 'user-reseller':
                                return API.helpers.users.create({
                                    account_id: account_id,
                                    role: user.split('-')[1]
                                });
                            case 'apikey-admin':
                            case 'apikey-reseller':
                                return API.helpers.apiKeys.createOneForAccount({ id: account_id }, user.split('-')[1]);
                        }
                    })
                    .then(function (newUser) {

                        switch (user) {
                            case 'user-admin':
                            case 'user-reseller':
                                API
                                    .resources
                                    .users
                                    .getOne(newUser.id)
                                    .expect(200)
                                    .then(function (res) {
                                        testingUser = res.body;
                                        testingUser.password = 'password1';
                                        testingUser.id = testingUser.user_id;
                                        API.authenticate(testingUser)
                                            .then(function () {
                                                API
                                                    .helpers
                                                    .domainConfigs
                                                    .createOne(account_id)
                                                    .then(function (val1) {
                                                        object1 = val1;
                                                        API
                                                            .helpers
                                                            .domainConfigs
                                                            .createOne(account_id)
                                                            .then(function (val2) {
                                                                object2 = val2;
                                                                done();
                                                            })
                                                            .catch(done);
                                                    })
                                                    .catch(done);
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);
                                break;
                            case 'apikey-admin':
                            case 'apikey-reseller':
                                API
                                    .resources
                                    .apiKeys
                                    .getOne(newUser.id)
                                    .expect(200)
                                    .then(function (res) {
                                        testingUser = res.body;
                                        API.authenticate(testingUser)
                                            .then(function () {
                                                API
                                                    .helpers
                                                    .domainConfigs
                                                    .createOne(account_id)
                                                    .then(function (val1) {
                                                        object1 = val1;
                                                        API
                                                            .helpers
                                                            .domainConfigs
                                                            .createOne(account_id)
                                                            .then(function (val2) {
                                                                object2 = val2;
                                                                done();
                                                            })
                                                            .catch(done);
                                                    })
                                                    .catch(done);
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);
                                break;
                        }
                    })
                    .catch(done);
            });

            beforeEach(function (done) {
                API.authenticate(testingUser).then(function () {
                    API.helpers.purge.createOne(object1.domain_name)
                        .then(function (res1) {
                            purge1 = res1;
                            API.helpers.purge.createOne(object2.domain_name)
                                .then(function (res2) {
                                    purge2 = res2;
                                    done();
                                })
                                .catch(done);
                        })
                        .catch(done);
                });
            });

            it('should successfully queue purge for accessible domains',
                function (done) {
                    API.helpers
                        .authenticateUser(testingUser)
                        .then(function () {
                            var purgeData = PurgeDP.generateOne(object1.domain_name);
                            var purgeData2 = PurgeDP.generateOne(object2.domain_name);
                            API.resources.purge
                                .createOne(purgeData)
                                .expect(200)
                                .then(function (response) {
                                    var expMsg = 'The purge request has been successfully queued';
                                    response.body.message.should.equal(expMsg);
                                    API.resources.purge
                                        .createOne(purgeData2)
                                        .expect(200)
                                        .then(function (response) {
                                            var expMsg = 'The purge request has been successfully queued';
                                            response.body.message.should.equal(expMsg);
                                            done();
                                        })
                                        .catch(done);
                                })
                                .catch(done);
                        })
                        .catch(done);
                });

            it('should return data when getting specific purge request for accessible domain',
                function (done) {
                    API.helpers
                        .authenticateUser(testingUser)
                        .then(function () {
                            API.resources.purge
                                .getOne(purge1.id)
                                .expect(200)
                                .then(function (res) {
                                    res.body.message.should.be.equal('Success');
                                    API.resources.purge
                                        .getOne(purge2.id)
                                        .expect(200)
                                        .then(function (res) {
                                            res.body.message.should.be.equal('Success');
                                            done();
                                        })
                                        .catch(done);
                                })
                                .catch(done);
                        })
                        .catch(done);
                });

            it('should return data when getting list purge requests for accessible domains.',
                function (done) {
                    API.helpers
                        .authenticateUser(testingUser)
                        .then(function () {
                            API.resources.purge
                                .getAll({ domain_id: object1.id })
                                .expect(200)
                                .then(function (res) {
                                    var data = res.body;
                                    data.should.not.be.undefined();
                                    data.data.should.not.be.undefined();
                                    API.resources.purge
                                        .getAll({ domain_id: object2.id })
                                        .expect(200)
                                        .then(function (res2) {
                                            var data2 = res2.body;
                                            data2.should.not.be.undefined();
                                            data2.data.should.not.be.undefined();
                                            done();
                                        })
                                        .catch(done);
                                })
                                .catch(done);
                        })
                        .catch(done);
                });

            describe('Purging cache for not allowed domains', function () {

                before(function (done) {
                    API.authenticate(testingUser)
                        .then(function () {
                            var updateUser = _.cloneDeep(testingUser);
                            if (updateUser.password) {
                                delete updateUser.password;
                            }
                            updateUser.permissions.cache_purge.access = true;
                            updateUser.permissions.cache_purge.list = [object1.id, object2.id];
                            updateUser.permissions.cache_purge.allow_list = false;
                            if (updateUser.key) {
                                return API
                                    .resources
                                    .apiKeys
                                    .update(testingUser.id, updateUser);
                            } else {
                                return API
                                    .resources
                                    .users
                                    .update(testingUser.id, updateUser);
                            }
                        })
                        .then(function () {
                            done();
                        })
                        .catch(done);
                });

                it('should NOT successfully queue purge for NOT accessible domains',
                    function (done) {
                        API.helpers
                            .authenticateUser(testingUser)
                            .then(function () {
                                var purgeData = PurgeDP.generateOne(object1.domain_name);
                                var purgeData2 = PurgeDP.generateOne(object2.domain_name);
                                API.resources.purge
                                    .createOne(purgeData)
                                    .expect(400)
                                    .then(function (response) {
                                        var expMsg = 'Domain not found';
                                        response.body.message.should.equal(expMsg);
                                        API.resources.purge
                                            .createOne(purgeData2)
                                            .expect(400)
                                            .then(function (response) {
                                                var expMsg = 'Domain not found';
                                                response.body.message.should.equal(expMsg);
                                                done();
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);
                            })
                            .catch(done);
                    });

                it('should NOT return data when getting specific purge request for NOT accessible domain',
                    function (done) {
                        API.helpers
                            .authenticateUser(testingUser)
                            .then(function () {
                                API.resources.purge
                                    .getOne(purge1.id)
                                    .expect(400)
                                    .then(function (res) {
                                        API.resources.purge
                                            .getOne(purge2.id)
                                            .expect(400)
                                            .then(function (res) {
                                                done();
                                            })
                                            .catch(done);
                                    })
                                    .catch(done);
                            })
                            .catch(done);
                    });

                it('should NOT return data when getting list purge requests for NOT accessible domains.',
                    function (done) {
                        API.helpers
                            .authenticateUser(testingUser)
                            .then(function () {
                                API.resources.purge
                                    .getAll({ domain_id: object1.id })
                                    .expect(400)
                                    .then(function (res) {
                                        var data = res.body;
                                        should(data.data).be.undefined();
                                        API.resources.purge
                                            .getAll({ domain_id: object2.id })
                                            .expect(400)
                                            .then(function (res2) {
                                                var data2 = res2.body;
                                                should(data2.data).be.undefined();
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