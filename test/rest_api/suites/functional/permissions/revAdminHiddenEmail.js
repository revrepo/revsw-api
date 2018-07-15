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
var vendorProfiles = config.vendor_profiles;
var revAdmin = config.api.users.revAdmin;

describe('Functional check', function () {
    this.timeout(config.api.request.maxTimeout);

    describe('Hiding of Rev Admin email in fields', function () {
        var testAccount;

        before(function (done) {
            API.authenticate(revAdmin)
                .then(function () {
                    API.helpers
                        .accounts
                        .createCompleteOne()
                        .then(function (res) {
                            testAccount = res.id;
                            done();
                        })
                        .catch(done);
                })
                .catch(done);
        });

        it('should not hide the created_by email for Rev Admin role', function (done) {
            API
                .authenticate(revAdmin)
                .then(function () {
                    API
                        .resources
                        .accounts
                        .getOne(testAccount)
                        .expect(200)
                        .then(function (res) {
                            res.body.createdBy.should.equal(revAdmin.email);
                            done();
                        })
                        .catch(done);
                });
        });

        ['reseller', 'admin'].forEach(function (role) {
            it('should hide the created_by email for ' + role + ' role', function (done) {
                API
                    .authenticate(revAdmin)
                    .then(function () {
                        API
                            .helpers
                            .users
                            .create({
                                role: 'reseller',
                                account_id: testAccount
                            })
                            .then(function (res) {
                                API
                                    .authenticate(res)
                                    .then(function () {
                                        API
                                            .resources
                                            .accounts
                                            .getOne(testAccount)
                                            .expect(200)
                                            .then(function (res) {
                                                res.body.createdBy.should.not.equal(revAdmin.email);
                                                res.body.createdBy.should.equal(vendorProfiles.revapm);
                                                done();
                                            })
                                            .catch(done);
                                    });
                            })
                            .catch(done);
                    });
            });
        });

        ['reseller', 'admin'].forEach(function (role) {
            it('should hide the created_by email for ' + role + ' role (API Key)', function (done) {
                API
                    .authenticate(revAdmin)
                    .then(function () {
                        API
                            .helpers
                            .apiKeys
                            .createOneForAccount({ id: testAccount }, role)
                            .then(function (res) {
                                API
                                    .resources
                                    .apiKeys
                                    .getOne(res.id)
                                    .then(function (key) {
                                        API
                                            .authenticate(key.body)
                                            .then(function () {
                                                API
                                                    .resources
                                                    .accounts
                                                    .getOne(testAccount)
                                                    .expect(200)
                                                    .then(function (res) {
                                                        res
                                                            .body
                                                            .createdBy
                                                            .should.not.equal(revAdmin.email);
                                                        res
                                                            .body
                                                            .createdBy
                                                            .should.equal(vendorProfiles.revapm);
                                                        done();
                                                    })
                                                    .catch(done);
                                            });
                                    })
                                    .catch(done);

                            })
                            .catch(done);
                    });
            });
        });
    });
});