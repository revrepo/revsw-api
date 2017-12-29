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
require('should');
var config = require('config');
var API = require('./../../../common/api');

describe('DNS Zones Negative Check', function () {

    // Changing default mocha's timeout (Default is 2 seconds).
    this.timeout(config.get('api.request.maxTimeout'));
    var user = config.get('api.users.revAdmin');

    describe('Auto Discover DNS Zones', function () {
        it('should return a failed response when auto discovering DNS zones for a `fake` domain',
            function (done) {
                API.helpers.authenticate(user).then(function () {
                    API.resources.dnsZones
                        .autoDiscover()
                        .getOne('apiqaresellertest00001.biz')
                        .expect(500)
                        .then(function (res) {
                            res.status.should.be.equal(500);
                            done();
                        })
                        .catch(done);
                });
            });
    });
});
