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
describe('Chargify webhook', function () {
  it('should activate a signup webhook', function (done) {

    var eventJSON =
    {
      "event": "signup_success",
      "id": "5",
      "payload": {
        "subscription": {
          "cancellation_message": "",
          "customer": {
            "last_name": "Doe",
            "reference": "",
            "phone": "555-555-1234",
            "first_name": "John",
            "zip": "12345",
            "address_2": "Apt 123",
            "address": "123 Main St",
            "state": "NC",
            "updated_at": "2012-09-09 11:38:32 -0400",
            "created_at": "2012-09-09 11:38:32 -0400",
            "organization": "Acme, Inc.",
            "id": "",
            "email": "testsignup-not-verified@revsw.com",
            "country": "US",
            "city": "Pleasantville"
          },
          "trial_started_at": "",
          "product": {
            "handle": "5_domains",
            "expiration_interval_unit": "never",
            "archived_at": "",
            "interval_unit": "month",
            "product_family": {
              "handle": "acme-online",
              "accounting_code": "",
              "name": "Acme Online",
              "id": "4",
              "description": "",
              "version_number": 1
            },
            "accounting_code": "",
            "price_in_cents": "9900",
            "expiration_interval": "",
            "name": "Pro",
            "trial_interval_unit": "month",
            "interval": "1",
            "return_params": "",
            "updated_at": "2012-09-09 11:36:53 -0400",
            "created_at": "2012-09-06 10:09:35 -0400",
            "id": "23",
            "return_url": "",
            "trial_interval": "",
            "description": "Vel soluta nihil qui accusamus quidem.  Et qui qui et sit omnis sit.  Veritatis voluptates aut incidunt mollitia corporis labore accusantium.",
            "trial_price_in_cents": "",
            "update_return_url": "",
            "initial_charge_in_cents": "",
            "require_credit_card": "true",
            "request_credit_card": "true"
          },
          "trial_ended_at": "",
          "previous_state": "active",
          "expires_at": "",
          "coupon_code": "",
          "current_period_started_at": "2012-09-09 11:38:32 -0400",
          "canceled_at": "",
          "next_assessment_at": "2012-10-09 11:38:32 -0400",
          "credit_card": {
            "last_name": "Doe",
            "card_type": "bogus",
            "vault_token": "1",
            "first_name": "Jane",
            "billing_state": "NC",
            "masked_card_number": "XXXX-XXXX-XXXX-1",
            "expiration_year": "2016",
            "billing_country": "US",
            "customer_vault_token": "",
            "customer_id": "15",
            "billing_address": "987 Commerce St",
            "expiration_month": "4",
            "current_vault": "bogus",
            "billing_city": "Greenberg",
            "id": "14",
            "billing_address_2": "Suite 789",
            "billing_zip": "67890"
          },
          "signup_revenue": "99.00",
          "signup_payment_id": "30",
          "delayed_cancel_at": "",
          "state": "active",
          "cancel_at_end_of_period": "false",
          "updated_at": "2012-09-09 11:38:33 -0400",
          "created_at": "2012-09-09 11:38:32 -0400",
          "id": "11839401", //important!
          "activated_at": "2012-09-09 11:38:33 -0400",
          "current_period_ends_at": "2012-10-09 11:38:32 -0400",
          "balance_in_cents": "9900",
          "total_revenue_in_cents": "4200"
        },
        "site": {
          "subdomain": "acme-test",
          "id": "3"
        }
      }
    };

    request(testAPIUrl)
      .post('/webhooks/chargify')
      .type('form')
      .send(eventJSON)
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

