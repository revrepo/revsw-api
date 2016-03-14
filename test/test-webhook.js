var request = require('supertest');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');
var mongoose    = require('mongoose');
var express = require('express');
var fs = require('fs');
var https = require('https');
var sleep = require('sleep');
var utils = require('../lib/utilities.js');
var config = require('config');
var _ = require('lodash');

var qaUserWithUserPerm = 'qa_user_with_user_perm@revsw.com',
  qaUserWithUserPermPassword = 'password1',
  qaUserWithAdminPerm = 'api_qa_user_with_admin_perm@revsw.com',
  qaUserWithAdminPermPassword = 'password1',
  qaUserWithRevAdminPerm = 'qa_user_with_rev-admin_perm@revsw.com',
  qaUserWithResellerPerm = 'api_qa_user_with_reseller_perm@revsw.com',
  qaUserWithResellerPermPassword = 'password1',
  wrongUsername = 'wrong_username@revsw.com',
  wrongPassword = 'we5rsdfsdfs',
  testDomain = 'qa-api-test-domain.revsw.net';  // this domain should exist in the QA environment

var testAPIUrl = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.https_port');
var testAPIUrlHTTP = ( process.env.API_QA_URL_HTTP ) ? process.env.API_QA_URL_HTTP : 'http://localhost:' + config.get('service.http_port');
var testAPIUrlExpected = ( process.env.API_QA_URL ) ? process.env.API_QA_URL : 'https://localhost:' + config.get('service.http_port');
var User = require('../models/User');
var BillingPlan = require('../models/BillingPlan');
var Company = require('../models/Account');
var mongoConnection = require('../lib/mongoConnections');
var company = new Company(mongoose, mongoConnection.getConnectionPortal());
var users = new User(mongoose, mongoConnection.getConnectionPortal());
var product = require('../lib/chargify.js').Product;
xdescribe('Chargify webhook', function () {
  it('should activate a test webhook', function (done) {

    request('https://localhost:8000')
      .post('/webhooks/chargify')
      .set('X-Chargify-Webhook-Id', 'testid')
      .set('X-Chargify-Webhook-Signature-Hmac-Sha-256', '19826d51b9f866b26eda1f154de192593360f8d0bcb63df8a28540a5dcf733f1')
      .type('form')
      .send('payload[chargify]=testing&event=test')
      .expect(200, function (err, res) {
        if (err) {
          throw err;
        }
        console.log(res.body);
        /*        res.body.forEach(function (doc) {
         console.log(doc.name);
         console.log(doc.chargify_handle);
         console.log(doc.id);
         console.log(doc.hosted_page);
         });*/
        done();
      });
  });

});

