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

var SSLCertsResource = require('./../resources/sslCerts');
var SSLCertDP = require('./../providers/data/sslCerts');
var AccountsHelper = require('./../helpers/accounts');
var APITestError = require('./../apiTestError');

// # SSL Certificates Helper
// Abstracts common functionality for the related resource.
var SSLCertsHelper = {

  /**
   * Creates a new SSL Certificate.
   *
   * @returns {Object} SSL Certificate data.
   */
  createOne: function () {
    return AccountsHelper
      .createOne()
      .then(function (account) {
        var sslCert = SSLCertDP.generateOne(account.id);
        return SSLCertsResource
          .createOne(sslCert)
          .catch(function (error) {
            throw new APITestError('Creating SSL Certificate',
              error.response.body,
              sslCert);
          })
          .then(function (respose) {
            sslCert.id = respose.body.id;
            return sslCert;
          });
      });
  }
};

module.exports = SSLCertsHelper;