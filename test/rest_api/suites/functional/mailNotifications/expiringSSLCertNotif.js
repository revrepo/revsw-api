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
var request = require('supertest-as-promised');

var exec = require('child_process').exec;

var config = require('config');
var API = require('./../../../common/api');
var oldEnv;
var oldDir;
var MailinatorHelper = require('./../../../common/helpers/external/mailinator');
var revAdmin = config.get('api.users.revAdmin');

// TODO: need to enable `expire_at` field of an SSL Cert to be updated, and then test this.
xdescribe('Functional check', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));

    describe('Email Notifications about expiring SSL Certs', function () {

        var accountId;
        var domain;
        var email = ['ssl-cert-expire', Date.now() + '@mailinator.com']
            .join('-')
            .toLowerCase();

        var today = new Date();
        var tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1); // date to expire the SSL cert

        var scriptCommand;

        before(function (done) {
            oldEnv = process.env.NODE_ENV;
            oldDir = process.env.NODE_CONFIG_DIR;
            // setting node env and config dir to successfully run the script
            process.env.NODE_ENV = 'unitTests';
            process.env.NODE_CONFIG_DIR = './../../config';

            API.helpers.authenticate(revAdmin)
                .then(function () {
                    API.helpers.sslCerts.createOne(revAdmin.account.id)
                        .then(function (ssl) {
                            ssl.expires_at = tomorrow;
                            API.resources.sslCerts
                                .update(ssl.id, ssl)
                                .expect(200)
                                .then(function (res) {
                                    console.log(res);
                                    done();
                                })
                                .catch(done);
                        });
                });
        });

        after(function (done) {
            process.env.NODE_ENV = oldEnv;
            process.env.NODE_CONFIG_DIR = oldDir;
            done();
        });

        it('should successfully send an email if and expiring SSL Cert is detected',
            function (done) {
                // setting our command
                scriptCommand = 'nodejs ./../../utils/notify_about_expiring_ssl_cert.js';
                exec(scriptCommand, function (err, stdout) {
                    console.log(stdout);
                    should(stdout).not.equal(null);
                    should(err).equal(null);
                    MailinatorHelper.getLastMessage(email).then(function (res) {
                        console.log(res);
                        should(res).not.equal(null);
                        done();
                    })
                        .catch(done);
                });
            });
    });

});
