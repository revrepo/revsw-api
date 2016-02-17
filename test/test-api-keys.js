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

describe('Rev API keys', function() {

  this.timeout(10000);

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
  var createdAPIKeyId;
  var testDomain = 'qa-api-test-proxy-nginx-custom-commands.revsw.net';
  var testDomainId;

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

  it('should get a domains list as user with admin permissions', function(done) {
    request(testAPIUrl)
      .get('/v1/domain_configs')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
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
          if (response_json[i].domain_name === testDomain) {
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
      .auth(testUser, testPassword)
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
      .auth(testUser, testPassword)
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
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .send({account_id: myCompanyId})
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw');
        done();
      });
  });

  it('should create an API key for the company' + testUser, function(done) {
    request(testAPIUrl)
      .post('/v1/api_keys')
      .auth(testUser, testPassword)
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
      .auth(testUser, testPassword)
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
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin,reseller,revadmin');
        done();
      });
  });

  it('should fail to return the API key with wrong password', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys/' + createdAPIKeyId)
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
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin,reseller,revadmin');
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

  xit('should return a list of API keys for the company', function(done) {
    request(testAPIUrl)
      .get('/v1/api_keys')
      .auth(testUser, testPassword)
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
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw');
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
      .auth(testUser, testPassword)
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
      .auth(testUser, testPassword)
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
      .auth(testUser, testPassword)
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
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw');
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
      .auth(testUser, testPassword)
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
      .auth(testUser, testPassword)
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
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw');
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
      .auth(testUser, testPassword)
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
      .auth(testUser, testPassword)
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
      .auth(testUser, testPassword)
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
      .expect(403)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(403);
        response_json.error.should.be.equal('Forbidden');
        response_json.message.should.be.equal('Insufficient scope, expected any of: admin_rw,reseller_rw,revadmin_rw');
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
      .auth(testUser, testPassword)
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
      .auth(testUser, testPassword)
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
