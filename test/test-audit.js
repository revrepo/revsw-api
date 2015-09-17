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

/*jslint node: true */

'use strict';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');

var express = require('express');
var fs = require('fs');
var https = require('https');
var sleep = require('sleep');
var utils = require('../lib/utilities.js');
var config = require('config');

var qaUserWithUserPerm         = 'qa_user_with_user_perm@revsw.com',
    qaUserWithUserPermPassword = 'password1';
var qaUserWithAdminPerm         = 'api_qa_user_with_admin_perm@revsw.com',
    qaUserWithAdminPermPassword = 'password1';

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');

describe('Rev API /v1/activity call', function() {

  it('should return back audit detailed log', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        console.log(response_json);
        response_json.email.should.be.equal(qaUserWithAdminPerm);
        response_json.updated_at.should.be.a.String();
        response_json.created_at.should.be.a.String();
        done();
      });
  });

  /*it('should return back user details for user with Admin role', function(done) {
    request(testAPIUrl)
      .get('/v1/activity/summary')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.email.should.be.equal(qaUserWithAdminPerm);
        response_json.updated_at.should.be.a.String();
        response_json.created_at.should.be.a.String();
        done();
      });
  });*/


});

