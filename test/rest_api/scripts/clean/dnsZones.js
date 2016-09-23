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

var config = require('config');
var API = require('./../../common/api');

describe('Clean up', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.api.request.maxTimeout);

    var reseller = config.get('api.users.revAdmin');
    var namePattern = /[0-9]{13}/;

    before(function (done) {
        done();
    });

    after(function (done) {
        done();
    });

    describe('DNS Zones resource', function () {

        beforeEach(function (done) {
            done();
        });

        afterEach(function (done) {
            done();
        });

        it('should clean DNS Zones created for testing.',
            function (done) {
                API.helpers
                    .authenticateUser(reseller)
                    .then(function () {
                        API.resources.dnsZones
                            .getAll()
                            .expect(200)
                            .then(function (res) {
                                var ids = [];
                                var dnsZones = res.body;
                                dnsZones.forEach(function (dnsZone) {
                                    if (namePattern.test(dnsZone.zone)) {
                                        ids.push(dnsZone.id);
                                    }
                                });

                                API.resources.dnsZones
                                    .deleteManyIfExist(ids)
                                    .finally(done);
                            })
                            .catch(done);
                    })
                    .catch(done);
            });
    });
});