process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');

var express = require('express');
var fs = require('fs');
var https = require('https');
var sleep = require('sleep');
var utils = require('../lib/utilities.js');

var testAPIUrl = 'https://localhost:8000';

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs';


describe('Rev API', function() {

  var adminToken = '',
    userToken = ''.
    userCompanyId = '',
    testDomainId,
    testDomain = 'qa-api-test-domain.revsw.net',
    domainConfigJson = {};

  it('should receive a list of first mile locations', function(done) {
    request(testAPIUrl)
      .get('/v1/locations/firstmile')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.length.should.be.above(0);
        for (var i=0; i < response_json.length; i++) {
          response_json[i].locationName.should.be.a.String();
          response_json[i].id.should.be.a.String();
        }
        done();
      });
  });


  it('should receive 404 on wrong API path', function(done) {
    request(testAPIUrl)
      .get('/v1/users-wrong-path')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
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

  // Testing domain-related calls

  it('should get a domains list as user with Admin permissions', function(done) {
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
        for (var i=0; i < response_json.length; i++ ) {
          response_json[i].companyId.should.be.a.String();
          response_json[i].name.should.be.a.String();
          response_json[i].id.should.be.a.String();
          response_json[i].sync_status.should.be.a.String();
          if ( response_json[i].name === testDomain ) {
            testDomainId = response_json[i].id;
          }
        }
        testDomainId.should.be.a.String();
        done();
      });
  });


  it('should get domain configuration for test domain', function(done) {
    request(testAPIUrl)
      .get('/v1/domains/' + testDomainId)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }

        var response_json = JSON.parse(res.text);
        response_json.id.should.be.equal(testDomainId);
        response_json.name.should.be.equal(testDomain);
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

describe('Rev API Admin User', function() {

  var numberOfUsers = 0,
    userId = '',
    myCompanyId = [],
    myDomains = [],
    testUser = 'api-qa-user-' + Date.now() + '@revsw.com',
    testUserId,
    testPassword = 'password1',
    newTestPassword = 'password2',
    testUserProfile = {};

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

  var updatedUserJson = {
    'firstname': 'Updated API QA User',
    'lastname': 'Updated With Admin Perm',
    'companyId': [
      '55b6ff6a7957012304a49d04'
    ],
    'domain': [
      'qa-api-test-domain.revsw.net'
    ],
    'theme': 'dark',
    'role': 'user',
    'password': newTestPassword,
    'access_control_list': {
      'readOnly': true,
      'test': false,
      'configure': false,
      'reports': false,
      'dashBoard': false
    }
  };

  it('should be denied access to /v1/accounts functions', function(done) {
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
        response_json.message.should.startWith('Insufficient scope');
        done();
      });
  });

  it('should get a list of users', function(done) {
    request(testAPIUrl)
      .get('/v1/users')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        // response_json.statusCode.should.be.equal(200);
        response_json.length.should.be.above(0);
        numberOfUsers = response_json.length;


        // now let's find the ID of the API test user (variable qaUserWithAdminPerm)
        var foundMyself = false;
        for ( var i=0; i < numberOfUsers; i++ ) {
          response_json[i].companyId.should.be.an.instanceOf(Array);
          response_json[i].domain.should.be.an.instanceOf(Array);
          response_json[i].email.should.be.type('string');
          response_json[i].firstname.should.be.type('string');
          response_json[i].user_id.should.be.type('string');
          if ( response_json[i].email === qaUserWithAdminPerm ) {
            foundMyself = true;
            userId = response_json[i].user_id;
            myCompanyId = response_json[i].companyId;
            myDomains = response_json[i].domain;
          }
        }
        foundMyself.should.be.equal(true);

        // check that the returned users all belong to the same companyId as the test user
        for ( i=0; i < numberOfUsers; i++ ) {
          var companyIdOverlap = utils.areOverlappingArrays(myCompanyId, response_json[i].companyId);
          companyIdOverlap.should.be.equal(true);
        }

        done();
      });
  });

  it('should get the details of test user account ' + qaUserWithAdminPerm, function(done) {
    request(testAPIUrl)
      .get('/v1/users/' + userId )
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.role.should.be.equal('admin');
        response_json.email.should.be.equal(qaUserWithAdminPerm);
        response_json.user_id.should.be.equal(userId);
        done();
      });
  });

  it('should fail to receive user details for RevAdmin user dev@revsw.com, ID 55888147fef4198e079c315e', function(done) {
    request(testAPIUrl)
      .get('/v1/users/55888147fef4198e079c315e' )
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('User not found');
        done();
      });
  });

  it('should fail to create a new user account using empty Json', function(done) {
    request(testAPIUrl)
      .post('/v1/users')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send( {} )
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('child "email" fails because ["email" is required]');
        done();
      });
  });

  it('should create a new user account ' + testUser, function(done) {
    newUserJson.email = testUser;
    newUserJson.companyId = myCompanyId;
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


  it('should read back the configuration of freshly created user ' + testUser, function(done) {
    request(testAPIUrl)
      .get('/v1/users/' + testUserId)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.user_id.should.be.equal(testUserId);
        response_json.updated_at.should.be.a.String();
        response_json.created_at.should.be.a.String();

        var verifyUserJson = response_json;
        delete verifyUserJson.created_at;
        delete verifyUserJson.updated_at;
        delete verifyUserJson.user_id;
        delete newUserJson.password;
        verifyUserJson.should.be.eql(newUserJson);
        done();
      });
  });


  it('should get a list of domains using freshly created user ' + testUser, function(done) {
    request(testAPIUrl)
      .get('/v1/domains')
      .auth(testUser, testPassword)
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

  it('should change the password for new user account ' + testUser, function(done) {
    request(testAPIUrl)
      .put('/v1/users/' + testUserId)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send( { password: newTestPassword } )
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully updated the user');
        done();
      });
  });

  it('should get a list of domains using freshly created user ' + testUser +' and new password', function(done) {
    request(testAPIUrl)
      .get('/v1/domains')
      .auth(testUser, newTestPassword)
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

  it('should create new user account ' + testUser + ' without specifying companyId and domain', function(done) {
    newUserJson.email = testUser;
    delete newUserJson.companyId;
    delete newUserJson.domain;
    newUserJson.password = testPassword;
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

  it('should read back the configuration of freshly created user ' + testUser + ' and verify companyId and domain attributes', function(done) {


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

    newUserJson.email = testUser;

    request(testAPIUrl)
      .get('/v1/users/' + testUserId)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.user_id.should.be.equal(testUserId);
        response_json.updated_at.should.be.a.String();
        response_json.created_at.should.be.a.String();

        var verifyUserJson = response_json;
        delete verifyUserJson.created_at;
        delete verifyUserJson.updated_at;
        delete verifyUserJson.user_id;
        delete newUserJson.password;
        verifyUserJson.should.be.eql(newUserJson);
        done();
      });
  });

  it('should fail to set new companyId 55ba46a67957012304a49d0f which does not belong to test user ' + testUser, function(done) {

    request(testAPIUrl)
      .put('/v1/users/' + testUserId)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send( { companyId: [ '55b6ff6a7957012304a49d04', '55ba46a67957012304a49d0f' ] })
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('The new companyId is not found');
        done();
      });
  }); 

  it('should update test user ' + testUser + ' with new details in all fields', function(done) {

    request(testAPIUrl)
      .put('/v1/users/' + testUserId)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send(updatedUserJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully updated the user');
        done();
      });
  });

  it('should read back the updated configuration of test user ' + testUser, function(done) {
    request(testAPIUrl)
      .get('/v1/users/' + testUserId)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.user_id.should.be.equal(testUserId);
        response_json.updated_at.should.be.a.String();
        response_json.created_at.should.be.a.String();

        var verifyUserJson = response_json;
        delete verifyUserJson.created_at;
        delete verifyUserJson.updated_at;
        delete verifyUserJson.user_id;
        delete verifyUserJson.email;
        delete updatedUserJson.password;
        verifyUserJson.should.be.eql(updatedUserJson);
        done();
      });
  });

  it('should get a list of domains using updated user ' + testUser +' and new password', function(done) {
    request(testAPIUrl)
      .get('/v1/domains')
      .auth(testUser, newTestPassword)
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

