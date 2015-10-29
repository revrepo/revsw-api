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

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');
var testAPIUrlHTTP = ( process.env.API_QA_URL_HTTP ) ? process.env.API_QA_URL_HTTP : 'http://localhost:' + config.get('service.http_port');
var testAPIUrlExpected = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.http_port');

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

describe('Rev API keys', function() {

  var myCompanyId = '55b6ff6a7957012304a49d04',
    myDomains = [],
    testUser = 'api-qa-user-' + Date.now() + '@revsw.com',
    testUserId,
//    testUser = 'api-qa-user-1444983698019@revsw.com',
//    testUserId = '5620b39268a3f1483b990e1c',
    testPassword = 'password1',
    newDomainName = 'delete-me-API-QA-name-' + Date.now() + '.revsw.net',
    newDomainId,
    createDomainIds,
    createdAPIKeyId,
    testUserProfile = {};

  var newUserJson = {
    'firstname': 'API QA User',
    'lastname': 'With Admin Perm',
    'email': 'deleteme111@revsw.com',
    'companyId': [
      myCompanyId
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
  
  it('should create a new user account ' + testUser, function(done) {
    newUserJson.email = testUser;
    newUserJson.domain = myDomains;
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

  it('should fail to create an API key without supplying companyId', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .auth(testUser, testPassword)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('child \"companyId\" fails because [\"companyId\" is required]');
        done();
      });
  });

  it('should fail to create an API key with wrong companyId', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .auth(testUser, testPassword)
      .send({companyId: '55b6ff222957012344449d04'})
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('Wrong company ID');
        done();
      });
  });

  it('should fail to create an API key without admin permissions' + testUser, function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .send({companyId: myCompanyId})
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw');
        done();
      });
  });

  it('should create an API key for the company' + testUser, function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .auth(testUser, testPassword)
      .send({companyId: myCompanyId})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully created new API key');
        createdAPIKeyId = response_json._id;
        done();
      });
  });

  it('should fail to return a list of API keys for the company without admin permissions', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys')
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin,reseller');
        done();
      });
  });

  it('should fail to return a list of API keys for the company with wrong password', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys')
      .auth(qaUserWithUserPerm, 'du3jwuu823urj')
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

  it('should fail to return a list of API keys for the company without authentication', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys')
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        response_json.message.should.be.equal('Missing authentication');
        done();
      });
  });

  it('should return a list of API keys for the company', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys')
      .auth(testUser, testPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.an.Array;
        done();
      });
  });

  it('should fail to update an API key for the company without supplying the key', function(done) {
    request(testAPIUrl)
      .put('/v1/api_keys/')
      .auth(testUser, testPassword)
      .send({read_only_status: true})
      .expect(404)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(404);
        response_json.error.should.be.equal('Not Found');
        done();
      });
  });

  it('should fail to update an API key for the company without admin permissions', function(done) {
    request(testAPIUrl)
      .put('/v1/api_keys/' + createdAPIKeyId)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .send({read_only_status: true})
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw');
        done();
      });
  });

  it('should fail to update an API key for the company without authentication', function(done) {
    request(testAPIUrl)
      .put('/v1/api_keys/' + createdAPIKeyId)
      .send({read_only_status: true})
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        response_json.message.should.be.equal('Missing authentication');
        done();
      });
  });

  it('should update an API key for the company', function(done) {
    request(testAPIUrl)
      .put('/v1/api_keys/' + createdAPIKeyId)
      .auth(testUser, testPassword)
      .send({read_only_status: true})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully updated the API key');
        done();
      });
  });

  it('should fail to activate the API key for the company without supplying the key', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/activate/')
      .auth(testUser, testPassword)
      .send({read_only_status: true})
      .expect(404)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(404);
        response_json.error.should.be.equal('Not Found');
        done();
      });
  });

  it('should fail to activate the API key for the company without admin permissions', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/activate/' + createdAPIKeyId)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .send({read_only_status: true})
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw');
        done();
      });
  });

  it('should fail to activate the API key for the company without authentication', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/activate/' + createdAPIKeyId)
      .send({read_only_status: true})
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        response_json.message.should.be.equal('Missing authentication');
        done();
      });
  });

  it('should activate the API key for the company', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/activate/' + createdAPIKeyId)
      .auth(testUser, testPassword)
      .send({read_only_status: true})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully activated the API key');
        done();
      });
  });

  it('should fail to deactivate the API key for the company without supplying the key', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/deactivate/')
      .auth(testUser, testPassword)
      .send({read_only_status: true})
      .expect(404)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(404);
        response_json.error.should.be.equal('Not Found');
        done();
      });
  });

  it('should fail to deactivate the API key for the company without admin permissions', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/deactivate/' + createdAPIKeyId)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .send({read_only_status: true})
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw');
        done();
      });
  });

  it('should fail to deactivate the API key for the company without authentication', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/deactivate/' + createdAPIKeyId)
      .send({read_only_status: true})
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        response_json.message.should.be.equal('Missing authentication');
        done();
      });
  });

  it('should deactivate the API key for the company', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/deactivate/' + createdAPIKeyId)
      .auth(testUser, testPassword)
      .send({read_only_status: true})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully deactivated the API key');
        done();
      });
  });

  it('should fail to delete the API key for the company without supplying the key', function(done) {
    request(testAPIUrl)
      .delete('/v1/api_keys/')
      .auth(testUser, testPassword)
      .send({read_only_status: true})
      .expect(404)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(404);
        response_json.error.should.be.equal('Not Found');
        done();
      });
  });

  it('should fail to delete the API key for the company without admin permissions', function(done) {
    request(testAPIUrl)
      .delete('/v1/api_keys/' + createdAPIKeyId)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .send({read_only_status: true})
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw');
        done();
      });
  });

  it('should fail to delete the API key for the company without authentication', function(done) {
    request(testAPIUrl)
      .delete('/v1/api_keys/' + createdAPIKeyId)
      .send({read_only_status: true})
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(401);
        response_json.error.should.be.equal('Unauthorized');
        response_json.message.should.be.equal('Missing authentication');
        done();
      });
  });

  it('should fail to delete the API key for the company', function(done) {
    request(testAPIUrl)
      .delete('/v1/api_keys/' + createdAPIKeyId)
      .auth(testUser, testPassword)
      .send({read_only_status: true})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully deleted the API key');
        done();
      });
  });

  it('should delete test user account ' + testUser, function(done) {
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
});

