/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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

var Utils = require('./../../common/utils');
var API = require('./../../common/api');
var dp = require('./../../common/providers/statsData');
var DP = new dp();
// var DomainConfigsDP = require('./../../common/providers/data/domainConfigs');

var should = require('should-http');
var promise = require('bluebird');
var config = require('config');

var user = config.get('api.users.admin');
var reseller = config.get('api.users.reseller');
var domains = config.get('api.stats.domains');

var prefix_lg = '    ' + Utils.colored( 'LightBlue', '• ' );
var prefix_smr = '    ' + Utils.colored( 'LightRed', '· ' );
var prefix_smb = '    ' + Utils.colored( 'LightBlue', '· ' );

//  ----------------------------------------------------------------------------------------------//
describe('Functional check.', function () {

  this.timeout(config.get('api.request.maxTimeout'));

  before(function (done) {
    API.helpers
      .authenticateUser(user)
      .then(done)
      .catch(done);
  });

  after(function (done) {
    done();
  });

  describe('Last mile RTT: Stats resource', function () {
    var testData;
    before(function (done) {
      testData = DP.generateLMRTTTests();
      done();
    });
    var getSpecCallback = function (type) {
      return function (done) {
        API.resources.stats
          .lastMileRtt()
          .getOne(domains.google.id, testData[type].query)
          .expect(200)
          .then(function (res) {
            var expData = testData[type];
            var data = res.body.data;
            var metadata = res.body.metadata;
            metadata.total_hits.should.equal(expData.total_hits);
            metadata.data_points_count.should.equal(expData.data_points_count);
            for (var i = 0, len = data.length; i < len; ++i) {
              var expItem = expData.data[data[i].key];
              data[i].count.should.equal(expItem.count);
              data[i].lm_rtt_avg_ms.should.equal(expItem.lm_rtt_avg_ms);
              data[i].lm_rtt_max_ms.should.equal(expItem.lm_rtt_max_ms);
              data[i].lm_rtt_min_ms.should.equal(expItem.lm_rtt_min_ms);
            }
            done();
          })
          .catch(done);
      };
    };

    it('should return data for `country` aggregations',
      getSpecCallback('country'));
    it('should return data for `os` aggregations', getSpecCallback('os'));
    it('should return data for `device` aggregations',
      getSpecCallback('device'));
  });

  describe('GBT/Traffic: Stats resource', function () {
    var testData;
    before(function (done) {
      testData = DP.generateGBTTests();
      done();
    });
    var getSpecCallback = function (type) {
      return function (done) {
        API.resources.stats
          .gbt()
          .getOne(domains.google.id, testData[type].query)
          .expect(200)
          .then(function (res) {
            var expData = testData[type];
            var data = res.body.data;
            var metadata = res.body.metadata;
            metadata.total_hits.should.be.equal(expData.total_hits);
            metadata.data_points_count.should.be
              .equal(expData.data_points_count);
            for (var i = 0, len = data.length; i < len; ++i) {
              var expItem = expData.data[data[i].key];
              data[i].count.should.equal(expItem.count);
              data[i].sent_bytes.should.equal(expItem.sent_bytes);
              data[i].received_bytes.should.equal(expItem.received_bytes);
            }
            done();
          })
          .catch(done);
      };
    };

    it('should return data for `country` aggregation',
      getSpecCallback('country'));
    it('should return data for `os` aggregation', getSpecCallback('os'));
    it('should return data for `device` aggregation',
      getSpecCallback('device'));
  });

  describe('Top Objects: Stats resource', function () {
    var testData = [];
    this.timeout(config.get('api.request.maxTimeout'));

    before(function () {
      testData = DP.generateTopObjectsTests();
    });

    it('All requests combinations', function (done) {
      var run_ = function (test) {
        return API.resources.stats
          .topObjects()
          .getOne(domains.google.id, test.query)
          .expect(200)
          .then(function (res) {
            var metadata = res.body.metadata;
            metadata.total_hits.should.equal(test.count);
          })
          .catch(done);
      };

      promise.map(testData, run_, {concurrency: 32})
        .then(function () {
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
  });

  describe('Top: Stats resource', function () {

    var testData = [];
    this.timeout(config.get('api.request.maxTimeout'));

    before(function () {
      testData = DP.generateTopTests();
    });

    it('All requests combinations', function (done) {
      var run_ = function (test) {
        return API.resources.stats
          .top()
          .getOne(domains.google.id, test.query)
          .expect(200)
          .then(function (res) {
            var metadata = res.body.metadata;
            metadata.total_hits.should.equal(test.total_hits);
            metadata.data_points_count.should.equal(test.data_points_count);
            if (test.count) {
              var data = res.body.data;
              for (var i = 0, len = data.length; i < len; ++i) {
                test.count.should.be.equal(data[i].count);
              }
            }
          })
          .catch(done);
      };

      promise.map(testData, run_, {concurrency: 24})
        .then(function () {
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
  });

  describe('Stats resource', function () {

    var testData = [];
    this.timeout(config.get('api.request.maxTimeout'));

    before(function () {
      testData = DP.generateStatsTests();
    });

    it('should return bad request when report period exceeds 24h',
      function (done) {
        API.resources.stats
          .top()
          .getOne(domains.test.id, {
            'from_timestamp': '-72h',
            'to_timestamp': '-2h'
          })
          .expect(400, done);
      });

    it('All requests combinations', function (done) {
      var getSpecCallback = function (test) {
        return API.resources.stats
          .getOne(domains.google.id, test.query)
          .expect(200)
          .then(function (res) {
            var metadata = res.body.metadata;
            var data = res.body.data;
            metadata.total_hits.should.equal(test.count);
            var sent = 0;
            var received = 0;
            var requests = 0;
            for (var i = 0, len = data.length; i < len; ++i) {
              requests += data[i].requests;
              sent += data[i].sent_bytes;
              received += data[i].received_bytes;
            }
            requests.should.equal(test.count);
            sent.should.equal(test.sent_bytes);
            received.should.equal(test.received_bytes);
          })
          .catch(done);
      };
      promise.map(testData, getSpecCallback, {concurrency: 32})
        .then(function () {
          done();
        })
        .catch(function (err) {
          done(err);
        });
    });
  });

});
