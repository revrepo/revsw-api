process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');

var config = require('config');

var testAPIUrl = (process.env.API_QA_URL) ? process.env.API_QA_URL : 'https://localhost:' +
  config.get('service.https_port');
var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com';
var qaUserWithUserPermPassword = 'password1';
var qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com';
var qaUserWithAdminPermPassword = 'password1';
var qaUserWithRevAdminPerm = 'dev@revsw.com';
var qaUserWithRevAdminPermPassword = '12345678';

var userAuthWithAdminPerm = {
  email: qaUserWithAdminPerm,
  password: qaUserWithAdminPermPassword
};
var userAuthWithRevAdminPerm = {
  email: qaUserWithRevAdminPerm,
  password: qaUserWithRevAdminPermPassword
};
var userAuthWithUserPerm = {
  email: qaUserWithUserPerm,
  password: qaUserWithUserPermPassword
};
describe('Rev API keys', function() {

  this.timeout(60000);

  var myCompanyId = '55b6ff6a7957012304a49d04';
  var myDomains = [];
  var okDomains = [
    '55f9f0da5ca524340d761b70', '55f9f0fa5ca524340d761b76', '55f9f6825ca524340d761b7c',
    '55b701197957012304a49d05', '56188c7e144de0433c4e68f8'
  ];
  var lessDomains = [ ];
  var wrongDomains = [
    '55f9f0da5ca524340d761b70', '55f9f0fa5ca524340f761b76', '55f9f6825ca524340d761b7c',
    '55b7011979570123aaa49d05', '56188c7e144de0433c4e68f8', '56188c7e144de0433c4e68a9'
  ];
  var testUser = 'api-qa-user-' + Date.now() + '@revsw.com';
  var testUserId;
  var testPassword = 'password1';
  var createdAPIKeyId = '';
  var testDomain = 'qa-api-test-proxy-nginx-custom-commands.revsw.net';
  var testDomainId;
  var testCompanyName = 'API QA Account for API Keys - ' + Date.now();
  var createdAccountID;

  var newUserJson = {
    'firstname': 'API QA User',
    'lastname': 'With Admin Perm',
    'email': 'deleteme111@revsw.com',
    'companyId': [myCompanyId],
    'domain': ['qa-api-test-proxy-nginx-custom-commands.revsw.net'],
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

  var jwtTokenWithAdminPerm = '',
  jwtTokenWithRevAdminPerm = '',
  jwtTokenWithUserPerm = ''
  jwtTokenTestUser = '';
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
                done();
              });
          });


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


  it('should get a domains list as user with admin permissions', function(done) {
    request(testAPIUrl)
      .get('/v1/domain_configs')
      .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.length.should.be.above(0);
        for (var i = 0; i < response_json.length; i++) {
          response_json[i].account_id.should.be.a.String();
          response_json[i].domain_name.should.be.a.String();
          response_json[i].id.should.be.a.String();
          if (response_json[i].domain_name === testDomain.toLowerCase()) {
            testDomainId = response_json[i].id;
          }
        }
        testDomainId.should.be.a.String();
        done();
      });
  });

  it('should fail to create an API key without supplying account_id', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('child "account_id" fails because ["account_id" is required]');
        done();
      });
  });

  it('should fail to create an API key with wrong account_id', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .send({account_id: '55b6ff222957012344449d04'})
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('Company ID not found');
        done();
      });
  });

  it('should fail to create an API key without admin permissions ' + testUser, function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .send({account_id: myCompanyId})
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw,apikey_rw');
        done();
      });
  });

  it('should create an API key for the company' + testUser, function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .send({account_id: myCompanyId})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(200);
        response_json.message.should.be.equal('Successfully created new API key');
        createdAPIKeyId = response_json.object_id;
        done();
      });
  });

  it('should find a new record about adding a new API key in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj = response_json.data[0];
        last_obj.target_id.should.be.equal(createdAPIKeyId);
        last_obj.activity_type.should.be.equal('add');
        last_obj.activity_target.should.be.equal('apikey');
        done();
      });
  });

  it('should fail to return the API key without admin permissions', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys/' + createdAPIKeyId)
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin,reseller,revadmin,apikey');
        done();
      });
  });

  xit('should fail to return the API key with wrong password', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys/' + createdAPIKeyId)
      // .auth(qaUserWithUserPerm, 'du3jwuu823urj')
      .set('Authorization', 'Bearer ' + 'notcorrecttoken.notcorrecttoken.notcorrecttoken')
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

  it('should fail to return the API key without authentication', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys/' + createdAPIKeyId)
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

  it('should return the API key', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys/' + createdAPIKeyId)
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
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


  it('should fail to return a list of API keys for the company without admin permissions', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin,reseller,revadmin,apikey');
        done();
      });
  });

  xit('should fail to return a list of API keys for the company with wrong password', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys')
      // .auth(qaUserWithUserPerm, 'du3jwuu823urj')
      .set('Authorization', 'Bearer ' + 'notcorrecttoken.notcorrecttoken.notcorrecttoken')
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

  xit('should return a list of API keys for the company', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.an.Array();
        response_json.length.should.be.above(0);
        response_json[0].id.should.be.equal(createdAPIKeyId);
        response_json[0].key_name.should.be.equal('New API Key');
        response_json[0].account_id.should.be.equal(myCompanyId);
        done();
      });
  });

  it('should fail to update an API key for the company without supplying the key', function(done) {
    request(testAPIUrl)
      .put('/v1/api_keys/')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
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
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .send({read_only_status: true})
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw,apikey_rw');
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

  it('should fail to update an API key with wrong domains', function(done) {
    request(testAPIUrl)
      .put('/v1/api_keys/' + createdAPIKeyId)
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .send({
        key_name        : 'New Key Name',
        account_id      : myCompanyId,
        domains         : wrongDomains,
        allowed_ops     : {
          read_config     : true,
          modify_config   : true,
          delete_config   : true,
          purge           : true,
          reports         : true,
          admin           : true,
        },
        active          : true,
        read_only_status: true
      })
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.startWith('Wrong domains: ');
        done();
      });
  });

  it('should update an API key for the company', function(done) {
    request(testAPIUrl)
      .put('/v1/api_keys/' + createdAPIKeyId)
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .send({
        key_name        : 'New Key Name',
        account_id      : myCompanyId,
        domains         : lessDomains,
        allowed_ops     : {
          read_config     : true,
          modify_config   : true,
          delete_config   : true,
          purge           : true,
          reports         : true,
          admin           : true,
        },
        active          : true,
        read_only_status: true
      })
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

  it('should find a new record about updating API key in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj = response_json.data[0];
        last_obj.target_id.should.be.equal(createdAPIKeyId);
        last_obj.target_name.should.be.equal('New Key Name');
        last_obj.activity_type.should.be.equal('modify');
        last_obj.activity_target.should.be.equal('apikey');
        done();
      });
  });

  it('should fail to activate the API key for the company without admin permissions', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/' + createdAPIKeyId + '/activate')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw,apikey_rw');
        done();
      });
  });

  it('should fail to activate the API key for the company without authentication', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/' + createdAPIKeyId + '/activate')
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
      .post('/v1/api_keys/' + createdAPIKeyId + '/activate')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
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

  it('should find a new record about activating API key in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj = response_json.data[0];
        last_obj.target_id.should.be.equal(createdAPIKeyId);
        last_obj.target_name.should.be.equal('New Key Name');
        last_obj.activity_type.should.be.equal('modify');
        last_obj.activity_target.should.be.equal('apikey');
        done();
      });
  });

  it('should fail to deactivate the API key for the company without admin permissions', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/' + createdAPIKeyId + '/deactivate')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw,apikey_rw');
        done();
      });
  });

  it('should fail to deactivate the API key for the company without authentication', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/' + createdAPIKeyId + '/deactivate')
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
      .post('/v1/api_keys/' + createdAPIKeyId + '/deactivate')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
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

  it('should find a new record about deactivating API key in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj = response_json.data[0];
        last_obj.target_id.should.be.equal(createdAPIKeyId);
        last_obj.target_name.should.be.equal('New Key Name');
        last_obj.activity_type.should.be.equal('modify');
        last_obj.activity_target.should.be.equal('apikey');
        done();
      });
  });

  it('should fail to delete the API key for the company without supplying the key', function(done) {
    request(testAPIUrl)
      .delete('/v1/api_keys/')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
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
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw,apikey_rw');
        done();
      });
  });

  it('should fail to delete the API key for the company without authentication', function(done) {
    request(testAPIUrl)
      .delete('/v1/api_keys/' + createdAPIKeyId)
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

  it('should delete the API key for the company', function(done) {
    request(testAPIUrl)
      .delete('/v1/api_keys/' + createdAPIKeyId)
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
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

  it('should find a new record about deleting API key in logger', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenTestUser)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var last_obj = response_json.data[0];
        last_obj.target_id.should.be.equal(createdAPIKeyId);
        last_obj.target_name.should.be.equal('New Key Name');
        last_obj.activity_type.should.be.equal('delete');
        last_obj.activity_target.should.be.equal('apikey');
        done();
      });
  });

  it('should delete test user account ' + testUser, function(done) {
    request(testAPIUrl)
      .delete('/v1/users/' + testUserId)
      .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
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


  // POSITIVE TESTS
  var createdKeyID;
  var createdApiKey;
  var forUpdatesApiKeyID;
  var purgeRequestID;
  var createdUserID;
  var createdAppID;
  var createdDomainID;
  var firstMileID = '55a56fa6476c10c329a90741';
  var createdROKeyID;
  var createdROKey;

  it('should create an API key for next tests with revadmin role', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
      .send({account_id: myCompanyId})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.message.should.be.equal('Successfully created new API key');
        createdKeyID = response_json.object_id;
        createdApiKey = response_json.key;
        done();
      });
  });

  it('should load accounts', function(done) {
    request(testAPIUrl)
      .get('/v1/accounts')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  xit('should create new account', function(done) {
    var newAccountJson = {
      companyName: testCompanyName,
      comment: 'API QA Account comment'
    };

    request(testAPIUrl)
      .post('/v1/accounts')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send(newAccountJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        console.log(response_json);
        createdAccountID = response_json.object_id;
        createdAccountID.should.be.a.String();
        done();
      });
  });

  // TODO: need to figure out how to handle account management via API key.
  // TODO:
  xit('should update account with id - ' + createdAccountID, function(done) {
    var updateAccountJson = {
      companyName: testCompanyName + ' UPDATED',
      comment: '',
      first_name: 'Vano',
      last_name: 'Khuroshvili',
      phone_number: '995577320836',
      contact_email: 'vano.khuroshvili@gmail.com',
      address1: 'Tbilisi 1',
      address2: 'Tbilisi 2',
      country: 'Georgia',
      state: 'Tbilisi',
      city: 'Tbilisi',
      zipcode: '01170',
      billing_plan: '56eaee8cd254ddc814509f51',
      use_contact_info_as_billing_info: true,
      billing_info: {},
      subscription_state: 'active'
    };

    request(testAPIUrl)
      .put('/v1/accounts/' + createdAccountID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send(updateAccountJson)
      .expect(200, done);
  });

  xit('should load account with id - ' + createdAccountID, function(done) {
    request(testAPIUrl)
      .get('/v1/accounts/' + createdAccountID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load api keys', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load api key with id', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys/' + createdKeyID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should create api key for account - ' + myCompanyId, function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send({account_id: myCompanyId})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        forUpdatesApiKeyID = response_json.object_id;
        done();
      });
  });

  it('should update api key', function(done) {
    var updateKeyJson = {
      key_name : 'auth with api key',
      account_id : myCompanyId,
      domains : [],
      allowed_ops : {
        read_config : true,
        modify_config : true,
        delete_config : true,
        purge : true,
        reports : true,
        admin : true
      },
      read_only_status : false,
      active : true
    };

    request(testAPIUrl)
      .put('/v1/api_keys/' + createdKeyID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send(updateKeyJson)
      .expect(200, done);
  });

  it('should activate api key ', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/' + forUpdatesApiKeyID + '/activate')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should deactivate api key ', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys/' + forUpdatesApiKeyID + '/deactivate')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should delete api key ', function(done) {
    request(testAPIUrl)
      .delete('/v1/api_keys/' + forUpdatesApiKeyID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load apps', function(done) {
    request(testAPIUrl)
      .get('/v1/apps')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should create app', function(done) {
    var createAppJson = {
      account_id : myCompanyId,
      app_name : 'App created with api key auth - ' + Date.now(),
      app_platform : 'iOS'
    };

    request(testAPIUrl)
      .post('/v1/apps')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send(createAppJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        createdAppID = response_json.id;
        done();
      });
  });

  it('should load app with id', function(done) {
    request(testAPIUrl)
      .get('/v1/apps/' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load app version with id', function(done) {
    request(testAPIUrl)
      .get('/v1/apps/' + createdAppID + '/versions')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load app configs with id', function(done) {
    request(testAPIUrl)
      .get('/v1/apps/' + createdAppID + '/config_status')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should update app with id', function(done) {
    var updateAppJson =  {
      app_name : 'update app name - ' + Date.now(),
      account_id : myCompanyId,
      configs : [{
        sdk_release_version : 99,
        logging_level : 'info'
      }]
    };

    request(testAPIUrl)
      .put('/v1/apps/' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send(updateAppJson)
      .expect(200, done);
  });

  it('should load app sdk releases', function(done) {
    request(testAPIUrl)
      .get('/v1/apps/sdk_releases')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load locations firstmile', function(done) {
    request(testAPIUrl)
      .get('/v1/locations/firstmile')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);

        if(response_json.length){
          firstMileID = response_json[0].id;
        }

        done();
      });
  });

  it('should load locations lastmile', function(done) {
    request(testAPIUrl)
      .get('/v1/locations/lastmile')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should purge domain - ' + testDomain, function(done) {
    var purgeJson = {
      domainName : testDomain,
      purges : [{
        url: {
          is_wildcard : true,
          expression : '12'
        }
      }]
  };

    request(testAPIUrl)
      .post('/v1/purge')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send(purgeJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        purgeRequestID = response_json.request_id;
        done();
      });
  });

  it('should load purge request status', function(done) {
    request(testAPIUrl)
      .get('/v1/purge/' + purgeRequestID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load web usage', function(done) {
    request(testAPIUrl)
      .get('/v1/usage_reports/web?account_id=' + myCompanyId)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load users', function(done) {
    request(testAPIUrl)
      .get('/v1/users')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should create user', function(done) {
    var createUserJson = {
      email: 'test-user-' + Date.now() + '@unittest.com',
      firstname: 'Test',
      lastname: 'User',
      password: 'psw123456',
      companyId: [myCompanyId],
      domain: [testDomain],
      two_factor_auth_enabled: false,
      access_control_list: {
        dashBoard: true,
        reports: true,
        configure: true,
        test: true,
        readOnly: true
      },
      role: 'user',
      theme: 'light'
    };

    request(testAPIUrl)
      .post('/v1/users')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send(createUserJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        createdUserID = response_json.object_id;
        done();
      });
  });

  it('should update user', function(done) {
    var udapteUserJson = {
      firstname: 'Updated Test',
      lastname: 'Update User',
      password: 'psw1234567',
      companyId: [myCompanyId],
      domain: [testDomain],
      two_factor_auth_enabled: false,
      access_control_list: {
        dashBoard: true,
        reports: true,
        configure: true,
        test: true,
        readOnly: true
      },
      role: 'user',
      theme: 'light'
    };

    request(testAPIUrl)
      .put('/v1/users/' + createdUserID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send(udapteUserJson)
      .expect(200,done);
  });

  it('should load user with id', function(done) {
    request(testAPIUrl)
      .get('/v1/users/' + createdUserID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load activities', function(done) {
    request(testAPIUrl)
      .get('/v1/activity?user_id=' + createdUserID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should delete user with id', function(done) {
    request(testAPIUrl)
      .delete('/v1/users/' + createdUserID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load stats for domain', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/' + testDomainId)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load top objects stats for domain', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/top_objects/' + testDomainId)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load top traffic stats for domain', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/top/' + testDomainId + '?report_type=device')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load RTT stats for domain', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/lastmile_rtt/' + testDomainId)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load GBT stats for domain', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/gbt/' + testDomainId)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load FBT average stats for domain', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/fbt/average/' + testDomainId)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load FBT distribution stats for domain', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/fbt/distribution/' + testDomainId)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load FBT heatmap stats for domain', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/fbt/heatmap/' + testDomainId)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load SDK stats for application', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/app/' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load SDK stats for the account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/account/' + myCompanyId)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load SDK stats for the dirs', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/dirs?app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load SDK data flow for account or app', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/flow?app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load SDK grouped data flow for account or app', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/agg_flow?report_type=status_code&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load hits amount for top traffic properties for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/top_requests?report_type=country&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load users amount for top traffic properties for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/top_users?report_type=country&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load data sent for top traffic properties for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/top_gbt?report_type=country&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load distributions of top traffic properties for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/distributions?report_type=destination&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load list of the top SDK objects for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/top_objects?report_type=failed&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load list of the slowest SDK objects for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/top_objects/slowest?report_type=full&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load list of the SDK objects with 5XX codes, for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/top_objects/5xx?network=Cellular&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load  SDK FBT min, max, average histograms, separated by destination, for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/ab/fbt?network=WiFi&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load  SDK FBT value distribution histogram, separated by destination, for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/ab/fbt_distribution?network=WiFi&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load SDK errors graph, separated by destination, for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/ab/errors?network=WiFi&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load SDK requests processing speed data, separated by destination, for an account', function(done) {
    request(testAPIUrl)
      .get('/v1/stats/sdk/ab/speed?network=WiFi&app_id=' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should delete app with id', function(done) {
    request(testAPIUrl)
      .delete('/v1/apps/' + createdAppID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load domains', function(done) {
    request(testAPIUrl)
      .get('/v1/domain_configs')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should create domain config', function(done) {
    var dmnName = 'mydomain' + Date.now() + '.com';

    var createDomainJson = {
      domain_name : dmnName,
      account_id : myCompanyId,
      origin_host_header : dmnName,
      origin_server : dmnName,
      origin_server_location_id : firstMileID
    };

    request(testAPIUrl)
      .post('/v1/domain_configs')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .send(createDomainJson)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        createdDomainID = response_json.object_id;
        done();
      });
  });

  it('should load domain with id', function(done) {
    request(testAPIUrl)
      .get('/v1/domain_configs/' + createdDomainID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load domain versions', function(done) {
    request(testAPIUrl)
      .get('/v1/domain_configs/' + createdDomainID + '/versions')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should load domain config status', function(done) {
    request(testAPIUrl)
      .get('/v1/domain_configs/' + createdDomainID + '/config_status')
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });


  // NEGATIVE TESTS

  xit('should create an API key for access permissions tests', function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
      .send({account_id: createdAccountID})
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        createdROKeyID = response_json.object_id;
        createdROKey = response_json.key;
        done();
      });
  });

  xit('should update api key and set read only permission', function(done) {
    var updateKeyJson = {
      key_name : 'auth with api key',
      account_id : createdAccountID,
      domains : [],
      allowed_ops : {
        read_config : true,
        modify_config : true,
        delete_config : true,
        purge : true,
        reports : true,
        admin : true
      },
      read_only_status : true,
      active : true
    };

    request(testAPIUrl)
      .put('/v1/api_keys/' + createdROKeyID)
      .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
      .send(updateKeyJson)
      .expect(200, done);
  });

  it('should fail with empty key', function(done) {
    request(testAPIUrl)
      .get('/v1/domain_configs')
      .set('Authorization', 'X-API-KEY ' + '')
      .expect(401, done);
  });

  it('should fail with wrong key', function(done) {
    request(testAPIUrl)
      .get('/v1/domain_configs')
      .set('Authorization', 'X-API-KEY ' + createdApiKey + 'make-it-wrong')
      .expect(401, done);
  });

  it('should fail with key from another account', function(done) {
    request(testAPIUrl)
      .delete('/v1/domain_configs/' + createdDomainID)
      .set('Authorization', 'X-API-KEY ' + '571561119d12edc422fd4931')
      .expect(401, done);
  });

  it('should fail with key which has not RW permissions', function(done) {
    request(testAPIUrl)
      .delete('/v1/domain_configs/' + createdDomainID)
      .set('Authorization', 'X-API-KEY ' + createdROKey)
      .expect(401, done);
  });

  it('should delete domain with id', function(done) {
    request(testAPIUrl)
      .delete('/v1/domain_configs/' + createdDomainID)
      .set('Authorization', 'X-API-KEY ' + createdApiKey)
      .expect(200, done);
  });

  it('should delete test API key  ID' + createdKeyID, function(done) {
    request(testAPIUrl)
      .delete('/v1/api_keys/' + createdKeyID)
      .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
      .expect(200, done);
  });

  xit('should delete customer account with id ' + createdAccountID, function(done) {
    request(testAPIUrl)
      .delete('/v1/accounts/' + createdAccountID)
      .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
      .expect(200, done);
  });
});
