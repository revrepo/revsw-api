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
var should = require('should');
var config = require('config');

var API = require('./../../../common/api');
var DataProvider = require('./../../../common/providers/data');
var request = require('supertest-as-promised');
var moment = require('moment');

describe('Negative check: User invitation process', function () {
    this.timeout(config.api.request.maxTimeout);

    var invitationMailSubjet = config.user_invitation_mail_subject;

    var users = [
        config.api.users.revAdmin,
        config.api.users.reseller,
        config.api.users.admin,
    ];

    var testingAcc;

    users.forEach(function (credentials) {
        describe('Invitation process test with role - ' + credentials.role, function () {
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

            it('should not generate an invitation token for a self signed user', function (done) {
                API
                    .authenticate(credentials)
                    .then(function () {
                        API
                            .helpers
                            .users
                            .create({
                                account_id: testingAcc.id
                            },
                                true)
                            .then(function (user) {
                                API
                                    .resources
                                    .users
                                    .getOne(user.id)
                                    .expect(200)
                                    .then(function (user_) {
                                        user_ = user_.body;
                                        (user_.invitation_token === null).should.be.true;
                                        done();
                                    })
                                    .catch(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

            it('should not be able to set a password using an invalid invitation token', function (done) {
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

                                        user_.invitation_token = new Array(49).join('x');

                                        var invitationData = {
                                            password: 'newpass1', //valid password                                                
                                            invitation_token: user_.invitation_token
                                        };

                                        API
                                            .resources
                                            .users
                                            .completeInvitation()
                                            .update(user_.user_id, invitationData)
                                            .expect(400)
                                            .then(function (res) {
                                                res.body.message.should.equal('Bad invitation token');
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