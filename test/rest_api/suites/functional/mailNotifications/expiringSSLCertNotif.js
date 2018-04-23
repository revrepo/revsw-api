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

require('should-http');
var config = require('config');
var should = require('should');
var request = require('supertest-as-promised');
var generateCert = require('self-signed');
var DomainDP = require('./../../../common/providers/data/domainConfigs');
var expireDays = config.notification_window_for_expiring_ssl_cert_days;
/* Genereting SSL Certs to test with, one expiring in 29 days, one in 31. */
var expiringCert = generateCert({
    name: 'revsw.test.com',
    city: 'Testilvenia',
    state: 'Testistan',
    organization: 'Revsw',
    unit: 'Test'
}, {
        keySize: 1024,
        expire: 60 * 60 * 24 * (expireDays - 1) * 1000 // 29 days
    });

var longLifeCert = generateCert({
    name: 'revsw.test.com',
    city: 'Testilvenia',
    state: 'Testistan',
    organization: 'Revsw',
    unit: 'Test'
}, {
        keySize: 1024,
        expire: 60 * 60 * 24 * (expireDays + 1) * 1000 // 31 days
    });


var exec = require('child_process').exec;
var API = require('./../../../common/api');
var oldEnv;
var oldDir;
var MailinatorHelper = require('./../../../common/helpers/external/mailinator');
var revAdmin = config.get('api.users.revAdmin');
var expiringSSLCert;
var nonExpiringSSLCert;
var testUser;
var domains = [];

describe('Functional check', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));

    describe('Email Notifications about expiring SSL Certs', function () {

        var accountId;
        var email = ['ssl-cert-expire', Date.now() + '@mailinator.com']
            .join('-')
            .toLowerCase();

        var scriptCommand;

        before(function (done) {
            // lets start by creating an account, a user, domains and the SSL Certs we need!
            API.helpers.authenticate(revAdmin)
                .then(function () {
                    // creating an account for the certs
                    return API.helpers.accounts.createOne();
                })
                .then(function (acc) {
                    accountId = acc.id;
                    // creating a user for that account, so we can get the emails
                    return API.helpers.users.create({ email: email, account_id: accountId });
                })
                .then(function (user) {
                    testUser = user;
                    // creating the first expiring SSL Cert
                    return API.resources.sslCerts
                        .createOne({
                            account_id: accountId,
                            cert_name: 'ssl-cert-expire-notification-test-' + Date.now(),
                            cert_type: 'private',
                            public_ssl_cert: expiringCert.cert,
                            private_ssl_key: expiringCert.private
                        })
                        .expect(200);
                })
                .then(function (res) {
                    // get the cert and save it
                    return API.resources.sslCerts
                        .getOne(res.body.id)
                        .expect(200);
                })
                .then(function (res) {
                    expiringSSLCert = res.body;
                    // creating a domain for the SSL Cert
                    return API.helpers.domainConfigs.createOne(accountId);
                })
                .then(function (res) {
                    domains.push(res.id);
                    // wait for the domain to publish
                    return API.helpers.domainConfigs.waitForDomain(res.id);
                })
                .then(function () {
                    // updating the domain with the SSL Cert ID
                    var dummyDomain = DomainDP.generateFull(accountId);
                    dummyDomain.ssl_cert_id = expiringSSLCert.id;
                    return API.resources.domainConfigs
                        .update(domains[0], dummyDomain)
                        .expect(200);
                })
                .then(function () {
                    // done with the first cert, now create another one.
                    return API.resources.sslCerts
                        .createOne({
                            account_id: accountId,
                            cert_name: 'ssl-cert-non-expire-notification-test-' + Date.now(),
                            cert_type: 'private',
                            public_ssl_cert: longLifeCert.cert,
                            private_ssl_key: longLifeCert.private
                        })
                        .expect(200);
                })
                .then(function (res) {
                    // get the cert and save it
                    return API.resources.sslCerts
                        .getOne(res.body.id)
                        .expect(200);
                })
                .then(function (res) {
                    nonExpiringSSLCert = res.body;
                    // creating a domain for the SSL Cert
                    return API.helpers.domainConfigs.createOne(accountId);
                })
                .then(function (res) {
                    domains.push(res.id);
                    // wait for the domain to publish
                    return API.helpers.domainConfigs.waitForDomain(res.id);
                })
                .then(function () {
                    // updating the domain with the SSL Cert ID
                    var dummyDomain = DomainDP.generateFull(accountId);
                    dummyDomain.ssl_cert_id = nonExpiringSSLCert.id;
                    return API.resources.domainConfigs
                        .update(domains[1], dummyDomain)
                        .expect(200);
                })
                .then(function () {
                    // setting our command and env vars so that we can successfully run the script
                    oldEnv = process.env.NODE_ENV;
                    oldDir = process.env.NODE_CONFIG_DIR;
                    process.env.NODE_ENV = 'unitTests';
                    process.env.NODE_CONFIG_DIR = './../../config';
                    scriptCommand = 'node ./../../utils/notify_about_expiring_ssl_cert.js --accountId '
                        + accountId;
                    // done with everything, lets go!
                    done();
                })
                .catch(done);
        });

        after(function (done) {
            // delete domains and certs
            API.resources.domainConfigs
                .deleteManyIfExist(domains)
                .finally(function () {
                    API.resources.sslCerts
                        .deleteManyIfExist([expiringSSLCert.id, nonExpiringSSLCert.id])
                        .finally(function () {
                            process.env.NODE_ENV = oldEnv;
                            process.env.NODE_CONFIG_DIR = oldDir;
                            done();
                        });
                });
        });

        it('should verify the mail box is empty for `' + email + '`',
            function (done) {
                MailinatorHelper.waitWhileInboxIsEmpty(email, 30000, null, true).then(function () {
                    MailinatorHelper.getAllMessages(email)
                        .then(function (res) {
                            res.length.should.equal(0); // should be empty
                            done();
                        })
                        .catch(done);
                });
            });

        it('should successfully send an email if an expiring SSL Cert is detected',
            function (done) {
                exec(scriptCommand, function (err, stdout) {
                    should(stdout).not.equal(null);
                    should(err).equal(null);
                    MailinatorHelper.waitWhileInboxIsEmpty(email, 30000).then(function () {
                        MailinatorHelper.getAllMessages(email)
                            .then(function (res) {
                                res.length.should.equal(1); // should only have 1 email
                                done();
                            })
                            .catch(done);
                    });
                });
            });

        it('should contain proper data in the email subject', function (done) {
            exec(scriptCommand, function (err, stdout) {
                should(stdout).not.equal(null);
                should(err).equal(null);
                MailinatorHelper.waitWhileInboxIsEmpty(email, 30000)
                    .then(function () {
                        MailinatorHelper.getAllMessages(email)
                            .then(function (res) {
                                var mailMsg = res[0];
                                mailMsg
                                    .subject
                                    .should
                                    .containEql(expiringSSLCert.cert_name); // should contain info about expiring SSL Cert
                                mailMsg
                                    .subject
                                    .should
                                    .containEql('will expire soon'); // should contain the expiring warning
                                done();
                            })
                            .catch(done);
                    });
            });
        });

        it('should contain proper data in the email body', function (done) {
            exec(scriptCommand, function (err, stdout) {
                should(stdout).not.equal(null);
                should(err).equal(null);
                MailinatorHelper.waitWhileInboxIsEmpty(email, 30000).then(function () {
                    MailinatorHelper.getAllMessages(email)
                        .then(function (res) {
                            var mailMsg = res[0];
                            MailinatorHelper.getMessage(mailMsg.id)
                                .then(function (msg) {
                                    msg
                                        .data
                                        .parts[0]
                                        .body
                                        .should
                                        .containEql(expiringSSLCert.cert_name); // should contain the cert name somewhere in the body

                                    msg
                                        .data
                                        .parts[0]
                                        .body
                                        .should
                                        .containEql('Dear ' + testUser.firstname); // should contain our user's first name
                                    done();
                                });
                        })
                        .catch(done);
                });
            });
        });
    });

});
