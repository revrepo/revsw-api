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
var speakeasy = require('speakeasy');
var async = require('async');
var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' +
  config.get('service.https_port');
var testAPIUrlHTTP = ( process.env.API_QA_URL_HTTP ) ? process.env.API_QA_URL_HTTP : 'http://localhost:' +
  config.get('service.http_port');
var testAPIUrlExpected = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' +
  config.get('service.http_port');

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithUserPermPassword = 'password1',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithRevAdminPermPassword = 'password1',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs',
  testDomain = 'qa-api-test-domain.revsw.net',  // this domain should exist in the QA environment
  secretKey = '';

var userAuthWithUserPerm = {
  email : qaUserWithUserPerm,
  password: qaUserWithUserPermPassword
}
var userAuthWithAdminPerm = {
  email : qaUserWithAdminPerm,
  password: qaUserWithAdminPermPassword
}

var userAuthWithResellerPerm = {
  email : qaUserWithResellerPerm,
  password: qaUserWithResellerPermPassword
}

var userAuthWithRevAdminPerm = {
  email : qaUserWithRevAdminPerm,
  password: qaUserWithRevAdminPermPassword
}


describe('Rev API 2FA', function() {

  var myCompanyId,
    myDomains = [],
    testUser = 'api-qa-user-' + Date.now() + '@revsw.com',
    testUserId,
//    testUser = 'api-qa-user-1444983698019@revsw.com',
//    testUserId = '5620b39268a3f1483b990e1c',
    testPassword = 'password1',
    newDomainName = 'delete-me-api-qa-name-' + Date.now() + '.revsw.net',
    newDomainId,
    createDomainIds,
    testUserProfile = {};

  this.timeout(10000);

  var newUserJson = {
    'firstname': 'API QA User',
    'lastname': 'With Admin Perm',
    'email': 'deleteme111@revsw.com',
    'companyId': [
      '55b6ff6a7957012304a49d04'
    ],
    'domain': [
      'qa-api-test-domain.revsw.net'
    ],
    'theme': 'light',
    'role': 'admin',
    'password': 'password1',
    'access_control_list': {
      'readOnly': false,
      'test': true,
      'configure': true,
      'reports': true,
      'dashBoard': true
    }
  };
  var jwtTokenWithUserPerm = '';
  var jwtTokenWithAdminPerm = '';
  var jwtTokenTestUser = '';
  before(function getAuthTokens(done) {
    async.parallel({
      jwtTokenWithUserPerm: function getAuthTokenWithAdminPerm(cb) {
        request(testAPIUrl)
          .post('/v1/authenticate')
          .send(userAuthWithUserPerm)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            jwtTokenWithUserPerm = response_json.token;
            cb(null, jwtTokenWithUserPerm);
          });
      },
      jwtTokenWithAdminPerm: function getAuthTokenWithAdminPerm(cb) {
        request(testAPIUrl)
          .post('/v1/authenticate')
          .send(userAuthWithAdminPerm)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            jwtTokenWithAdminPerm = response_json.token;
            cb(null, jwtTokenWithAdminPerm);
          });
      },
      jwtTokenWithResellerPerm: function getAuthTokenWithAdminPerm(cb) {
        request(testAPIUrl)
          .post('/v1/authenticate')
          .send(userAuthWithResellerPerm)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            jwtTokenWithAdminPerm = response_json.token;
            cb(null, jwtTokenWithAdminPerm);
          });
      },

    }, function(err, tokens) {
      if (err) {
        throw err;
      }
      jwtTokenWithUserPerm = tokens.jwtTokenWithUserPerm;
      jwtTokenWithAdminPerm = tokens.jwtTokenWithAdminPerm;
      jwtTokenWithResellerPerm = tokens.jwtTokenWithResellerPerm;
      done()
    });

  });


  it('should create a new user account ' + testUser, function(done) {
    newUserJson.email = testUser;
    newUserJson.domain = myDomains;
    request(testAPIUrl)
      .post('/v1/users')
      .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
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
        request(testAPIUrl)
          .post('/v1/authenticate')
          .send({
            email: testUser,
            password: testPassword
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            jwtTokenTestUser = response_json.token;
            done();
          });
      });
  });


  it('should fail to enable 2fa for user ' + testUser + ' before calling init', function(done) {
    var oneTimePassword = speakeasy.time({key: secretKey, encoding: 'base32'});
    request(testAPIUrl)
      .post('/v1/2fa/enable')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .send({oneTimePassword: oneTimePassword})
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.message.should.be.equal('Must call init first');
        done();
      });
  });

  it('should initialize 2fa for freshly created user ' + testUser, function(done) {
    request(testAPIUrl)
      .get('/v1/2fa/init')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.ascii.should.be.a.String().length(16);
        response_json.hex.should.be.a.String().length(32);
        response_json.base32.should.be.a.String();
        response_json.google_auth_qr.should.be.a.String().and
          .match(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+.[A-Za-z0-9-_:%&;\?#/.=]+/g);
        secretKey = response_json.base32;
        done();
      });
  });

  it('should authenticate user ' + testUser + ' without oneTimePassword' , function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({email: testUser, password: testPassword})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Enjoy your token');
        done();
      });
  });

  xit('should fail to initialize 2fa for freshly created user ' + testUser + ' with wrong credentials', function(done) {

    request(testAPIUrl)
      .get('/v1/2fa/init')
      .auth('non-existing-user', testPassword)
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        response_json.message.should.be.equal('Bad username or password');
        done();
      });
  });

  it('should fail to enable 2fa for user ' + testUser + ' with wrong oneTimePassword', function(done) {
    var oneTimePassword = '123456';
    request(testAPIUrl)
      .post('/v1/2fa/enable')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .send({oneTimePassword: oneTimePassword})
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.message.should.be.equal('The supplied one time password is incorrect');
        done();
      });
  });

  it('should enable 2fa for user ' + testUser, function(done) {
    var oneTimePassword = speakeasy.time({key: secretKey, encoding: 'base32'});
    request(testAPIUrl)
      .post('/v1/2fa/enable')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .send({oneTimePassword: oneTimePassword})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully enabled two factor authentication');
        done();
      });
  });

  it('should fail to authenticate user ' + testUser + ' without oneTimePassword' , function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({email: testUser, password: testPassword})
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        done();
      });
  });

  it('should fail to authenticate user ' + testUser + ' with wrong oneTimePassword' , function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({email: testUser, password: testPassword, oneTimePassword: 'wrong pass'})
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

  it('should authenticate user ' + testUser + ' with oneTimePassword' , function(done) {
    var oneTimePassword = speakeasy.time({key: secretKey, encoding: 'base32'});
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({email: testUser, password: testPassword, oneTimePassword: oneTimePassword})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Enjoy your token');
        done();
      });
  });

  it('should fail to disable 2FA for another user', function(done) {
    var oneTimePassword = speakeasy.time({key: secretKey, encoding: 'base32'});
    request(testAPIUrl)
      .post('/v1/2fa/disable/' + testUserId)
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .send({oneTimePassword: oneTimePassword})
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('User ID not found');
        done();
      });
  });

  it('should fail to disable 2FA for an existing user from another account', function(done) {
    var oneTimePassword = speakeasy.time({key: secretKey, encoding: 'base32'});
    request(testAPIUrl)
      .post('/v1/2fa/disable/' + testUserId)
      .set('Authorization', 'Bearer ' + jwtTokenWithResellerPerm)
      .send({oneTimePassword: oneTimePassword})
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('User ID not found');
        done();
      });
  });

  it('should disable 2fa for user ' + testUser, function(done) {
    var oneTimePassword = speakeasy.time({key: secretKey, encoding: 'base32'});
    request(testAPIUrl)
      .post('/v1/2fa/disable/' + testUserId)
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .send({oneTimePassword: oneTimePassword})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully disabled two factor authentication');
        done();
      });
  });

  it('should be allowed to disable 2FA for another user in the same company account', function(done) {
    var oneTimePassword = speakeasy.time({key: secretKey, encoding: 'base32'});
    request(testAPIUrl)
      .post('/v1/2fa/disable/' + testUserId)
       .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
      .send({oneTimePassword: oneTimePassword})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully disabled two factor authentication');
        done();
      });
  });

  it('should authenticate user ' + testUser + ' without oneTimePassword' , function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({email: testUser, password: testPassword})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Enjoy your token');
        done();
      });
  });

  it('should delete test user account ' + testUser, function(done) {
    request(testAPIUrl)
      .delete('/v1/users/' + testUserId)
      .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
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

});

