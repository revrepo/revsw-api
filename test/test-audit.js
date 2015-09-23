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

var request = require('supertest');
var should  = require('should-http');

var config = require('config');

var qaUserWithUserPerm         = 'qa_user_with_user_perm@revsw.com',
    qaUserWithUserPermPassword = 'password1';
var qaUserWithAdminPerm         = 'api_qa_user_with_admin_perm@revsw.com',
    qaUserWithAdminPermPassword = 'password1';
var wrongUser         = 'test@test.com',
    wrongUserPassword = 'test123456';

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');

describe('Rev API /v1/activity call', function() {

  var userId          = '55a45491bf0020ec6da33298';
  var otherId         = '5601fda1f68c387c76544120';
  var companyId       = '5588869fbde7a0d00338ce8f';
  var wrongUserId     = 'dde2d231312';
  var userNotFound    = 'User not found';
  var companyNotFound = 'Company not found';

  it('should return 401 fail', function(done) {
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

  it('Should return error 404 (User not found)', function(done) {
    var getParams  = '?user_id='+wrongUserId;

    request(testAPIUrl)
      .get('/v1/activity'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(404)
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
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.a.Array();
        for(var key in response_json) {
          response_json[key].should.have.property('user_id').be.a.String();
          response_json[key].should.have.property('user_name').be.a.String();
          response_json[key].should.have.property('user_type').be.a.String();
          response_json[key].should.have.property('domain_id').be.a.Array();
          response_json[key].should.have.property('datetime').be.a.Number();
          response_json[key].should.have.property('account_id').be.a.Array();
          response_json[key].should.have.property('activity_type').be.a.String();
          response_json[key].should.have.property('activity_target').be.a.String();
          response_json[key].should.have.property('target_name').be.a.String();
          response_json[key].should.have.property('target_id').be.a.String();
          response_json[key].should.have.property('operation_status').be.a.String();
          response_json[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

  it('Should return error 404 (Other exist user_id with user permissions - User not found)', function(done) {
    var getParams  = '?user_id='+otherId;

    request(testAPIUrl)
      .get('/v1/activity'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(404)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(userNotFound);
        done();
      });
  });

  it('Should return user detailed activity log (Other exist user_id with admin/resseler permissions)', function(done) {
    var getParams  = '?user_id='+otherId;

    request(testAPIUrl)
      .get('/v1/activity'+getParams)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.a.Array();
        for(var key in response_json) {
          response_json[key].should.have.property('user_id').be.a.String();
          response_json[key].should.have.property('user_name').be.a.String();
          response_json[key].should.have.property('user_type').be.a.String();
          response_json[key].should.have.property('domain_id').be.a.Array();
          response_json[key].should.have.property('datetime').be.a.Number();
          response_json[key].should.have.property('account_id').be.a.Array();
          response_json[key].should.have.property('activity_type').be.a.String();
          response_json[key].should.have.property('activity_target').be.a.String();
          response_json[key].should.have.property('target_name').be.a.String();
          response_json[key].should.have.property('target_id').be.a.String();
          response_json[key].should.have.property('operation_status').be.a.String();
          response_json[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

  it('Should return user detailed activity log (with user_id)', function(done) {
    var getParams = '?user_id='+userId;

    request(testAPIUrl)
      .get('/v1/activity'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.a.Array();
        for(var key in response_json) {
          response_json[key].should.have.property('user_id').be.a.String();
          response_json[key].should.have.property('user_name').be.a.String();
          response_json[key].should.have.property('user_type').be.a.String();
          response_json[key].should.have.property('domain_id').be.a.Array();
          response_json[key].should.have.property('datetime').be.a.Number();
          response_json[key].should.have.property('account_id').be.a.Array();
          response_json[key].should.have.property('activity_type').be.a.String();
          response_json[key].should.have.property('activity_target').be.a.String();
          response_json[key].should.have.property('target_name').be.a.String();
          response_json[key].should.have.property('target_id').be.a.String();
          response_json[key].should.have.property('operation_status').be.a.String();
          response_json[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

  it('Should return user detailed activity log (with company_id)', function(done) {
    var getParams = '?company_id='+companyId;

    request(testAPIUrl)
      .get('/v1/activity'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.a.Array();
        for(var key in response_json) {
          response_json[key].should.have.property('user_id').be.a.String();
          response_json[key].should.have.property('user_name').be.a.String();
          response_json[key].should.have.property('user_type').be.a.String();
          response_json[key].should.have.property('domain_id').be.a.Array();
          response_json[key].should.have.property('datetime').be.a.Number();
          response_json[key].should.have.property('account_id').be.a.Array();
          response_json[key].should.have.property('activity_type').be.a.String();
          response_json[key].should.have.property('activity_target').be.a.String();
          response_json[key].should.have.property('target_name').be.a.String();
          response_json[key].should.have.property('target_id').be.a.String();
          response_json[key].should.have.property('operation_status').be.a.String();
          response_json[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

  it('Should return error 404 (With user_id and wrong company_id - Company not found)', function(done) {
    var badCompanyId = '5588869fbde7a0d00338ce6f';
    var getParams    = '?user_id='+userId+'&company_id='+badCompanyId;

    request(testAPIUrl)
      .get('/v1/activity'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(404)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(companyNotFound);
        done();
      });
  });

  it('Should return user detailed activity log (with user_id and company_id)', function(done) {
    var getParams = '?user_id='+userId+'&company_id='+companyId;

    request(testAPIUrl)
      .get('/v1/activity'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.a.Array();
        for(var key in response_json) {
          response_json[key].should.have.property('user_id').be.a.String();
          response_json[key].should.have.property('user_name').be.a.String();
          response_json[key].should.have.property('user_type').be.a.String();
          response_json[key].should.have.property('domain_id').be.a.Array();
          response_json[key].should.have.property('datetime').be.a.Number();
          response_json[key].should.have.property('account_id').be.a.Array();
          response_json[key].should.have.property('activity_type').be.a.String();
          response_json[key].should.have.property('activity_target').be.a.String();
          response_json[key].should.have.property('target_name').be.a.String();
          response_json[key].should.have.property('target_id').be.a.String();
          response_json[key].should.have.property('operation_status').be.a.String();
          response_json[key].should.have.property('target_object').be.a.Object();
        }
        done();
      });
  });

});


describe('Rev API /v1/activity/summary call', function() {

  var userId          = '55a45491bf0020ec6da33298';
  var otherId         = '5601fda1f68c387c76544120';
  var companyId       = '5588869fbde7a0d00338ce8f';
  var wrongUserId     = 'dde2d231312';
  var userNotFound    = 'User not found';
  var companyNotFound = 'Company not found';

  it('should return 401 fail', function(done) {
    request(testAPIUrl)
      .get('/v1/activity/summary')
      .auth(wrongUser, wrongUserPassword)
      .expect(401)
      .end(function(err) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('Should return error 404 (User not found)', function(done) {
    var getParams  = '?user_id='+wrongUserId;

    request(testAPIUrl)
      .get('/v1/activity/summary'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(404)
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
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.a.Array();
        for(var key in response_json) {
          response_json[key].should.have.property('metadata').be.a.Object();
          response_json[key].should.have.property('data').be.a.Object();
        }
        done();
      });
  });

  it('Should return error 404 (Other exist user_id with user permissions - User not found)', function(done) {
    var getParams  = '?user_id='+otherId;

    request(testAPIUrl)
      .get('/v1/activity/summary'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(404)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(userNotFound);
        done();
      });
  });

  it('Should return user summary activity log (Other exist user_id with admin/resseler permissions)', function(done) {
    var getParams  = '?user_id='+otherId;

    request(testAPIUrl)
      .get('/v1/activity/summary'+getParams)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.a.Array();
        for(var key in response_json) {
          response_json[key].should.have.property('metadata').be.a.Object();
          response_json[key].should.have.property('data').be.a.Object();
        }
        done();
      });
  });

  it('Should return user activity log (with user_id)', function(done) {
    var getParams = '?user_id='+userId;

    request(testAPIUrl)
      .get('/v1/activity/summary'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        for(var key in response_json) {
          response_json[key].should.have.property('metadata').be.a.Object();
          response_json[key].should.have.property('data').be.a.Object();
        }
        done();
      });
  });

  it('Should return user summary activity log (with company_id)', function(done) {
    var getParams = '?company_id='+companyId;

    request(testAPIUrl)
      .get('/v1/activity/summary'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.a.Array();
        for(var key in response_json) {
          response_json[key].should.have.property('metadata').be.a.Object();
          response_json[key].should.have.property('data').be.a.Object();
        }
        done();
      });
  });

  it('Should return error 404 (With user_id and wrong company_id - Company not found)', function(done) {
    var badCompanyId = '5588869fbde7a0d00338ce6f';
    var getParams    = '?user_id='+userId+'&company_id='+badCompanyId;

    request(testAPIUrl)
      .get('/v1/activity/summary'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(404)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        res.body.message.should.be.equal(companyNotFound);
        done();
      });
  });

  it('Should return user summary activity log (with user_id and company_id)', function(done) {
    var getParams = '?user_id='+userId+'&company_id='+companyId;

    request(testAPIUrl)
      .get('/v1/activity/summary'+getParams)
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.should.be.a.Array();
        for(var key in response_json) {
          response_json[key].should.have.property('metadata').be.a.Object();
          response_json[key].should.have.property('data').be.a.Object();
        }
        done();
      });
  });

});
