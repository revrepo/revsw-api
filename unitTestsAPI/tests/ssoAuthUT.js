
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
var should = require('should');


var oldEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'unitTests'; // use unit tests config

var config = require('config');
var utilsFile = require('../../lib/utilities');
var zlib = require('zlib');

var ssoTokenProperties = [
    'expirationTimestamp',
    'providerData'
];

describe('Unit Test:', function () {
    describe('SSO token decryption', function () {

        after(function (done) {
            process.env.NODE_ENV = oldEnv;
            done();
        });

        var token = config.get('azureSSOToken').toString(); // dummy token
        var resourceId = config.get('azureSSOResourceId').toString(); // dummy resource id

        it('should successfully decrypt a valid SSO token', function (done) {
            var decToken = utilsFile.decodeSSOToken(token);
            decToken.should.not.equal(undefined);
            done();
        });

        ssoTokenProperties.forEach(function (prop) {
            it('should contain `' + prop + '` property in a decrypted SSO token', function (done) {
                var decToken = utilsFile.decodeSSOToken(token);
                decToken.should.have.property(prop);
                decToken[prop].should.not.equal(undefined);
                done();
            });
        });

        it('should not contain any unexpected properties in a decrypted SSO token',
            function (done) {
                var decToken = utilsFile.decodeSSOToken(token);
                for (var p in decToken) {
                    ssoTokenProperties.indexOf(p).should.not.equal(-1);
                }
                done();
            });

        it('should successfully decode resource ID',
            function (done) {
                utilsFile.decodeSSOResourceId(resourceId).then(function (id) {
                    should(id).not.equal(undefined);
                    done();
                });
            });

            it('should match a regex expression with a decoded resource ID',
            function (done) {
                utilsFile.decodeSSOResourceId(resourceId).then(function (id) {
                    var resIdRegexMatch = new RegExp('\/.*\/.*'); // verify the id is valid
                    should(resIdRegexMatch.test(id)).equal(true);
                    done();
                });
            });

    });
});