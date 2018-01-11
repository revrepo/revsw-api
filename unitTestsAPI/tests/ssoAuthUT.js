
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
require('should');

var oldEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'unitTests'; // use unit tests config

var config = require('config');
var utilsFile = require('../../lib/utilities');

/* TODO: fix decodeSSOToken function and enable tests */

xdescribe('Unit Test:', function () {
    describe('SSO token decryption', function () {

        after(function (done) {
            process.env.NODE_ENV = oldEnv;
            done();
        });

        var token = 'tokenhere';

        it('should decrypt a valid SSO token', function (done) {
                var decToken = utilsFile.decodeSSOToken(token);
                console.log(decToken);
                done();
            });        
    });
});