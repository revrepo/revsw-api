/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

// Clear external data

var _ = require('lodash');
var config = require('config');
var chargify = config.get('chargify');
var Promise = require('bluebird');
var request = require('supertest-as-promised');

// This allows to overpass SSL certificate check
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var baseUrl = chargify.domain;
var apiKey = chargify.api_key;
var password = '';

describe('Clean up', function () {


  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  describe('Chargify canceled Subscriptions', function () {

    var listSubscriptionsIds = [];

    before(function (done) {
      request(baseUrl)
        .get('/subscriptions.json')
        .query({
          per_page: 500, // NOTE: Will clear all records (for test account limit records equal 500 )
          state: 'canceled'
        })
        .auth(apiKey, chargify.password)
        .type('application/json')
        .accept('application/json')
        .end(function (err, dataResponse) {
          listSubscriptionsIds = _.map(dataResponse.body, function (item) {
            return {
              state: item.subscription.state,
              subscriptionId: item.subscription.id,
              customerId: item.subscription.customer.id
            };
          });
          if (err) {
            return done(err);
          }
          return done();
        });
    });

    it('should delete all canceled subscriptions ', function (done) {
      //NOTE: A `POST` to `<subdomain>.chargify.com/subscriptions/<subscription_id>/purge?ack=<customer_id>`
      // will allow subscriptions to be banished via the API
      var requestsAll = [];
      _.forEach(listSubscriptionsIds, function (item) {
        //console.log(item.state, '/subscriptions/' + item.subscriptionId + '/purge?ack=' + item.customerId);
        if (item.state === 'canceled') {
          requestsAll.push(
            request(baseUrl)
            .post('/subscriptions/' + item.subscriptionId + '/purge?ack=' + item.customerId)
            .auth(apiKey, password)
            .type('application/json')
            .accept('application/json')
            .expect(200)
            .then(function (data) {
              return request(baseUrl)
                .delete('/customers/' + item.customerId + '.json')
                .auth(apiKey, password)
                .type('application/json')
                .expect(204);
            }));
        }
      });      

      Promise.all(requestsAll)
        .then(function (data) {
          console.log('Total records deleted: ', data.length);
          return done();
        })
        .catch(function (err) {
          return done(err);
        });

    });

    it('should delete all inactive customers ', function (done) {
      var requestsAll = [];
      request(baseUrl)
        .get('/customers.json')
        .query()
        .auth(apiKey, chargify.password)
        .type('application/json')
        .accept('application/json')
        .end(function (err, dataResponse) {
          var testMail = /[a-z]*-[0-9]*@mailinator.com/g;
          _.forEach(dataResponse.body, function (item) {
            if (testMail.test(item.customer.email) || item.customer.email === 'company01@mail.com') {
              requestsAll.push(              
                  request(baseUrl)
                  .delete('/customers/' + item.customer.id + '.json')
                  .auth(apiKey, password)
                  .type('application/json')
                  .expect(204)
              );
            }
          });

          Promise.all(requestsAll)
            .then(function (data) {
              console.log('Total records deleted: ', data.length);
              return done();
            })
            .catch(function (err) {
              return done(err);
            });
        });
    });
  });
});
