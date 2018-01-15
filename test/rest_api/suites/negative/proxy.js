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

require('should-http');

var config = require('config');
var API = require('./../../common/api');

describe('Negative check', function () {

  // Changing default mocha's timeout (Default is 2 seconds).
  this.timeout(config.get('api.request.maxTimeout'));

  describe('Proxy resource', function () {

    var proxyWhiteRefererURLs = config.get('proxy_white_referer_urls');

    proxyWhiteRefererURLs.forEach(function (url) {
      it('should return success response for `' + url + '`',
        function (done) {
          API.resources.proxy
            .getOne()
            .set('Referer', url)
            .expect(200)
            .end(done);
        });
    });

    it('should return `400 Bad Request` response if `Referer` is not set',
        function (done) {
          API.resources.proxy
            .getOne()
            .expect(400)
            .end(done);
        });

        it('should return `400 Bad Request` response if `Referer` is invalid',
        function (done) {
          API.resources.proxy
            .getOne()
            .set('Referer', 'www.invalid-url.com')
            .expect(400)
            .end(done);
        });
  });
});
