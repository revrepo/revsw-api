process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');
var async = require('async');

var fs = require('fs');
var https = require('https');
var sleep = require('sleep');
var config = require('config');

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
    qaUserWithUserPermPassword = 'password1',
    qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
    qaUserWithAdminPermPassword = 'password1',
    qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
    qaUserWithRevAdminPermPassword = 'password1',
    qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
    qaUserWithResellerPermPassword = 'password1',
    testDomainId = '5655668638f201be519f9d87',
    testDomain = 'portal-qa-domain.revsw.net';  // this domain should exist in the QA environment
    wrongUsername = 'wrong_username@revsw.com',
    wrongPassword = 'we5rsdfsdfs';

var userAuthWithUserPerm = {
  email: qaUserWithUserPerm,
  password: qaUserWithUserPermPassword
}
var userAuthWithAdminPerm = {
  email: qaUserWithAdminPerm,
  password: qaUserWithAdminPermPassword
}
var userAuthWithResellerPerm = {
  email: qaUserWithResellerPerm,
  password: qaUserWithResellerPermPassword
}
var userAuthWithRevAdminPerm = {
  email: qaUserWithRevAdminPerm,
  password: qaUserWithRevAdminPermPassword
}

  var testObjectDomain = 'qa-api-test-domain.revsw.net', // !!! Note Exists
      testObjectPath   = '/test-cache.js';

  var  purgeJson = {
    domainName: testObjectDomain,
    purges: [{
      url: {
       is_wildcard: true,
       expression: testObjectPath
      }
    }]
  };

  var proxyServers = [ 'testsjc20-bp01.revsw.net', 'testsjc20-bp02.revsw.net' ];

describe('Rev Purge API (RevAdmin role)', function() {

  this.timeout(10000);

  it('should return paginated data with purge jobs and domain_id', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithRevAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithRevAdminPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithRevAdminPerm);
        request(testAPIUrl)
          .get('/v1/purge')
          .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
          .query({
            domain_id: testDomainId
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.total.should.be.a.Number();
            response_json.data.should.be.a.Array();
            done();
          });
      });
  });
});


 describe('Rev Purge API', function() {

  var adminToken = '';
  var userToken = '';
  var userCompanyId = '';
  var domainConfigJson = {};
  var purgeRequestID = '';

  this.timeout(10000);

  it('should fail to submit a purge request as user with "user" role', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithUserPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithUserPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithUserPerm);

        request(testAPIUrl)
          .post('/v1/purge')
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .send(purgeJson)
          .expect(403)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.error.should.be.equal('Forbidden');
            response_json.message.should.startWith('Insufficient scope');
            done();
          });
      });

  });


  it('should fail to submit a purge request with non-existing domain', function(done) {
    var purgeJson = {
      domainName: 'domain-which-should-not-exist-in-the-system.revsw.net',
      purges: [{
        url: {
          is_wildcard: true,
          expression: '/test-cache.js'
        }
      }]
    };

    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithAdminPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithAdminPerm);
        request(testAPIUrl)
          .post('/v1/purge')
          .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
          .send(purgeJson)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.error.should.be.equal('Bad Request');
            response_json.message.should.be.equal('Domain not found');
            done();
          });
      });
  });



  it('should fail to submit a purge request using malformed JSON purge object', function(done) {
    var purgeJson = {
      domainName: 'test-proxy-cache-config.revsw.net',
      purges: [{
        url: {
          is_wildcard: true,
          expression: '/test-cache.js',
          blahblah: 'yahh'
        }
      }]
    };
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithAdminPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithAdminPerm);
        request(testAPIUrl)
          .post('/v1/purge')
          .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
          .send(purgeJson)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.error.should.be.equal('Bad Request');
            response_json.message.should.be
              .equal('child "purges" fails because ["purges" at position 0 fails because ' +
                '[child "url" fails because ["blahblah" is not allowed]]]');
            done();
          });
      });
  });

  // TODO: Check logic
  it.skip('should have the test object cached on QA proxy servers', function(done) {

    async.series( [

      // hit the test object the first time to get it cached
      function (cb) { request('http://' + proxyServers[0])
        .get(testObjectPath)
        .set('Host', testObjectDomain)
        .expect(200, cb); },

        // hit the test object the second time to confirm that it is cached
      function (cb) { request('http://' + proxyServers[0])
        .get(testObjectPath)
        .set('Host', testObjectDomain)
        .expect('X-Rev-Cache', 'HIT')
        .expect(200, cb); },
      // hit the test object the first time to get it cached
      function (cb) { request('http://' + proxyServers[1])
        .get(testObjectPath)
        .set('Host', testObjectDomain)
        .expect(200, cb); },

        // hit the test object the second time to confirm that it is cached
      function (cb) { request('http://' + proxyServers[1])
        .get(testObjectPath)
        .set('Host', testObjectDomain)
        .expect('X-Rev-Cache', 'HIT')
        .expect(200, cb); }
    ], done);

  });


  it('should submit a purge request', function(done) {
    var purgeJson = {
      domainName:  testDomain,
      purges: [{
        url: {
          is_wildcard: true,
          expression: '/test-cache.js'
        }
      }]
    };
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithRevAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithRevAdminPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithRevAdminPerm);
        request(testAPIUrl)
          .post('/v1/purge')
          .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
          .send(purgeJson)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.statusCode.should.be.equal(200);
            response_json.message.should.be.equal('The purge request has been successfully queued');
            response_json.request_id.should.be.a.String();
            purgeRequestID = response_json.request_id;
            done();
          });
      });
  });


  it('should find a new record about purge data in logger', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithRevAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithRevAdminPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithRevAdminPerm);
        request(testAPIUrl)
          .get('/v1/activity')
          .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
          .expect(200)
          .end(function(err, res) {

            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            var last_obj = response_json.data[1];
            last_obj.activity_type.should.be.equal('purge');
            last_obj.activity_target.should.be.equal('domain');
            done();
          });
      });
  });

  it.skip('should sleep for 3 seconds and see that the test object is purged on the test proxy servers', function(done) {
    this.timeout(20000);

    setTimeout(function () {

    async.series( [

      // hit the test object the first time to get it cached
      function (cb) { request('http://' + proxyServers[0])
        .get(testObjectPath)
        .set('Host', testObjectDomain)
        .expect('X-Rev-Cache', 'MISS')
        .expect(200, cb); },

        // hit the test object the second time to confirm that it is cached
      function (cb) { request('http://' + proxyServers[0])
        .get(testObjectPath)
        .set('Host', testObjectDomain)
        .expect('X-Rev-Cache', 'HIT')
        .expect(200, cb); },
      // hit the test object the first time to get it cached
      function (cb) { request('http://' + proxyServers[1])
        .get(testObjectPath)
        .set('Host', testObjectDomain)
        .expect('X-Rev-Cache', 'MISS')
        .expect(200, cb); },

        // hit the test object the second time to confirm that it is cached
      function (cb) { request('http://' + proxyServers[1])
        .get(testObjectPath)
        .set('Host', testObjectDomain)
        .expect('X-Rev-Cache', 'HIT')
        .expect(200, cb); }
    ], done);

    }, 3000);

  });

  it('should read the status of purge job and make sure it is "Success"', function(done) {
    this.timeout(50000);
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithRevAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithRevAdminPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithRevAdminPerm);
        sleep.sleep(25);
        request(testAPIUrl)
          .get('/v1/purge/' + purgeRequestID)
          .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.statusCode.should.be.equal(200);
            response_json.message.should.be.equal('Success');
            done();
          });
      });
  });

  it('should receive an error on short request ID', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithRevAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithRevAdminPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithRevAdminPerm);
        request(testAPIUrl)
          .get('/v1/purge/24qwerasfasdfsdfsdf')
          .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.statusCode.should.be.equal(400);
            response_json.error.should.be.equal('Bad Request');
            response_json.message.should.be.equal('child \"request_id\" fails because [\"request_id\" with value ' +
              '\"24qwerasfasdfsdfsdf\" fails to match the required pattern: ' +
              '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/]');
            done();
          });
      });
  });


  it('should receive an error on not existing ID', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithRevAdminPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithRevAdminPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithRevAdminPerm);
        request(testAPIUrl)
          .get('/v1/purge/be5e3430-3670-11e5-a98b-25bd5958e027')
          .set('Authorization', 'Bearer ' + jwtTokenWithRevAdminPerm)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.statusCode.should.be.equal(400);
            response_json.error.should.be.equal('Bad Request');
            response_json.message.should.be.equal('Purge job ID not found');
            done();
          });
      });
  });

});

