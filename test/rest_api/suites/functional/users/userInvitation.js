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

describe('Functional check: User invitation process', function () {
    this.timeout(config.api.request.maxTimeout);

    var invitationMailSubjet = config.user_invitation_mail_subject;
    var linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/;

    var users = [
        config.api.users.revAdmin,
        config.api.users.reseller,
        config.api.users.admin,
    ];

    var testingAcc;

    // Retrieving information about specific user that later we will use for
    // our API requests.
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

            it('should generate a valid invitation token for a newly not self-registered user',
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
                                            API
                                                .resources
                                                .users
                                                .invitationTokenStatus(user_.invitation_token)
                                                .getOne()
                                                .expect(200)
                                                .then(function (res) {
                                                    res.body.statusCode.should.equal(200);
                                                    res.body.message.should.equal('Invitation token is valid');
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

            it('should generate a valid invitation token expire date for a newly not self-registered user',
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

                                            var firstDate = moment(user_.invitation_expire_at);
                                            var secDate = moment(Date.now());
                                            var dayDiff = firstDate.diff(secDate, 'hours');
                                            dayDiff.should.equal(23);
                                            done();
                                        })
                                        .catch(done);
                                })
                                .catch(done);
                        })
                        .catch(done);
                });

            it('should generate a valid invitation token sent date for a newly not self-registered user',
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

                                            var firstDate = moment(user_.invitation_sent_at);
                                            var secDate = moment(Date.now());
                                            var dayDiff = firstDate.diff(secDate, 'seconds');
                                            dayDiff.should.be.below(10);
                                            done();
                                        })
                                        .catch(done);
                                })
                                .catch(done);
                        })
                        .catch(done);
                });

            it('should send a valid email with a valid invitation token for a newly not self-registered user',
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
                                            API
                                                .helpers
                                                .mailinator
                                                .waitWhileInboxIsEmpty(user_.email, 60000, invitationMailSubjet, true)
                                                .then(function () {
                                                    API
                                                        .helpers
                                                        .mailinator
                                                        .getAllMessages(user_.email)
                                                        .then(function (mails) {
                                                            var invitationMail = mails[0];
                                                            API
                                                                .helpers
                                                                .mailinator
                                                                .getMessage(invitationMail.id)
                                                                .then(function (mail_) {
                                                                    invitationMail = mail_.data;
                                                                    invitationMail.subject.should.equal(invitationMailSubjet);
                                                                    var invLink = invitationMail.parts[0].body.match(linkRegex)[2];
                                                                    request(invLink)
                                                                        .get('')
                                                                        .then(function (res) {
                                                                            res.headers
                                                                                .location
                                                                                .should
                                                                                .containEql(user_.invitation_token);
                                                                            res.headers
                                                                                .location
                                                                                .should
                                                                                .containEql(user_.user_id);
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

            it('should successfully complete invitation process after sending a new password with a valid invitation token',
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

                                            var invitationData = {
                                                password: 'newpass1', //valid password                                                
                                                invitation_token: user_.invitation_token
                                            };

                                            API
                                                .resources
                                                .users
                                                .completeInvitation()
                                                .update(user_.user_id, invitationData)
                                                .expect(200)
                                                .then(function (res) {
                                                    API
                                                        .resources
                                                        .authenticate
                                                        .createOne({
                                                            email: user_.email,
                                                            password: 'newpass1' // new pass
                                                        })
                                                        .expect(200)
                                                        .then(function (res) {
                                                            res.body.should.have.property('token');
                                                            API
                                                                .resources
                                                                .users
                                                                .getOne(user_.user_id)
                                                                .expect(200)
                                                                .then(function (completeUser) {
                                                                    should(completeUser.body.invitation_token).be.empty;
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
                });
        });
    });
});
