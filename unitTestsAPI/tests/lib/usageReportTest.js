/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
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
var should = require('should');

var oldEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'unitTests'; // use unit tests config

var usageReport = require('../../../lib/usageReport');

var config = require('config');

describe('Unit test', function() {
  this.timeout(config.default_timeout);
  describe('Usage Report', function() {
    it('should exist method `reportAboutSitesWithoutAssignedBillingZone`', function() {
      should.exist(usageReport.reportAboutSitesWithoutAssignedBillingZone);
    });
    describe('reportAboutSitesWithoutAssignedBillingZone', function() {
      it('should return result', function(done) {
        var options = {};
        usageReport.reportAboutSitesWithoutAssignedBillingZone(
          options,
          function(error, result) {
            should.not.exist(error);
            should.exist(result);
            result.should.not.be.String();
            result.should.be.Array();
            result.should.be.empty();
            done();
          }
        );
      });
    });
  });
});
