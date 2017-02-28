/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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

// TODO: need to figure out why mocha cannot authorize SSL cert deployed
// on support.nuubit.net
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

var request = require('supertest-as-promised');
var should = require('should');

// # Smoke check: ZenDesk Article
var config = require('config');

describe('Smoke check', function () {
  this.timeout(config.get('api.request.maxTimeout'));
  var zenDeskUrl = config.get('api.zenDesk.url');

  before(function (done) {
    done();
  });

  after(function (done) {
    done();
  });

  describe('ZenDesk Article', function () {

    it('should return a success response when accessing it.',
      function (done) {
        request = request(zenDeskUrl);
        request
          .get('/hc/en-us/categories/200833373-nuu-bit-API')
          .expect(200)
          .end(function (err, res) {
            if (err) {
              done(err);
            }
            should.exist(res.body);
            done();
          });
      });
  });
});

