process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');

// var express = require('express');
// var fs = require('fs');
// var https = require('https');
// var sleep = require('sleep');
// var utils = require('../lib/utilities.js');
var config = require('config');

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithUserPermPassword = 'password1',
  qaUserWithAdminPerm = 'qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs',
  testDomainId = '5655668638f201be519f9d87',
  testDomain = 'portal-qa-domain.revsw.net';  // this domain should exist in the QA environment

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
var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');
var testAPIUrlHTTP = ( process.env.API_QA_URL_HTTP ) ? process.env.API_QA_URL_HTTP : 'http://localhost:' + config.get('service.http_port');
var testAPIUrlExpected = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.http_port');

describe('Rev stats top API', function() {

  this.timeout(10000);

  it('should allow a request for user with User role', function(done) {

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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .query({
            report_type: 'referer'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });


  it('should allow a request for user with Admin role', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithAdminPerm)
          .query({
            report_type: 'referer'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });


  it.skip('should allow a request for user with Reseller role', function(done) {
    request(testAPIUrl)
      .post('/v1/authenticate')
      .send(userAuthWithResellerPerm)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        var jwtTokenWithResellerPerm = response_json.token;
        response_json.token.should.be.a.String(jwtTokenWithResellerPerm);
        // TODO: check resselers`s permission for this testDomainId
        request(testAPIUrl)
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithResellerPerm)
          .query({
            report_type: 'referer'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });

      });
  });



  it('should fail if report_type is not set', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            done();
          });
      });
  });

  it('should fail if report_type is set to some junk value', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          // .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
          .query({
            report_type: 'referer233333333'
          })
          .expect(400)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            done();
          });
      });
  });

  it('should return data for report_type = referer', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .query({
            report_type: 'referer'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = status_code', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .query({
            report_type: 'status_code'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = cache_status', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .query({
            report_type: 'cache_status'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = content_type', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .query({
            report_type: 'content_type'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = protocol', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .query({
            report_type: 'protocol'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = http_protocol', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .query({
            report_type: 'http_protocol'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = http_method', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .query({
            report_type: 'http_method'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = content_encoding', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          .query({
            report_type: 'content_encoding'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = os', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          // .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
          .query({
            report_type: 'os'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = device', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          // .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
          .query({
            report_type: 'device'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

  it('should return data for report_type = country', function(done) {
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
          .get('/v1/stats/top/' + testDomainId)
          .set('Authorization', 'Bearer ' + jwtTokenWithUserPerm)
          // .auth(qaUserWithUserPerm, qaUserWithUserPermPassword)
          .query({
            report_type: 'country'
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              throw err;
            }
            var response_json = JSON.parse(res.text);
            response_json.metadata.domain_name.should.be.equal(testDomain.toLowerCase());
            response_json.metadata.domain_id.should.be.equal(testDomainId);
            done();
          });
      });
  });

});

