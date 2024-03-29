/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 */

/*jslint node: true */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var request     = require('supertest');
var should      = require('should-http');
var AuditLogger = require('../lib/audit');

var config = require('config');

var qaUserWithUserPerm         = 'qa_user_with_user_perm@revsw.com',
    qaUserWithUserPermPassword = 'password1';
var qaUserWithAdminPerm         = 'api_qa_user_with_admin_perm@revsw.com',
    qaUserWithAdminPermPassword = 'password1';
var wrongUser         = 'test@test.com',
    wrongUserPassword = 'test123456';

var userAuthWithUserPerm = {
  email: qaUserWithUserPerm,
  password: qaUserWithUserPermPassword
};

var wrongUserAuth = {
  email: qaUserWithUserPerm,
  password: qaUserWithUserPermPassword
};


var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' +
  config.get('service.https_port');
console.log(testAPIUrl);
describe('Rev API /v1/activity call', function() {

  this.timeout(10000);

  var userId          = '55a45491bf0020ec6da33298';
  var otherId         = '55e54267cb1e8d093f575adf';
  var companyId       = '5588869fbde7a0d00338ce8f';
  var wrongUserId     = 'dde2d2313121111111111111';
  var userNotFound    = 'User ID not found';
  var companyNotFound = 'Account ID not found';

  var jwtTokenWithUserPerm = '';

  before(function(done){
      request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithUserPerm )
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

  it('Should return 401 fail for auth method', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .auth(wrongUser, wrongUserPassword)
      .expect(401)
      .end(function(err) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('Should return 400 fail for not exist token', function(done) {
    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer notcorrecttokennotcorrecttokennotcorrecttoken' )
      .expect(400)
      .end(function(err) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('Should return error 400 (User not found)', function(done) {
    var getParams  = '?user_id='+wrongUserId;

    request(testAPIUrl)
      .get('/v1/activity'+getParams)
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(userNotFound);
        done();
      });
  });

  it('Should return user detailed activity log (without params)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.data.should.be.a.Array();

        for(var key in response_json.data) {
          response_json.data[key].should.have.property('user_id').be.a.String();
          response_json.data[key].should.have.property('user_name').be.a.String();
          response_json.data[key].should.have.property('user_type').be.a.String();
          response_json.data[key].should.have.property('datetime').be.a.Number();
          response_json.data[key].should.have.property('account_id').be.a.String();
          response_json.data[key].should.have.property('activity_type').be.a.String();
          response_json.data[key].should.have.property('activity_target').be.a.String();
          response_json.data[key].should.have.property('target_name').be.a.String();
          response_json.data[key].should.have.property('target_id').be.a.String();
          response_json.data[key].should.have.property('operation_status').be.a.String();
          response_json.data[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

  it('Should return error 400 (Other exist user_id with user permissions - User not found)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .query({ user_id : otherId })
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(userNotFound);
        done();
      });
  });

  xit('Should return user detailed activity log (Other exist user_id with admin/resseler permissions)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .query({ user_id : otherId })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.data.should.be.a.Array();

        for(var key in response_json.data) {
          response_json.data[key].should.have.property('user_id').be.a.String();
          response_json.data[key].should.have.property('user_name').be.a.String();
          response_json.data[key].should.have.property('user_type').be.a.String();
          response_json.data[key].should.have.property('datetime').be.a.Number();
          response_json.data[key].should.have.property('account_id').be.a.String();
          response_json.data[key].should.have.property('activity_type').be.a.String();
          response_json.data[key].should.have.property('activity_target').be.a.String();
          response_json.data[key].should.have.property('target_name').be.a.String();
          response_json.data[key].should.have.property('target_id').be.a.String();
          response_json.data[key].should.have.property('operation_status').be.a.String();
          response_json.data[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

  it('Should return user detailed activity log (with user_id)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .query({ user_id : userId })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.data.should.be.a.Array();

        for(var key in response_json.data) {
          response_json.data[key].should.have.property('user_id').be.a.String();
          response_json.data[key].should.have.property('user_name').be.a.String();
          response_json.data[key].should.have.property('user_type').be.a.String();
          response_json.data[key].should.have.property('datetime').be.a.Number();
          response_json.data[key].should.have.property('account_id').be.a.String();
          response_json.data[key].should.have.property('activity_type').be.a.String();
          response_json.data[key].should.have.property('activity_target').be.a.String();
          response_json.data[key].should.have.property('target_name').be.a.String();
          response_json.data[key].should.have.property('target_id').be.a.String();
          response_json.data[key].should.have.property('operation_status').be.a.String();
          response_json.data[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

  it('Should return user detailed activity log (with account_id)', function(done) {
    this.timeout(30000);

    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .query({ account_id : companyId })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.data.should.be.a.Array();

        for(var key in response_json.data) {
          response_json.data[key].should.have.property('user_id').be.a.String();
          response_json.data[key].should.have.property('user_name').be.a.String();
          response_json.data[key].should.have.property('user_type').be.a.String();
          response_json.data[key].should.have.property('datetime').be.a.Number();
          response_json.data[key].should.have.property('account_id').be.a.String();
          response_json.data[key].should.have.property('activity_type').be.a.String();
          response_json.data[key].should.have.property('activity_target').be.a.String();
          response_json.data[key].should.have.property('target_name').be.a.String();
          console.log('response_json.data[key].target_id = ' + (response_json.data[key].target_id));
          response_json.data[key].should.have.property('target_id').be.a.String();
          response_json.data[key].should.have.property('operation_status').be.a.String();
          response_json.data[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

  it('Should return error 400 (With user_id and wrong account_id - Company not found)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(400)
      .query({ user_id : userId, account_id : '5588869fbde7a0d00338ce6f' })
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(companyNotFound);
        done();
      });
  });

  it('Should return user detailed activity log (with user_id and account_id)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(200)
      .query({ user_id : userId, account_id : companyId })
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.data.should.be.a.Array();

        for(var key in response_json.data) {
          response_json.data[key].should.have.property('user_id').be.a.String();
          response_json.data[key].should.have.property('user_name').be.a.String();
          response_json.data[key].should.have.property('user_type').be.a.String();
          response_json.data[key].should.have.property('datetime').be.a.Number();
          response_json.data[key].should.have.property('account_id').be.a.String();
          response_json.data[key].should.have.property('activity_type').be.a.String();
          response_json.data[key].should.have.property('activity_target').be.a.String();
          response_json.data[key].should.have.property('target_name').be.a.String();
          response_json.data[key].should.have.property('target_id').be.a.String();
          response_json.data[key].should.have.property('operation_status').be.a.String();
          response_json.data[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

});


describe('Rev API /v1/activity/summary call', function() {

  this.timeout(10000);

  var userId          = '55a45491bf0020ec6da33298';
  var otherId         = '5601fda1f68c387c76544120';
  var companyId       = '5588869fbde7a0d00338ce8f';
  var wrongUserId     = 'dde2d2313121111111111111';
  var userNotFound    = 'User ID not found';
  var companyNotFound = 'Account ID not found';

  var jwtTokenWithUserPerm = '';

  before(function(done){
      request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithUserPerm )
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

  it('Should return 401 fail ', function(done) {
    request(testAPIUrl)
      .get('/v1/activity/summary')
      .set('Authorization', 'Bearer ' + 'notcorrecttoken.notcorrecttoken.notcorrecttoken')
      .expect(401)
      .end(function(err) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('Should return error 400 (User not found)', function(done) {
    request(testAPIUrl)
      .get('/v1/activity/summary')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .query({ user_id : wrongUserId })
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(userNotFound);
        done();
      });
  });

  it('Should return user summary activity log (without params)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity/summary')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);

        response_json.should.have.property('metadata').be.a.Object();
        response_json.should.have.property('data').be.a.Array();
        done();
      });
  });

  it('Should return error 400 (Other exist user_id with user permissions - User not found)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity/summary')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .query({ user_id : otherId })
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(userNotFound);
        done();
      });
  });

  xit('Should return user summary activity log (Other exist user_id with admin/resseler permissions)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity/summary')
      .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
      .query({ user_id : otherId })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);

        response_json.should.have.property('metadata').be.a.Object();
        response_json.should.have.property('data').be.a.Array();
        done();
      });
  });

  it('Should return user activity log (with user_id)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity/summary')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .query({ user_id : userId })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);

        response_json.should.have.property('metadata').be.a.Object();
        response_json.should.have.property('data').be.a.Array();
        done();
      });
  });

  it('Should return user summary activity log (with account_id)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity/summary')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .query({ account_id : companyId })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);

        response_json.should.have.property('metadata').be.a.Object();
        response_json.should.have.property('data').be.a.Array();
        done();
      });
  });

  xit('Should return error 400 (With user_id and wrong account_id - Company not found)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity/summary')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .query({ user_id : userId, account_id : '5588869fbde7a0d00338ce6f' })
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(companyNotFound);
        done();
      });
  });

  it('Should return user summary activity log (with user_id and account_id)', function(done) {

    request(testAPIUrl)
      .get('/v1/activity/summary')
      .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
      .query({ user_id : userId, account_id : companyId })
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);

        response_json.should.have.property('metadata').be.a.Object();
        response_json.should.have.property('data').be.a.Array();
        done();
      });
  });

});
