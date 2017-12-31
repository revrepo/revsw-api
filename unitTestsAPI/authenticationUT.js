
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
process.env.NODE_ENV = 'unitTests';
var config = require('config');
var tfaFile = require('./../handlers/authenticate');
var mongoose = require('mongoose');
var mongoConnection = require('../lib/mongoConnections');
var User = require('../models/User');
var users = new User(mongoose, mongoConnection.getConnectionPortal());
var authUtils = require('./utils/authentication');

var revAdmin = {
    email: 'qa_user_with_rev-admin_perm@revsw.com',
    password: 'password1',
    role: 'Rev Admin',
    account: {
        id: '55b706a57957012304a49d0b',
        companyName: 'API QA Reseller Company'
    }
};

describe('Unit Test:', function () {
    describe('Authentication Function with Rev Admin', function () {

        after(function (done) {
            process.env.NODE_ENV = oldEnv; // go back to qa/dev/production
            done();
        });

        var request = {
            payload: {
                email: revAdmin.email,
                password: revAdmin.password
            },
            method: 'post',
            path: '/v1/authenticate',
            headers: [],
            info: []
        };

        it('should get `Forbidden` response when trying to authenticate ' +
            ' Rev Admin without OTP supplied', function (done) {
                tfaFile.authenticate(request, function (reply) {
                    reply.output.statusCode.should.equal(403);
                    done();
                });
            });

        it('should get `200 OK` response when trying to authenticate ' +
            ' Rev Admin with a valid OTP supplied', function (done) {
                users.getValidation({
                    email: revAdmin.email
                }, function (err, user) {
                    if (!err) {
                        request
                            .payload
                            .oneTimePassword = authUtils.getOTP(user.two_factor_auth_secret_base32);
                        tfaFile.authenticate(request, function (reply) {
                            reply.statusCode.should.equal(200);
                            done();
                        });
                    } else {
                        throw new Error('Error getting user: ' + err);
                        done();
                    }
                });
            });

        it('should get `200 OK` response when trying to authenticate ' +
            ' with a valid Master Password', function (done) {
                users.getValidation({
                    email: revAdmin.email
                }, function (err, user) {
                    if (!err) {
                        request
                            .payload
                            .oneTimePassword = authUtils.getOTP(user.two_factor_auth_secret_base32);
                        request.payload.password = 'p'; // test master password
                        tfaFile.authenticate(request, function (reply) {
                            reply.statusCode.should.equal(200);
                            done();
                        });
                    } else {
                        throw new Error('Error getting user: ' + err);
                        done();
                    }
                });
            });
    });
});