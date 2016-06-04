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

describe('Rev API JWT Token', function() {

  this.timeout(10000);

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs',
  testDomain = 'qa-api-test-domain.revsw.net';  // this domain should exist in the QA environment


  var adminToken = '',
    jwtToken = '',
    userCompanyId = '',
    testDomainId,
    testUserId = '',
    domainConfigJson = {};

    var testUserJWT = 'api-qa-user-' + Date.now() + '@revsw.com';
    var testPass = 'password1';
    var newTestPass = 'password2';

  var userAuth = {
    email: testUserJWT,
    password: testPass
  };

  var changePasswordJson2 = {
    current_password: testPass,
    new_password: newTestPass
  };

  var newUserJson = {
    'firstname': 'API QA User',
    'lastname': 'With User Perm',
    'email': testUserJWT,
    'theme': 'light',
    'role': 'user',
    'password': testPass,
    'access_control_list': {
      'readOnly': false,
      'test': true,
      'configure': true,
      'reports': true,
      'dashBoard': true
    }
  };

  it('should create a new user account ' + testUserJWT, function(done) {
    request(testAPIUrl)
      .post('/v1/users')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send(newUserJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully created new user');
        response_json.object_id.should.be.a.String();
        testUserId = response_json.object_id;
        done();
      });
  });

  it('should find a new record about the addition of new user in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj      = response_json.data[0];
        last_obj.target_id.should.be.equal(testUserId);
        last_obj.activity_type.should.be.equal('add');
        last_obj.activity_target.should.be.equal('user');
        done();
      });
  });

  it('should fail to authenticate using empty JSON', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send( {} )
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        done();
      });
  });

  it('should fail to authenticate using wrong password', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send( { email: testUserJWT, password: 'edtq3tedfgsdfg' } )
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        done();
      });
  });

  it('should authenticate and receive a token', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send( userAuth )
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Enjoy your token');
        response_json.token.should.be.a.String();
        jwtToken = response_json.token;
        done();
      });
  });

  it('should fail to get a list of LM locations without any authorization', function(done) {
    request(testAPIUrl)
      .get('/v1/locations/lastmile')
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('should fail to get a list of LN locations using wrong token', function(done) {
    request(testAPIUrl)
      .get('/v1/locations/lastmile')
      .set('Authorization', 'Bearer asdljgadlskgjladgjsldkjglsdkjgldkfjgldfkgjdlfkgjdflkgjdlfgjdl')
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('should get a list of LM locations using the new token', function(done) {
    request(testAPIUrl)
      .get('/v1/locations/lastmile')
      .set('Authorization', 'Bearer ' + jwtToken)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('should successfully change the user password', function(done) {
    request(testAPIUrl)
      .put('/v1/users/password/' + testUserId)
      .auth(testUserJWT, testPass)
      .send( changePasswordJson2 )
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully updated the password');
        done();
      });
  });

  it('should find a new record about modify password the user in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .auth(testUserJWT, newTestPass)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj      = response_json.data[0];
        last_obj.target_id.should.be.equal(testUserId);
        last_obj.activity_type.should.be.equal('modify');
        last_obj.activity_target.should.be.equal('user');
        done();
      });
  });

  it('should fail to get a list of LM locations using the same token after password change', function(done) {
    request(testAPIUrl)
      .get('/v1/locations/lastmile')
      .set('Authorization', 'Bearer ' + jwtToken)
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        done();
      });
  });

  it('should delete test user account ' + testUserJWT, function(done) {
    request(testAPIUrl)
      .delete('/v1/users/' + testUserId)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully deleted the user');
        done();
      });
  });



  it('should find a new record about deleting the user in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj      = response_json.data[0];
        last_obj.target_id.should.be.equal(testUserId);
        last_obj.activity_type.should.be.equal('delete');
        last_obj.activity_target.should.be.equal('user');
        done();
      });
  });

});


