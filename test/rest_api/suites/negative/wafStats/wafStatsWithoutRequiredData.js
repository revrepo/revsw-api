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
var API = require('./../../../common/api');
var DataProvider = require('./../../../common/providers/data');
var HelpersAPI = require('./../../../common/helpers/api');

describe('Negative check:', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));
    var revAdminCredentials = config.api.users.revAdmin;

    var userRolesList = [
        'admin',
        'reseller'
    ];

    var user, accountForUsers, domain;

    before(function (done) {
        API.helpers
            .authenticate(revAdminCredentials)
            .then(function () {
                return HelpersAPI.accounts.createCompleteOne();
            })
            .then(function (newAccount) {
                accountForUsers = newAccount;
                return API.helpers.domainConfigs.createOne(newAccount.id);
            })
            .then(function (dom) {
                domain = dom;
                done();
            })
            .catch(done);
    });

    userRolesList.forEach(function (roleName) {
        describe('WAF Stats with role "' + roleName + '"', function () {
            before(function (done) {
                var newUser = DataProvider.generateUser(roleName);
                newUser.account_id = accountForUsers.id;
                newUser.domain = [];
                API.helpers
                    .authenticate(revAdminCredentials)
                    .then(function () {
                        API.helpers.users.create(newUser)
                            .then(function (u) {
                                user = u;
                                done();
                            })
                            .catch(done);
                    })
                    .catch(done);
            });

            it('should return `400 Bad Request` response when getting ' +
                ' WAF stats top objects without `report_type`',
                function (done) {
                    API.helpers
                        .authenticateUser(user)
                        .then(function () {
                            API.resources.wafStats
                                .topObjects()
                                .getOne(domain.id)
                                .expect(400)
                                .end(done);
                        })
                        .catch(done);
                });

            it('should return `400 Bad Request` response when getting ' +
                ' top WAF stats without `report_type`',
                function (done) {
                    API.helpers
                        .authenticateUser(user)
                        .then(function () {
                            API.resources.wafStats
                                .top()
                                .getOne(domain.id)
                                .expect(400)
                                .end(done);
                        })
                        .catch(done);
                });
        });
    });
});
