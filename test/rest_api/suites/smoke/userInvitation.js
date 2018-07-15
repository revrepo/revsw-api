/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

// # Smoke check: users
require('should');
var config = require('config');

var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');

describe('Smoke check: User invitation process', function () {
    this.timeout(config.api.request.maxTimeout);

    var users = [
        config.api.users.revAdmin,
        config.api.users.reseller,
        config.api.users.admin,
    ];

    var testingAcc;

    // Retrieving information about specific user that later we will use for
    // our API requests.
    users.forEach(function (credentials) {
        // Generating new `user` data in order to use later in our tests.
        describe('Invitation token generation check with role - ' + credentials.role, function () {
            var testUser;

            before(function (done) {
                API
                    .authenticate(credentials)
                    .then(function () {
                        API
                            .helpers
                            .accounts
                            .createOne()
                            .then(function (acc) {
                                testingAcc = acc;
                                done();
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

            it('should generate an invitation token for a newly created user (not self registered)',
                function (done) {
                    API
                        .authenticate(credentials)
                        .then(function () {
                            API
                                .helpers
                                .users
                                .create({
                                    account_id: testingAcc.id
                                },
                                    false)
                                .then(function (user) {
                                    API
                                        .resources
                                        .users
                                        .getOne(user.id)
                                        .expect(200)
                                        .then(function (user_) {
                                            user_ = user_.body;
                                            user_
                                                .should.have.property('invitation_token')
                                                .which.is.a.String()
                                                .and.have.lengthOf(48);
                                            done();
                                        })
                                        .catch(done);
                                })
                                .catch(done);
                        })
                        .catch(done);
                });

            it('should generate an invitation expire date for a newly created user (not self registered)',
                function (done) {
                    API
                        .authenticate(credentials)
                        .then(function () {
                            API
                                .helpers
                                .users
                                .create({
                                    account_id: testingAcc.id
                                },
                                    false)
                                .then(function (user) {
                                    API
                                        .resources
                                        .users
                                        .getOne(user.id)
                                        .expect(200)
                                        .then(function (user_) {
                                            user_ = user_.body;
                                            user_
                                                .should.have.property('invitation_expire_at')
                                                .and.should.not.be.empty;
                                            done();
                                        })
                                        .catch(done);
                                })
                                .catch(done);
                        })
                        .catch(done);
                });

            it('should generate an invitation sent at date for a newly created user (not self registered)',
                function (done) {
                    API
                        .authenticate(credentials)
                        .then(function () {
                            API
                                .helpers
                                .users
                                .create({
                                    account_id: testingAcc.id
                                },
                                    false)
                                .then(function (user) {
                                    API
                                        .resources
                                        .users
                                        .getOne(user.id)
                                        .expect(200)
                                        .then(function (user_) {
                                            user_ = user_.body;
                                            user_
                                                .should.have.property('invitation_sent_at')
                                                .and.should.not.be.empty;
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
