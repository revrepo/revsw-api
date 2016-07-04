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

var testAPIUrl = (process.env.API_QA_URL) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');
var testAPIUrlHTTP = (process.env.API_QA_URL_HTTP) ? process.env.API_QA_URL_HTTP : 'http://localhost:' + config.get('service.http_port');
var testAPIUrlExpected = (process.env.API_QA_URL) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.http_port');

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithRevAdminPermPassword = 'password1',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs',
  testDomain = 'qa-api-test-domain.revsw.net'; // this domain should exist in the QA environment

var userAuthWithAdminPerm = {
  email: qaUserWithAdminPerm,
  password: qaUserWithAdminPermPassword
};
var userAuthWithRevAdminPerm = {
  email: qaUserWithRevAdminPerm,
  password: qaUserWithRevAdminPermPassword
};

describe('Rev user password change API', function() {

  this.timeout(10000);

  var jwtTokenWithAdminPerm = '',
    jwtTokenWithRevAdminPerm = '',
    userToken = '',
    userCompanyId = '',
    testDomainId,
    testDomain = 'qa-api-test-domain.revsw.net',
    domainConfigJson = {};

  var testUser = 'api-qa-user-' + Date.now() + '@revsw.com',
    testUserId = '',
    testPass = 'password1',
    newTestPass = 'password2';

  var changePasswordJson = {
    current_password: testPass,
    new_password: newTestPass
  };

  var newUserJson = {
    'firstname': 'API QA User',
    'lastname': 'With User Perm',
    'email': testUser,
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
  before(function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithRevAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        jwtTokenWithRevAdminPerm = response_json.token;

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

            done();
          });
      });
  })

  it('should create a new user account ' + testUser, function(done) {
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
        done();
      });
  });

  it('should find a new record about the addition of new user in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj = response_json.data[0];
        last_obj.target_id.should.be.equal(testUserId);
        last_obj.activity_type.should.be.equal('add');
        last_obj.activity_target.should.be.equal('user');
        done();
      });
  });

  it('should fail to change the password for another user', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({
        email: testUser,
        password: testPass
      })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenTestUser = response_json.token;
        request(testAPIUrl)
          .put('/v1/users/password/55f206b68593406503e1fdb6')
          .set('Authorization', 'Bearer ' + jwtTokenTestUser)
          .send(changePasswordJson)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.statusCode.should.be.equal(400);
            response_json.message.should.be.equal('Cannot update the password of another user');
            done();
          });
      });
  });

  it('should fail to change the password with empty JSON', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({
        email: testUser,
        password: testPass
      })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenTestUser = response_json.token;
        request(testAPIUrl)
          .put('/v1/users/password/' + testUserId)
          .set('Authorization', 'Bearer ' + jwtTokenTestUser)
          .send({})
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.statusCode.should.be.equal(400);
            done();
          });
      });
  });

  it('should fail to change the password with wrong current password', function(done) {
    var changePassJsonLocal = {
      current_password: testPass,
      new_password: newTestPass
    };
    changePassJsonLocal.current_password = '234afsdfswsdf';
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({
        email: testUser,
        password: testPass
      })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenTestUser = response_json.token;
        request(testAPIUrl)
          .put('/v1/users/password/' + testUserId)
          .set('Authorization', 'Bearer ' + jwtTokenTestUser)
          .send(changePassJsonLocal)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.statusCode.should.be.equal(400);
            response_json.message.should.be.equal('The current user password is not correct');
            done();
          });
      });
  });

  it('should fail to change the password with short new password', function(done) {
    var changePassJsonLocal = {
      current_password: testPass,
      new_password: newTestPass
    };
    changePassJsonLocal.new_password = '234af';
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({
        email: testUser,
        password: testPass
      })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenTestUser = response_json.token;
        request(testAPIUrl)
          .put('/v1/users/password/' + testUserId)
          .set('Authorization', 'Bearer ' + jwtTokenTestUser)
          .send(changePassJsonLocal)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.statusCode.should.be.equal(400);
            //        response_json.message.should.be.equal('The current user password is not correct');
            done();
          });
      });
  });

  it('should successfully change the user password', function(done) {
    var changePasswordJson = {
      current_password: testPass,
      new_password: newTestPass
    };
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({
        email: testUser,
        password: testPass
      })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenTestUser = response_json.token;
        request(testAPIUrl)
          .put('/v1/users/password/' + testUserId)
          .set('Authorization', 'Bearer ' + jwtTokenTestUser)
          .send(changePasswordJson)
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
  });

  it('should find a new record about updating password the user in logger', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({
        email: testUser,
        password: newTestPass
      })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenTestUser = response_json.token;
        request(testAPIUrl)
          .get('/v1/activity')
          .set('Authorization', 'Bearer ' + jwtTokenTestUser)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            var last_obj = response_json.data[1];
            last_obj.target_id.should.be.equal(testUserId);
            last_obj.activity_type.should.be.equal('modify');
            last_obj.activity_target.should.be.equal('user');
            done();
          });
      });
  });

  it('should get user details using the new password', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send({
        email: testUser,
        password: newTestPass
      })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenTestUser = response_json.token;
        request(testAPIUrl)
          .get('/v1/users/myself')
          .set('Authorization', 'Bearer ' + jwtTokenTestUser)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.email.should.be.equal(testUser);
            done();
          });
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

  it('should find a new record about deleting the user in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj = response_json.data[0];
        last_obj.target_id.should.be.equal(testUserId);
        last_obj.activity_type.should.be.equal('delete');
        last_obj.activity_target.should.be.equal('user');
        done();
      });
  });
});
