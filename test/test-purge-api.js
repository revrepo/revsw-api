process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');
var async = require('async');

var express = require('express');
var fs = require('fs');
var https = require('https');
var sleep = require('sleep');

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:8000';

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithUserPermPassword = 'password1',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs';

  testObjectDomain = 'qa-api-test-domain.revsw.net';
  testObjectPath = '/test-cache.js';

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


describe('Rev Purge API', function() {

  var adminToken = '';
  var userToken = '';
  var userCompanyId = '';
  var domainConfigJson = {};
  var purgeRequestID = '';


  it('should fail to submit a purge request as user with "user" role', function(done) {
    request(testAPIUrl)
      .post('/v1/purge')
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
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

  it('should fail to submit a purge request with non-existing domain', function(done) {
    var  purgeJson = {
      domainName: 'domain-which-should-not-exist-in-the-system.revsw.net',
      purges: [{
        url: {
          is_wildcard: true,
          expression: '/test-cache.js'
        }
      }]
    };
    request(testAPIUrl)
      .post('/v1/purge')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
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

  it('should fail to submit a purge request using malformed JSON purge object', function(done) {
    var  purgeJson = {
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
      .post('/v1/purge')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send(purgeJson)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be
          .equal('child "purges" fails because ["purges" at position 0 fails because [child "url" fails because ["blahblah" is not allowed]]]');
        done();
      });
  });


  it('should have the test object cached on QA proxy servers', function(done) {

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
    var  purgeJson = {
      domainName: 'qa-api-test-domain.revsw.net',
      purges: [{
        url: {
          is_wildcard: true,
          expression: '/test-cache.js'
        }
      }]
    };

    request(testAPIUrl)
      .post('/v1/purge')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
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
        console.log('Request ID = ', purgeRequestID);
        done();
      });
  });


  it('should sleep for 3 seconds and see that the test object is purged on the test proxy servers', function(done) {
    this.timeout(10000);

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
    request(testAPIUrl)
      .get('/v1/purge/' + purgeRequestID)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
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

  it('should receive an error on short request ID', function(done) {
    request(testAPIUrl)
      .get('/v1/purge/24qwerasfasdfsdfsdf')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('child \"request_id\" fails because [\"request_id\" length must be 36 characters long]');
        done();
      });
  });


  it('should receive an error on not existing ID', function(done) {
    request(testAPIUrl)
      .get('/v1/purge/be5e3430-3670-11e5-a98b-25bd5958e027')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
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


xdescribe('Rev Purge old API', function() {

  var adminToken = '';
  var userToken = '';
  var userCompanyId = '';
  var domainConfigJson = {};
  var purgeRequestID = '';


  it('should fail to submit a purge request as user with "user" role', function(done) {
    request(testAPIUrl)
      .post('/purge')
      .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
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

  it('should fail to submit a purge request with non-existing domain', function(done) {
    var  purgeJson = {
      domainName: 'domain-which-should-not-exist-in-the-system.revsw.net',
      purges: [{
        url: {
          is_wildcard: true,
          expression: '/test-cache.js'
        }
      }]
    };
    request(testAPIUrl)
      .post('/purge')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
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

  it('should fail to submit a purge request using malformed JSON purge object', function(done) {
    var  purgeJson = {
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
      .post('/purge')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send(purgeJson)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be
          .equal('child "purges" fails because ["purges" at position 0 fails because [child "url" fails because ["blahblah" is not allowed]]]');
        done();
      });
  });


  it('should have the test object cached on QA proxy servers', function(done) {

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
    var  purgeJson = {
      domainName: 'qa-api-test-domain.revsw.net',
      purges: [{
        url: {
          is_wildcard: true,
          expression: '/test-cache.js'
        }
      }]
    };

    request(testAPIUrl)
      .post('/purge')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send(purgeJson)
      .expect(202)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.status.should.be.equal(202);
        response_json.message.should.be.equal('The purge request has been successfully queued');
        response_json.request_id.should.be.a.String();
        purgeRequestID = response_json.request_id;
        console.log('Request ID = ', purgeRequestID);
        done();
      });
  });


  it('should sleep for 3 seconds and see that the test object is purged on the test proxy servers', function(done) {
    this.timeout(10000);

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

  it('should read the status of purge job and make sure it is "success"', function(done) {
    request(testAPIUrl)
      .post('/checkStatus')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send( { req_id : purgeRequestID } )
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.status.should.be.equal(200);
        response_json.message.should.be.equal('Purge Successful');
        done();
      });
  });

  it('should receive an error on short request ID', function(done) {
    request(testAPIUrl)
      .post('/checkStatus')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send( { req_id: '234234234234234234234a' } )
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('child \"req_id\" fails because [\"req_id\" length must be 36 characters long]');
        done();
      });
  });


  it('should receive an error on not existing ID', function(done) {
    request(testAPIUrl)
      .post('/checkStatus')
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .send( { req_id: 'be5e3430-3670-11e5-a98b-25bd5958e027' } )
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




