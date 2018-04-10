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
var API = require('./../../../../common/api');
var AccountsDP = require('./../../../../common/providers/data/accounts');
var DataProvider = require('./../../../../common/providers/data');
var request = require('supertest-as-promised');

describe('Functional Check: ', function () {
    this.timeout(config.api.request.maxTimeout);

    var API_URL = API.helpers.getAPIURL();

    var revAdmin = config.api.users.revAdmin;

    var users = [
        config.get('api.apikeys.reseller'),
        config.get('api.apikeys.admin')
    ];

    users.forEach(function (user) {
        describe('API Keys self permissions with role - ' + user.role, function () {
            var keyRole = user.role.includes('Reseller') ? 'reseller' : 'admin';
            var account_id;

            var testingResources;
            var testingResources2;
            var testingUser;
            var permissionsToTest = {
                domain_configs: [],
                apps: [],
                dns_zones: [],
                users: null,
                ssl_certs: null,
                groups: null,
                api_keys: [],
                log_shipping_jobs: null
            };
            // this needs to be the length of permissionsToTest object
            var PERM_LENGTH = Object.keys(permissionsToTest).length - 1;

            before(function (done) {
                API.authenticate(revAdmin).then(function () {
                    API.helpers.accounts.createOne().then(function (acc) {
                        account_id = acc.id;
                        API.helpers.createResources(keyRole, account_id).then(function (res) {
                            testingResources = res;
                            permissionsToTest.domain_configs.push(res.domain_id);
                            permissionsToTest.apps.push(res.app_id);
                            permissionsToTest.dns_zones.push(res.dns_zone_id);
                            permissionsToTest.api_keys.push(res.api_key);
                            API.helpers.createResources(keyRole, account_id).then(function (ress) {
                                testingResources = ress;
                                permissionsToTest.domain_configs.push(ress.domain_id);
                                permissionsToTest.apps.push(ress.app_id);
                                permissionsToTest.dns_zones.push(ress.dns_zone_id);
                                permissionsToTest.api_keys.push(ress.api_key);
                                API.resources.apiKeys.getOne(ress.api_key)
                                    .expect(200)
                                    .then(function (_user) {
                                        testingUser = _user.body;
                                        delete permissionsToTest.api_keys;
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

            it('should have access to all resources by default', function (done) {
                API.authenticate(testingUser).then(function () {
                    var count = 1;
                    for (var perm in permissionsToTest) {
                        request(API_URL + '/v1/' + perm)
                            .get('')
                            .set('Authorization', 'X-API-KEY ' + testingUser.key)
                            .expect(200)
                            .then(function (res) {
                                should(res.ok);
                                if (res.body.length === 0) {
                                }
                                res.body.length.should.be.above(0);
                                if (count === PERM_LENGTH) {
                                    done();
                                }
                                count++;
                            }).catch(done);;
                    }
                }).catch(done);;
            });

            it('should not have access to resources after disabling permissions for that resource', function (done) {
                API.authenticate(testingUser).then(function () {
                    var updateUser = _.cloneDeep(testingUser);
                    updateUser.permissions.mobile_apps.access = false;
                    updateUser.permissions.domains.access = false;
                    updateUser.permissions.dns_zones.access = false;
                    updateUser.permissions.ssl_names = false;
                    updateUser.permissions.ssl_certs = false;
                    updateUser.permissions.waf_rules = false;
                    updateUser.permissions.logshipping_jobs = false;
                    updateUser.permissions.groups = false;
                    updateUser.permissions.users = false;
                    API.resources.apiKeys
                        .update(testingUser.id, updateUser)
                        .expect(200)
                        .then(function () {
                            API.authenticate(testingUser).then(function () {
                                var count = 1;
                                for (var perm in permissionsToTest) {
                                    request(API_URL + '/v1/' + perm)
                                        .get('')
                                        .set('Authorization', 'X-API-KEY ' + testingUser.key)
                                        .expect(200)
                                        .then(function (res) {
                                            should(res.ok);
                                            if (res.body.length > 0) {
                                                // this is for debugging, keep this for MUCH easier debuging..
                                                console.log(JSON.stringify(res.body) + ' <<<< Error is in this body!');
                                            }
                                            res.body.length.should.equal(0);
                                            if (count === PERM_LENGTH) {
                                                done();
                                            }
                                            count++;
                                        });
                                }
                            });
                        });
                });
            });

            it('should have access to resources after re-enabling permissions for that resource', function (done) {
                API.authenticate(testingUser).then(function () {
                    var updateUser = _.cloneDeep(testingUser);
                    updateUser.permissions.mobile_apps.access = true;
                    updateUser.permissions.domains.access = true;
                    updateUser.permissions.dns_zones.access = true;
                    updateUser.permissions.ssl_names = true;
                    updateUser.permissions.ssl_certs = true;
                    updateUser.permissions.waf_rules = true;
                    updateUser.permissions.logshipping_jobs = true;
                    updateUser.permissions.groups = true;
                    updateUser.permissions.users = true;
                    API.resources.apiKeys
                        .update(testingUser.id, updateUser)
                        .expect(200)
                        .then(function () {
                            API.authenticate(testingUser).then(function () {
                                var count = 1;
                                for (var perm in permissionsToTest) {
                                    request(API_URL + '/v1/' + perm)
                                        .get('')
                                        .set('Authorization', 'X-API-KEY ' + testingUser.key)
                                        .expect(200)
                                        .then(function (res) {
                                            should(res.ok);
                                            if (res.body.length !== 2) {
                                                // this is for debugging, keep this for MUCH easier debuging..
                                                console.log(JSON.stringify(res.body) + ' <<<< Error is in this body!');
                                            }
                                            // amount of resources we are testing
                                            res.body.length.should.equal(2);
                                            if (count === PERM_LENGTH) {
                                                done();
                                            }
                                            count++;
                                        });
                                }
                            });
                        });
                });
            });

            it('should have access only to resources listed in the permission list', function (done) {
                API.authenticate(testingUser).then(function () {
                    var updateUser = _.cloneDeep(testingUser);
                    updateUser.permissions.mobile_apps.list = [permissionsToTest.apps[0]];
                    updateUser.permissions.domains.list = [permissionsToTest.domain_configs[0]];
                    updateUser.permissions.dns_zones.list = [permissionsToTest.dns_zones[0]];
                    API.resources.apiKeys
                        .update(testingUser.id, updateUser)
                        .expect(200)
                        .then(function () {
                            API.authenticate(testingUser).then(function () {
                                var count = 1;
                                for (var perm in permissionsToTest) {
                                    if (permissionsToTest[perm]) {
                                        requestAPI(perm, permissionsToTest[perm][0]).then(function (res) {
                                            if (count === PERM_LENGTH) {
                                                done();
                                            }
                                            count++;
                                        });
                                    } else {
                                        count++;
                                    }
                                }
                            });
                        });
                });
            });

            it('should not have access to resources NOT listed in the permission list', function (done) {
                API.authenticate(testingUser).then(function () {
                    var count = 1;
                    for (var perm in permissionsToTest) {
                        if (permissionsToTest[perm]) {
                            request(API_URL + '/v1/' + perm)
                                .get('/' + permissionsToTest[perm][1])
                                .set('Authorization', 'X-API-KEY ' + testingUser.key)
                                .expect(400)
                                .then(function (res) {
                                    should(!res.ok);
                                    if (count === PERM_LENGTH) {
                                        done();
                                    }
                                    count++;
                                });
                        } else {
                            count++;
                        }
                    }
                });
            });

            it('should not have access to a resource in a list after disabling `allow_list` flag of that permission list', function (done) {
                API.authenticate(testingUser).then(function () {
                    var updateUser = _.cloneDeep(testingUser);
                    updateUser.permissions.mobile_apps.list = [permissionsToTest.apps[0]];
                    updateUser.permissions.domains.list = [permissionsToTest.domain_configs[0]];
                    updateUser.permissions.dns_zones.list = [permissionsToTest.dns_zones[0]];
                    updateUser.permissions.mobile_apps.allow_list = false;
                    updateUser.permissions.domains.allow_list = false;
                    updateUser.permissions.dns_zones.allow_list = false;
                    API.resources.apiKeys
                        .update(testingUser.id, updateUser)
                        .expect(200)
                        .then(function () {
                            API.authenticate(testingUser).then(function () {
                                var count = 1;
                                for (var perm in permissionsToTest) {
                                    if (permissionsToTest[perm]) {
                                        requestAPI(perm, permissionsToTest[perm][1]).then(function (res) {
                                            if (count === PERM_LENGTH) {
                                                done();
                                            }
                                            count++;
                                        });
                                    } else {
                                        count++;
                                    }
                                }
                            });
                        });
                });
            });

            it('should have access to a resource NOT listed in a list after disabling `allow_list` flag of that permission list', function (done) {
                API.authenticate(testingUser).then(function () {
                    var count = 1;
                    for (var perm in permissionsToTest) {
                        if (permissionsToTest[perm]) {
                            requestAPI(perm, permissionsToTest[perm][1]).then(function (res) {
                                if (count === PERM_LENGTH) {
                                    done();
                                }
                                count++;
                            });
                        } else {
                            count++;
                        }
                    }
                });
            });

            function requestAPI(perm, resource) {
                return request(API_URL + '/v1/' + perm)
                    .get('')
                    .set('Authorization', 'X-API-KEY ' + testingUser.key)
                    .expect(200)
                    .then(function (res) {
                        should(res.ok);
                        res.body.length.should.equal(1);
                        res.body[0].id.should.equal(resource);
                        return res;
                    });
            }
        });
    });
});

