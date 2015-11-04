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

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');
var testAPIUrlHTTP = ( process.env.API_QA_URL_HTTP ) ? process.env.API_QA_URL_HTTP : 'http://localhost:' + config.get('service.http_port');
var testAPIUrlExpected = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.http_port');

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs',
  testDomain = 'qa-api-test-domain.revsw.net';  // this domain should exist in the QA environment

describe('Rev API Reseller User', function() {

  this.timeout(10000);

  var testCompanyName = 'API QA Test Company ' + Date.now();
  var newAccountJson = { companyName: testCompanyName };
  var testCompanyID = '';

  it('should be able to get a list of companies', function(done) {
    request(testAPIUrl)
      .get('/v1/accounts')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(200);
        var response_json = JSON.parse(res.text);
        response_json.length.should.be.above(0);
        done();
      });
  });


  it('should create a new account', function(done) {
    request(testAPIUrl)
      .post('/v1/accounts')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .send(newAccountJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(200);
        var response_json = JSON.parse(res.text);
        response_json.message.should.be.equal('Successfully created new account');
        response_json.object_id.should.be.a.String();
        testCompanyID = response_json.object_id;
        done();
      });
  });

  it('should find a new record about adding a new account in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj      = response_json.data[0];
        last_obj.target_id.should.be.equal(testCompanyID);
        last_obj.activity_type.should.be.equal('add');
        last_obj.activity_target.should.be.equal('account');
        done();
      });
  });

  it('should fail to create a new account with the same name', function(done) {
    request(testAPIUrl)
      .post('/v1/accounts')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .send(newAccountJson)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(400);
        var response_json = JSON.parse(res.text);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('The company name is already registered in the system');
        done();
      });
  });


  it('should fail to create a new account with empty JSON request', function(done) {
    request(testAPIUrl)
      .post('/v1/accounts')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .send({})
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(400);
        var response_json = JSON.parse(res.text);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('child "companyName" fails because ["companyName" is required]');
        done();
      });
  });


  it('should see the new account in the list of registered accounts', function(done) {
    request(testAPIUrl)
      .get('/v1/accounts')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .send(newAccountJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(200);
        var response_json = JSON.parse(res.text);
        response_json.length.should.be.above(0);
        for ( var i = 0; i < response_json.length; i++ ) {
          if ( response_json[i].companyName === testCompanyName ) {
            done();
          }
        }
        console.log(JSON.stringify(response_json));
        throw new Error('Cannot find freshly created account ' + testCompanyName + ' in the list of existing accounts');
      });
  });

  it('should get details for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/accounts/' + testCompanyID)
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .send(newAccountJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(200);
        var response_json = JSON.parse(res.text);
        response_json.companyName.should.be.equal(testCompanyName);
        done();
      });
  });


  it('should update an account with new company name "' + testCompanyName +'"', function(done) {
    testCompanyName = 'API QA Test Company ' + Date.now();
    newAccountJson = { companyName: testCompanyName };
    request(testAPIUrl)
      .put('/v1/accounts/' + testCompanyID)
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .send(newAccountJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(200);
        var response_json = JSON.parse(res.text);
        response_json.message.should.be.equal('Successfully updated the account');
        done();
      });
  });

  it('should find a new record about updating account in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj      = response_json.data[0];
        console.log(JSON.stringify(last_obj));
        last_obj.target_id.should.be.equal(testCompanyID);
        last_obj.target_name.should.be.equal(testCompanyName);
        last_obj.activity_type.should.be.equal('modify');
        last_obj.activity_target.should.be.equal('account');
        done();
      });
  });

  it('should fail to update an account with existing company name "API QA Reseller Company"', function(done) {
    var testCompanyName = 'API QA Reseller Company';
    newAccountJson = { companyName: testCompanyName };
    request(testAPIUrl)
      .put('/v1/accounts/' + testCompanyID)
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .send(newAccountJson)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('The company name is already registered in the system');
        done();
      });
  });

  it('should delete an account', function(done) {
    request(testAPIUrl)
      .delete('/v1/accounts/' + testCompanyID)
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(200);
        var response_json = JSON.parse(res.text);
        response_json.message.should.be.equal('Successfully deleted the account');
        done();
      });
  });

  it('should find a new record about deleting account in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj      = response_json.data[0];
        last_obj.target_id.should.be.equal(testCompanyID);
        last_obj.activity_type.should.be.equal('delete');
        last_obj.activity_target.should.be.equal('account');
        done();
      });
  });

  it('should fail to delete a non-existing account', function(done) {
    request(testAPIUrl)
      .delete('/v1/accounts/' + testCompanyID)
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('Account not found');
        done();
      });
  });

  it('should fail to delete account 55ba46a67957012304a49d0f belonging to another user', function(done) {
    request(testAPIUrl)
      .delete('/v1/accounts/55ba46a67957012304a49d0f')
      .auth(qaUserWithResellerPerm, qaUserWithResellerPermPassword)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('Account not found');
        done();
      });
  });


});

