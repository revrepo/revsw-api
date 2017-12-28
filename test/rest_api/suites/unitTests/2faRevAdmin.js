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
var API = require('./../../common/api');
var DataProvider = require('./../../common/providers/data');
var HelpersAPI = require('./../../common/helpers/api');
var TwoFADP = require('./../../common/providers/data/2fa');

describe('Smoke check:', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));

    var revAdmin = config.api.users.revAdmin;

    describe('2FA Authentication for Rev Admin', function () {

        before(function (done) {
            // enable 2fa for revadmin
            API.helpers
                .authenticateUser(revAdmin)
                .then(function () {
                    API.resources.twoFA
                        .init()
                        .getOne()
                        .expect(200)
                        .then(function () {
                            API.helpers
                                .authenticateUser(revAdmin)
                                .then(function () {
                                    API.resources.twoFA
                                        .init()
                                        .getOne()
                                        .expect(200)
                                        .then(function (res) {
                                            var key = res.body.base32;
                                            var oneTimePassword = TwoFADP
                                                .generateOneTimePassword(key);
                                            API.resources.twoFA
                                                .enable()
                                                .createOne(oneTimePassword)
                                                .expect(200)
                                                .end(done); // all is set and ready to test
                                        })
                                        .catch(done);
                                })
                                .catch(done);
                        });
                })
                .catch(done);
        });

        it('should successfully authenticate using a valid One Time Password and disable 2FA',
            function (done) {
                API.resources.twoFA
                    .init()
                    .getOne()
                    .expect(200)
                    .then(function (res) {
                        var key = res.body.base32;
                        return TwoFADP.generateOneTimePassword(key);
                    })
                    .then(function (otp) {
                        // send the OTP with the authentication details
                        revAdmin.oneTimePassword = otp.oneTimePassword;
                        API.helpers
                            .authenticateUser(revAdmin)
                            .then(function () {
                                // successfully authenticated with 2FA enabled
                                API.resources.users
                                    .myself()
                                    .getOne()
                                    .expect(200)
                                    .then(function (res) {
                                        API.resources.twoFA
                                            .disable()
                                            .createOne(res.body.user_id)
                                            .expect(200)
                                            .end(done); // 2FA successfully disabled
                                    });
                            })
                            .catch(done);
                    })
                    .catch(done);
            });
    });
});
