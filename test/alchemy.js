process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
var should = require('should-http');
var request = require('supertest');
var agent = require('supertest-as-promised');
var mongoose    = require('mongoose');
var express = require('express');
var fs = require('fs');
var https = require('https');
//var sleep = require('sleep');
var utils = require('../lib/utilities.js');
var config = require('config');
var _ = require('lodash');
var crypto = require('crypto');
var chargifyConfig = config.get('chargify');

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
var customer = require('../lib/chargify.js').Customer;

describe('other things', function () {
  it.skip('should update 56e5b0120fdb26341ed421e7 company id', function (done) {
    company.update({
      account_id: '56e5b0120fdb26341ed421e7',
      subscription_id: '12114463',
      subscription_state: 'active',
      billing_portal_link: {url: 'https://www.billingportal.com/manage/11710117/1457894371/dc5dd54b9120515f'}
    }, done);
  });
  it('should update all billing plans', function (done) {
    BillingPlan.update({services: {}}, {$set: {"services.$.measurement_unit": 'domain'}} , function (err, res) {
      console.log(err);
      console.log(res);
      done();
    });
  });
});
xdescribe('chargify API', function () {
  it.skip('should get a list of statements', function (done) {
    customer.getTransactions(11845913, function (err, res) {
      if(err){
        throw err;
      }
      console.log(res);
      done();
    });
  });

  it.skip('should find a webhook working', function (done) {

    var key = chargifyConfig.shared_key;
    var hmac = crypto.createHmac('sha256', key);
    hmac.update('id=123456&event=test&payload[chargify]=testing');
    var hmacHex = hmac.digest('hex');
    request('https://localhost:8000')
      .post('/webhooks/chargify')
      .type('form')
      .set('X-Chargify-Webhook-Id', 'testid')
      .set('X-Chargify-Webhook-Signature-Hmac-Sha-256', hmacHex)
      .send('id=123456&event=test&payload[chargify]=testing')
      //.auth('dev@revsw.com', '12345678')
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
  it.skip('should test Statements API', function (done) {
    request('https://localhost:8000')
      .get('/v1/accounts/56dcc8afa2bfed484a69e921/statements')
      .auth('dev@revsw.com', '12345678')
      .expect(200, function (err, res) {
        if (err) {
          throw err;
        }
        console.log(res.body);
        done();
      });
  });
});



xdescribe('Manipulations with billing plans', function () {
  it.skip('should testlodash', function (done) {
    var a = {some: 'thing', not: 'another'};
    var b = {pam: 'fam', foo: 'bar'};
    var c = {page: 'none'};
    console.log(_.merge(a, _.merge(b, c)));
    done();

  });
  it.skip('should delete self-registered users', function (done) {
    users.query({self_registered: true}, function (err, docs) {
      docs.forEach(function (doc) {
        users.update({_id: doc._id, deleted: true}, function (err, res) {
          if(err){
            throw err;
          }
          console.log(doc.firstname);
          console.log(res);

        });
      })
    });
  });
  it.skip('should get a list of companies', function (done) {
    company.model.find({}, function (err, docs) {
      if(err){
        done(err);
      }
      docs.forEach(function (d) {
        console.log(d);
        done();
      })
    })
  });
  it.skip('should give me a user with specific company', function (done) {
    users.model.find({companyId: '56c41c9cd15cbb8001aaaac1'}, function (err, docs) {
      if(err){
        done(err);
      }
      docs.forEach(function (d) {
        console.log(d);
        done();
      })
    })
  });

  it.skip('should activate a signup webhook', function (done) {
    
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
          "id": "11839401",
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
    
    request('https://localhost:8000')
      .post('/webhooks/chargify')
      .set('X-Chargify-Webhook-Id', 'testid')
      .set('X-Chargify-Webhook-Signature-Hmac-Sha-256', 'testid')
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
  it.skip('should update Unique product with hosted page record', function (done) {
    BillingPlan.get({chargify_handle: '5_domains'}, function (err, doc) {
      if(err){
        throw err;
      }
      product.getHostedPage(doc.chargify_handle, function (err, res) {
        if(err){
          throw err;
        }
        BillingPlan.updateBillingPlan({id: doc._id, hosted_page: res.url}, done);
      });

    })
  });
  it.skip('should delete old billing plans', function (done) {
      BillingPlan.remove({name: 'Starter'}, done);
  });

  it('should show me billing plans', function (done) {
    BillingPlan.find({}, function (err, docs) {
      if(err){
        throw err;
      }
      console.log(docs);
      
     docs.forEach(function (doc) {
        console.log(doc.services);

      });
      done();
    });
  });
  it.skip('should update a billing plan', function (done) {
    var productPlan =
    {
      name: 'Gold',
      description: 'provides you with 15 domains',
      chargify_handle: '15_domains',
      type: 'public',
      monthly_fee: 15,
      services: [{
        code_name: 'Domains',
        description: 'Allocated domains',
        measurement_unit: 'domain',
        cost: 1,
        included: 15,
        type: 'quantity',
        chargify_id: 150841
      }],
      prepay_discounts: [{
        period: 0,
        discount: 0
      }],
      commitment_discounts: [{
        period: 0,
        discount: 0
      }],
      order: 0
    };

    request('https://localhost:8000')
      .put('/v1/billing_plans/56bb35a095f4c7d814d477ca')
      .send(productPlan)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200, function (err, res) {
        if (err) {
          console.log(err);
          throw err;
        }

        console.log(res.body);
        done();
      });
  });

  it.skip('should create me a new plan', function (done) {
    var productPlan =
    {
      name: 'Unique 15',
      description: 'provides you with 15 domains',
      chargify_handle: '10_domains',
      type: 'public',
      monthly_fee: 15,
      services: [{
        code_name: 'domain',
        description: 'serve domains',
        measurement_unit: 'domain',
        cost: 1,
        included: 15
      }],
      prepay_discounts: [{
        period: 0,
        discount: 0
      }],
      commitment_discounts: [{
        period: 0,
        discount: 0
      }],
      order: 0
    };

    request('https://localhost:8000')
      .post('/v1/billing_plans')
      .send(productPlan)
      .auth(qaUserWithAdminPerm, qaUserWithAdminPermPassword)
      .expect(200, function (err, res) {
        if (err) {
          console.log(err);
          throw err;
        }

        console.log(res.body);
        done();
      });

  });
});


//Because of failed validation a user was created without required field and all responses failed because response
//validation actually worked
xdescribe('Rev API /v1/users/:id call', function() {
var adminReq = {auth:{credentials:{role: ''}}};
    adminReq.auth.credentials.role ='revadmin';
  var revAdminReq = {auth:{credentials:{role: ''}}};
  revAdminReq.auth.credentials.role ='revadmin';
  this.timeout(10000);

  it.skip('should find a corrupted user', function (done) {


    users.query({firstname: null}, function (err, doc) {
      console.log(err);
      console.log(doc);
      done();
    });

    users.get({email: 'alhk.ras@gmail.com'}, function (err, doc) {
      console.log(err);
      console.log(doc);
      done();
    });
  });

  it.skip('should get user list from DB without errors from revAdmin', function (done) {
    users.listAll(revAdminReq, function (err, doc) {
      console.log(err);
      done();
    });
  });

  it.skip('should return users list', function (done) {
    request('https://localhost:8000')
      .get('/v1/users')
      .auth('dev@revsw.com', '12345678')
      .expect(200, function (err, res) {
        if (err) {
          throw err;
        }
        console.log(err);
        res.body.forEach(function (doc) {
          console.log(doc.user_id);
          console.log(doc.email);
          console.log(doc.companyId);
          console.log(doc.role);
        });
        done();
      });
  });
  it.skip('should make user back on his feet', function (done) {
    users.model.findByIdAndUpdate('56b300e984e519fa3082dd16', {$set:{firstname: 'Survivor', lastname: 'From a Bug'}}, function (err, doc) {
      if(err){
        throw err;
      }
      console.log(doc);
      done();
    });

  });

});


