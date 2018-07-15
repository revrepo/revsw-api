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
var dnsZonesDP = require('./../../../common/providers/data/dnsZones');
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
        var account_id;
        describe('DNS Zones permissions with - ' + user, function () {
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
                                                    .dnsZones
                                                    .create(account_id)
                                                    .then(function (val1) {
                                                        object1 = val1;
                                                        API
                                                            .helpers
                                                            .dnsZones
                                                            .create(account_id)
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
                                                    .dnsZones
                                                    .create(account_id)
                                                    .then(function (val1) {
                                                        object1 = val1;
                                                        API
                                                            .helpers
                                                            .dnsZones
                                                            .create(account_id)
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

            it('should have access to both DNS Zones', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        API
                            .resources
                            .dnsZones
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(2);
                                JSON.stringify(res.body).should.containEql(object1.id);
                                JSON.stringify(res.body).should.containEql(object2.id);
                                done();
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

            it('should not have access to both DNS Zones after disabling `DNS Zones` permission', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.dns_zones.access = false;
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
                            .dnsZones
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(0);
                                API
                                    .resources
                                    .dnsZones
                                    .getOne(object1.id)
                                    .expect(400)
                                    .then(function () {
                                        API
                                            .resources
                                            .dnsZones
                                            .getOne(object2.id)
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

            it('should have access only to first DNS Zone after setting `DNS Zones` permission list', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.dns_zones.access = true;
                        updateUser.permissions.dns_zones.list = [object1.id];
                        updateUser.permissions.dns_zones.allow_list = true;
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
                                    .dnsZones
                                    .getAll()
                                    .expect(200)
                                    .then(function (res) {
                                        res.body.length.should.equal(1);
                                        API
                                            .resources
                                            .dnsZones
                                            .getOne(object1.id)
                                            .expect(200)
                                            .then(function () {
                                                API
                                                    .resources
                                                    .dnsZones
                                                    .getOne(object2.id)
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

            it('should NOT have access only to first DNS Zone after setting `DNS Zones` permission list', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.dns_zones.access = true;
                        updateUser.permissions.dns_zones.list = [object1.id];
                        updateUser.permissions.dns_zones.allow_list = false;
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
                            .dnsZones
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(1);
                                API
                                    .resources
                                    .dnsZones
                                    .getOne(object1.id)
                                    .expect(400)
                                    .then(function () {
                                        API
                                            .resources
                                            .dnsZones
                                            .getOne(object2.id)
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

            it('should NOT have access to any app after setting `DNS Zones` permission list', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.dns_zones.access = true;
                        updateUser.permissions.dns_zones.list = [object1.id, object2.id];
                        updateUser.permissions.dns_zones.allow_list = false;
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
                            .dnsZones
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(0);
                                API
                                    .resources
                                    .dnsZones
                                    .getOne(object1.id)
                                    .expect(400)
                                    .then(function () {
                                        API
                                            .resources
                                            .dnsZones
                                            .getOne(object2.id)
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

            it('should have access to both dnsZones after setting `DNS Zones` permission list', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.dns_zones.access = true;
                        updateUser.permissions.dns_zones.list = [object1.id, object2.id];
                        updateUser.permissions.dns_zones.allow_list = true;
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
                            .dnsZones
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                res.body.length.should.equal(2);
                                API
                                    .resources
                                    .dnsZones
                                    .getOne(object1.id)
                                    .expect(200)
                                    .then(function () {
                                        API
                                            .resources
                                            .dnsZones
                                            .getOne(object2.id)
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

            it('should successfully update DNS Zone that we have access to', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.dns_zones.access = true;
                        updateUser.permissions.dns_zones.list = [object1.id];
                        updateUser.permissions.dns_zones.allow_list = true;
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
                        var dnsCopy = _.cloneDeep(object1);
                        API
                            .resources
                            .dnsZones
                            .update(dnsCopy.id, null)
                            .expect(200)
                            .then(function () {
                                done();
                            })          
                            .catch(done);              
                    })
                    .catch(done);
            });

            it('should NOT successfully update DNS Zone that we DONT have access to', function (done) {
                API
                    .authenticate(testingUser)
                    .then(function () {
                        var updateUser = _.cloneDeep(testingUser);
                        if (updateUser.password) {
                            delete updateUser.password;
                        }
                        updateUser.permissions.dns_zones.access = true;
                        updateUser.permissions.dns_zones.list = [object1.id];
                        updateUser.permissions.dns_zones.allow_list = false;
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
                        var dnsCopy = _.cloneDeep(object1);
                        API
                            .resources
                            .dnsZones
                            .update(dnsCopy.id, null)
                            .expect(400)
                            .then(function () {
                                done();
                            })          
                            .catch(done);              
                    })
                    .catch(done);
            });
        });
    });
});