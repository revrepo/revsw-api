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
var tfaFile = require('./../handlers/authenticate');
var config = require('config');

describe('Unit Test:', function () {
    describe('Authentication Function with Rev Admin', function () {

        var request = {
            payload: {
                email: 'ashermoshav@gmail.com',
                password: '12345678'
            },
            method: 'post',
            path: '/v1/authenticate',
            headers: [],
            info: []
        };

        it('should successfully authenticate with a self registered user', function (done) {
            tfaFile.authenticate(request, function (reply) {
                reply.statusCode.should.equal(200);
                done();
            });
        });
    });
});