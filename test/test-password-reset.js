process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');

var express = require('express');
var fs = require('fs');
var https = require('https');
var sleep = require('sleep');
var crypto = require('crypto');
var utils = require('../lib/utilities.js');
var config = require('config');

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');
var testAPIUrlHTTP = ( process.env.API_QA_URL_HTTP ) ? process.env.API_QA_URL_HTTP : 'http://localhost:' + config.get('service.http_port');
var testAPIUrlExpected = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.http_port');

describe('Rev password reset API', function() {

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs',
  testDomain = 'qa-api-test-domain.revsw.net';  // this domain should exist in the QA environment


  var adminToken = '',
    jwtToken = ''.
    userCompanyId = '',
    testDomainId,
    domainConfigJson = {},
    resetToken = '',
    testUser = 'revswqa@gmail.com',
    notExistingUser = 'needtomakesure@thattheuserdoesnotexist.com',
    testUserGmailPass = 'revswqa1',
    testPass = crypto.randomBytes(5).toString('hex');


  it('should fail to authenticate the test user using the password we plan to set later', function(done) {

    request(testAPIUrl)
      .post('/v1/authenticate')
      .send( { email: testUser, password: testPass } )
      .expect(401)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('should return an error when triggering the password reset process for not-existing user', function(done) {
    request(testAPIUrl)
      .post('/v1/forgot')
      .send( { email: notExistingUser } )
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('No account with that email address exists');
        done();
      });
  });


  it('should trigger the password reset process for user ' + testUser, function(done) {
    request(testAPIUrl)
      .post('/v1/forgot')
      .send( { email: testUser } )
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.message.should.be.equal('An e-mail has been sent to ' + testUser + ' with further instructions');
        done();
      });
  });

  it('should receive to the Gmail account an email with password reset link', function(done) {

    this.timeout(20000);
    sleep.sleep(10);
    var inbox = require('inbox');
    var client = inbox.createConnection(false, 'imap.gmail.com', {
      secureConnection: true,
      auth: {
        user: testUser,
        pass: testUserGmailPass
      },
      debug: false
    });

    client.connect();

    client.on('connect', function() {
      client.openMailbox('INBOX', function(error, mailbox) {
        if (error) { throw error; }
        client.listMessages(-1, function(error, messages) {
          if (error) { throw error; }
          var uid = messages[0].UID;
          process.stdin.setEncoding('utf8');
          var messageStream = client.createMessageStream(uid);
          var readable = messageStream;
          readable.on('data', function(chunk) {
            var text = chunk.toString();

            var ytre = /(\b(https?|ftp|file):\/\/[\-A-Z0-9+&@#\/%?=~_|!:,.;]*[\-A-Z0-9+&@#\/%=~_|])/ig;
            var resultArray = text.match(ytre);
            var forgotlink;
            if (resultArray !== null) {
              for (var i = 0; i < resultArray.length; i++) {
                if (resultArray[i].indexOf('reset') + 1) {
                  forgotlink = resultArray[i];
                }
              }
              forgotlink.should.be.a.String();
              resetToken = forgotlink.split('/')[4];
              resetToken.should.be.a.String();
              done();
            }
          });
        });
      });
    });
  });

  it('should verify that received password reset token is valid', function(done) {
    console.log('resetToken = ' + resetToken);
    request(testAPIUrl)
      .get('/v1/reset/' + resetToken)
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.message.should.be.equal('The password reset token is valid');
        done();
      });
  });

  it('should set new password', function(done) {
    request(testAPIUrl)
      .post('/v1/reset/' + resetToken)
      .send( { password: testPass } )
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.message.should.be.equal('Your password has been changed');
        done();
      });
  });

  it('should verify that the new password is active for the test user', function(done) {

    request(testAPIUrl)
      .post('/v1/authenticate')
      .send( { email: testUser, password: testPass } )
      .expect(200)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        done();
      });
  });

  it('should verify that the password reset token is not valid anymore', function(done) {
    request(testAPIUrl)
      .get('/v1/reset/' + resetToken)
      .expect(400)
      .end(function(err, res) {
        if (err) {
          throw err;
        }
        var response_json = JSON.parse(res.text);
        response_json.statusCode.should.be.equal(400);
        response_json.error.should.be.equal('Bad Request');
        response_json.message.should.be.equal('The password reset token is invalid or has expired');
        done();
      });
  });

  it('should receive to the Gmail account a password change confirmation email', function(done) {

    this.timeout(20000);
    sleep.sleep(10);
    var inbox = require('inbox');
    var client = inbox.createConnection(false, 'imap.gmail.com', {
      secureConnection: true,
      auth: {
        user: testUser,
        pass: testUserGmailPass
      },
      debug: false
    });

    client.connect();

    client.on('connect', function() {
      client.openMailbox('INBOX', function(error, mailbox) {
        if (error) { throw error; }
        client.listMessages(-1, function(error, messages) {
          if (error) { throw error; }
          var uid = messages[0].UID;
          process.stdin.setEncoding('utf8');
          var messageStream = client.createMessageStream(uid);
          var readable = messageStream;
          readable.on('data', function(chunk) {
            var text = chunk.toString();
            var ytre = 'Your RevAPM Customer Portal password has been changed';
            var resultArray = text.match(ytre);
            resultArray.length.should.be.equal(1);
            done();
          });
        });
      });
    });
  });


});


