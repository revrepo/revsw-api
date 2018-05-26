/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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

describe('Smoke check', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));

    var users = [
        config.get('api.apikeys.reseller'),
        config.get('api.apikeys.admin'),
        config.get('api.users.reseller'),
        config.get('api.users.admin')
    ];

    users.forEach(function (user) {

        describe('With user: ' + user.role, function () {

            describe('API Requests Throttling', function () {
                it('should limit API Requests per second', function (done) {
                    let flag = false;
                    API.authenticate(user).then(function () {
                        for (let j = 0; j < 50; j++) {
                            API
                                .resources
                                .users
                                .getAll()
                                .then(function (res) {
                                    if (res.text === 'API Requests limit reached, please try again later.') {
                                        flag = true;
                                    }

                                    if (j === 49) {
                                        flag.should.equal(true);
                                        done();
                                    }
                                });
                        }
                    });
                });

                it('should NOT limit API Requests if limit is not reached', function (done) {
                    setTimeout(function () {
                        let flag = false;
                        API.authenticate(user).then(function () {
                            for (let j = 0; j < 10; j++) {
                                API
                                    .resources
                                    .users
                                    .getAll()
                                    .then(function (res) {
                                        if (res.text === 'API Requests limit reached, please try again later.') {
                                            flag = true;
                                        }

                                        if (j === 9) {
                                            flag.should.equal(false);
                                            done();
                                        }
                                    });
                            }
                        });
                    }, 1000);
                });
            });
        });
    });
});