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

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithUserPermPassword = 'password1',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs',
  testDomain = 'qa-api-test-domain.revsw.net';  // this domain should exist in the QA environment

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');
var testAPIUrlHTTP = ( process.env.API_QA_URL_HTTP ) ? process.env.API_QA_URL_HTTP : 'http://localhost:' + config.get('service.http_port');
var testAPIUrlExpected = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.http_port');

describe('Rev API /v1/users/myself call', function() {

  this.timeout(10000);

  it('should return back user details for user with User role', function(done) {
    request(testAPIUrl)
      .get('/v1/users/myself')
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.email.should.be.equal(qaUserWithUserPerm);
        response_json.updated_at.should.be.a.String();
        response_json.created_at.should.be.a.String();
        done();
      });
  });

  it('should return back user details for user with Admin role', function(done) {
    request(testAPIUrl)
      .get('/v1/users/myself')
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
  });

/*
  it('should return back user details for user with Reseller role', function(done) {
    request(testAPIUrl)
      .get('/v1/users/myself')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.email.should.be.equal(qaUserWithResellerPerm);
        response_json.updated_at.should.be.a.String();
        response_json.created_at.should.be.a.String();
        done();
      });
  });
*/

});

