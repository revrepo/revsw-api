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
var should = require('should');

var exec = require('child_process').exec;

var config = require('config');
var API = require('./../../../common/api');
var oldEnv;
var oldDir;
var MailinatorHelper = require('./../../../common/helpers/external/mailinator');

/* TODO: create a new domain for this test, send requests to it and then test the notifications */
describe('Functional check', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));

    describe('Email Notifications about traffic change', function () {

        var accountId;
        var domain;
        var email = ['traffic-change', Date.now() + '@mailinator.com']
            .join('-')
            .toLowerCase();


        var scriptCommand;

        before(function (done) {
            oldEnv = process.env.NODE_ENV;
            oldDir = process.env.NODE_CONFIG_DIR;
            // setting node env and config dir to successfully run the script
            process.env.NODE_ENV = 'unitTests';
            process.env.NODE_CONFIG_DIR = './../../config';
            // setting our command
            scriptCommand = 'node ./../../utils/notify_about_traffic_changes.js ' +
                '--alert_on_traffic_changes ' +
                '--traffic_alerting_email ' +
                email;
            done();
        });

        after(function (done) {
            process.env.NODE_ENV = oldEnv;
            process.env.NODE_CONFIG_DIR = oldDir;
            done();
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

        it('should successfully send an email if traffic change is detected',
            function (done) {
                exec(scriptCommand, function (err, stdout) {
                    should(stdout).not.equal(null);
                    should(err).equal(null);
                    MailinatorHelper.waitWhileInboxIsEmpty(email, 30000)
                        .then(function () {
                            MailinatorHelper.getAllMessages(email)
                                .then(function (res) {
                                    res.length.should.be.above(0); // should be more than one mail
                                    done();
                                })
                                .catch(done);
                        });
                });
            });

        it('should contain proper data in sent email subject',
            function (done) {
                exec(scriptCommand, function (err, stdout) {
                    should(stdout).not.equal(null);
                    should(err).equal(null);
                    MailinatorHelper.waitWhileInboxIsEmpty(email, 30000)
                        .then(function () {
                            MailinatorHelper.getAllMessages(email)
                                .then(function (res) {
                                    res[0]
                                        .subject
                                        .should
                                        .containEql('Traffic change detected for domain');
                                    done();
                                })
                                .catch(done);
                        });
                });
            });

        it('should contain proper data in sent email body',
            function (done) {
                exec(scriptCommand, function (err, stdout) {
                    should(stdout).not.equal(null);
                    should(err).equal(null);
                    MailinatorHelper.waitWhileInboxIsEmpty(email, 30000).then(function () {
                        MailinatorHelper.getAllMessages(email)
                            .then(function (res) {
                                var mailMsg = res[0];
                                MailinatorHelper.getMessage(mailMsg.id)
                                    .then(function (msg) {
                                        var body = msg.data.parts[0].body;
                                        // checking if some required strings are in the body
                                        body
                                            .should
                                            .containEql('Traffic for yesterday');

                                        body
                                            .should
                                            .containEql('Traffic for day before yesterday');

                                        body
                                            .should
                                            .containEql('detected a traffic change');

                                        done();
                                    });
                            })
                            .catch(done);
                    });
                });
            });
    });

});
