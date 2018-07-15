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
var AppsDP = require('./../../../common/providers/data/apps');
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
        var app1;
        var app2;
        var account_id;
        describe('Mobile Apps permissions with - ' + user, function () {
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
                                                    .apps
                                                    .create({
                                                        accountId: account_id
                                                    })
                                                    .then(function (app) {
                                                        app1 = app;
                                                        API
                                                            .helpers
                                                            .apps
                                                            .create({
                                                                accountId: account_id
                                                            })
                                                            .then(function (appSec) {
                                                                app2 = appSec;
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
                                                    .apps
                                                    .create({
                                                        accountId: account_id
                                                    })
                                                    .then(function (app) {
                                                        app1 = app;
                                                        API
                                                            .helpers
                                                            .apps
                                                            .create({
                                                                accountId: account_id
                                                            })
                                                            .then(function (appSec) {
                                                                app2 = appSec;
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

            it('should have access to both apps', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        API
                            .resources
                            .apps
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(2);
                                JSON.stringify(res.body).should.containEql(app1.id);
                                JSON.stringify(res.body).should.containEql(app2.id);
                                done();
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

            it('should not have access to both apps after disabling `mobile_apps` permission', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.mobile_apps.access = false;
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
                        API
                            .resources
                            .apps
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(0);
                                API
                                    .resources
                                    .apps
                                    .getOne(app1.id)
                                    .expect(400)
                                    .then(function () {
                                        API
                                            .resources
                                            .apps
                                            .getOne(app2.id)
                                            .expect(400)
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
            });

            it('should have access only to first app after setting `mobile_apps` permission list', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.mobile_apps.access = true;
                        updateUser.permissions.mobile_apps.list = [app1.id];
                        updateUser.permissions.mobile_apps.allow_list = true;
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
                        API.authenticate(testingUser)
                            .then(function () {
                                API
                                    .resources
                                    .apps
                                    .getAll()
                                    .expect(200)
                                    .then(function (res) {
                                        res.body.length.should.equal(1);
                                        API
                                            .resources
                                            .apps
                                            .getOne(app1.id)
                                            .expect(200)
                                            .then(function () {
                                                API
                                                    .resources
                                                    .apps
                                                    .getOne(app2.id)
                                                    .expect(400)
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
            });

            it('should NOT have access only to first app after setting `mobile_apps` permission list', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.mobile_apps.access = true;
                        updateUser.permissions.mobile_apps.list = [app1.id];
                        updateUser.permissions.mobile_apps.allow_list = false;
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
                        API
                            .resources
                            .apps
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(1);
                                API
                                    .resources
                                    .apps
                                    .getOne(app1.id)
                                    .expect(400)
                                    .then(function () {
                                        API
                                            .resources
                                            .apps
                                            .getOne(app2.id)
                                            .expect(200)
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
            });

            it('should NOT have access to any app after setting `mobile_apps` permission list', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.mobile_apps.access = true;
                        updateUser.permissions.mobile_apps.list = [app1.id, app2.id];
                        updateUser.permissions.mobile_apps.allow_list = false;
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
                        API
                            .resources
                            .apps
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(0);
                                API
                                    .resources
                                    .apps
                                    .getOne(app1.id)
                                    .expect(400)
                                    .then(function () {
                                        API
                                            .resources
                                            .apps
                                            .getOne(app2.id)
                                            .expect(400)
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
            });

            it('should have access to both apps after setting `mobile_apps` permission list', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.mobile_apps.access = true;
                        updateUser.permissions.mobile_apps.list = [app1.id, app2.id];
                        updateUser.permissions.mobile_apps.allow_list = true;
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
                        API
                            .resources
                            .apps
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(2);
                                API
                                    .resources
                                    .apps
                                    .getOne(app1.id)
                                    .expect(200)
                                    .then(function () {
                                        API
                                            .resources
                                            .apps
                                            .getOne(app2.id)
                                            .expect(200)
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
            });
        });
    });
});