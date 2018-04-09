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
var GroupDP = require('./../../../../common/providers/data/groups');
var request = require('supertest-as-promised');

describe('Functional Check: ', function () {
    this.timeout(config.api.request.maxTimeout);

    var API_URL = API.helpers.getAPIURL();

    var users = [
        config.get('api.users.reseller'),
        config.get('api.users.admin')
    ];

    users.forEach(function (user) {
        describe('Users group inherited permissions with role - ' + user.role, function () {

            var RESOURCES_LENGTH = 2;

            var account_id;

            var testingResources;
            var testingGroup;
            var testingResources2;
            var testingUser;
            var permissionsToTest = {
                domain_configs: [],
                apps: [],
                dns_zones: [],
                users: []
            };

            var pushResources = function (done) {
                API.helpers.createResources(user.role.toLowerCase(), account_id).then(function (res) {
                    testingResources = res;
                    permissionsToTest.domain_configs.push(res.domain_id);
                    permissionsToTest.apps.push(res.app_id);
                    permissionsToTest.dns_zones.push(res.dns_zone_id);
                    permissionsToTest.users.push(res.user_id);
                    if (permissionsToTest.domain_configs.length === RESOURCES_LENGTH) {

                        API.resources.users.getOne(permissionsToTest.users[0])
                            .expect(200)
                            .then(function (_user) {
                                testingUser = _user.body;
                                testingUser.password = 'password1';
                                delete permissionsToTest.users;
                                var grp = GroupDP.generateValid({ account_id: account_id });
                                API.resources.groups.createOne(grp)
                                    .expect(200)
                                    .then(function (group) {
                                        API
                                            .resources
                                            .groups
                                            .getOne(group.body.object_id)
                                            .expect(200)
                                            .then(function (group) {
                                                testingGroup = group.body;
                                                testingUser.group_id = testingGroup.id;
                                                API.resources.users
                                                    .update(testingUser.user_id, testingUser)
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
                    } else {
                        return;
                    }
                })
                .catch(done);
            };

            // this needs to be the length of permissionsToTest object
            var PERM_LENGTH = Object.keys(permissionsToTest).length - 1;

            before(function (done) {
                API.authenticate(user).then(function () {
                    API.helpers.accounts.createOne().then(function (acc) {
                        account_id = acc.id;
                        for (var i = 0; i < RESOURCES_LENGTH; i++) {
                            setTimeout(function () {
                                pushResources(done);
                            }, 5000);
                        }
                    })
                    .catch(done);
                });
            });

            it('should have access to all resources by default', function (done) {
                API.authenticate(testingUser).then(function () {
                    var count = 1;
                    for (var perm in permissionsToTest) {
                        request(API_URL + '/v1/' + perm)
                            .get('')
                            .set('Authorization', 'Bearer ' + testingUser.token)
                            .expect(200)
                            .then(function (res) {
                                should(res.ok);
                                // amount of resources we are testing
                                res.body.length.should.equal(RESOURCES_LENGTH);
                                if (count === PERM_LENGTH) {
                                    done();
                                }
                                count++;
                            });
                    }
                });
            });

            it('should not have access to resources after disabling groups permissions for that resource', function (done) {
                API.authenticate(testingUser).then(function () {
                    var updateGroup = _.cloneDeep(testingGroup);
                    updateGroup.permissions.mobile_apps.access = false;
                    updateGroup.permissions.domains.access = false;
                    updateGroup.permissions.dns_zones.access = false;
                    API.resources.groups
                        .update(testingGroup.id, updateGroup)
                        .expect(200)
                        .then(function () {
                            API.authenticate(testingUser).then(function () {
                                var count = 1;
                                for (var perm in permissionsToTest) {
                                    request(API_URL + '/v1/' + perm)
                                        .get('')
                                        .set('Authorization', 'Bearer ' + testingUser.token)
                                        .expect(200)
                                        .then(function (res) {
                                            should(res.ok);
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
                    var updateGroup = _.cloneDeep(testingGroup);
                    updateGroup.permissions.mobile_apps.access = true;
                    updateGroup.permissions.domains.access = true;
                    updateGroup.permissions.dns_zones.access = true;
                    API.resources.groups
                        .update(testingGroup.id, updateGroup)
                        .expect(200)
                        .then(function () {
                            API.authenticate(testingUser).then(function () {
                                var count = 1;
                                for (var perm in permissionsToTest) {
                                    request(API_URL + '/v1/' + perm)
                                        .get('')
                                        .set('Authorization', 'Bearer ' + testingUser.token)
                                        .expect(200)
                                        .then(function (res) {
                                            should(res.ok);
                                            // amount of resources we are testing
                                            res.body.length.should.equal(RESOURCES_LENGTH);
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
                    var updateGroup = _.cloneDeep(testingGroup);
                    updateGroup.permissions.mobile_apps.list = [permissionsToTest.apps[0]];
                    updateGroup.permissions.domains.list = [permissionsToTest.domain_configs[0]];
                    updateGroup.permissions.dns_zones.list = [permissionsToTest.dns_zones[0]];
                    API.resources.groups
                        .update(testingGroup.id, updateGroup)
                        .expect(200)
                        .then(function () {
                            API.authenticate(testingUser).then(function () {
                                var count = 1;
                                for (var perm in permissionsToTest) {
                                    requestAPI(perm, permissionsToTest[perm][0]).then(function (res) {
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

            it('should not have access to resources NOT listed in the permission list', function (done) {
                API.authenticate(testingUser).then(function () {
                    var count = 1;
                    for (var perm in permissionsToTest) {
                        request(API_URL + '/v1/' + perm)
                            .get('/' + permissionsToTest[perm][1])
                            .set('Authorization', 'Bearer ' + testingUser.token)
                            .expect(400)
                            .then(function (res) {
                                should(!res.ok);
                                if (count === PERM_LENGTH) {
                                    done();
                                }
                                count++;
                            });
                    }
                });
            });

            it('should not have access to a resource in a list after disabling `allow_list` flag of that permission list', function (done) {
                API.authenticate(testingUser).then(function () {
                    var updateGroup = _.cloneDeep(testingGroup);
                    updateGroup.permissions.mobile_apps.list = [permissionsToTest.apps[0]];
                    updateGroup.permissions.domains.list = [permissionsToTest.domain_configs[0]];
                    updateGroup.permissions.dns_zones.list = [permissionsToTest.dns_zones[0]];
                    updateGroup.permissions.mobile_apps.allow_list = false;
                    updateGroup.permissions.domains.allow_list = false;
                    updateGroup.permissions.dns_zones.allow_list = false;
                    API.resources.groups
                        .update(testingGroup.id, updateGroup)
                        .expect(200)
                        .then(function () {
                            API.authenticate(testingUser).then(function () {
                                var count = 1;
                                for (var perm in permissionsToTest) {
                                    requestAPI(perm, permissionsToTest[perm][1]).then(function (res) {
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

            it('should have access to a resource NOT listed in a list after disabling `allow_list` flag of that permission list', function (done) {
                API.authenticate(testingUser).then(function () {
                    var count = 1;
                    for (var perm in permissionsToTest) {
                        requestAPI(perm, permissionsToTest[perm][1]).then(function (res) {
                            if (count === PERM_LENGTH) {
                                done();
                            }
                            count++;
                        });
                    }
                });
            });

            function requestAPI(perm, resource) {
                return request(API_URL + '/v1/' + perm)
                    .get('')
                    .set('Authorization', 'Bearer ' + testingUser.token)
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

