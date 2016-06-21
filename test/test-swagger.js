process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');

var https = require('https');
var sleep = require('sleep');
var config = require('config');

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');
var testAPIUrlHTTP = ( process.env.API_QA_URL_HTTP ) ? process.env.API_QA_URL_HTTP : 'http://localhost:' + config.get('service.http_port');
var testAPIUrlExpected = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.http_port');


describe('Rev API Swagger UI', function() {

  this.timeout(10000);

  it('should redirect to HTTPS with 301 when sending HTTP request to /', function(done) {
    request(testAPIUrlHTTP)
      .get('/')
      .expect(301)
      .expect('Location', testAPIUrlExpected + '/')
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('should return a page when requested from "/" path', function(done) {
    request(testAPIUrl)
      .get('/')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('should return an object when requested from "/docs/swaggerui/css/highlight.default.css" path', function(done) {
    request(testAPIUrl)
      .get('/docs/swaggerui/css/highlight.default.css')
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

});


