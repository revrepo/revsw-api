var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');

var express = require('express');
var fs = require('fs');
var https = require('https');
var sleep = require('sleep');

var testAPIUrl = 'http://localhost:8000';

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs';


describe('Rev API', function() {

  var adminToken = '';
  var userToken = '';
  var userCompanyId = '';
  var domainConfigJson = {};

  it('should not authenticate user with wrong username', function(done) {
    request(testAPIUrl)
      .get('/v1/users')
      .auth(wrongUsername, wrongPassword)
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(401);
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        response_json.message.should.be.equal('Bad username or password');
        done();
      });
  });


  it('should not authenticate user with wrong password', function(done) {
    request(testAPIUrl)
      .get('/v1/users')
      .auth(qaUserWithAdminPerm, wrongPassword)
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(401);
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        response_json.message.should.be.equal('Bad username or password');
        done();
      });
  });

  it('should not allow user with RevAdmin role', function(done) {
    request(testAPIUrl)
      .get('/v1/users')
      .auth(qaUserWithRevAdminPerm, 'password1')
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(401);
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        response_json.message.should.be.equal('Bad username or password');
        done();
      });
  });

  it('should be able to get a domains list as user with Admin permissions', function(done) {
    request(testAPIUrl)
      .get('/v1/domains')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.length.should.be.above(0);
        done();
      });
  });

});


describe('Rev API Reseller User', function() {
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
//    console.log('New company name: ' + testCompanyName);
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
//        console.log('New companyId: ', testCompanyID);
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
//        console.log(' response_json = ',  response_json);
        for ( var i = 0; i < response_json.length; i++ ) {
          if ( response_json[i].companyName === testCompanyName ) {
            done();
          }
        }
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
        response_json.companyName.should.be.equal(testCompanyName);
        done();
      });
  });

  it('should fail to update an account with existing company name "API QA Reseller Company"', function(done) {
    testCompanyName = 'API QA Reseller Company';
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


});

describe('Rev API Admin User', function() {

  it('should be denied access to /accounts functions', function(done) {
    request(testAPIUrl)
      .get('/v1/accounts')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.statusCode.should.be.equal(403);
        var response_json = JSON.parse(res.text);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Only users with role "reseller" can access account-related functions');
        done();
      });
  });

});


