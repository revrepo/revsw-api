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

// # SSL Certificates Data Provider object
//
// Defines some methods to generate valid and common SSL cert. test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var SSLCertDataProvider = {

  prefix: 'api-test',

  /**
   * ### SSLCertDataProvider.generateOne()
   *
   * Generates valid data that represents a SSL Cert and the REST API
   * end points accept.
   *
   * @param {String} accountId, account ID
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
  generateOne: function (accountId) {
    var prefix = Date.now();
    var items = ['private'];  
    // var items = ['shared', 'private'];  TODO shared certs should be tested using a different
    // approach: they are available for revadmin only and for now there can be only one shared cert
    // in the system
    return {
      account_id: accountId,
      cert_name: faker.lorem.sentence() + ' ' + prefix,
      cert_type: items[Math.floor(Math.random() * items.length)],
      comment: 'Something', // Optional
      public_ssl_cert: '-----BEGIN CERTIFICATE-----\n' +
      'MIIC9zCCAd+gAwIBAgIJALjDeIy6xsYNMA0GCSqGSIb3DQEBBQUAMBIxEDAOBgNV\n' +
      'BAMMB2FzZC5jb20wHhcNMTYwNTE5MTcxOTE2WhcNMjYwNTE3MTcxOTE2WjASMRAw\n' +
      'DgYDVQQDDAdhc2QuY29tMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n' +
      'rrWqpABvagJZvHk+YDWycv0rwbbl/UbK/osBcV2bfjYB2A7dFCGvGg2sZ6rGeI5S\n' +
      'PWBVdu1I7sNalZGjk8R8tAfoRLLoR99teOlkSQUNP9nTEfX9cTSeHhLAK3ZSnJHE\n' +
      'hB3jFyMBAeVEXf5CiNWyyVNVMkVIyFnDDDP0ag4kTvSEHeGlsXZDC1rKE/7mY07K\n' +
      'uPGs4E99HkDq+Zgf6BpPEvdYiterI3SptEMYxdpRjwMqvUQb1KLn2yL/FLgeM10F\n' +
      'wDQhlEUqna54+bQoP2h1pWafz8zHem6AeaIrz6dIETy4eDmyoaU/DrJOARw+yAS+\n' +
      'U1BlW59kHxrDlxK9KfPVFwIDAQABo1AwTjAdBgNVHQ4EFgQU7P7jJfmbqUTV7bTb\n' +
      'a0KwhxP6Q+owHwYDVR0jBBgwFoAU7P7jJfmbqUTV7bTba0KwhxP6Q+owDAYDVR0T\n' +
      'BAUwAwEB/zANBgkqhkiG9w0BAQUFAAOCAQEAUJMVngyc9xxOitqqvi9+jSGqXdBr\n' +
      'dAMaWna0xhySoNenmguJVnRa3EYai1J/nk5qJgJq9DyPxXArDn2N4UGVK/u97ozT\n' +
      '4HIbCQxrrFJxAL3JhYo5q1Mdo1LvJFOypRwKS1QP+VcgUt+DW8MNdgnWihxbDnCX\n' +
      '0zgutoPorMtD8rMCtSjhxHpvkBdgOsGYCMeYBUOXgrhHEWfHX/v6Yt/jFw5zWL0I\n' +
      '11syc2MjJ+c3bN2/yMTIK+Nu+j9+Tu/kNchfe4v7jK2NQozCcCSsSNae92nUjaux\n' +
      'FhIcSq0V6/My737H12LJLDDFGOcKaoOYNVYXMEl9Z2GVPmmQVGzqVbUXAA==\n' +
      '-----END CERTIFICATE-----', // Public SSL certificate in PEM format
      private_ssl_key: '-----BEGIN RSA PRIVATE KEY-----\n' +
      'MIIEpAIBAAKCAQEArrWqpABvagJZvHk+YDWycv0rwbbl/UbK/osBcV2bfjYB2A7d\n' +
      'FCGvGg2sZ6rGeI5SPWBVdu1I7sNalZGjk8R8tAfoRLLoR99teOlkSQUNP9nTEfX9\n' +
      'cTSeHhLAK3ZSnJHEhB3jFyMBAeVEXf5CiNWyyVNVMkVIyFnDDDP0ag4kTvSEHeGl\n' +
      'sXZDC1rKE/7mY07KuPGs4E99HkDq+Zgf6BpPEvdYiterI3SptEMYxdpRjwMqvUQb\n' +
      '1KLn2yL/FLgeM10FwDQhlEUqna54+bQoP2h1pWafz8zHem6AeaIrz6dIETy4eDmy\n' +
      'oaU/DrJOARw+yAS+U1BlW59kHxrDlxK9KfPVFwIDAQABAoIBAHAzmaBz6xmw4sKp\n' +
      'NwcA1VcGAtkIxlHP6kRpL4cH7/mxY6PHf/IS4+qeh2+YfJgmBukF+j1DjMhSS9Ws\n' +
      'z9nxoYjZXzDnmUe3VQ4HDfHbPbQZB3YMfjT67uUvc502Az4sW4Hh09sjDt2RyUN4\n' +
      'LHDGlWi4jQmY93I8O4iVwU1vQaA2Vv9EyWcRsdjkCwYCK7EvPIOmZrZtBj6JNGPW\n' +
      'nYMuwDMiV6oY0ic70AMqB7vPX53IEnxVepeFea7hVkXapNZ+j8f8M97ERdfzFoAg\n' +
      'PgbuE3hcmHGf7EUWMULJKSWJrQN1m8TV/F34cWm6jQSRuAtEQdEOQ07cKMPw+MXn\n' +
      'M3Mz6JECgYEA2IgsVJ1sTlMWR1Uw3bOVLl7Udb7dWAZdU6MISEoXIYZOnibADHWI\n' +
      'wN7+UpXPtBtq95J8rMCY90WR39Wj93OnFvC40c8oEOleDrKaXgJJx/Z1gCOv5xwl\n' +
      '6s+N2lEYNT8M1/Q/1JyE3ZJOifM/AG+gxT8vkGYSj9x176UH3DqpX7kCgYEAzo36\n' +
      'mk33cqa6DwjOvcYoPQSYyDtzE9ciNAyyoyJFgO1PdvpGUY+Z6W90uNHTQcoi1t1v\n' +
      'pEfUYinzpiuEtQUv2hQYxbgVm/ym5CkfVg8KEasfLKN3sVCvya5GDEwc6qiRW4EH\n' +
      'EJIZJxN4KuZd93YvpWCkytTRckd2chZasfbhI08CgYBSKOFBPfZRhd9HM8D17mUl\n' +
      'kh/liYVtGAUjbhH/c/Vw6Ag+pA9s6s/39uTjKysDeP/ObovV9MJV2NTv7J1pkD2P\n' +
      'S8mk+oiGWjYxN32xPAcI07Bj7aaZ96k/fn+hnfGkiobyDiCGKNmVRSV93IlEPhbv\n' +
      'oPkIPmK+qXUqeCESZEPOKQKBgQCHHUzO3y18rB+Nch96+EKeF4GxiWHvmozfK2c3\n' +
      'W1XHznRqybBx7dOqZaQeufLNWGKN1vAOsIX3aKXfDxySJUB2EStbOt232f95xISh\n' +
      'ENlvUVblJlFHhhZXgU6FAMzxmy7qgm6Sol8dtpimx2a0V3U3Yw6pN6mCbcjHPGQ7\n' +
      'gdkn9QKBgQDX35FhVfyHGCQyOv5Me+2Ycfc5iFKmXie6IJB/El7xt0lTPdccl7c/\n' +
      'sA8KhjneeQs8qMNzxEtppNM9A86IP7OAnO8ydS/IyQBvAtoqwSNE1ydVcjg8Rjik\n' +
      'pVLyiPsKT20w/q3x4P36coz+VCcCM7kKuZxfNoXHceX1jsau/ZXJXw==\n' +
      '-----END RSA PRIVATE KEY-----', // Private SSL key in PEM format
      private_ssl_key_passphrase: '', // Optional
      chain_ssl_cert: '' // Optional
    };
  }
};

module.exports = SSLCertDataProvider;
