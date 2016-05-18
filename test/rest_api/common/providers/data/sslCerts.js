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

var faker = require('faker');

// # SSL Cert Data Provider object
//
// Defines some methods to generate valid and common SSL cert. test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var SSLCertDataProvider = {

  prefix: 'API-TEST',

  /**
   * ### SSLCertDataProvider.generateOne()
   *
   * Generates valid data that represents a SSL Cert and the REST API
   * end points accept.
   *
   * @param {Object} data, SSL cert information to use
   * @returns {Object} SSL Cert info with the following schema
   *
   *    {
   *       account_id: String,
   *       cert_name: String,
   *       cert_type: String,
   *       comment: String,
   *       public_ssl_cert: String,
   *       private_ssl_key: String,
   *       private_ssl_key_passphrase: String,
   *       chain_ssl_cert: String
   *    }
   */
  generateOne: function (data) {
    var prefix = Date.now();
    return {
      account_id: data.accountId,
      cert_name: faker.name.small() + ' ' + prefix,
      cert_type: 'shared', //'shared' or 'private'
      comment: 'Something', // Optional
      public_ssl_cert: '', // Public SSL certificate in PEM format
      private_ssl_key: '', // Private SSL key in PEM format
      private_ssl_key_passphrase: '', // Optional
      chain_ssl_cert: '' // Optional
    };
  }
};

module.exports = SSLCertDataProvider;