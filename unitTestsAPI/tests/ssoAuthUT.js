
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
var testUtils = require('./../utils/ssoToken');
var utilsFile = require('../../lib/utilities');
var zlib = require('zlib');

var ssoTokenProperties = [
    'expirationTimestamp',
    'providerData'
];

/* 
 *   This is the Azure Resource we are going to encrypt
 *   and decrypt during these unit tests 
*/
var azureResource = {
    subscription_id: 2,
    resource_group_name: 'rg4',
    resource_name: 'r4',
    resource_id: '/subscriptions/2/resourcegroups/rg1/providers/RevAPM.MobileCDN/accounts/r4',
    account_id: '5a57573dddfaa12f74de8647'
};

/* 
 *   This is the Azure SSO Token we are going to encrypt
 *   and decrypt during these unit tests 
*/
var appToken = {
    expirationTimestamp: (new Date().getTime()) + 60000,
    providerData: '5a57573dddfaa12f74de8647'
};

describe('Unit Test:', function () {
    describe('SSO token decryption', function () {
        var token;
        var resourceId;

        /**
         *  In this spec we take an Azure Resource, and an App Token, both containing some data.
         * .then() encrypt them together using symmetric encryption.
         * .then() get an encrypted token.
         * .then() send that token to the decryption function and hope for the best.
         * .then() make sure that all the data we encrypted (timestamp, resource_id etc...) is
         *         all intact and correct.
         */
        
        before(function (done) {
            testUtils.encryptAppToken(appToken, azureResource)
                .then(function (res) {
                    token = res.token;
                    resourceId = res.resourceId;
                    // encrypted token and resource id, now lets test!
                    done();
                })
                .catch(done);
        });

        after(function (done) {
            process.env.NODE_ENV = oldEnv;
            done();
        });

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

            it('should contain the correct value in `' + prop + '` property', function (done) {
                var decToken = utilsFile.decodeSSOToken(token);
                decToken[prop].should.equal(appToken[prop]);
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

        it('should successfully decrypt resource ID',
            function (done) {
                utilsFile.decodeSSOResourceId(resourceId).then(function (id) {
                    should(id).not.equal(undefined);
                    done();
                });
            });

        it('should contain the correct resource ID after decryption',
            function (done) {
                utilsFile.decodeSSOResourceId(resourceId).then(function (id) {                    
                    id.should.equal(azureResource.resource_id);
                    done();
                });
            });

    });
});